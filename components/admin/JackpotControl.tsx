"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Gift, Play, Pause, DollarSign, Settings2, Trophy, RefreshCw, AlertCircle, Zap, Crown, Activity } from "lucide-react";
import { adminAPI } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useJackpotSocket } from "@/hooks/useJackpotSocket";
import confetti from "canvas-confetti";

interface JackpotStatus {
    roundNumber: number;
    ticketsSold: number;
    totalTickets: number;
    ticketPrice: number;
    totalPrizePool: number;
    progress: number;
    status: string;
    isActive: boolean;
    drawIsActive: boolean;
    recentWinners: Array<{ wallet: string; prize: string; rank: string }>;
}

export function JackpotControl() {
    const [status, setStatus] = useState<JackpotStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [newPrice, setNewPrice] = useState("");
    const [newLimit, setNewLimit] = useState("");
    const [liveTickets, setLiveTickets] = useState(0);
    const [liveProgress, setLiveProgress] = useState(0);
    const [recentPurchases, setRecentPurchases] = useState<Array<{ buyer: string; quantity: number; time: Date }>>([]);
    const prevTicketsSoldRef = useRef(0);

    // WebSocket integration for real-time updates
    const { isConnected, connectionStatus } = useJackpotSocket({
        onTicketSold: (data) => {
            console.log('🎟️ Ticket sold:', data);

            // Animate ticket counter
            setLiveTickets(data.ticketsSold);
            setLiveProgress(data.progress);

            // Add to recent purchases feed
            setRecentPurchases(prev => [{
                buyer: data.buyer,
                quantity: data.quantity,
                time: new Date(data.timestamp)
            }, ...prev].slice(0, 10));

            // Play success sound (optional)
            const audio = new Audio('/sounds/ticket-purchase.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => { }); // Ignore if audio fails

            // Show toast notification
            toast.success(`${data.quantity} ticket(s) sold!`, {
                description: `Buyer: ${data.buyer}`,
                duration: 2000
            });
        },
        onStatusUpdate: (data) => {
            console.log('📊 Status update:', data);
            setStatus(prev => prev ? { ...prev, ...data } : null);
            setLiveTickets(data.ticketsSold);
            setLiveProgress(data.progress);
        },
        onDrawComplete: (data) => {
            console.log('🎉 Draw complete:', data);

            // Trigger confetti
            confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.6 }
            });

            toast.success('🎉 Jackpot Draw Complete!', {
                description: `${data.totalWinners} winners selected for round ${data.roundNumber}`,
                duration: 5000
            });

            // Refresh status
            fetchStatus();
        },
        onWinnerAnnounced: (data) => {
            console.log('👑 Winner announced:', data);

            // Add confetti for top 3 winners
            if (['1st', '2nd', '3rd'].includes(data.rank)) {
                confetti({
                    particleCount: 50,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 }
                });
                confetti({
                    particleCount: 50,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 }
                });
            }

            toast.success(`${data.rank} Place Winner!`, {
                description: `${data.wallet} won $${data.prize.toLocaleString()}!`,
                duration: 4000
            });
        },
        onNewRound: (data) => {
            console.log('🔄 New round started:', data);

            toast.info('New Jackpot Round Started!', {
                description: `Round ${data.roundNumber} - ${data.totalTickets} tickets available`,
                duration: 4000
            });

            // Reset live counters
            setLiveTickets(0);
            setLiveProgress(0);
            setRecentPurchases([]);

            // Refresh status
            fetchStatus();
        }
    });

    const fetchStatus = async () => {
        setIsLoading(true);
        try {
            const res = await adminAPI.getJackpotStatus();
            if (res.status === 'success') {
                const data = res.data;
                setStatus(data);
                setLiveTickets(data.ticketsSold);
                setLiveProgress((data.ticketsSold / data.totalTickets) * 100);
                setNewPrice(data.ticketPrice.toString());
                setNewLimit(data.totalTickets.toString());
                prevTicketsSoldRef.current = data.ticketsSold;
            }
        } catch (error) {
            console.error("Failed to fetch jackpot status:", error);
            toast.error('Failed to load jackpot status');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();

        // Auto-refresh every 30 seconds as fallback
        const interval = setInterval(() => {
            if (!isConnected) {
                fetchStatus();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [isConnected]);

    // Animate ticket counter when it changes
    useEffect(() => {
        if (!status || liveTickets === prevTicketsSoldRef.current) return;

        const increment = liveTickets > prevTicketsSoldRef.current;
        const diff = Math.abs(liveTickets - prevTicketsSoldRef.current);

        if (diff > 0 && diff < 20) {
            // Animate smooth counting
            let current = prevTicketsSoldRef.current;
            const step = increment ? 1 : -1;
            const timer = setInterval(() => {
                current += step;
                setLiveTickets(current);
                if (current === liveTickets) {
                    clearInterval(timer);
                    prevTicketsSoldRef.current = liveTickets;
                }
            }, 50);
            return () => clearInterval(timer);
        } else {
            prevTicketsSoldRef.current = liveTickets;
        }
    }, [liveTickets, status]);

    const handleTogglePause = async () => {
        try {
            const res = await adminAPI.toggleJackpotPause();
            if (res.status === 'success') {
                toast.success(res.message);
                fetchStatus();
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to toggle pause');
        }
    };

    const handleUpdateParams = async () => {
        setIsUpdating(true);
        try {
            const res = await adminAPI.updateJackpotParams({
                newPrice: parseFloat(newPrice),
                newLimit: parseInt(newLimit)
            });
            if (res.status === 'success') {
                toast.success("Parameters updated successfully!");
                fetchStatus();
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to update parameters');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleWithdrawSurplus = async () => {
        try {
            const res = await adminAPI.withdrawJackpotSurplus();
            if (res.status === 'success') {
                toast.success(res.message);
                fetchStatus();
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to withdraw surplus');
        }
    };

    if (isLoading && !status) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
                <div className="lg:col-span-2 h-[500px] bg-white/5 rounded-[2.5rem]" />
                <div className="space-y-6">
                    <div className="h-64 bg-white/5 rounded-[2.5rem]" />
                    <div className="h-64 bg-white/5 rounded-[2.5rem]" />
                </div>
            </div>
        );
    }

    const progress = liveProgress || ((status?.ticketsSold || 0) / (status?.totalTickets || 1)) * 100;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-[#030303] border border-purple-500/20 shadow-[0_0_50px_-10px_rgba(168,85,247,0.15)] relative overflow-hidden backdrop-blur-2xl rounded-[2rem]">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] pointer-events-none" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2" />

                <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-white/5 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-4 rounded-2xl bg-[#0A0A0A] border border-purple-500/30 text-purple-400 shadow-[0_0_20px_-5px_rgba(168,85,247,0.3)] group-hover:scale-105 transition-transform duration-300 group-hover:border-purple-500/50">
                                <Gift className="h-8 w-8" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <CardTitle className="text-2xl font-display font-black text-white uppercase tracking-wider flex items-center gap-3">
                                Jackpot Core
                                <span className="px-2.5 py-0.5 rounded-lg text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono tracking-tight shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                                    V2.0 PRO
                                </span>
                            </CardTitle>
                            <div className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-[0.2em] text-white/30">
                                <span className="text-purple-400/80">Round {status?.roundNumber || 1}</span>
                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                <span>Global Prize Distribution</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Connection Status */}
                        <div className={cn(
                            "flex items-center gap-2.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all backdrop-blur-md border",
                            connectionStatus === 'connected'
                                ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_-5px_rgba(16,185,129,0.2)]"
                                : "bg-amber-500/5 text-amber-400 border-amber-500/20"
                        )}>
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                connectionStatus === 'connected' ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_currentColor]" : "bg-amber-400"
                            )} />
                            {connectionStatus === 'connected' ? 'LIVE FEED ACTIVE' : 'CONNECTING...'}
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={fetchStatus}
                            className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white transition-all duration-300 border border-white/5 hover:border-white/10 group"
                        >
                            <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-700" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-8 space-y-10 relative z-10">
                    {/* Pool Progress Section */}
                    <div className="space-y-8 bg-[#080808] rounded-[2rem] p-8 border border-white/5 shadow-inner relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

                        <div className="flex justify-between items-end relative z-10">
                            <div>
                                <div className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] mb-5 flex items-center gap-2.5">
                                    <div className="p-1 rounded bg-amber-500/10 text-amber-500">
                                        <Zap className="h-3 w-3" />
                                    </div>
                                    Current Pool Status
                                </div>
                                <div className="flex items-baseline gap-5">
                                    <div className="relative">
                                        <div className="text-6xl font-mono font-black text-white tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                            <span className="tabular-nums bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                                                {liveTickets.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-2 text-3xl font-mono font-bold text-white/20">
                                        / <span className="text-white/40">{status?.totalTickets.toLocaleString()}</span>
                                    </div>
                                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
                                        Tickets Sold
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="glass-panel p-5 rounded-2xl bg-[#0F0F0F] border border-white/5 shadow-xl relative overflow-hidden group-hover:border-purple-500/20 transition-colors duration-500">
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                    <div className="text-[9px] uppercase font-black text-white/30 tracking-[0.2em] mb-2">Fill Velocity</div>
                                    <div className="text-4xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 tabular-nums drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                                        {progress.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative h-6 w-full bg-[#050505] rounded-full overflow-hidden border border-white/5 p-1 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all duration-1000 ease-out relative overflow-hidden"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:24px_24px] animate-[progress-stripes_1s_linear_infinite]" />
                                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Parameter Controls */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2.5 text-xs font-black text-white/40 uppercase tracking-[0.2em]">
                                <Settings2 className="h-3.5 w-3.5" /> Engine Configuration
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2.5 group">
                                    <label className="text-[9px] uppercase font-bold text-white/30 group-hover:text-purple-400 transition-colors pl-1 tracking-wider">
                                        Ticket Price (GC)
                                    </label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={newPrice}
                                            onChange={(e) => setNewPrice(e.target.value)}
                                            className="bg-[#050505] border-white/10 focus:border-purple-500/50 font-mono text-sm h-14 transition-all rounded-xl focus:bg-white/[0.02] focus:shadow-[0_0_20px_-5px_rgba(168,85,247,0.15)] pl-4"
                                            disabled={!!(status && status.ticketsSold > 0)}
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 pointer-events-none">GC</div>
                                    </div>
                                </div>
                                <div className="space-y-2.5 group">
                                    <label className="text-[9px] uppercase font-bold text-white/30 group-hover:text-purple-400 transition-colors pl-1 tracking-wider">
                                        Total Tickets
                                    </label>
                                    <Input
                                        type="number"
                                        value={newLimit}
                                        onChange={(e) => setNewLimit(e.target.value)}
                                        className="bg-[#050505] border-white/10 focus:border-purple-500/50 font-mono text-sm h-14 transition-all rounded-xl focus:bg-white/[0.02] focus:shadow-[0_0_20px_-5px_rgba(168,85,247,0.15)] pl-4"
                                        disabled={!!(status && status.ticketsSold > 0)}
                                    />
                                </div>
                            </div>

                            {status && status.ticketsSold > 0 && (
                                <div className="bg-amber-500/[0.03] border border-amber-500/10 rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm shadow-[0_4px_20px_-10px_rgba(245,158,11,0.1)]">
                                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-amber-500/80 leading-relaxed font-bold tracking-wide">
                                        SYSTEM LOCKED: Modification disabled during active ticket sales to ensure protocol integrity.
                                    </p>
                                </div>
                            )}

                            <Button
                                onClick={handleUpdateParams}
                                disabled={isUpdating || !!(status && status.ticketsSold > 0)}
                                className="w-full bg-white text-black hover:bg-white/90 font-black uppercase tracking-widest text-[10px] h-14 rounded-xl shadow-[0_0_30px_-5px_rgba(255,255,255,0.2)] transition-all hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group border-0"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {isUpdating ? 'Executing...' : 'Update Parameters'}
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            </Button>
                        </div>

                        {/* Treasury Management */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2.5 text-xs font-black text-white/40 uppercase tracking-[0.2em]">
                                <DollarSign className="h-3.5 w-3.5" /> Treasury Surplus
                            </div>
                            <div className="p-1 rounded-[1.2rem] bg-gradient-to-br from-emerald-500/20 to-transparent">
                                <div className="p-7 rounded-2xl bg-[#050505] border border-emerald-500/10 space-y-6 relative overflow-hidden h-full flex flex-col justify-between">
                                    <div className="absolute top-0 right-0 w-[100px] h-[100px] bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none" />

                                    <div>
                                        <div className="text-[9px] uppercase font-bold text-emerald-500/50 mb-3 tracking-widest">Available Reserve</div>
                                        <div className="text-5xl font-mono font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                            0.00 <span className="text-sm font-bold opacity-40 ml-1">USDT</span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleWithdrawSurplus}
                                        disabled={true}
                                        variant="outline"
                                        className="w-full border-emerald-500/20 text-emerald-500 bg-emerald-500/[0.02] font-bold uppercase tracking-widest text-[10px] h-12 rounded-xl transition-all opacity-50 cursor-not-allowed hover:bg-emerald-500/[0.05]"
                                    >
                                        Transfer to Vault
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                {/* Control Panel */}
                <Card className="bg-[#030303] border-white/10 backdrop-blur-2xl rounded-[2rem] overflow-hidden shadow-2xl relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />

                    <CardHeader className="border-b border-white/5 py-6 px-7 bg-white/[0.02]">
                        <CardTitle className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2.5">
                            <Settings2 className="h-4 w-4 text-blue-400" />
                            System Override
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-7 space-y-6">
                        <div className="p-6 rounded-[1.5rem] bg-[#080808] border border-white/5 space-y-5 shadow-inner">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Master Status</span>
                                <span className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all shadow-[0_0_15px_-5px_rgba(0,0,0,0.5)]",
                                    status?.drawIsActive
                                        ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/20"
                                        : "bg-red-950/30 text-red-500 border-red-500/20"
                                )}>
                                    <span className={cn("w-1.5 h-1.5 rounded-full relative", status?.drawIsActive ? "bg-emerald-500" : "bg-red-500")}>
                                        <span className={cn("absolute inset-0 rounded-full animate-ping opacity-75", status?.drawIsActive ? "bg-emerald-500" : "bg-red-500")} />
                                    </span>
                                    {status?.drawIsActive ? "Active" : "Halted"}
                                </span>
                            </div>
                            <Button
                                onClick={handleTogglePause}
                                className={cn(
                                    "w-full h-14 flex items-center justify-center gap-2.5 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-lg active:scale-[0.98] border relative overflow-hidden",
                                    status?.drawIsActive
                                        ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 hover:border-red-500/30 shadow-[0_0_20px_-10px_rgba(239,68,68,0.3)]"
                                        : "bg-emerald-500 text-[#020617] hover:bg-emerald-400 border-transparent shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
                                )}
                            >
                                {status?.drawIsActive ? (
                                    <><Pause className="h-3.5 w-3.5" /> Emergency Halt</>
                                ) : (
                                    <><Play className="h-3.5 w-3.5 fill-current" /> Initialize Protocol</>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Winners & Feed */}
                <Card className="bg-[#030303] border-white/10 backdrop-blur-2xl rounded-[2rem] overflow-hidden shadow-2xl flex-1 flex flex-col relative min-h-[500px]">
                    <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-amber-500/5 blur-[80px] rounded-full pointer-events-none" />

                    <CardHeader className="border-b border-white/5 py-6 px-7 bg-white/[0.02]">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2.5">
                                <Crown className="h-4 w-4 text-amber-400" />
                                Hall of Fame
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 flex flex-col">
                        <div className="divide-y divide-white/5 overflow-y-auto custom-scrollbar flex-1">
                            {status?.recentWinners && status.recentWinners.length > 0 ? (
                                status.recentWinners.map((w, i) => (
                                    <div key={i} className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group relative overflow-hidden">
                                        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
                                        <div className="flex items-center gap-5">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black border transition-transform group-hover:scale-110 duration-300",
                                                i === 0 ? "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_20px_-5px_rgba(245,158,11,0.2)]" :
                                                    i === 1 ? "bg-slate-400/10 text-slate-400 border-slate-400/20" :
                                                        i === 2 ? "bg-orange-700/10 text-orange-700 border-orange-700/20" :
                                                            "bg-white/5 text-white/30 border-white/10"
                                            )}>
                                                {i < 3 ? <Trophy className="h-4 w-4" /> : (i + 1)}
                                            </div>
                                            <div>
                                                <div className="text-[11px] font-mono text-white/90 group-hover:text-white transition-colors tracking-tight">
                                                    {w.wallet}
                                                </div>
                                                <div className="text-[9px] text-white/30 uppercase tracking-wider font-bold mt-1 flex items-center gap-1.5">
                                                    <span className={cn("w-1 h-1 rounded-full",
                                                        i === 0 ? "bg-amber-500" :
                                                            i === 1 ? "bg-slate-400" :
                                                                i === 2 ? "bg-orange-700" : "bg-white/20"
                                                    )} />
                                                    Rank {w.rank}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-black text-emerald-400 tabular-nums drop-shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                                {w.prize}
                                            </div>
                                            <div className="text-[8px] font-bold text-emerald-500/40 uppercase tracking-widest mt-1">Points</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-10 text-center flex flex-col items-center justify-center h-64">
                                    <div className="p-5 rounded-full bg-white/[0.02] border border-white/5 mb-5 shadow-inner">
                                        <Trophy className="h-8 w-8 text-white/10" />
                                    </div>
                                    <p className="text-xs text-white/30 font-bold uppercase tracking-widest">No champions yet recorded</p>
                                    <p className="text-[10px] text-white/20 mt-2">Winners will appear here after the draw</p>
                                </div>
                            )}
                        </div>

                        {/* Recent Purchases Footer */}
                        {recentPurchases.length > 0 && (
                            <div className="border-t border-white/5 p-6 bg-[#080808]">
                                <div className="text-[9px] uppercase font-black text-white/30 tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Activity className="h-3 w-3 text-emerald-500" />
                                    Live Inflow
                                </div>
                                <div className="space-y-3">
                                    {recentPurchases.slice(0, 3).map((purchase, i) => (
                                        <div key={i} className="flex items-center justify-between text-[10px] p-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                                            <span className="font-mono text-white/40">{purchase.buyer.slice(0, 16)}...</span>
                                            <span className="font-bold text-emerald-500/90 flex items-center gap-1.5">
                                                +{purchase.quantity} <span className="text-[8px] opacity-50 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">TICKETS</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
