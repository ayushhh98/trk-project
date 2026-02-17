"use client";

import { useState, useEffect } from "react";
import { Trophy, Zap, DollarSign, Crown } from "lucide-react";
import { useJackpotSocket } from "@/hooks/useJackpotSocket";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface Winner {
    id: string;
    wallet: string;
    prize: number;
    rank: string;
    timestamp: Date;
    roundNumber?: number;
}

interface LiveWinnerFeedProps {
    variant?: "ticker" | "feed" | "compact";
    maxItems?: number;
    showAnimation?: boolean;
    className?: string;
}

export function LiveWinnerFeed({
    variant = "ticker",
    maxItems = 10,
    showAnimation = true,
    className
}: LiveWinnerFeedProps) {
    const [winners, setWinners] = useState<Winner[]>([]);
    const [isLive, setIsLive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch initial winners on mount
    useEffect(() => {
        const fetchRecentWinners = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lucky-draw/recent-winners`);
                const result = await response.json();

                if (result.status === 'success' && result.data) {
                    // Map backend winner format to frontend Winner interface
                    const formattedWinners: Winner[] = result.data.map((w: any) => ({
                        id: w.id,
                        wallet: maskWallet(w.wallet),
                        prize: w.prize,
                        rank: w.rank,
                        timestamp: new Date(w.timestamp),
                        roundNumber: w.roundNumber
                    }));
                    setWinners(formattedWinners);
                }
            } catch (error) {
                console.error('Failed to fetch recent winners:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecentWinners();
    }, [maxItems]);

    const { isConnected } = useJackpotSocket({
        onWinnerAnnounced: (data) => {
            const newWinner: Winner = {
                id: `${data.roundNumber}-${data.wallet}-${Date.now()}`,
                wallet: maskWallet(data.wallet || data.walletAddress),
                prize: data.prize,
                rank: data.rank,
                timestamp: new Date(),
                roundNumber: data.roundNumber
            };

            setWinners(prev => {
                // Avoid duplicates
                const exists = prev.some(w => w.wallet === newWinner.wallet && w.prize === newWinner.prize && w.roundNumber === newWinner.roundNumber);
                if (exists) return prev;
                return [newWinner, ...prev].slice(0, maxItems);
            });
            setIsLive(true);

            // Show celebration for top 3 winners
            if (showAnimation && ['1st', '2nd', '3rd'].includes(data.rank)) {
                confetti({
                    particleCount: 30,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0, y: 0.6 }
                });
                confetti({
                    particleCount: 30,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1, y: 0.6 }
                });
            }

            // Reset live indicator after 3 seconds
            setTimeout(() => setIsLive(false), 3000);
        },
        onDrawComplete: (data) => {
            // Optionally clear old winners when new draw completes
            // setWinners([]);
        }
    });

    // Mask wallet address for privacy
    function maskWallet(address: string) {
        if (!address || address.length < 10) return address;
        // If already masked (contains ...), return as is
        if (address.includes('...')) return address;
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Compact variant - single row with latest winner
    if (variant === "compact") {
        const latestWinner = winners[0];

        if (!latestWinner) {
            return (
                <div className={cn("flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10", className)}>
                    <Trophy className="h-4 w-4 text-amber-500/50" />
                    <span className="text-xs text-white/40">No recent winners</span>
                </div>
            );
        }

        return (
            <div className={cn(
                "flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 relative overflow-hidden",
                isLive && "animate-pulse",
                className
            )}>
                {isLive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                )}
                <div className="flex items-center gap-3 relative z-10">
                    <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                        <Crown className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase font-black text-white/40 tracking-widest">Latest Winner</div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-white/80">{latestWinner.wallet}</span>
                            <span className="text-xs font-black text-emerald-400">${latestWinner.prize.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                {isLive && (
                    <Zap className="h-4 w-4 text-emerald-500 animate-pulse" />
                )}
            </div>
        );
    }

    // Ticker variant - horizontal scrolling
    if (variant === "ticker") {
        return (
            <div className={cn("relative overflow-hidden bg-black/40 border-y border-white/10 py-3", className)}>
                <div className="flex items-center gap-2 px-4 mb-2">
                    <div className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                        isConnected
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-white/5 text-white/40 border border-white/10"
                    )}>
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isConnected ? "bg-emerald-500 animate-pulse" : "bg-white/40"
                        )} />
                        {isConnected ? "LIVE" : "OFFLINE"}
                    </div>
                    <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">Recent Winners</span>
                </div>

                <div className="relative">
                    {winners.length === 0 ? (
                        <div className="text-center text-xs text-white/30 py-4">
                            Waiting for first winner...
                        </div>
                    ) : (
                        <div className="flex gap-4 animate-scroll-left">
                            {[...winners, ...winners].map((winner, idx) => (
                                <div
                                    key={`${winner.id}-${idx}`}
                                    className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 whitespace-nowrap min-w-max"
                                >
                                    <div className={cn(
                                        "p-1.5 rounded-lg",
                                        winner.rank === '1st' && "bg-amber-500/20 border border-amber-500/30",
                                        winner.rank === '2nd' && "bg-gray-400/20 border border-gray-400/30",
                                        winner.rank === '3rd' && "bg-orange-500/20 border border-orange-500/30",
                                        !['1st', '2nd', '3rd'].includes(winner.rank) && "bg-purple-500/20 border border-purple-500/30"
                                    )}>
                                        <Trophy className="h-3 w-3 text-amber-400" />
                                    </div>
                                    <div>
                                        <div className="text-[9px] uppercase font-black text-white/40 tracking-widest">{winner.rank} Place</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-white/70">{winner.wallet}</span>
                                            <span className="text-xs font-black text-emerald-400">${winner.prize.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Feed variant - vertical list
    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-black text-white uppercase tracking-wider">Live Winners</span>
                </div>
                <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                    isConnected
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-white/5 text-white/40 border border-white/10"
                )}>
                    <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isConnected ? "bg-emerald-500 animate-pulse" : "bg-white/40"
                    )} />
                    {isConnected ? "LIVE" : "OFFLINE"}
                </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
                {winners.length === 0 ? (
                    <div className="text-center text-xs text-white/30 py-8 border border-white/5 rounded-xl bg-white/5">
                        No winners yet. Watch this space for live announcements!
                    </div>
                ) : (
                    winners.map((winner, idx) => (
                        <div
                            key={winner.id}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-all",
                                idx === 0 && isLive
                                    ? "bg-gradient-to-r from-amber-500/20 to-purple-500/20 border-amber-500/30 animate-in slide-in-from-top"
                                    : "bg-white/5 border-white/10",
                                "hover:bg-white/10"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    winner.rank === '1st' && "bg-amber-500/20 border border-amber-500/30",
                                    winner.rank === '2nd' && "bg-gray-400/20 border border-gray-400/30",
                                    winner.rank === '3rd' && "bg-orange-500/20 border border-orange-500/30",
                                    !['1st', '2nd', '3rd'].includes(winner.rank) && "bg-purple-500/20 border border-purple-500/30"
                                )}>
                                    {winner.rank === '1st' && <Crown className="h-4 w-4 text-amber-400" />}
                                    {winner.rank !== '1st' && <Trophy className="h-4 w-4 text-white/60" />}
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-black text-white/40 tracking-widest">
                                        {winner.rank} Place {winner.roundNumber && `• Round ${winner.roundNumber}`}
                                    </div>
                                    <div className="text-xs font-mono text-white/80">{winner.wallet}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-emerald-400">
                                <DollarSign className="h-3 w-3" />
                                <span className="text-sm font-black">{winner.prize.toLocaleString()}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
