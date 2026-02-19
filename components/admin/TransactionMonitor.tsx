"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import {
    Receipt, Search, ExternalLink, RefreshCw,
    ArrowDownCircle, Users, Gift, ShieldCheck,
    ChevronLeft, ChevronRight, Download, Activity,
    TrendingDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/components/providers/Web3Provider";
import { toast } from "sonner";

interface Transaction {
    id: string;
    type: "deposit" | "referral" | "lucky_draw" | "cashback" | "withdrawal";
    walletAddress: string;
    amount: number;
    txHash: string | null;
    status: "confirmed" | "failed" | "pending";
    timestamp: string;
    note: string;
}

interface DailySummary {
    deposits: number;
    withdrawals: number;
    referrals: number;
    cashbacks: number;
    total: number;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    deposit: { label: "Deposit", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: ArrowDownCircle },
    referral: { label: "Referral", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: Users },
    lucky_draw: { label: "Lucky Draw", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: Gift },
    cashback: { label: "Cashback", color: "text-purple-400 bg-purple-500/10 border-purple-500/20", icon: ShieldCheck },
    withdrawal: { label: "Withdrawal", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: TrendingDown },
};

const STATUS_CONFIG: Record<string, { color: string; dot: string }> = {
    confirmed: { color: "text-emerald-400", dot: "bg-emerald-400" },
    failed: { color: "text-red-400", dot: "bg-red-400" },
    pending: { color: "text-amber-400", dot: "bg-amber-400 animate-pulse" },
};

const DATE_FILTERS = ["Today", "7d", "30d", "All"];

function relativeTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(ts).toLocaleDateString();
}

function isWithinDateFilter(timestamp: string, filter: string) {
    if (filter === "All") return true;
    const txDate = new Date(timestamp);
    if (Number.isNaN(txDate.getTime())) return false;

    const now = new Date();
    if (filter === "Today") {
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        return txDate >= dayStart;
    }
    if (filter === "7d") {
        return txDate >= new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    }
    if (filter === "30d") {
        return txDate >= new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    }
    return true;
}

export function TransactionMonitor() {
    const socket = useSocket();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("All");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [isLive, setIsLive] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [summary, setSummary] = useState<DailySummary>({ deposits: 0, withdrawals: 0, referrals: 0, cashbacks: 0, total: 0 });
    const [newTxIds, setNewTxIds] = useState<Set<string>>(new Set());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const seenTxIdsRef = useRef<Set<string>>(new Set());

    const applySummaryDelta = useCallback((tx: Transaction) => {
        const amount = Number(tx.amount || 0);
        if (!Number.isFinite(amount) || amount <= 0) return;
        setSummary(prev => {
            const next = { ...prev, total: prev.total + amount };
            if (tx.type === "deposit") next.deposits += amount;
            if (tx.type === "withdrawal") next.withdrawals += amount;
            if (tx.type === "referral") next.referrals += amount;
            if (tx.type === "cashback") next.cashbacks += amount;
            return next;
        });
    }, []);

    const fetchTransactions = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("trk_token");
            const params = new URLSearchParams({ page: String(page), limit: "20" });
            if (typeFilter !== "all") params.set("type", typeFilter);
            if (search) params.set("walletAddress", search);
            if (dateFilter !== "All") params.set("dateRange", dateFilter);

            const res = await fetch(`/api/admin/transactions?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.message || `Failed to fetch transactions (${res.status})`);
            }
            if (data.status === "success") {
                const nextTransactions = data.data.transactions || [];
                setTransactions(nextTransactions);
                seenTxIdsRef.current = new Set(
                    nextTransactions
                        .map((tx: Transaction) => String(tx.id))
                        .filter(Boolean)
                );
                setTotalPages(data.data.totalPages || 1);
                setTotal(data.data.total || 0);
                if (data.data.summary) setSummary(data.data.summary);
                setLastSync(new Date());
            }
        } catch (e) {
            console.error("Failed to fetch transactions:", e);
        } finally {
            setIsLoading(false);
        }
    }, [page, typeFilter, search, dateFilter]);

    // Auto-refresh every 15s
    useEffect(() => {
        fetchTransactions();
        intervalRef.current = setInterval(fetchTransactions, 15000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [fetchTransactions]);

    // Socket: live new transactions
    useEffect(() => {
        if (!socket) return;
        setIsLive(socket.connected);

        const handleConnect = () => setIsLive(true);
        const handleDisconnect = () => setIsLive(false);

        const handleNew = (tx: any) => {
            const normalizedType = String(tx?.type || "").toLowerCase();
            if (!["deposit", "withdrawal", "referral", "cashback", "lucky_draw"].includes(normalizedType)) {
                return;
            }

            const newTx: Transaction = {
                id: String(tx?._id || tx?.id || `rt_${Date.now()}`),
                type: normalizedType as Transaction["type"],
                walletAddress: String(tx?.walletAddress || tx?.userId || ""),
                amount: Number(tx?.amount || 0),
                txHash: tx?.txHash || null,
                status: tx?.status || "confirmed",
                timestamp: tx?.createdAt || tx?.timestamp || new Date().toISOString(),
                note: tx?.note || ""
            };

            const typeMatches = typeFilter === "all" || typeFilter === newTx.type;
            const walletMatches = !search || newTx.walletAddress.toLowerCase().includes(search.toLowerCase());
            const dateMatches = isWithinDateFilter(newTx.timestamp, dateFilter);
            if (page !== 1 || !typeMatches || !walletMatches || !dateMatches) return;

            if (seenTxIdsRef.current.has(newTx.id)) return;
            seenTxIdsRef.current.add(newTx.id);
            if (seenTxIdsRef.current.size > 5000) {
                const recent = Array.from(seenTxIdsRef.current).slice(-1500);
                seenTxIdsRef.current = new Set(recent);
            }

            setTransactions(prev => {
                setNewTxIds(s => new Set([...s, newTx.id]));
                setTimeout(() => setNewTxIds(s => {
                    const n = new Set(s);
                    n.delete(newTx.id);
                    return n;
                }), 3000);
                setTotal(t => t + 1);
                return [newTx, ...prev].slice(0, 20);
            });

            applySummaryDelta(newTx);
            setLastSync(new Date());
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("transaction_created", handleNew);
        socket.on("referral_commission_created", handleNew);
        socket.on("new_deposit", handleNew);
        socket.on("withdrawal_processed", handleNew);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("transaction_created", handleNew);
            socket.off("referral_commission_created", handleNew);
            socket.off("new_deposit", handleNew);
            socket.off("withdrawal_processed", handleNew);
            setIsLive(false);
        };
    }, [socket, page, typeFilter, search, dateFilter, applySummaryDelta]);

    const exportCSV = () => {
        const headers = ["Type", "Wallet", "Amount", "TxHash", "Status", "Time", "Note"];
        const rows = transactions.map(tx => [
            tx.type, tx.walletAddress, tx.amount, tx.txHash || "", tx.status,
            new Date(tx.timestamp).toISOString(), tx.note
        ]);
        const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV exported");
    };

    const shortAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";

    const summaryCards = [
        { label: "Deposits", value: `$${summary.deposits.toFixed(2)}`, color: "text-emerald-400", icon: ArrowDownCircle },
        { label: "Withdrawals", value: `$${summary.withdrawals.toFixed(2)}`, color: "text-red-400", icon: TrendingDown },
        { label: "Referrals", value: `$${summary.referrals.toFixed(2)}`, color: "text-blue-400", icon: Users },
        { label: "Cashbacks", value: `$${summary.cashbacks.toFixed(2)}`, color: "text-purple-400", icon: ShieldCheck },
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black uppercase tracking-widest">Transaction Monitor</h2>
                            {isLive && (
                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                    LIVE
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">
                            {total.toLocaleString()} records
                            {lastSync && ` · synced ${relativeTime(lastSync.toISOString())}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={exportCSV} className="border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest gap-1.5">
                        <Download className="h-3.5 w-3.5" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchTransactions} className="border-white/10 hover:bg-white/5">
                        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Daily Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {summaryCards.map((c, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <Card className="bg-black/40 border-white/5">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg bg-white/5", c.color)}>
                                    <c.icon className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest">{c.label}</p>
                                    <p className={cn("text-sm font-black", c.color)}>{c.value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Filters */}
            <Card className="bg-black/40 border-white/5">
                <CardContent className="p-4 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                        <Input
                            placeholder="Search wallet address..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="pl-9 bg-white/5 border-white/10 text-sm h-9"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {["all", "deposit", "referral", "lucky_draw", "cashback", "withdrawal"].map(t => (
                            <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
                                className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all",
                                    typeFilter === t ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-white/30 hover:text-white/60 hover:border-white/10"
                                )}>
                                {t === "all" ? "All" : TYPE_CONFIG[t]?.label || t}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-1.5">
                        {DATE_FILTERS.map(d => (
                            <button key={d} onClick={() => { setDateFilter(d); setPage(1); }}
                                className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border transition-all",
                                    dateFilter === d ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "border-white/5 text-white/30 hover:border-white/10"
                                )}>
                                {d}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="bg-black/40 border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                {["Type", "Wallet", "Amount", "Tx Hash", "Status", "Time", "Note"].map(h => (
                                    <th key={h} className="text-left text-[9px] font-black uppercase tracking-widest text-white/20 px-4 py-3">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="border-b border-white/5 animate-pulse">
                                            {Array.from({ length: 7 }).map((_, j) => (
                                                <td key={j} className="px-4 py-3">
                                                    <div className="h-4 bg-white/5 rounded w-full" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-16">
                                            <div className="flex flex-col items-center gap-3 text-white/20">
                                                <Activity className="h-8 w-8" />
                                                <span className="text-[10px] uppercase tracking-widest">No transactions found</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : transactions.map((tx, i) => {
                                    const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.deposit;
                                    const Icon = cfg.icon;
                                    const statusCfg = STATUS_CONFIG[tx.status] || STATUS_CONFIG.confirmed;
                                    const isNew = newTxIds.has(tx.id);
                                    return (
                                        <motion.tr
                                            key={tx.id || i}
                                            initial={{ opacity: 0, backgroundColor: isNew ? "rgba(16,185,129,0.15)" : "transparent" }}
                                            animate={{ opacity: 1, backgroundColor: "transparent" }}
                                            transition={{ delay: i * 0.015, duration: isNew ? 1.5 : 0.2 }}
                                            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <span className={cn("inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border", cfg.color)}>
                                                    <Icon className="h-3 w-3" />
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-white/60">{shortAddr(tx.walletAddress)}</td>
                                            <td className="px-4 py-3 font-black text-sm text-white">${Number(tx.amount).toFixed(2)}</td>
                                            <td className="px-4 py-3">
                                                {tx.txHash ? (
                                                    <a href={`https://bscscan.com/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-[9px] font-mono text-blue-400/60 hover:text-blue-400 transition-colors">
                                                        {tx.txHash.slice(0, 8)}...
                                                        <ExternalLink className="h-2.5 w-2.5" />
                                                    </a>
                                                ) : (
                                                    <span className="text-white/20 text-[9px]">Off-chain</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn("inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest", statusCfg.color)}>
                                                    <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[10px] text-white/30" title={new Date(tx.timestamp).toLocaleString()}>
                                                    {tx.timestamp ? relativeTime(tx.timestamp) : "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-[10px] text-white/40 max-w-[150px] truncate">{tx.note}</td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                        <span className="text-[10px] text-white/30">Page {page} of {totalPages} · {total} total</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="border-white/10 h-7 w-7 p-0">
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-white/10 h-7 w-7 p-0">
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
