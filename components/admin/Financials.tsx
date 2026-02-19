"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    Activity,
    ArrowDownRight,
    ArrowUpRight,
    Database,
    Gift,
    RefreshCw,
    ShieldCheck,
    TrendingUp,
    Users,
    Wallet,
    Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminAPI } from "@/lib/api";
import { useSocket } from "@/components/providers/Web3Provider";
import { toast } from "sonner";
import { AdminCharts } from "./AdminCharts";

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

interface FinancialSummary {
    deposits: number;
    withdrawals: number;
    referrals: number;
    cashbacks: number;
    total: number;
}

interface FinancialTransaction {
    id: string;
    type: string;
    walletAddress: string;
    amount: number;
    status: string;
    timestamp: string;
    txHash: string | null;
    note: string;
}

interface SocketStatsPayload {
    users?: number;
    games?: number;
    jackpots?: number;
    audits?: number;
    dbSize?: number;
}

interface TurnoverPayload {
    totalTurnover?: number;
}

const ZERO_ANALYTICS: AnalyticsData = {
    totalUsers: 0,
    totalGames: 0,
    totalWagered: 0,
    totalPayout: 0,
    houseEdge: 0,
};

const ZERO_DB_STATS: DbStats = {
    users: 0,
    games: 0,
    jackpots: 0,
    audits: 0,
    dbSize: 0,
    collections: 0,
};

const ZERO_SUMMARY: FinancialSummary = {
    deposits: 0,
    withdrawals: 0,
    referrals: 0,
    cashbacks: 0,
    total: 0,
};

const TYPE_STYLES: Record<string, string> = {
    deposit: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
    withdrawal: "text-red-300 border-red-500/30 bg-red-500/10",
    referral: "text-blue-300 border-blue-500/30 bg-blue-500/10",
    cashback: "text-purple-300 border-purple-500/30 bg-purple-500/10",
    lucky_draw: "text-amber-300 border-amber-500/30 bg-amber-500/10",
};

const toNumber = (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value: number) =>
    `$${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const formatBytes = (bytes: number) => {
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

const shortWallet = (wallet: string) =>
    wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "-";

const relativeTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    if (Number.isNaN(diff) || diff < 0) return "-";
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
};

export function Financials() {
    const socket = useSocket();
    const [analytics, setAnalytics] = useState<AnalyticsData>(ZERO_ANALYTICS);
    const [dbStats, setDbStats] = useState<DbStats>(ZERO_DB_STATS);
    const [summary, setSummary] = useState<FinancialSummary>(ZERO_SUMMARY);
    const [recentTransactions, setRecentTransactions] = useState<FinancialTransaction[]>([]);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [isLive, setIsLive] = useState(false);
    const [eventsPerMin, setEventsPerMin] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const eventCountRef = useRef(0);
    const epmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchFinancials = useCallback(async (showSpinner = false) => {
        if (showSpinner) setIsRefreshing(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("trk_token") : null;
            const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

            const [analyticsRes, dbRes, txRes] = await Promise.all([
                adminAPI.getAnalytics(),
                adminAPI.getDBStats(),
                fetch("/api/admin/transactions?page=1&limit=8&dateRange=30d", {
                    headers,
                }),
            ]);

            if (analyticsRes.status === "success") {
                setAnalytics({
                    totalUsers: toNumber(analyticsRes.data?.totalUsers),
                    totalGames: toNumber(analyticsRes.data?.totalGames),
                    totalWagered: toNumber(analyticsRes.data?.totalWagered),
                    totalPayout: toNumber(analyticsRes.data?.totalPayout),
                    houseEdge: toNumber(analyticsRes.data?.houseEdge),
                });
            }

            if (dbRes.status === "success") {
                setDbStats({
                    users: toNumber(dbRes.data?.users),
                    games: toNumber(dbRes.data?.games),
                    jackpots: toNumber(dbRes.data?.jackpots),
                    audits: toNumber(dbRes.data?.audits),
                    dbSize: toNumber(dbRes.data?.dbSize),
                    collections: toNumber(dbRes.data?.collections),
                });
            }

            if (txRes.ok) {
                const txPayload = await txRes.json();
                if (txPayload?.status === "success") {
                    const txSummary = txPayload.data?.summary || {};
                    setSummary({
                        deposits: toNumber(txSummary.deposits),
                        withdrawals: toNumber(txSummary.withdrawals),
                        referrals: toNumber(txSummary.referrals),
                        cashbacks: toNumber(txSummary.cashbacks),
                        total: toNumber(txSummary.total),
                    });

                    const transactions = Array.isArray(txPayload.data?.transactions)
                        ? txPayload.data.transactions
                        : [];
                    setRecentTransactions(
                        transactions.map((tx: any) => ({
                            id: String(tx.id || tx._id || `${tx.txHash || ""}-${tx.timestamp || Date.now()}`),
                            type: String(tx.type || "deposit"),
                            walletAddress: String(tx.walletAddress || ""),
                            amount: toNumber(tx.amount),
                            status: String(tx.status || "confirmed"),
                            timestamp: String(tx.timestamp || new Date().toISOString()),
                            txHash: tx.txHash ? String(tx.txHash) : null,
                            note: String(tx.note || ""),
                        }))
                    );
                }
            }

            setLastSync(new Date());
        } catch (error) {
            console.error("Failed to fetch financials:", error);
            if (showSpinner) toast.error("Failed to refresh financial data");
        } finally {
            if (showSpinner) setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchFinancials();
        const interval = setInterval(() => fetchFinancials(), 10000);
        return () => clearInterval(interval);
    }, [fetchFinancials]);

    useEffect(() => {
        epmIntervalRef.current = setInterval(() => {
            setEventsPerMin(eventCountRef.current);
            eventCountRef.current = 0;
        }, 60000);

        return () => {
            if (epmIntervalRef.current) clearInterval(epmIntervalRef.current);
        };
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleConnect = () => setIsLive(true);
        const handleDisconnect = () => setIsLive(false);

        const handleStatsUpdate = (payload: SocketStatsPayload) => {
            if (!payload) return;
            eventCountRef.current += 1;

            setDbStats((prev) => ({
                users: payload.users !== undefined ? toNumber(payload.users, prev.users) : prev.users,
                games: payload.games !== undefined ? toNumber(payload.games, prev.games) : prev.games,
                jackpots: payload.jackpots !== undefined ? toNumber(payload.jackpots, prev.jackpots) : prev.jackpots,
                audits: payload.audits !== undefined ? toNumber(payload.audits, prev.audits) : prev.audits,
                dbSize: payload.dbSize !== undefined ? toNumber(payload.dbSize, prev.dbSize) : prev.dbSize,
                collections: prev.collections,
            }));

            setAnalytics((prev) => ({
                ...prev,
                totalUsers: payload.users !== undefined ? toNumber(payload.users, prev.totalUsers) : prev.totalUsers,
                totalGames: payload.games !== undefined ? toNumber(payload.games, prev.totalGames) : prev.totalGames,
            }));

            setLastSync(new Date());
        };

        const handleTurnoverUpdate = (payload: TurnoverPayload) => {
            if (!payload || payload.totalTurnover === undefined) return;
            eventCountRef.current += 1;

            setAnalytics((prev) => {
                const totalWagered = toNumber(payload.totalTurnover, prev.totalWagered);
                const houseEdge = Math.max(0, totalWagered - prev.totalPayout);
                return { ...prev, totalWagered, houseEdge };
            });

            setLastSync(new Date());
        };

        const handleFinancialEvent = () => {
            eventCountRef.current += 1;
            fetchFinancials();
        };

        setIsLive(socket.connected);

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("admin:stats_update", handleStatsUpdate);
        socket.on("admin_stats_update", handleStatsUpdate);
        socket.on("platform:turnover_update", handleTurnoverUpdate);
        socket.on("transaction_created", handleFinancialEvent);
        socket.on("new_deposit", handleFinancialEvent);
        socket.on("withdrawal_processed", handleFinancialEvent);
        socket.on("user_registered", handleFinancialEvent);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("admin:stats_update", handleStatsUpdate);
            socket.off("admin_stats_update", handleStatsUpdate);
            socket.off("platform:turnover_update", handleTurnoverUpdate);
            socket.off("transaction_created", handleFinancialEvent);
            socket.off("new_deposit", handleFinancialEvent);
            socket.off("withdrawal_processed", handleFinancialEvent);
            socket.off("user_registered", handleFinancialEvent);
            setIsLive(false);
        };
    }, [socket, fetchFinancials]);

    const metricCards = [
        {
            title: "Total Wagered",
            value: formatMoney(analytics.totalWagered),
            icon: TrendingUp,
            color: "text-emerald-300",
            bg: "bg-emerald-500/10",
            sub: "Platform turnover",
        },
        {
            title: "Total Payout",
            value: formatMoney(analytics.totalPayout),
            icon: ArrowUpRight,
            color: "text-amber-300",
            bg: "bg-amber-500/10",
            sub: "Winner payouts",
        },
        {
            title: "House Edge",
            value: formatMoney(analytics.houseEdge),
            icon: ArrowDownRight,
            color: "text-rose-300",
            bg: "bg-rose-500/10",
            sub: "Wagered - payout",
        },
        {
            title: "30d Deposits",
            value: formatMoney(summary.deposits),
            icon: Wallet,
            color: "text-cyan-300",
            bg: "bg-cyan-500/10",
            sub: "From transaction monitor",
        },
        {
            title: "30d Referrals",
            value: formatMoney(summary.referrals),
            icon: Users,
            color: "text-blue-300",
            bg: "bg-blue-500/10",
            sub: "Referral rewards",
        },
        {
            title: "30d Cashbacks",
            value: formatMoney(summary.cashbacks),
            icon: ShieldCheck,
            color: "text-purple-300",
            bg: "bg-purple-500/10",
            sub: "Cashback payouts",
        },
        {
            title: "Total Users",
            value: analytics.totalUsers.toLocaleString(),
            icon: Activity,
            color: "text-sky-300",
            bg: "bg-sky-500/10",
            sub: "Registered users",
        },
        {
            title: "Database Size",
            value: formatBytes(dbStats.dbSize),
            icon: Database,
            color: "text-slate-200",
            bg: "bg-slate-400/10",
            sub: `${dbStats.collections.toLocaleString()} collections`,
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <h2 className="text-xs font-black uppercase tracking-[0.28em] text-white/30 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Financial Overview
                    </h2>
                    <p className="text-[10px] uppercase tracking-widest text-white/35">
                        Real-time backend metrics
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <span
                        className={cn(
                            "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest",
                            isLive ? "text-emerald-400" : "text-amber-400"
                        )}
                    >
                        <span
                            className={cn(
                                "inline-block h-1.5 w-1.5 rounded-full",
                                isLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                            )}
                        />
                        {isLive ? "Live" : "Polling"}
                    </span>

                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-300/80 flex items-center gap-1.5">
                        <Zap className="h-3 w-3" />
                        {eventsPerMin} evt/min
                    </span>

                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                        {lastSync ? `Synced ${lastSync.toLocaleTimeString()}` : "Syncing"}
                    </span>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchFinancials(true)}
                        className="border-white/10 hover:bg-white/5 h-8 px-2"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {metricCards.map((card) => (
                    <Card key={card.title} className="bg-black/40 border-white/5 hover:border-white/10 transition-colors rounded-2xl">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                {card.title}
                            </CardTitle>
                            <div className={cn("p-2 rounded-lg border border-white/5", card.bg)}>
                                <card.icon className={cn("h-4 w-4", card.color)} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black font-mono text-white tracking-tight">
                                {card.value}
                            </div>
                            <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mt-2">
                                {card.sub}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <AdminCharts />

            <Card className="bg-black/40 border-white/5 rounded-2xl overflow-hidden">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/40">
                            Recent Financial Activity
                        </CardTitle>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/35 flex items-center gap-1.5">
                            <Gift className="h-3 w-3" />
                            30d Total {formatMoney(summary.total)}
                        </span>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {recentTransactions.length === 0 ? (
                        <div className="px-6 py-12 text-center text-[10px] uppercase tracking-widest text-white/30">
                            No activity found
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {recentTransactions.map((tx) => (
                                <div key={tx.id} className="px-4 py-3 grid grid-cols-[100px_1fr_auto_auto] gap-3 items-center">
                                    <span
                                        className={cn(
                                            "inline-flex justify-center px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest",
                                            TYPE_STYLES[tx.type] || "text-white/70 border-white/20 bg-white/5"
                                        )}
                                    >
                                        {tx.type.replace("_", " ")}
                                    </span>
                                    <div className="text-xs text-white/65 font-mono">
                                        {shortWallet(tx.walletAddress)}
                                    </div>
                                    <div className="text-xs font-black text-white">
                                        {formatMoney(tx.amount)}
                                    </div>
                                    <div className="text-[10px] text-white/35 uppercase tracking-widest" title={new Date(tx.timestamp).toLocaleString()}>
                                        {relativeTime(tx.timestamp)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
