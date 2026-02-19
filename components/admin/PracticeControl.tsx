"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, RefreshCw, AlertCircle, TrendingUp, Users, Clock, Zap, ArrowRight, Activity, ShieldCheck } from "lucide-react";
import { useSocket } from "@/components/providers/Web3Provider";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api";

interface PracticeStats {
    totalPracticeUsers: number;
    activePracticeUsers: number;
    expiredPracticeUsers: number;
    convertedToReal: number;
    conversionRate: string;
    maxPracticeUsers: number;
    practiceBonus: number;
    practiceExpiryDays: number;
    capacityUsed: string;
    totalUsers: number;
    newToday?: number;
    newYesterday?: number;
}

function relativeTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(ts).toLocaleDateString();
}

export function PracticeControl() {
    const socket = useSocket();
    const [stats, setStats] = useState<PracticeStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLive, setIsLive] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [liveNewCount, setLiveNewCount] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("trk_token");
            const res = await fetch(`${getApiUrl()}/admin/practice/stats`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.status === "success") {
                setStats(data.data);
                // Reset live count on fresh fetch to avoid double counting
                setLiveNewCount(0);
                setLastSync(new Date());
            }
        } catch (e) {
            console.error("Failed to fetch practice stats:", e);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-refresh every 30s
    useEffect(() => {
        fetchStats();
        intervalRef.current = setInterval(fetchStats, 30000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    // Socket: live new registrations
    useEffect(() => {
        if (!socket) return;
        setIsLive(true);

        const handleNewUser = () => {
            setLiveNewCount(c => c + 1);
        };

        const handleStatsUpdate = (payload: any) => {
            if (!payload?.practice) return;
            setStats(prev => {
                const base = prev || {
                    totalPracticeUsers: 0,
                    activePracticeUsers: 0,
                    expiredPracticeUsers: 0,
                    convertedToReal: 0,
                    conversionRate: "0",
                    maxPracticeUsers: 100000,
                    practiceBonus: 100,
                    practiceExpiryDays: 30,
                    capacityUsed: "0",
                    totalUsers: 0,
                    newToday: 0,
                    newYesterday: 0
                };
                return {
                    ...base,
                    totalPracticeUsers: payload.practice.total,
                    activePracticeUsers: payload.practice.active,
                    expiredPracticeUsers: payload.practice.total - payload.practice.active,
                    convertedToReal: payload.practice.converted,
                    newToday: payload.practice.newToday,
                    newYesterday: payload.practice.newYesterday,
                    conversionRate: payload.practice.total > 0 ? (payload.practice.converted / payload.practice.total * 100).toFixed(1) : "0",
                    capacityUsed: (payload.practice.total / base.maxPracticeUsers * 100).toFixed(1)
                };
            });
            setLastSync(new Date());
        };

        socket.on("user_registered", handleNewUser);
        socket.on("admin:stats_update", handleStatsUpdate);
        return () => {
            socket.off("user_registered", handleNewUser);
            socket.off("admin:stats_update", handleStatsUpdate);
            setIsLive(false);
        };
    }, [socket]);

    const capacityPct = parseFloat(stats?.capacityUsed || "0");
    const conversionRate = parseFloat(stats?.conversionRate || "0");

    // Calculate total new today: base + live updates
    const totalNewToday = (stats?.newToday || 0) + liveNewCount;
    const todayVsYesterday = stats?.newYesterday
        ? totalNewToday - stats.newYesterday
        : null;

    const funnelItems = [
        { label: "Total Practice Users", value: stats?.totalPracticeUsers || 0, color: "bg-blue-500", pct: 100 },
        { label: "Active (within expiry)", value: stats?.activePracticeUsers || 0, color: "bg-emerald-500", pct: stats?.totalPracticeUsers ? (stats.activePracticeUsers / stats.totalPracticeUsers) * 100 : 0 },
        { label: "Expired", value: stats?.expiredPracticeUsers || 0, color: "bg-red-500", pct: stats?.totalPracticeUsers ? (stats.expiredPracticeUsers / stats.totalPracticeUsers) * 100 : 0 },
        { label: "Converted to Real", value: stats?.convertedToReal || 0, color: "bg-amber-500", pct: stats?.totalPracticeUsers ? (stats.convertedToReal / stats.totalPracticeUsers) * 100 : 0 },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center shadow-lg shadow-purple-500/10">
                        <Gamepad2 className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-white tracking-tight">Practice System</h2>
                            {isLive && (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 rounded-full shadow-[0_0_10px_-3px_rgba(16,185,129,0.3)]">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    LIVE
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-white/40 mt-1 flex items-center gap-2">
                            <ShieldCheck className="h-3 w-3" />
                            Automated System · No manual intervention
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {lastSync && (
                        <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
                            Synced {relativeTime(lastSync.toISOString())}
                        </span>
                    )}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchStats}
                        className="h-9 w-9 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <RefreshCw className={cn("h-4 w-4 text-white/70", isLoading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Legal / Compliance Notice */}
            <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <AlertCircle className="h-24 w-24 text-red-500 transform rotate-12 translate-x-4 -translate-y-4" />
                </div>
                <div className="relative flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-red-200">Regulatory Compliance Notice</p>
                        <p className="text-xs text-red-400/80 leading-relaxed max-w-2xl">
                            Manual crediting of practice balances is strictly prohibited to maintain system integrity.
                            All practice credits are automatically assigned via the registration smart contract logic.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: "Practice Bonus",
                        value: `$${stats?.practiceBonus || 100}`,
                        sub: "per new user",
                        icon: Gamepad2,
                        color: "text-purple-400",
                        bg: "from-purple-500/10 to-transparent"
                    },
                    {
                        label: "Max Capacity",
                        value: (stats?.maxPracticeUsers || 100000).toLocaleString(),
                        sub: "total slots",
                        icon: Users,
                        color: "text-blue-400",
                        bg: "from-blue-500/10 to-transparent"
                    },
                    {
                        label: "Expiry Period",
                        value: `${stats?.practiceExpiryDays || 30}d`,
                        sub: "after registration",
                        icon: Clock,
                        color: "text-amber-400",
                        bg: "from-amber-500/10 to-transparent"
                    },
                    {
                        label: "New Today",
                        value: totalNewToday.toLocaleString(),
                        sub: todayVsYesterday !== null
                            ? `${todayVsYesterday >= 0 ? "+" : ""}${todayVsYesterday} vs yesterday`
                            : "New Registrations",
                        icon: Zap,
                        color: "text-emerald-400",
                        bg: "from-emerald-500/20 to-emerald-500/5",
                        border: "border-emerald-500/20"
                    },
                ].map((item, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="h-full"
                    >
                        <Card className={cn(
                            "h-full bg-black/40 backdrop-blur-sm border-white/5 overflow-hidden transition-all duration-300 hover:border-white/10 group",
                            item.border
                        )}>
                            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-100 transition-opacity", item.bg)} />
                            <CardContent className="relative p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{item.label}</p>
                                    <div className={cn("p-1.5 rounded-lg bg-white/5", item.color)}>
                                        <item.icon className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <AnimatePresence mode="wait">
                                        <motion.p
                                            key={item.value}
                                            initial={{ opacity: 0.5, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn("text-2xl font-black tracking-tight", item.color)}
                                        >
                                            {item.value}
                                        </motion.p>
                                    </AnimatePresence>
                                    <p className="text-[10px] text-white/30 font-medium uppercase tracking-wide">{item.sub}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Capacity Analysis */}
                <Card className="bg-black/40 backdrop-blur-sm border-white/5">
                    <CardContent className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                                <Activity className="h-3.5 w-3.5" /> Capacity Usage
                            </h3>
                            <span className={cn(
                                "text-xs font-black px-2 py-0.5 rounded border",
                                capacityPct > 80 ? "text-red-400 border-red-500/30 bg-red-500/10" :
                                    capacityPct > 60 ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                                        "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                            )}>
                                {capacityPct.toFixed(1)}%
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="relative pt-2">
                                <div className="flex justify-between text-[10px] font-medium text-white/30 mb-2">
                                    <span>{(stats?.totalPracticeUsers || 0).toLocaleString()} Active</span>
                                    <span>{(stats?.maxPracticeUsers || 100000).toLocaleString()} Max</span>
                                </div>
                                <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, capacityPct)}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={cn(
                                            "h-full rounded-full transition-colors relative",
                                            capacityPct > 80 ? "bg-gradient-to-r from-red-600 to-red-400" :
                                                capacityPct > 60 ? "bg-gradient-to-r from-amber-600 to-amber-400" :
                                                    "bg-gradient-to-r from-emerald-600 to-emerald-400"
                                        )}
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                                    </motion.div>
                                </div>
                            </div>

                            <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Conversion Performance</span>
                                    <span className="text-sm font-black text-white">{conversionRate.toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, conversionRate * 5)}%` }} // Scale for visibility
                                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                                    />
                                </div>
                                <p className="text-[9px] text-white/20 mt-2">
                                    Percentage of practice users who upgraded to Real Money status.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Conversion Funnel */}
                <Card className="bg-black/40 backdrop-blur-sm border-white/5">
                    <CardContent className="p-6 space-y-5">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5" /> User Funnel
                        </h3>
                        <div className="space-y-4">
                            {funnelItems.map((item, i) => (
                                <div key={i} className="relative group">
                                    <div className="flex items-center justify-between mb-1.5 relative z-10">
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]", item.color.replace('bg-', 'bg-'))} />
                                            <span className="text-[11px] font-medium text-white/60 group-hover:text-white transition-colors">{item.label}</span>
                                        </div>
                                        <span className="text-xs font-bold text-white tabular-nums">{item.value.toLocaleString()}</span>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.pct}%` }}
                                            transition={{ delay: i * 0.1, duration: 0.8 }}
                                            className={cn("h-full rounded-full opacity-60 group-hover:opacity-100 transition-opacity", item.color)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 mt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-white/30">
                            <span className="flex items-center gap-1.5 hover:text-white/50 transition-colors cursor-help">
                                <AlertCircle className="h-3 w-3" />
                                Data updates automatically
                            </span>
                            <span className="flex items-center gap-1.5 text-white/20">
                                System Config <ArrowRight className="h-3 w-3" />
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
