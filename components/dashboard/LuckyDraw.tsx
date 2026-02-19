"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Gift, Zap, Users, Loader2, Sparkles, Trophy, History, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { gameAPI, apiRequest } from "@/lib/api";
import { dedupeByKey, mergeUniqueByKey } from "@/lib/collections";
import { useJackpotSocket } from "@/hooks/useJackpotSocket";

interface Winner {
    wallet: string;
    prize: string;
    rank: string;
    timestamp?: string;
}

export function LuckyDraw() {
    const { token, realBalances, refreshUser } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<any>(null);
    const [winners, setWinners] = useState<Winner[]>([]);
    const [isBuying, setIsBuying] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const [statusData, winnersData] = await Promise.all([
                gameAPI.getLuckyDrawStatus(),
                apiRequest('/lucky-draw/recent-winners')
            ]);

            if (statusData.status === 'success') {
                setStatus(statusData.data);
            }

            if (winnersData.status === 'success' && Array.isArray(winnersData.data)) {
                setWinners(dedupeByKey(winnersData.data, (w: any) => `${w.wallet}-${w.rank}-${w.timestamp}`));
            }
        } catch (error) {
            console.error("Failed to fetch Lucky Draw data", error);
        }
    }, []);

    // Use the robust socket hook for real-time updates
    const { isConnected } = useJackpotSocket({
        onStatusUpdate: (data) => {
            // Update local status with new data
            setStatus((prev: any) => ({
                ...prev,
                ...data,
                // Ensure recentWinners is preserved if not sent in partial update
                recentWinners: data.recentWinners || prev?.recentWinners || []
            }));
            if (Array.isArray(data?.recentWinners)) {
                setWinners(prev =>
                    mergeUniqueByKey(data.recentWinners, prev, (w) => `${w.wallet}-${w.rank}-${w.timestamp}`)
                        .slice(0, 10)
                );
            }

            // If the system is halted or resumed, toast a notification
            if (data.drawIsActive !== undefined && status) {
                if (data.drawIsActive && !status.drawIsActive) {
                    toast.success("Jackpot System Online", { icon: <Zap className="h-4 w-4 text-emerald-500" /> });
                } else if (!data.drawIsActive && status.drawIsActive) {
                    toast.warning("Jackpot System Paused", { icon: <Loader2 className="h-4 w-4 text-amber-500" /> });
                }
            }
        },
        onTicketSold: (data) => {
            // Increment ticket count and progress locally for smooth animation
            setStatus((prev: any) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    ticketsSold: data.ticketsSold,
                    // Optionally update recent purchases lists if we had that in state
                };
            });
        },
        onWinnerAnnounced: (winner) => {
            setWinners(prev =>
                mergeUniqueByKey([winner], prev, (w) => `${w.wallet}-${w.rank}-${w.timestamp}`)
                    .slice(0, 10)
            );
            toast.success(`JACKPOT! ${winner.wallet.slice(0, 6)}... won ${winner.prize}!`, {
                icon: <Trophy className="h-5 w-5 text-amber-500" />,
                duration: 8000
            });
            fetchStatus(); // Refresh full status to be sure
            refreshUser(); // Sync balance if user was the winner
        },
        onNewRound: (data) => {
            toast.info(`Round ${data.roundNumber} Started!`, { icon: <Sparkles className="h-4 w-4 text-purple-500" /> });
            fetchStatus();
        }
    });

    useEffect(() => {
        fetchStatus();
        if (isConnected) return;
        const interval = setInterval(fetchStatus, 30000); // Poll every 30s as fallback
        return () => clearInterval(interval);
    }, [fetchStatus, isConnected]);

    const handleBuyTicket = async () => {
        if (!token) {
            toast.error("Authentication required to buy tickets.");
            return;
        }

        setIsBuying(true);
        try {
            const data = await gameAPI.buyLuckyDrawTickets(1);
            if (data.status === 'success') {
                toast.success("Ticket Protocol Initiated! Good luck.");
                fetchStatus();
                refreshUser();
            } else {
                toast.error(data.message || "Purchase failed.");
            }
        } catch (error) {
            toast.error("Network instability detected.");
        } finally {
            setIsBuying(false);
        }
    };

    const progress = status ? (status.ticketsSold / status.totalTickets) * 100 : 0;

    return (
        <Card className="h-full bg-black/40 border-white/5 backdrop-blur-xl rounded-[2rem] overflow-hidden group hover:border-purple-500/50 transition-all duration-500 hover:shadow-[0_0_50px_rgba(168,85,247,0.15)] relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <CardContent className="p-8 space-y-6 relative z-10">
                <div className="flex justify-between items-start">
                    <div className="h-14 w-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                        <Gift className="h-7 w-7" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono font-bold text-purple-500 uppercase tracking-widest">
                            Round #{status?.currentRound ?? "..."}
                        </div>
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold animate-pulse ${isConnected ? 'text-emerald-500' : 'text-amber-500'}`}>
                            <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? (status?.drawIsActive ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-amber-500'}`} />
                            {isConnected ? (status?.drawIsActive ? 'LIVE FEED ACTIVE' : 'SYSTEM HALTED') : 'CONNECTING...'}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-display font-bold text-white group-hover:text-purple-400 transition-colors">Lucky Draw</h3>
                        <Sparkles className="h-4 w-4 text-amber-500 animate-bounce" />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Provably fair jackpots. <span className="text-white font-bold">1 in 10 Wins</span> guaranteed by the TRK protocol.
                    </p>

                    {/* Total Prize Pool Display */}
                    <div className="bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-amber-500 animate-pulse" />
                            <span className="text-xs font-black uppercase text-amber-500 tracking-widest">Current Prize Pool</span>
                        </div>
                        <div className="text-xl font-mono font-black text-white text-shadow-glow">
                            ${status?.totalPrizePool?.toLocaleString() ?? "70,000"} <span className="text-xs text-white/50">USDT</span>
                        </div>
                    </div>
                </div>

                {/* Live Winner Ticker */}
                <div className="bg-black/60 border border-white/5 rounded-xl p-4 overflow-hidden h-[120px] relative">
                    <div className="absolute top-2 left-4 text-[9px] font-black uppercase text-white/30 tracking-widest flex items-center gap-1">
                        <History className="h-3 w-3" /> Recent Extractions
                    </div>
                    <div className="mt-4 space-y-2">
                        <AnimatePresence mode="popLayout">
                            {winners.length > 0 ? winners.slice(0, 3).map((w, i) => (
                                <motion.div
                                    key={w.wallet + i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex items-center justify-between text-xs"
                                >
                                    <span className="font-mono text-purple-400">{w.wallet.slice(0, 6)}...{w.wallet.slice(-4)}</span>
                                    <span className="font-bold text-emerald-500">+{w.prize}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{w.rank}</span>
                                </motion.div>
                            )) : (
                                <div className="text-center py-4 text-white/20 text-[10px] italic">Scanning blockchain for winners...</div>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-black to-transparent pointer-events-none" />
                </div>

                {/* Progress Bar */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <div className="text-[9px] font-black uppercase text-white/30 tracking-widest">Jackpot Fill</div>
                            <div className="text-lg font-mono font-bold text-white">{status?.ticketsSold ?? 0} <span className="text-xs text-white/40">/ {status?.totalTickets ?? "..."}</span></div>
                        </div>
                        <div className="text-right">
                            <div className="text-[9px] font-black uppercase text-white/30 tracking-widest">Probability</div>
                            <div className="text-lg font-mono font-bold text-purple-500">10.0%</div>
                        </div>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                            className="h-full bg-gradient-to-r from-purple-600 to-purple-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1 }}
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex gap-3">
                    <Button
                        onClick={handleBuyTicket}
                        disabled={isBuying || (status && !status.drawIsActive)}
                        className={`flex-1 font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all ${status && !status.drawIsActive
                            ? "bg-amber-500/20 text-amber-500 cursor-not-allowed hover:bg-amber-500/20"
                            : "bg-purple-500 text-white hover:bg-purple-400"
                            }`}
                    >
                        {isBuying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : status && !status.drawIsActive ? (
                            <>Protocol Paused <Loader2 className="h-3 w-3 ml-2" /></>
                        ) : (
                            <>Get Ticket <Zap className="h-3 w-3 ml-2 fill-current" /></>
                        )}
                    </Button>
                    <div className="flex flex-col justify-center px-4 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Entry</span>
                        <span className="text-xs font-mono font-bold text-white">{status?.ticketPrice ?? "..."} <span className="text-[10px] text-purple-400">USDT</span></span>
                    </div>
                </div>
            </CardContent>

            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Paused Overlay */}
            <AnimatePresence>
                {status && !status.drawIsActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6"
                    >
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 mb-4 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                            <Lock className="w-8 h-8 text-amber-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Protocol Paused</h3>
                        <p className="text-sm text-white/50 max-w-[200px]">
                            Lucky Draw entries are temporarily suspended by the administrator.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
