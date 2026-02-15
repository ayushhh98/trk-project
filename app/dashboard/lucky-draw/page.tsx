"use client";

import { socket } from "@/components/providers/Web3Provider";
import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    ArrowLeft, Ticket, Trophy, Zap, CheckCircle2,
    Clock, Shield, Info, Star, Sparkles,
    ChevronRight, Wallet, History, AlertCircle,
    Copy, Check
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { gameAPI } from "@/lib/api";
import { toast } from "sonner";


// Prize Chart Configuration
const prizeChart = [
    { rank: '🥇 1st Prize', amount: '10,000', winners: '1' },
    { rank: '🥈 2nd Prize', amount: '5,000', winners: '1' },
    { rank: '🥉 3rd Prize', amount: '4,000', winners: '1' },
    { rank: '4th – 10th', amount: '1,000', winners: '7' },
    { rank: '11th – 50th', amount: '300', winners: '40' },
    { rank: '51st – 100th', amount: '120', winners: '50' },
    { rank: '101st – 500th', amount: '40', winners: '400' },
    { rank: '501st – 1000th', amount: '20', winners: '500' },
];

export default function LuckyDrawPage() {

    const [tickingPool, setTickingPool] = useState(0);
    const [jackpotData, setJackpotData] = useState({
        totalTickets: 1000,
        ticketsSold: 0,
        ticketPrice: 10,
        totalWinners: 100,
        winChance: '10%',
        totalPrizePool: 0,
        drawIsActive: true,
        userTickets: 0,
        recentWinners: [] as any[]
    });

    const [ticketQuantity, setTicketQuantity] = useState(1);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [purchaseMethod, setPurchaseMethod] = useState<'wallet' | 'game'>('wallet');
    const [showTopup, setShowTopup] = useState(false);
    const [isToppingUp, setIsToppingUp] = useState(false);
    const [topupAmount, setTopupAmount] = useState(10);
    const [topupSource, setTopupSource] = useState<'cash' | 'game' | 'cashback' | 'roiOnRoi' | 'winners'>('cash');

    // Restore full useWallet destructuring to fix missing variables
    const { address, user, realBalances, buyLuckyDrawTickets, buyTicketsWithGameBalance, topupLuckyWallet } = useWallet();

    const fetchStatus = useCallback(async () => {
        try {
            const response = await gameAPI.getLuckyDrawStatus();
            if (response.status === 'success') {
                setJackpotData(prev => ({
                    ...prev,
                    ...response.data,
                    // If backend sends prizes, map them, otherwise keep static/default or map differently
                }));
                // Update ticking pool base logic if needed
                setTickingPool(response.data.totalPrizePool || 0); // Start from real pool
            }
        } catch (error) {
            console.error("Failed to fetch jackpot status", error);
        }
    }, []);

    useEffect(() => {
        fetchStatus();

        const currentSocket = socket;
        if (currentSocket) {
            const onStatusUpdate = (data: any) => {
                setJackpotData(prev => ({ ...prev, ...data }));
                if (data.totalPrizePool) setTickingPool(data.totalPrizePool);
            };

            const onTicketSold = (data: any) => {
                setJackpotData(prev => ({
                    ...prev,
                    ticketsSold: data.ticketsSold,
                    totalTickets: data.totalTickets,
                    progress: data.progress
                }));
                // Real-time pool update calculation if needed, or rely on status update
            };

            const onNewRound = (data: any) => {
                toast.info(`New Lucky Draw Round #${data.roundNumber} Started!`);
                fetchStatus(); // Refresh full state
            };

            const onDrawComplete = (data: any) => {
                toast.success(`Draw Complete for Round #${data.roundNumber}!`, {
                    description: `${data.totalWinners} winners selected. Check your entries!`
                });
                fetchStatus();
            };

            const onWinnerAnnounced = (data: any) => {
                // Update recent winners list dynamically
                setJackpotData(prev => ({
                    ...prev,
                    recentWinners: [
                        { wallet: data.wallet, prize: `$${data.prize.toLocaleString()}`, rank: data.rank },
                        ...prev.recentWinners
                    ].slice(0, 5)
                }));
            };

            const onTurnoverUpdate = (data: any) => {
                // If the backend doesn't broadcast the prize pool directly, 
                // we can estimate it as 70% of revenue or just use the turnover to trigger a refresh
                // For now, let's just refresh status if turnover changes significantly
                fetchStatus();
            };

            currentSocket.on('jackpot:status_update', onStatusUpdate);
            currentSocket.on('jackpot:ticket_sold', onTicketSold);
            currentSocket.on('jackpot:new_round', onNewRound);
            currentSocket.on('jackpot:draw_complete', onDrawComplete);
            currentSocket.on('jackpot:winner_announced', onWinnerAnnounced);
            currentSocket.on('platform:turnover_update', onTurnoverUpdate);

            return () => {
                currentSocket.off('jackpot:status_update', onStatusUpdate);
                currentSocket.off('jackpot:ticket_sold', onTicketSold);
                currentSocket.off('jackpot:new_round', onNewRound);
                currentSocket.off('jackpot:draw_complete', onDrawComplete);
                currentSocket.off('jackpot:winner_announced', onWinnerAnnounced);
                currentSocket.off('platform:turnover_update', onTurnoverUpdate);
            };
        }
    }, [fetchStatus]);

    // Cyber-Drip Ticker Logic (Visual effect only, base updated by real data)
    useEffect(() => {
        const interval = setInterval(() => {
            setTickingPool(prev => {
                // Micro-drip to keep it alive between socket updates
                const drip = 0.00001;
                return prev + drip;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const progress = (jackpotData.ticketsSold / jackpotData.totalTickets) * 100;

    return (
        <div className="min-h-screen bg-background pb-20 selection:bg-pink-500/30">
            {/* Cinematic Header */}
            <header className="border-b border-white/5 bg-black/40 backdrop-blur-3xl sticky top-0 z-50">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/dashboard" className="group flex items-center gap-3 text-white/40 hover:text-white transition-all duration-300">
                        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white group-hover:scale-110 transition-all">
                            <ArrowLeft className="h-5 w-5" />
                        </div>
                        <div className="hidden sm:block">
                            <div className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-pink-500/60">Ecosystem</div>
                            <div className="text-sm font-bold">Control Center</div>
                        </div>
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="h-12 flex items-center gap-2 px-4 rounded-2xl bg-pink-500/10 border border-pink-500/20">
                            <div className="h-6 w-6 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-500">
                                <Ticket className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-pink-500/60 leading-none">Your Entries</span>
                                <span className="text-sm font-mono font-bold text-white leading-tight">{jackpotData.userTickets} <small className="text-[8px] opacity-40">TICKETS</small></span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12 lg:py-20 space-y-20">
                {/* Hero section */}
                <div className="relative">
                    {/* Background FX */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[500px] bg-pink-500/10 blur-[150px] opacity-50 pointer-events-none" />

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-8 relative z-10"
                    >
                        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-pink-400 uppercase tracking-[0.4em] backdrop-blur-3xl">
                            <Sparkles className="h-4 w-4 animate-pulse" />
                            Global Reward Pool
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-6xl md:text-9xl font-display font-black italic uppercase tracking-tighter text-white">
                                Lucky <span className="text-pink-500 drop-shadow-[0_0_50px_rgba(236,72,153,0.5)]">Draw</span>
                            </h1>
                            <div className="flex items-center justify-center gap-4 text-4xl md:text-8xl font-black text-white font-display tabular-nums">
                                <span className="text-pink-500 opacity-50 tracking-widest">$</span>
                                {tickingPool.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                            </div>
                        </div>

                        <p className="text-white/40 max-w-2xl mx-auto uppercase tracking-widest text-xs md:text-sm font-medium leading-relaxed">
                            Transparent, high-probability rewards powered by <span className="text-white font-bold">Smart Contracts</span>.
                            <br />
                            <span className="text-pink-400/80 font-black">1 in 10 players win guaranteed.</span>
                        </p>

                        <div className="max-w-xl mx-auto space-y-4 pt-8">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.3em] text-white/20 px-2">
                                <span>Sales Progress</span>
                                <span>{progress.toFixed(1)}% Completed</span>
                            </div>
                            <div className="h-5 bg-white/5 rounded-2xl p-1 border border-white/10 overflow-hidden relative">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="h-full bg-gradient-to-r from-pink-600 via-purple-500 to-pink-400 rounded-xl relative"
                                >
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
                                    <div className="absolute top-0 right-0 h-full w-24 bg-white/20 blur-xl animate-pulse" />
                                </motion.div>
                            </div>
                            <div className="flex justify-between text-[9px] font-bold text-white/30 px-2">
                                <span>{jackpotData.ticketsSold.toLocaleString('en-US')} SOLD</span>
                                <span>10,000 TARGET</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Smart Entry Protocol (New) */}
                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="bg-white/[0.02] border-white/5 rounded-3xl p-8 space-y-4 hover:bg-white/[0.04] transition-all group border-0 shadow-lg">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                            <Zap className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">20% Auto-Credit</h3>
                            <p className="text-[10px] leading-relaxed text-white/40 uppercase font-medium">
                                20% of your <span className="text-emerald-400">Daily Cashback</span> and <span className="text-emerald-400">ROI Yield</span> is automatically diverted to the Lucky Wallet.
                            </p>
                        </div>
                    </Card>

                    <Card className="bg-white/[0.02] border-white/5 rounded-3xl p-8 space-y-4 hover:bg-white/[0.04] transition-all group border-0 shadow-lg">
                        <div className="h-12 w-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform">
                            <Ticket className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Auto-Participation</h3>
                            <p className="text-[10px] leading-relaxed text-white/40 uppercase font-medium">
                                Once your balance reaches <span className="text-pink-400">10 USDT</span>, the system automatically secures your participation ticket.
                            </p>
                        </div>
                    </Card>

                    <Card className="bg-white/[0.02] border-white/5 rounded-3xl p-8 space-y-4 hover:bg-white/[0.04] transition-all group border-0 shadow-lg">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                            <Shield className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Withdrawal Protocol</h3>
                            <p className="text-[10px] leading-relaxed text-white/40 uppercase font-medium">
                                Accumulate your wins or withdraw. <span className="text-amber-400">10% Fee</span> applied on withdrawals to ensure prize pool sustainability.
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Interaction Grid */}
                <div className="grid lg:grid-cols-12 gap-10 items-start">
                    {/* Left: Purchase Terminal */}
                    <div className="lg:col-span-4 space-y-8">
                        <Card className="border-pink-500/20 bg-white/[0.02] backdrop-blur-3xl rounded-[3rem] overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent pointer-events-none" />
                            <CardContent className="p-8 space-y-8 relative z-10">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="h-14 w-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500">
                                            <Ticket className="h-7 w-7" />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Ticket Price</div>
                                            <div className="text-2xl font-black text-white">{jackpotData.ticketPrice} <span className="text-sm opacity-40">USDT</span></div>
                                        </div>
                                    </div>

                                    {/* Auto-Entry Wallet */}
                                    <div className="p-6 rounded-[2rem] bg-gradient-to-br from-pink-500/10 to-transparent border border-pink-500/10 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div className="text-[10px] font-black text-pink-500/80 uppercase tracking-widest">Lucky Wallet</div>
                                            <div className="flex items-center gap-2">
                                                <Zap className="h-4 w-4 text-pink-500 animate-pulse" />
                                                <button
                                                    onClick={() => setShowTopup(true)}
                                                    className="h-6 px-3 rounded-full bg-pink-500 text-[8px] font-black text-white hover:bg-pink-400 transition-colors uppercase tracking-widest"
                                                >
                                                    Manual Topup
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-black text-white font-mono">
                                            ${(realBalances?.luckyDrawWallet || 0).toFixed(2)}
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, ((realBalances?.luckyDrawWallet || 0) / 10) * 100)}%` }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">
                                                    {realBalances?.luckyDrawWallet >= 10
                                                        ? "Threshold Reached - Ticket Processing"
                                                        : `$${(10 - (realBalances?.luckyDrawWallet || 0)).toFixed(2)} needed for auto-ticket`
                                                    }
                                                </div>
                                                <div className="text-[9px] font-bold text-pink-500/40 uppercase">Min 10 USDT</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {/* Entry Protocol Switcher */}
                                    <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                                        <button
                                            onClick={() => setPurchaseMethod('wallet')}
                                            className={cn(
                                                "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                                purchaseMethod === 'wallet' ? "bg-pink-500 text-white shadow-lg" : "text-white/40 hover:text-white"
                                            )}
                                        >Connected Wallet</button>
                                        <button
                                            onClick={() => setPurchaseMethod('game')}
                                            className={cn(
                                                "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                                purchaseMethod === 'game' ? "bg-pink-500 text-white shadow-lg" : "text-white/40 hover:text-white"
                                            )}
                                        >Game Balance</button>
                                    </div>

                                    <div className="flex items-center justify-between p-2 bg-white/5 rounded-2xl border border-white/5">
                                        <button
                                            onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                                            className="h-12 w-12 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all active:scale-90"
                                        >-</button>
                                        <div className="text-center">
                                            <div className="text-[9px] font-black text-white/20 uppercase">Quantity</div>
                                            <div className="text-2xl font-black text-white font-mono">{ticketQuantity}</div>
                                        </div>
                                        <button
                                            onClick={() => setTicketQuantity(ticketQuantity + 1)}
                                            className="h-12 w-12 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 flex items-center justify-center transition-all active:scale-90"
                                        >+</button>
                                    </div>

                                    {purchaseMethod === 'wallet' ? (
                                        <div className="space-y-4">
                                            <Button
                                                onClick={async () => {
                                                    setIsPurchasing(true);
                                                    try {
                                                        await buyLuckyDrawTickets(ticketQuantity);
                                                    } catch (e) { } finally {
                                                        setIsPurchasing(false);
                                                    }
                                                }}
                                                disabled={isPurchasing}
                                                className="w-full h-16 rounded-[1.5rem] bg-pink-600 hover:bg-pink-500 text-white font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_rgba(236,72,153,0.3)] transition-all active:scale-95 group"
                                            >
                                                {isPurchasing ? "Confirming..." : (
                                                    <span className="flex items-center gap-2">
                                                        Wallet Entry <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                                    </span>
                                                )}
                                            </Button>
                                            <div className="text-center">
                                                <div className="text-[10px] text-white/20 font-bold uppercase mb-2">Internal Assets Insufficient?</div>
                                                <Link
                                                    href="/dashboard/cash"
                                                    className="inline-flex items-center gap-2 text-[10px] text-emerald-400 hover:text-emerald-300 font-black uppercase tracking-widest transition-colors"
                                                >
                                                    Top-up Real Money <Zap className="h-3 w-3 fill-emerald-400" />
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <Button
                                                onClick={async () => {
                                                    setIsPurchasing(true);
                                                    try {
                                                        await buyTicketsWithGameBalance(ticketQuantity);
                                                    } catch (e) { } finally {
                                                        setIsPurchasing(false);
                                                    }
                                                }}
                                                disabled={isPurchasing}
                                                className="w-full h-16 rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_rgba(16,185,129,0.2)] transition-all active:scale-95 group"
                                            >
                                                {isPurchasing ? "Syncing..." : (
                                                    <span className="flex items-center gap-2">
                                                        Internal Entry <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                                    </span>
                                                )}
                                            </Button>
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Available Game Balance</div>
                                                <div className="text-lg font-black text-emerald-400 font-mono">
                                                    {realBalances?.game || "0.00"} USDT
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <Link
                                                    href="/dashboard/cash"
                                                    className="inline-flex items-center gap-2 text-[10px] text-pink-400 hover:text-pink-300 font-black uppercase tracking-widest transition-colors"
                                                >
                                                    Top-up Real Money <Wallet className="h-3 w-3" />
                                                </Link>
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-center text-[10px] font-black text-white/10 uppercase tracking-[0.2em]">
                                        Total Cost: <span className="text-white/60">{(ticketQuantity * jackpotData.ticketPrice).toLocaleString('en-US')} USDT</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Prize Matrix & History */}
                    <div className="lg:col-span-8 space-y-10">
                        <Card className="border-white/5 bg-white/[0.01] backdrop-blur-3xl rounded-[3rem] overflow-hidden">
                            <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between border-b border-white/5 bg-white/[0.02]">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Prize Matrix</h2>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Round LD-2026-001 Distribution</p>
                                </div>
                                <div className="h-12 px-6 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                    1,000 Winners Guaranteed
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-white/5">
                                    {prizeChart.map((row, i) => (
                                        <div key={i} className="group hover:bg-white/5 transition-all p-6 px-10 flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 text-sm font-black text-white/10 group-hover:text-pink-500/30 transition-colors">#{i + 1}</div>
                                                <div className="text-sm font-bold text-white uppercase tracking-wider">{row.rank}</div>
                                            </div>
                                            <div className="flex items-center gap-12">
                                                <div className="text-right">
                                                    <div className="text-[9px] font-black text-white/20 uppercase">Per Winner</div>
                                                    <div className="text-xl font-mono font-bold text-pink-400">${row.amount}</div>
                                                </div>
                                                <div className="w-20 text-right">
                                                    <div className="text-[9px] font-black text-white/20 uppercase">Slots</div>
                                                    <div className="text-sm font-bold text-white/60">{row.winners}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Activity */}
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] px-2">Live Winners</h3>
                                <div className="space-y-3">
                                    {jackpotData.recentWinners.map((w: any, i: number) => (
                                        <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-pink-500/5 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
                                                    <Trophy className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-white">{w.wallet}</div>
                                                    <div className="text-[9px] font-black text-white/20 uppercase">{w.rank} Prize</div>
                                                </div>
                                            </div>
                                            <div className="text-sm font-mono font-bold text-green-500">+${w.prize}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Card className="border-white/5 bg-white/[0.02] rounded-[2.5rem] flex flex-col justify-center items-center p-8 text-center space-y-4">
                                <AlertCircle className="h-10 w-10 text-white/5" />
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Fair Play Protocol</h4>
                                    <p className="text-[10px] leading-relaxed text-white/20 uppercase tracking-tighter">
                                        Provably fair randomized seed selection powered by <span className="text-pink-500/40 font-black">Chainlink VRF</span>.
                                        Results are immutable once processed on the Binance Smart Chain.
                                    </p>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>

            {/* Top-up Modal */}
            {showTopup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md bg-white/[0.03] border border-white/10 p-8 rounded-[3rem] backdrop-blur-3xl space-y-8"
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Manual Top-Up</h3>
                            <button onClick={() => setShowTopup(false)} className="text-white/20 hover:text-white transition-colors">
                                <ArrowLeft className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="text-[10px] font-black text-white/20 uppercase tracking-widest text-center">Select Source Wallet</div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'cash', label: 'Cash Vault', val: realBalances?.cash },
                                    { id: 'game', label: 'Entry Vault', val: realBalances?.game },
                                    { id: 'cashback', label: 'Daily Cashback', val: realBalances?.cashback },
                                    { id: 'roiOnRoi', label: 'ROI Yield', val: realBalances?.roiOnRoi }
                                ].map((source) => (
                                    <button
                                        key={source.id}
                                        onClick={() => setTopupSource(source.id as any)}
                                        className={cn(
                                            "p-4 rounded-2xl border transition-all text-left space-y-1",
                                            topupSource === source.id
                                                ? "bg-pink-500/20 border-pink-500/50"
                                                : "bg-white/5 border-white/10 hover:border-white/20"
                                        )}
                                    >
                                        <div className="text-[8px] font-black text-white/40 uppercase">{source.label}</div>
                                        <div className="text-sm font-black text-white">${(source.val || 0).toFixed(2)}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="text-[10px] font-black text-white/20 uppercase tracking-widest text-center">Amount (USDT)</div>
                            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
                                <input
                                    type="number"
                                    value={topupAmount}
                                    onChange={(e) => setTopupAmount(Number(e.target.value))}
                                    className="bg-transparent border-none outline-none text-2xl font-black text-white w-full font-mono"
                                />
                                <div className="text-white/40 font-black">USDT</div>
                            </div>
                        </div>

                        <Button
                            onClick={async () => {
                                setIsToppingUp(true);
                                try {
                                    await topupLuckyWallet(topupSource, topupAmount);
                                    setShowTopup(false);
                                } catch (e) { } finally {
                                    setIsToppingUp(false);
                                }
                            }}
                            disabled={isToppingUp || topupAmount <= 0}
                            className="w-full h-16 rounded-[1.5rem] bg-pink-600 hover:bg-pink-500 text-white font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_rgba(236,72,153,0.3)] transition-all active:scale-95"
                        >
                            {isToppingUp ? "Processing..." : "Confirm Top-Up"}
                        </Button>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
