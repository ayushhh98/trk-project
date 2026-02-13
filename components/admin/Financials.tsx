"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
    TrendingUp,
    Wallet,
    Users,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Target,
    Zap,
    Crown,
    Gift,
    ShieldCheck
} from "lucide-react";
import { useReadContract } from "wagmi";
import { TRKGameABI } from "@/config/abis"; // Updated ABI
import { CONTRACTS } from "@/config/contracts"; // Contract Addresses
import { formatUnits } from "viem";
import { cn } from "@/lib/utils";
import { adminAPI } from "@/lib/api";
import { useSocket } from "@/components/providers/Web3Provider";

interface PoolData {
    gamePool: number;
    clubPool: number;
    luckyDraw: number;
    protectionPool: number;
}

interface UserStats {
    totalUsers: number;
    totalVolume: number;
    totalWithdrawn: number;
}

interface AnalyticsData {
    totalUsers: number;
    totalGames: number;
    totalWagered: number;
    totalPayout: number;
    houseEdge: number;
}

interface DbStats {
    users: number;
    games: number;
    jackpots: number;
    audits: number;
    dbSize: number;
    collections: number;
}

export function Financials() {
    const socket = useSocket();
    const [pools, setPools] = useState<PoolData>({ gamePool: 0, clubPool: 0, luckyDraw: 0, protectionPool: 0 });
    const [stats, setStats] = useState<UserStats>({ totalUsers: 0, totalVolume: 0, totalWithdrawn: 0 });
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [dbStats, setDbStats] = useState<DbStats | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // Fetch Pools (Live from Contract)
    const { data: poolsData, refetch: refetchPools } = useReadContract({
        address: CONTRACTS[56].GAME as `0x${string}`, // Defaulting to BSC Mainnet ID 56 for now or derive from chainId
        abi: TRKGameABI,
        functionName: 'getPools',
        query: { refetchInterval: 5000 }
    });

    // Fetch Global Stats
    const { data: globalStatsData, refetch: refetchStats } = useReadContract({
        address: CONTRACTS[56].GAME as `0x${string}`,
        abi: TRKGameABI,
        functionName: 'getUserStats',
        query: { refetchInterval: 10000 }
    });

    useEffect(() => {
        if (poolsData && Array.isArray(poolsData)) {
            setPools({
                gamePool: Number(formatUnits(poolsData[0], 18)),
                clubPool: Number(formatUnits(poolsData[1], 18)),
                luckyDraw: Number(formatUnits(poolsData[2], 18)),
                protectionPool: Number(formatUnits(poolsData[3], 18)),
            });
        }
    }, [poolsData]);

    useEffect(() => {
        if (globalStatsData && Array.isArray(globalStatsData)) {
            setStats({
                totalUsers: Number(globalStatsData[0]),
                totalVolume: Number(formatUnits(globalStatsData[2], 18)),
                totalWithdrawn: Number(formatUnits(globalStatsData[3], 18)),
            });
        }
    }, [globalStatsData]);

    const formatBytes = useMemo(() => {
        return (bytes: number) => {
            if (!bytes || bytes <= 0) return "0 B";
            const units = ["B", "KB", "MB", "GB", "TB"];
            let value = bytes;
            let index = 0;
            while (value >= 1024 && index < units.length - 1) {
                value /= 1024;
                index += 1;
            }
            const precision = value < 10 ? 2 : 1;
            return `${value.toFixed(precision)} ${units[index]}`;
        };
    }, []);

    const fetchLiveStats = async () => {
        try {
            const [analyticsRes, dbRes] = await Promise.all([
                adminAPI.getAnalytics(),
                adminAPI.getDBStats()
            ]);
            if (analyticsRes.status === "success") {
                setAnalytics(analyticsRes.data);
            }
            if (dbRes.status === "success") {
                setDbStats(dbRes.data);
            }
            setLastSync(new Date());
        } catch (error) {
            console.error("Failed to fetch live admin stats:", error);
        }
    };

    useEffect(() => {
        fetchLiveStats();
        const interval = setInterval(fetchLiveStats, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!socket) return;
        const handleStatsUpdate = (payload: any) => {
            if (!payload) return;
            setDbStats(prev => ({
                users: payload.users ?? prev?.users ?? 0,
                games: payload.games ?? prev?.games ?? 0,
                jackpots: payload.jackpots ?? prev?.jackpots ?? 0,
                audits: payload.audits ?? prev?.audits ?? 0,
                dbSize: payload.dbSize ?? prev?.dbSize ?? 0,
                collections: prev?.collections ?? 0
            }));
            setLastSync(new Date());
        };

        socket.on("admin:stats_update", handleStatsUpdate);
        socket.on("admin_stats_update", handleStatsUpdate);
        return () => {
            socket.off("admin:stats_update", handleStatsUpdate);
            socket.off("admin_stats_update", handleStatsUpdate);
        };
    }, [socket]);

    // Derived Metrics
    const totalAllocated = pools.gamePool + pools.clubPool + pools.luckyDraw + pools.protectionPool;
    const treasuryFees = stats.totalVolume * 0.12; // 12% Est.
    const referralPayouts = stats.totalVolume * 0.15; // 15% Est.
    const netEcosystemHealth = stats.totalVolume - stats.totalWithdrawn;

    const liveCards = [
        {
            title: "Total Users",
            value: analytics?.totalUsers?.toLocaleString() || "0",
            icon: Users,
            color: "text-blue-400",
            bg: "bg-blue-400/10",
            sub: "All accounts"
        },
        {
            title: "Total Games",
            value: analytics?.totalGames?.toLocaleString() || "0",
            icon: Activity,
            color: "text-purple-400",
            bg: "bg-purple-400/10",
            sub: "All-time rounds"
        },
        {
            title: "Total Wagered",
            value: `$${(analytics?.totalWagered || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            icon: TrendingUp,
            color: "text-emerald-400",
            bg: "bg-emerald-400/10",
            sub: "Lifetime volume"
        },
        {
            title: "Total Payout",
            value: `$${(analytics?.totalPayout || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            icon: ArrowUpRight,
            color: "text-amber-400",
            bg: "bg-amber-400/10",
            sub: "Wins paid out"
        },
        {
            title: "House Edge",
            value: `$${(analytics?.houseEdge || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            icon: ArrowDownRight,
            color: "text-red-400",
            bg: "bg-red-400/10",
            sub: "Wagered - payouts"
        },
        {
            title: "DB Size",
            value: formatBytes(dbStats?.dbSize || 0),
            icon: Wallet,
            color: "text-cyan-400",
            bg: "bg-cyan-400/10",
            sub: `${dbStats?.collections || 0} collections`
        },
        {
            title: "Jackpot Rounds",
            value: dbStats?.jackpots?.toLocaleString() || "0",
            icon: Gift,
            color: "text-pink-400",
            bg: "bg-pink-400/10",
            sub: "Jackpot history"
        },
        {
            title: "Audit Logs",
            value: dbStats?.audits?.toLocaleString() || "0",
            icon: ShieldCheck,
            color: "text-slate-300",
            bg: "bg-slate-300/10",
            sub: "Security events"
        }
    ];

    const poolCards = [
        {
            title: "Game Payout Pool",
            value: pools.gamePool,
            percent: 56, // Base alloc
            icon: Target,
            color: "text-blue-400",
            bg: "bg-blue-400/10",
            desc: "Liquidity for winner payouts"
        },
        {
            title: "Club Bonus Pool",
            value: pools.clubPool,
            percent: 5,
            icon: Crown,
            color: "text-purple-400",
            bg: "bg-purple-400/10",
            desc: "Accumulated for high-rank rewards"
        },
        {
            title: "Lucky Draw Pool",
            value: pools.luckyDraw,
            percent: 2,
            icon: Gift,
            color: "text-amber-400",
            bg: "bg-amber-400/10",
            desc: "Jackpot prize accumulation"
        },
        {
            title: "Protection Pool",
            value: pools.protectionPool,
            percent: 10,
            icon: ShieldCheck,
            color: "text-emerald-400",
            bg: "bg-emerald-400/10",
            desc: "Cashback & Referrer ROI reserve"
        }
    ];

    return (
        <div className="space-y-8">
            {/* Live Platform Metrics */}
            <div className="space-y-4">
                <div className="text-xs font-black uppercase tracking-[0.3em] text-white/20 px-2 flex items-center gap-3">
                    <Activity className="h-4 w-4" /> Live Project Metrics
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-emerald-400/80 flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {lastSync ? `Synced ${lastSync.toLocaleTimeString()}` : "Syncing..."}
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {liveCards.map((stat, index) => (
                        <Card key={index} className="group bg-black/40 border-white/5 hover:border-white/10 transition-all duration-300 rounded-2xl">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white/40">{stat.title}</CardTitle>
                                <div className={cn("p-2 rounded-lg border border-white/5", stat.bg)}>
                                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black font-mono text-white tracking-tighter">
                                    {stat.value}
                                </div>
                                <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mt-2">
                                    {stat.sub}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Ecosystem Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-[#0a0a0a]/50 border-white/5 backdrop-blur-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Volume</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black font-mono text-white tracking-tighter">
                            ${stats.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-emerald-400">
                            <Activity className="h-3 w-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Lifetime Flow</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#0a0a0a]/50 border-white/5 backdrop-blur-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/40">Contract TvL</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black font-mono text-white tracking-tighter">
                            ${totalAllocated.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-blue-400">
                            <Wallet className="h-3 w-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Total Value Locked</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#0a0a0a]/50 border-white/5 backdrop-blur-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/40">Est. Treasury Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black font-mono text-white tracking-tighter">
                            ${treasuryFees.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-purple-400">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">12% Fee Generation</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Live Pools Grid */}
            <div className="space-y-4">
                <div className="text-xs font-black uppercase tracking-[0.3em] text-white/20 px-2 flex items-center gap-3">
                    <Zap className="h-4 w-4" /> Live Contract Pools
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {poolCards.map((pool, idx) => (
                        <Card key={idx} className="group bg-black/40 border-white/5 hover:border-white/10 transition-all duration-300 relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${pool.bg.replace('/10', '')}`} />
                            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white/50">{pool.title}</CardTitle>
                                <pool.icon className={cn("h-4 w-4 opacity-50", pool.color)} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black font-mono text-white tracking-tighter">
                                    ${pool.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="mt-3 space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/30">
                                        <span>Allocation</span>
                                        <span>{pool.percent}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full", pool.bg.replace('/10', ''))}
                                            style={{ width: `${pool.percent}%` }}
                                        />
                                    </div>
                                    <p className="text-[9px] text-white/20 pt-1">{pool.desc}</p>
                                </div>
                            </CardContent>

                            {/* Glow Effect */}
                            <div className={cn(
                                "absolute -bottom-10 -right-10 w-24 h-24 rounded-full blur-[50px] opacity-0 group-hover:opacity-20 transition-all duration-700 pointer-events-none",
                                pool.bg.replace('/10', '')
                            )} />
                        </Card>
                    ))}
                </div>
            </div>

            {/* Revenue Distribution Visualizer (Static Representation of Logic) */}
            <Card className="bg-black/40 border-white/5 backdrop-blur-sm p-6">
                <div className="text-xs font-black uppercase tracking-[0.3em] text-white/20 mb-6 flex items-center gap-3">
                    <PieChart className="h-4 w-4" /> Revenue Logic Matrix
                </div>

                <div className="relative pt-4 pb-8">
                    {/* Flow Bar */}
                    <div className="h-12 w-full bg-white/5 rounded-full flex overflow-hidden relative">
                        {/* Game Pool 56% */}
                        <div className="h-full bg-blue-500/20 flex items-center justify-center border-r border-black/50 group hover:bg-blue-500/30 transition-all relative" style={{ width: '56%' }}>
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 z-10">Game Pool (56%)</span>
                        </div>
                        {/* Referral 15% */}
                        <div className="h-full bg-green-500/20 flex items-center justify-center border-r border-black/50 hover:bg-green-500/30 transition-all relative" style={{ width: '15%' }}>
                            <span className="text-[10px] font-black uppercase tracking-widest text-green-400 z-10">Refs (15%)</span>
                        </div>
                        {/* Treasury 12% */}
                        <div className="h-full bg-purple-500/20 flex items-center justify-center border-r border-black/50 hover:bg-purple-500/30 transition-all relative" style={{ width: '12%' }}>
                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 z-10">Treasury (12%)</span>
                        </div>
                        {/* Protection 10% */}
                        <div className="h-full bg-emerald-500/20 flex items-center justify-center border-r border-black/50 hover:bg-emerald-500/30 transition-all relative" style={{ width: '10%' }}>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 z-10">Prot. (10%)</span>
                        </div>
                        {/* Club 5% */}
                        <div className="h-full bg-pink-500/20 flex items-center justify-center border-r border-black/50 hover:bg-pink-500/30 transition-all relative" style={{ width: '5%' }}>
                            <span className="text-[10px] font-black uppercase tracking-widest text-pink-400 z-10">5%</span>
                        </div>
                        {/* Lucky 2% */}
                        <div className="h-full bg-amber-500/20 flex items-center justify-center hover:bg-amber-500/30 transition-all relative" style={{ width: '2%' }}>
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 z-10">2%</span>
                        </div>
                    </div>

                    <div className="flex justify-between mt-2 text-[9px] text-white/20 uppercase font-bold tracking-widest">
                        <span>Direct Payout Liquidity</span>
                        <span>Affiliate & System Growth</span>
                    </div>
                </div>
            </Card>

        </div>
    );
}
