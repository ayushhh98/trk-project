"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Search, MoreVertical, Shield, Ban, CheckCircle, ChevronLeft, ChevronRight, Wallet, Users, Zap, TrendingUp, Activity, Download } from "lucide-react";
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
import { motion } from "framer-motion";

interface User {
    _id: string;
    email: string;
    walletAddress?: string;
    role: string;
    isBanned: boolean;
    isActive: boolean;
    credits: number; // Practice Balance
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

export function UserTable() {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const socket = useSocket();

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await adminAPI.getUsers({ page, search, limit: 10 });
            if (res.status === 'success') {
                setUsers(res.data.users);
                setTotalPages(res.data.totalPages);
            }
        } catch (error) {
            toast.error("Failed to fetch users");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(fetchUsers, 500);
        return () => clearTimeout(debounce);
    }, [search, page]);

    // Real-time Updates
    useEffect(() => {
        if (!socket) return;

        const handleUserRegistered = (newUser: any) => {
            // Only update if we are on the first page and not searching
            if (page === 1 && !search) {
                setUsers(prev => {
                    const exists = prev.find(u => u._id === newUser._id);
                    if (exists) return prev;
                    return [newUser, ...prev].slice(0, 10);
                });
                toast.info("New User Registered", {
                    description: `${newUser.email || "User"} joined the platform.`
                });
            } else {
                // Just show notification if deep in pages
                toast.info("New User Registered", {
                    description: `${newUser.email || "User"} joined the platform.`
                });
            }
        };

        const handleBalanceUpdate = (data: any) => {
            setUsers(prev => prev.map(user => {
                if (user._id === data.userId || user.walletAddress === data.walletAddress) {
                    return {
                        ...user,
                        realBalances: data.realBalances ? { ...user.realBalances, ...data.realBalances } : user.realBalances,
                        credits: data.practiceBalance !== undefined ? data.practiceBalance : user.credits
                    };
                }
                return user;
            }));
        };

        socket.on("user_registered", handleUserRegistered);
        socket.on("balance_update", handleBalanceUpdate);

        return () => {
            socket.off("user_registered", handleUserRegistered);
            socket.off("balance_update", handleBalanceUpdate);
        };
    }, [socket, page, search]);

    const handleBan = async (id: string, currentStatus: boolean) => {
        try {
            if (currentStatus) {
                await adminAPI.unbanUser(id);
                toast.success("User unbanned");
            } else {
                await adminAPI.banUser(id, "Admin action");
                toast.success("User banned");
            }
            fetchUsers();
        } catch (error) {
            toast.error("Action failed");
        }
    };

    const handleRole = async (id: string, newRole: 'player' | 'admin') => {
        try {
            await adminAPI.updateRole(id, newRole);
            toast.success(`Role updated to ${newRole}`);
            fetchUsers();
        } catch (error) {
            toast.error("Role update failed");
        }
    };

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'tier2': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'tier1': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            default: return 'text-white/30 bg-white/5 border-white/10';
        }
    };

    const getTierLabel = (tier: string) => {
        switch (tier) {
            case 'tier2': return 'Full Node';
            case 'tier1': return 'Basic Node';
            default: return 'Inactive';
        }
    };

    return (
        <Card className="bg-gradient-to-br from-black/60 via-black/40 to-black/60 border border-emerald-500/20 backdrop-blur-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.3)]">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 border-b border-white/5 bg-white/[0.02]">
                <div className="space-y-1">
                    <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Users className="h-5 w-5 text-emerald-500" />
                        User Command Center
                    </h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium pl-8">
                        Global Identity & Asset Governance
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-80 group">
                        <div className="absolute inset-0 bg-emerald-500/5 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-emerald-500 transition-colors" />
                        <Input
                            placeholder="SEARCH_USERS..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-12 bg-black/40 border-white/5 focus:border-emerald-500/50 text-xs font-mono h-11 rounded-xl transition-all placeholder:text-white/20"
                        />
                    </div>
                    <Button variant="outline" size="icon" className="h-11 w-11 border-white/5 bg-black/40 hover:bg-white/5 hover:text-emerald-400 transition-colors rounded-xl">
                        <Download className="h-4 w-4" />
                    </Button>
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
                                                    <span className="text-emerald-500/70 font-mono text-xs">
                                                        {user.credits} Practice
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col gap-1.5">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider w-fit border shadow-sm",
                                                    getTierColor(user.activation?.tier || 'none')
                                                )}>
                                                    {getTierLabel(user.activation?.tier || 'none')}
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
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full animate-pulse",
                                                    user.isBanned ? "bg-red-500" : "bg-emerald-500"
                                                )} />
                                                <span className={cn(
                                                    "text-xs font-bold uppercase tracking-wide",
                                                    user.role === 'admin' ? "text-purple-400" : "text-white/60"
                                                )}>
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
                                                        onClick={() => handleRole(user._id, user.role === 'admin' ? 'player' : 'admin')}
                                                        className="hover:bg-white/5 focus:bg-white/5 cursor-pointer rounded-lg p-2.5 text-xs font-bold uppercase tracking-wide mt-1 transition-colors"
                                                    >
                                                        <Shield className="mr-2 h-4 w-4 text-purple-500" />
                                                        {user.role === 'admin' ? "Demote to Player" : "Promote to Admin"}
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
                            onClick={() => setPage(p => Math.max(1, p - 1))}
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
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="text-xs bg-black/40 border-white/10 hover:bg-white/5 h-9 px-4 rounded-xl font-mono uppercase transition-all hover:border-emerald-500/30"
                        >
                            Next <ChevronRight className="h-3 w-3 ml-2" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card >
    );
}
