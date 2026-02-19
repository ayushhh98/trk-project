"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
    Search,
    MoreVertical,
    Shield,
    Ban,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Wallet,
    Users,
    Zap,
    TrendingUp,
    Download,
    Snowflake,
    RefreshCw,
    Copy,
} from "lucide-react";
import { adminAPI } from "@/lib/api";
import { useSocket } from "@/components/providers/Web3Provider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
    _id: string;
    email: string;
    walletAddress?: string;
    role: string;
    isBanned: boolean;
    isFrozen?: boolean;
    isActive: boolean;
    credits: number;
    rewardPoints: number;
    realBalances?: {
        totalUnified?: number;
        cash?: number;
    };
    activation?: {
        tier: string;
        totalDeposited: number;
    };
    referralCode?: string;
    createdAt: string;
}

const TIER_FILTERS = ["all", "tier2", "tier1", "none"] as const;
const TIER_LABELS: Record<string, string> = {
    all: "All",
    tier2: "Full Node",
    tier1: "Basic Node",
    none: "Inactive",
};

const normalizeIncomingUser = (input: any): User => ({
    _id: String(input?._id || input?.id || ""),
    email: input?.email || "",
    walletAddress: input?.walletAddress || "",
    role: input?.role || "player",
    isBanned: Boolean(input?.isBanned),
    isFrozen: Boolean(input?.isFrozen),
    isActive: input?.isActive !== false,
    credits: Number(input?.credits ?? input?.practiceBalance ?? 0),
    rewardPoints: Number(input?.rewardPoints ?? 0),
    realBalances: input?.realBalances || { cash: 0, totalUnified: 0 },
    activation: input?.activation || { tier: "none", totalDeposited: 0 },
    referralCode: input?.referralCode || "",
    createdAt: input?.createdAt || new Date().toISOString(),
});

export function UserTable() {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [tierFilter, setTierFilter] = useState<string>("all");
    const [isLive, setIsLive] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastRealtimeFetchRef = useRef(0);

    const socket = useSocket();

    const fetchUsers = useCallback(async (options?: { silent?: boolean }) => {
        if (!options?.silent) setIsLoading(true);
        try {
            const params: any = { page, search, limit: 10 };
            if (tierFilter !== "all") params.tier = tierFilter;
            const res = await adminAPI.getUsers(params);
            if (res.status === "success") {
                const nextUsers = (res.data.users || []).map(normalizeIncomingUser);
                setUsers(nextUsers);
                setTotalPages(res.data.totalPages || 1);
                setTotal(res.data.total || 0);
                setLastSync(new Date());
            }
        } catch {
            if (!options?.silent) toast.error("Failed to fetch users");
        } finally {
            if (!options?.silent) setIsLoading(false);
        }
    }, [page, search, tierFilter]);

    useEffect(() => {
        const debounce = setTimeout(() => fetchUsers(), 350);
        return () => clearTimeout(debounce);
    }, [fetchUsers]);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            fetchUsers({ silent: true });
        }, 10000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchUsers]);

    useEffect(() => {
        if (!socket) return;

        const isTierMatch = (user: User) => tierFilter === "all" || user.activation?.tier === tierFilter;
        const maybeRefresh = () => {
            const now = Date.now();
            if (now - lastRealtimeFetchRef.current < 2500) return;
            lastRealtimeFetchRef.current = now;
            fetchUsers({ silent: true });
        };

        const handleConnect = () => setIsLive(true);
        const handleDisconnect = () => setIsLive(false);

        const handleUserRegistered = (payload: any) => {
            const incoming = normalizeIncomingUser(payload);
            const label = incoming.email || incoming.walletAddress || "User";

            if (page === 1 && !search && isTierMatch(incoming)) {
                setUsers((prev) => {
                    const exists = prev.find((u) => u._id === incoming._id);
                    if (exists) return prev;
                    return [incoming, ...prev].slice(0, 10);
                });
                setTotal((t) => t + 1);
            }

            toast.info("New User Registered", {
                description: `${label} joined the platform.`,
            });
            maybeRefresh();
        };

        const handleUserUpdated = (payload: any) => {
            const incoming = normalizeIncomingUser(payload);
            let found = false;
            setUsers((prev) => prev.map((u) => {
                if (u._id !== incoming._id) return u;
                found = true;
                return { ...u, ...incoming };
            }));
            if (!found) maybeRefresh();
        };

        setIsLive(socket.connected);
        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("admin:user_registered", handleUserRegistered);
        socket.on("user_registered", handleUserRegistered);
        socket.on("admin:user_updated", handleUserUpdated);
        socket.on("transaction_created", maybeRefresh);
        socket.on("global_win", maybeRefresh);
        socket.on("club_income_distributed", maybeRefresh);
        socket.on("admin:stats_update", maybeRefresh);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("admin:user_registered", handleUserRegistered);
            socket.off("user_registered", handleUserRegistered);
            socket.off("admin:user_updated", handleUserUpdated);
            socket.off("transaction_created", maybeRefresh);
            socket.off("global_win", maybeRefresh);
            socket.off("club_income_distributed", maybeRefresh);
            socket.off("admin:stats_update", maybeRefresh);
            setIsLive(false);
        };
    }, [socket, page, search, tierFilter, fetchUsers]);

    const handleBan = async (id: string, currentStatus: boolean) => {
        try {
            if (currentStatus) {
                await adminAPI.unbanUser(id);
                toast.success("User unbanned");
            } else {
                await adminAPI.banUser(id, "Admin action");
                toast.success("User banned");
            }
            fetchUsers({ silent: true });
        } catch {
            toast.error("Action failed");
        }
    };

    const handleRole = async (id: string, newRole: "player" | "admin") => {
        try {
            await adminAPI.updateRole(id, newRole);
            toast.success(`Role updated to ${newRole}`);
            fetchUsers({ silent: true });
        } catch {
            toast.error("Role update failed");
        }
    };

    const handleFreeze = async (id: string, isFrozen: boolean) => {
        try {
            const token = localStorage.getItem("trk_token");
            const endpoint = isFrozen ? `/api/admin/users/${id}/unfreeze` : `/api/admin/users/${id}/freeze`;
            const res = await fetch(endpoint, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ reason: "Admin action" })
            });
            const data = await res.json();
            if (data.status === "success") {
                toast.success(isFrozen ? "User unfrozen" : "User frozen");
                fetchUsers({ silent: true });
            } else {
                toast.error(data.message || "Action failed");
            }
        } catch {
            toast.error("Network error");
        }
    };

    const exportCSV = () => {
        const headers = ["Email", "Wallet", "Role", "Tier", "Real Balance", "Practice Balance", "Banned", "Frozen", "Joined"];
        const rows = users.map((u) => [
            u.email,
            u.walletAddress || "",
            u.role,
            u.activation?.tier || "none",
            (u.realBalances?.cash || 0).toFixed(2),
            u.credits,
            u.isBanned,
            u.isFrozen || false,
            new Date(u.createdAt).toISOString(),
        ]);
        const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "users.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Users CSV exported");
    };

    const getTierColor = (tier: string) => {
        switch (tier) {
            case "tier2":
                return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
            case "tier1":
                return "text-blue-400 bg-blue-500/10 border-blue-500/20";
            default:
                return "text-white/30 bg-white/5 border-white/10";
        }
    };

    const getTierLabel = (tier: string) => {
        switch (tier) {
            case "tier2":
                return "Full Node";
            case "tier1":
                return "Basic Node";
            default:
                return "Inactive";
        }
    };

    return (
        <Card className="bg-gradient-to-br from-black/60 via-black/40 to-black/60 border border-emerald-500/20 backdrop-blur-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.3)]">
            <CardHeader className="flex flex-col gap-4 p-8 border-b border-white/5 bg-white/[0.02]">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider flex items-center gap-3">
                            <Users className="h-5 w-5 text-emerald-500" />
                            User Command Center
                            {isLive && (
                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                    LIVE
                                </span>
                            )}
                        </h3>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium pl-8">
                            Global Identity & Asset Governance
                            {total > 0 ? ` · ${total.toLocaleString()} users` : ""}
                            {lastSync ? ` · synced ${lastSync.toLocaleTimeString()}` : ""}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-emerald-500 transition-colors" />
                            <Input
                                placeholder="SEARCH_USERS..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-12 bg-black/40 border-white/5 focus:border-emerald-500/50 text-xs font-mono h-11 rounded-xl transition-all placeholder:text-white/20"
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={exportCSV} title="Export CSV" className="h-11 w-11 border-white/5 bg-black/40 hover:bg-white/5 hover:text-emerald-400 transition-colors rounded-xl">
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => fetchUsers()} className="h-11 w-11 border-white/5 bg-black/40 hover:bg-white/5 hover:text-emerald-400 transition-colors rounded-xl">
                            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap pl-0">
                    {TIER_FILTERS.map((t) => (
                        <button
                            key={t}
                            onClick={() => {
                                setTierFilter(t);
                                setPage(1);
                            }}
                            className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all",
                                tierFilter === t
                                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                                    : "border-white/5 text-white/30 hover:text-white/60 hover:border-white/10"
                            )}
                        >
                            {TIER_LABELS[t]}
                        </button>
                    ))}
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#0f0f0f] border-b border-white/5 text-[9px] uppercase font-black tracking-[0.2em] text-white/30">
                            <tr>
                                <th className="px-8 py-5">Identity Protocol</th>
                                <th className="px-8 py-5">Asset Portfolio</th>
                                <th className="px-8 py-5">Node Status</th>
                                <th className="px-8 py-5">System Role</th>
                                <th className="px-8 py-5 text-right">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-8 py-6">
                                            <div className="h-10 bg-white/[0.02] rounded-xl w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-16 text-center text-white/30">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 rounded-full bg-white/5">
                                                <Users className="h-6 w-6 text-white/20" />
                                            </div>
                                            <span className="text-[10px] uppercase tracking-widest font-medium">No identities found</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user._id} className="group hover:bg-white/[0.02] transition-colors relative">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-white/50 group-hover:border-emerald-500/30 group-hover:text-emerald-500 transition-colors">
                                                    {user.email?.[0]?.toUpperCase() || "U"}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">ID: {user._id}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-4 w-4 text-white/20 hover:text-white"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(user._id);
                                                                toast.success("ID Copied");
                                                            }}
                                                        >
                                                            <Copy className="h-2.5 w-2.5" />
                                                        </Button>
                                                    </div>
                                                    <div className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">{user.email || "No Email"}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-white/40 font-mono border border-white/5">
                                                            {user.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : "No Wallet"}
                                                        </span>
                                                        {user.referralCode && (
                                                            <span className="text-[10px] bg-emerald-500/5 text-emerald-500 px-1.5 py-0.5 rounded font-mono uppercase border border-emerald-500/10">
                                                                REF: {user.referralCode}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 rounded bg-amber-500/10 text-amber-500">
                                                        <Wallet className="h-3 w-3" />
                                                    </div>
                                                    <span className="text-amber-500 font-mono font-bold text-sm">
                                                        {(user.realBalances?.cash || 0).toFixed(2)} USDT
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 rounded bg-emerald-500/10 text-emerald-500">
                                                        <Zap className="h-3 w-3" />
                                                    </div>
                                                    <span className="text-emerald-500/70 font-mono text-xs">{user.credits} Practice</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col gap-1.5">
                                                <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider w-fit border shadow-sm", getTierColor(user.activation?.tier || "none"))}>
                                                    {getTierLabel(user.activation?.tier || "none")}
                                                </span>
                                                {user.activation?.totalDeposited ? (
                                                    <span className="text-[10px] text-white/30 font-mono pl-1 flex items-center gap-1">
                                                        <TrendingUp className="h-2.5 w-2.5" />
                                                        Vol: ${user.activation.totalDeposited}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", user.isBanned ? "bg-red-500" : "bg-emerald-500")} />
                                                <span className={cn("text-xs font-bold uppercase tracking-wide", user.role === "admin" || user.role === "superadmin" ? "text-purple-400" : "text-white/60")}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-[#1a1a1a]/95 backdrop-blur-xl border-white/10 text-white min-w-[200px] p-2 rounded-xl shadow-2xl">
                                                    <DropdownMenuItem
                                                        onClick={() => handleBan(user._id, user.isBanned)}
                                                        className="hover:bg-white/5 focus:bg-white/5 cursor-pointer rounded-lg p-2.5 text-xs font-bold uppercase tracking-wide transition-colors"
                                                    >
                                                        {user.isBanned ? (
                                                            <>
                                                                <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                                                                <span className="text-emerald-500">Unban User</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Ban className="mr-2 h-4 w-4 text-red-500" />
                                                                <span className="text-red-500">Ban User</span>
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleFreeze(user._id, user.isFrozen || false)}
                                                        className="hover:bg-white/5 focus:bg-white/5 cursor-pointer rounded-lg p-2.5 text-xs font-bold uppercase tracking-wide mt-1 transition-colors"
                                                    >
                                                        <Snowflake className={cn("mr-2 h-4 w-4", user.isFrozen ? "text-blue-400" : "text-cyan-500")} />
                                                        <span className={user.isFrozen ? "text-blue-400" : "text-cyan-500"}>
                                                            {user.isFrozen ? "Unfreeze Account" : "Freeze Account"}
                                                        </span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleRole(user._id, user.role === "admin" ? "player" : "admin")}
                                                        className="hover:bg-white/5 focus:bg-white/5 cursor-pointer rounded-lg p-2.5 text-xs font-bold uppercase tracking-wide mt-1 transition-colors"
                                                    >
                                                        <Shield className="mr-2 h-4 w-4 text-purple-500" />
                                                        {user.role === "admin" ? "Demote to Player" : "Promote to Admin"}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-6 border-t border-white/5 bg-white/[0.01]">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="text-xs bg-black/40 border-white/10 hover:bg-white/5 h-9 px-4 rounded-xl font-mono uppercase transition-all hover:border-emerald-500/30"
                        >
                            <ChevronLeft className="h-3 w-3 mr-2" /> Previous
                        </Button>
                        <div className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-[10px] text-white/40 uppercase tracking-widest font-black">
                                Page <span className="text-white">{page}</span> of {totalPages}
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="text-xs bg-black/40 border-white/10 hover:bg-white/5 h-9 px-4 rounded-xl font-mono uppercase transition-all hover:border-emerald-500/30"
                        >
                            Next <ChevronRight className="h-3 w-3 ml-2" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

