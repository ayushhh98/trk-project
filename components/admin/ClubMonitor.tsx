"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Users, TrendingUp, RefreshCw, Eye, Trophy, Zap, Activity, Clock, ArrowUpRight } from "lucide-react";
import { useSocket } from "@/components/providers/Web3Provider";
import { cn } from "@/lib/utils";

interface ClubData {
    rankDistribution: { _id: string; count: number }[];
    usersWithClubIncome: number;
    totalClubIncome: number;
    recentRankUpgrades: { walletAddress: string; clubRank: string; createdAt: string }[];
    tier1Users: number;
    tier2Users: number;
    clubPoolPercent: number;
    note: string;
    topEarners?: { walletAddress: string; clubIncome: number; clubRank: string }[];
    newToday?: number;
    newYesterday?: number;
}

const RANK_COLORS: Record<string, { text: string; bg: string; bar: string; border: string }> = {
    "Rank 0": { text: "text-white/30", bg: "bg-white/5", bar: "bg-white/20", border: "border-white/10" },
    "Rank 1": { text: "text-blue-400", bg: "bg-blue-500/10", bar: "bg-blue-500", border: "border-blue-500/30" },
    "Rank 2": { text: "text-purple-400", bg: "bg-purple-500/10", bar: "bg-purple-500", border: "border-purple-500/30" },
    "Rank 3": { text: "text-amber-400", bg: "bg-amber-500/10", bar: "bg-amber-500", border: "border-amber-500/30" },
    "Rank 4": { text: "text-orange-400", bg: "bg-orange-500/10", bar: "bg-orange-500", border: "border-orange-500/30" },
    "Rank 5": { text: "text-red-400", bg: "bg-red-500/10", bar: "bg-red-500", border: "border-red-500/30" },
};

function relativeTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    try {
        const date = new Date(ts);
        if (isNaN(date.getTime())) return "Just now"; // Fallback for invalid dates
    } catch { return "Just now"; }

    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(ts).toLocaleDateString();
}

export function ClubMonitor() {
    const socket = useSocket();
    const [data, setData] = useState<ClubData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLive, setIsLive] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [newUpgrades, setNewUpgrades] = useState<Set<string>>(new Set());

    // Real-time registration stats
    const [newToday, setNewToday] = useState<number>(0);
    const [liveNewCount, setLiveNewCount] = useState<number>(0);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastLiveRefreshRef = useRef<number>(0);

    const fetchData = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const token = localStorage.getItem("trk_token");
            const res = await fetch("/api/admin/club/overview", { headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json();
            if (json.status === "success") {
                setData(json.data);
                setNewToday(json.data?.newToday || 0);
                if (typeof json.data?.newToday === "number") {
                    setLiveNewCount(0);
                }
                setLastSync(new Date());
            }

        } catch (e) {
            console.error("Failed to fetch club data:", e);
        } finally {
            if (showLoader) setIsLoading(false);
        }
    };

    // Auto-refresh every 20s
    useEffect(() => {
        fetchData(true);
        intervalRef.current = setInterval(() => fetchData(false), 20000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    // Socket: live rank upgrades AND registrations
    useEffect(() => {
        if (!socket) return;
        setIsLive(socket.connected);

        const handleConnect = () => setIsLive(true);
        const handleDisconnect = () => setIsLive(false);

        const maybeRefreshClubData = () => {
            const now = Date.now();
            if (now - lastLiveRefreshRef.current < 8000) return;
            lastLiveRefreshRef.current = now;
            fetchData(false);
        };

        const handleRankUpgrade = (payload: any) => {
            const key = payload.walletAddress + payload.clubRank;
            setNewUpgrades(s => new Set([...s, key]));
            setTimeout(() => setNewUpgrades(s => { const n = new Set(s); n.delete(key); return n; }), 4000);

            setData(prev => {
                if (!prev) return prev;
                const exists = prev.recentRankUpgrades.find(u => u.walletAddress === payload.walletAddress);
                if (exists) return prev;
                return {
                    ...prev,
                    recentRankUpgrades: [
                        { walletAddress: payload.walletAddress, clubRank: payload.clubRank, createdAt: new Date().toISOString() },
                        ...prev.recentRankUpgrades
                    ].slice(0, 20)
                };
            });
            maybeRefreshClubData();
        };

        const handleNewUser = () => {
            setLiveNewCount(c => c + 1);
        };

        const handleStatsUpdate = (payload: any) => {
            // Update newToday from the global stats broadcast
            if (payload?.practice?.newToday !== undefined) {
                setNewToday(payload.practice.newToday);
                // We can reset live count if we trust the backend info is fresh, 
                // but usually we keep it cumulative until next hard fetch or if logic dictates.
                // For smoother UI, we'll let the next fetch or this update sync it.
                // If backend sends newToday, it includes the 'live' ones up to that second.
                setLiveNewCount(0);
            }

            if (payload?.club) {
                setData(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        usersWithClubIncome: payload.club.usersWithIncome ?? prev.usersWithClubIncome,
                        totalClubIncome: payload.club.totalDistributed ?? prev.totalClubIncome,
                        tier2Users: payload.club.tier2Eligible ?? prev.tier2Users
                    };
                });
            }
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("rank_upgrade", handleRankUpgrade);
        socket.on("club_rank_updated", handleRankUpgrade);
        socket.on("club_income_distributed", maybeRefreshClubData);
        socket.on("user_registered", handleNewUser);
        socket.on("admin:user_registered", handleNewUser);
        socket.on("admin:user_updated", maybeRefreshClubData);
        socket.on("transaction_created", maybeRefreshClubData);
        socket.on("admin:stats_update", handleStatsUpdate);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("rank_upgrade", handleRankUpgrade);
            socket.off("club_rank_updated", handleRankUpgrade);
            socket.off("club_income_distributed", maybeRefreshClubData);
            socket.off("user_registered", handleNewUser);
            socket.off("admin:user_registered", handleNewUser);
            socket.off("admin:user_updated", maybeRefreshClubData);
            socket.off("transaction_created", maybeRefreshClubData);
            socket.off("admin:stats_update", handleStatsUpdate);
            setIsLive(false);
        };
    }, [socket]);

    const totalRankUsers = (data?.rankDistribution || []).reduce((s, r) => s + r.count, 0);
    const totalNewToday = newToday + liveNewCount;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-white/10 flex items-center justify-center shadow-lg shadow-amber-500/10">
                        <Crown className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-white tracking-tight">Club Monitor</h2>
                            {isLive && (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 rounded-full shadow-[0_0_10px_-3px_rgba(245,158,11,0.3)]">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                    </span>
                                    LIVE
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-white/40 mt-1 flex items-center gap-2">
                            <Eye className="h-3 w-3" />
                            Observer Mode · Automatic Rank Upgrades
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {lastSync && (
                        <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
                            Synced {relativeTime(lastSync.toISOString())}
                        </span>
                    )}
                    <Button variant="outline" size="icon" onClick={() => fetchData(true)} className="h-9 w-9 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all">
                        <RefreshCw className={cn("h-4 w-4 text-white/70", isLoading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Compliance Banner */}
            <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-start gap-3 relative z-10">
                    <Activity className="h-5 w-5 text-amber-400 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-amber-200">System Autonomy Notice</p>
                        <p className="text-xs text-amber-400/80 leading-relaxed max-w-3xl">
                            Club ranks and income distributions are strictly governed by smart contract logic and team performance metrics.
                            Manual overrides are disabled to ensure fair play and transparency.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    {
                        label: "Club Pool %",
                        value: `${data?.clubPoolPercent || 8}%`,
                        sub: "of daily turnover",
                        color: "text-amber-400",
                        icon: Zap,
                        bg: "from-amber-500/10 to-transparent"
                    },
                    {
                        label: "Total Distributed",
                        value: `$${(data?.totalClubIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        sub: "lifetime club income",
                        color: "text-emerald-400",
                        icon: TrendingUp,
                        bg: "from-emerald-500/10 to-transparent"
                    },
                    {
                        label: "Qualified Members",
                        value: data?.usersWithClubIncome || 0,
                        sub: "earning income",
                        color: "text-blue-400",
                        icon: Users,
                        bg: "from-blue-500/10 to-transparent"
                    },
                    {
                        label: "Tier 2 Eligible",
                        value: data?.tier2Users || 0,
                        sub: "potential members",
                        color: "text-purple-400",
                        icon: Crown,
                        bg: "from-purple-500/10 to-transparent"
                    },
                    {
                        label: "New Today",
                        value: totalNewToday.toLocaleString(),
                        sub: "platform registrations",
                        color: "text-white",
                        icon: ArrowUpRight,
                        bg: "from-white/10 to-transparent",
                        isLive: true
                    },
                ].map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="h-full">
                        <Card className="h-full bg-black/40 backdrop-blur-sm border-white/5 hover:border-white/10 transition-all duration-300 group overflow-hidden">
                            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-100 transition-opacity", stat.bg)} />
                            <CardContent className="relative p-5 flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{stat.label}</p>
                                        <div className={cn("p-1.5 rounded-lg bg-white/5", stat.color)}>
                                            <stat.icon className="h-3.5 w-3.5" />
                                        </div>
                                    </div>
                                    <p className={cn("text-2xl font-black tracking-tight", stat.color)}>
                                        {stat.value}
                                        {stat.isLive && liveNewCount > 0 && <span className="ml-1 text-xs text-emerald-400 animate-pulse">●</span>}
                                    </p>
                                </div>
                                <p className="text-[10px] text-white/30 font-medium uppercase tracking-wide mt-2">{stat.sub}</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Rank Distribution */}
                <Card className="bg-black/40 backdrop-blur-sm border-white/5 lg:col-span-1">
                    <CardContent className="p-6 space-y-5">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" /> Rank Distribution
                        </h3>
                        {isLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(data?.rankDistribution || []).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-white/20">
                                        <Users className="h-8 w-8 mb-2 opacity-20" />
                                        <p className="text-xs">No rank data available</p>
                                    </div>
                                ) : (
                                    data?.rankDistribution.map((rank, i) => {
                                        const pct = totalRankUsers > 0 ? (rank.count / totalRankUsers) * 100 : 0;
                                        const cfg = RANK_COLORS[rank._id] || RANK_COLORS["Rank 0"];
                                        return (
                                            <div key={i} className="space-y-1.5 group">
                                                <div className="flex items-center justify-between">
                                                    <span className={cn("text-[11px] font-bold", cfg.text)}>{rank._id}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-white/40 font-mono">{rank.count}</span>
                                                        <span className="text-[10px] font-bold text-white/20">{pct.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ delay: i * 0.05, duration: 0.7 }}
                                                        className={cn("h-full rounded-full opacity-60 group-hover:opacity-100 transition-opacity", cfg.bar)}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Rank Upgrades */}
                <Card className="bg-black/40 backdrop-blur-sm border-white/5 lg:col-span-1">
                    <CardContent className="p-6 space-y-5">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5" /> Recent Upgrades
                        </h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            <AnimatePresence initial={false}>
                                {(data?.recentRankUpgrades || []).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-white/20">
                                        <Clock className="h-8 w-8 mb-2 opacity-20" />
                                        <p className="text-xs">No upgrades recently</p>
                                    </div>
                                ) : (
                                    data?.recentRankUpgrades.map((u, i) => {
                                        const key = u.walletAddress + u.clubRank;
                                        const isNew = newUpgrades.has(key);
                                        const cfg = RANK_COLORS[u.clubRank] || RANK_COLORS["Rank 0"];
                                        return (
                                            <motion.div
                                                key={key + i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{
                                                    opacity: 1,
                                                    x: 0,
                                                    backgroundColor: isNew ? "rgba(255,255,255,0.05)" : "transparent"
                                                }}
                                                className={cn(
                                                    "flex items-center justify-between p-2.5 rounded-lg border border-transparent transition-all",
                                                    isNew && "border-white/10"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-black border", cfg.bg, cfg.text, cfg.border)}>
                                                        {u.walletAddress?.[2]?.toUpperCase() || "?"}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-mono text-[11px] font-medium text-white/70">
                                                            {u.walletAddress ? `${u.walletAddress.slice(0, 6)}...${u.walletAddress.slice(-4)}` : "Unknown"}
                                                        </span>
                                                        <span className="text-[9px] text-white/30">{u.createdAt ? relativeTime(u.createdAt) : "Just now"}</span>
                                                    </div>
                                                </div>
                                                <div className={cn("text-[10px] font-black px-2 py-1 rounded bg-white/5", cfg.text)}>
                                                    {u.clubRank}
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Earners */}
                <Card className="bg-black/40 backdrop-blur-sm border-white/5 lg:col-span-1">
                    <CardContent className="p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                                <Trophy className="h-3.5 w-3.5 text-amber-400" /> Top Earners
                            </h3>
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                CLB Income
                            </span>
                        </div>

                        <div className="space-y-3">
                            {(data?.topEarners || []).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-white/20">
                                    <Trophy className="h-8 w-8 mb-2 opacity-20" />
                                    <p className="text-xs">No earner data yet</p>
                                </div>
                            ) : (
                                data?.topEarners?.map((e, i) => {
                                    const cfg = RANK_COLORS[e.clubRank] || RANK_COLORS["Rank 0"];
                                    return (
                                        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                                            className="group flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    "h-5 w-5 flex items-center justify-center text-[10px] font-bold rounded",
                                                    i === 0 ? "bg-amber-500 text-black" :
                                                        i === 1 ? "bg-white/20 text-white" :
                                                            i === 2 ? "bg-orange-700/50 text-orange-200" : "text-white/20"
                                                )}>
                                                    #{i + 1}
                                                </span>
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-[11px] text-white/70 group-hover:text-white transition-colors">
                                                        {e.walletAddress ? `${e.walletAddress.slice(0, 6)}...${e.walletAddress.slice(-4)}` : "—"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <span className="text-[11px] font-black text-emerald-400">${e.clubIncome.toFixed(2)}</span>
                                                <span className={cn("text-[9px] font-bold", cfg.text)}>{e.clubRank}</span>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
