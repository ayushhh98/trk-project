"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Button } from "@/components/ui/Button";
import { CountdownTimer } from "@/components/dashboard/CountdownTimer";
import { CyberneticTerminal } from "@/components/dashboard/CyberneticTerminal";
import { Trophy, Coins, Users, TrendingUp, Zap, ShieldCheck, Wallet, Play } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DepositModal } from "@/components/cash/DepositModal";
import { WithdrawalModal } from "@/components/cash/WithdrawalModal";
import { EarningsNexus } from "@/components/dashboard/EarningsNexus";
import { HardenedCapital } from "@/components/dashboard/HardenedCapital";
import { PerformanceMetrics } from "@/components/dashboard/PerformanceMetrics";
import { LuckyDraw } from "@/components/dashboard/LuckyDraw";
import { PromoPoster } from "@/components/dashboard/PromoPoster";
import { LaunchPoster } from "@/components/dashboard/LaunchPoster";
import { StatCard } from "@/components/dashboard/StatCard";
import { IncomeModuleCard } from "@/components/dashboard/IncomeModuleCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RefreshCw } from "lucide-react";
import { LiveWinnerFeed } from "@/components/jackpot/LiveWinnerFeed";
import { PromoCarousel } from "@/components/dashboard/PromoCarousel";
import { contentAPI } from "@/lib/api";


export default function DashboardPage() {
    const {
        isConnected, address, user, practiceBalance, practiceExpiry,
        gameHistory, disconnect, isLoading, isRegisteredOnChain, registerOnChain,
        nativeBalance, usdtBalance, isRealMode, setIsRealMode, realBalances,
        refreshUser, linkWallet, deposit, isSwitchingWallet, hasRealAccess
    } = useWallet();

    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [posters, setPosters] = useState<any[]>([]);
    const router = useRouter();

    // Redirect to auth if not connected
    useEffect(() => {
        if (isLoading || isSwitchingWallet) return;
        if (typeof window !== "undefined") {
            const hasToken = !!localStorage.getItem("trk_token");
            if (hasToken) return;
        }
        if (!isConnected) {
            router.push("/auth");
        }
    }, [isConnected, isLoading, isSwitchingWallet, router]);

    const fetchPosters = async () => {
        try {
            const res = await contentAPI.getPosters();
            if (res.status === 'success') {
                setPosters(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch posters:", error);
        }
    };

    useEffect(() => {
        setIsClient(true);
        fetchPosters();
    }, []);

    // Calculate stats
    const gamesPlayed = gameHistory.length;
    const wins = gameHistory.filter(h => h.won).length;
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
    const netChange = gameHistory.reduce((acc, h) => acc + (h.won ? h.amount * 6 : -h.amount), 0);

    const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not Connected";
    const displayAddress = isClient ? shortAddress : "Not Connected";
    const hasWallet = isClient && !!address;

    const promoPoster = posters.find(p => p.type === 'promo') || {
        title: "Become The Protocol Owner",
        description: "Unlock governance rights, revenue sharing, and elite tier withdrawal limits.",
        link: "/dashboard"
    };

    const launchPoster = posters.find(p => p.type === 'launch') || {
        title: "Lucky Draw Jackpot",
        description: "Enter the next draw and secure a share of the protocol prize pool.",
        link: "/dashboard/lucky-draw",
        stats: [
            { label: "Prize Pool", value: "$25,000" },
            { label: "Tickets", value: "Unlimited" },
            { label: "Draw", value: "Daily" }
        ]
    };

    return (
        <div className="bg-transparent pb-32">
            <main className="container mx-auto px-4 py-6 space-y-8">

                {/* Simplified Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-black via-black/95 to-black/90 border border-white/10 shadow-2xl"
                >
                    {/* Background Effects */}
                    <div className={cn(
                        "absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--gradient-color),transparent_60%)] transition-colors duration-700",
                        isRealMode ? "[--gradient-color:rgba(245,158,11,0.12)]" : "[--gradient-color:rgba(16,185,129,0.12)]"
                    )} />

                    <div className="relative z-10 p-8">
                        {/* Top Row: Title + Mode Toggle + Actions */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                            <div>
                                <div className={cn(
                                    "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black tracking-widest uppercase mb-3",
                                    isRealMode
                                        ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                )}>
                                    <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isRealMode ? "bg-amber-500" : "bg-emerald-500")} />
                                    Dashboard
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-display font-black text-white tracking-tight">
                                    Welcome Back
                                </h1>
                                <p className="text-white/50 mt-2">{displayAddress}</p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                {/* Mode Toggle */}
                                <div className="flex items-center gap-1 p-1 bg-black/60 border border-white/10 rounded-xl shadow-lg">
                                    <button
                                        onClick={() => setIsRealMode(false)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                            !isRealMode ? "bg-white text-black" : "text-white/40 hover:text-white"
                                        )}
                                    >
                                        Practice
                                    </button>
                                    <button
                                        onClick={() => hasRealAccess && setIsRealMode(true)}
                                        disabled={!hasRealAccess}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                                            isRealMode ? "bg-primary text-black" : "text-white/40 hover:text-white",
                                            !hasRealAccess && "opacity-40 cursor-not-allowed"
                                        )}
                                    >
                                        <ShieldCheck className="h-3 w-3" />
                                        Real
                                    </button>
                                </div>

                                <QuickActions
                                    onDeposit={() => setIsDepositOpen(true)}
                                    onWithdraw={() => setIsWithdrawOpen(true)}
                                    isRealMode={isRealMode}
                                />
                            </div>
                        </div>

                        {/* Bottom Row: Stats + Timer */}
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                            <div className={cn(
                                "flex items-center gap-6 p-5 pr-10 rounded-2xl backdrop-blur-sm border transition-all",
                                isRealMode
                                    ? "bg-amber-500/5 border-amber-500/10"
                                    : "bg-emerald-500/5 border-emerald-500/10"
                            )}>
                                <div className={cn(
                                    "h-16 w-16 rounded-xl flex items-center justify-center border",
                                    isRealMode
                                        ? "bg-amber-500/20 border-amber-500/20"
                                        : "bg-emerald-500/20 border-emerald-500/20"
                                )}>
                                    {isRealMode ?
                                        <ShieldCheck className="h-8 w-8 text-amber-500" /> :
                                        <Coins className="h-8 w-8 text-emerald-500" />
                                    }
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
                                        {isRealMode ? "Total Assets" : "Practice Balance"}
                                    </div>
                                    <div className="text-4xl font-mono font-bold text-white tracking-tight flex items-baseline gap-2">
                                        {isRealMode ? (realBalances.totalUnified || 0).toFixed(2) : practiceBalance}
                                        <span className={cn("text-sm font-bold", isRealMode ? "text-amber-500" : "text-emerald-500")}>USDT</span>
                                    </div>
                                </div>
                            </div>

                            <CountdownTimer expiryDate={practiceExpiry} />
                        </div>
                    </div>
                </motion.div>

                {/* Real Money Unlock Banner */}
                {!hasRealAccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl overflow-hidden bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4"
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                <ShieldCheck className="h-6 w-6 text-amber-500 animate-pulse" />
                            </div>
                            <div>
                                <div className="text-sm font-black text-white">Unlock Real Money Mode</div>
                                <p className="text-xs text-white/60">Make your first deposit to start earning real rewards.</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setIsDepositOpen(true)}
                            className="bg-amber-500 text-black hover:bg-amber-400 font-black uppercase text-xs px-6 h-10 rounded-xl whitespace-nowrap"
                        >
                            <Wallet className="h-4 w-4 mr-2" />
                            Make Deposit
                        </Button>
                    </motion.div>
                )}

                {/* Hero Section: Game CTA + Protocol Owner */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Game CTA */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Promotional Carousel */}
                        <PromoCarousel />
                        <LaunchPoster
                            title={launchPoster.title}
                            description={launchPoster.description}
                            link={launchPoster.link}
                            stats={launchPoster.stats}
                            imageUrl={launchPoster.imageUrl}
                        />
                    </div>

                    {/* Right: Protocol Owner Poster */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1"
                    >
                        <PromoPoster
                            title={promoPoster.title}
                            description={promoPoster.description}
                            link={promoPoster.link}
                            imageUrl={promoPoster.imageUrl}
                        />
                    </motion.div>
                </div>

                {/* Live Winner Ticker */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <LiveWinnerFeed variant="ticker" maxItems={15} />
                </motion.div>

                {/* Row 1: Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0, duration: 0.5, type: "spring", stiffness: 100 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                    >
                        <StatCard
                            title="Total Balance"
                            value={`${isRealMode ? (realBalances.totalUnified || 0).toFixed(2) : practiceBalance} USDT`}
                            subtitle={isRealMode ? "Real Money" : "Practice Mode"}
                            icon={Wallet}
                            color={isRealMode ? "amber" : "emerald"}
                        />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 100 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                    >
                        <StatCard
                            title="Performance"
                            value={`${winRate}%`}
                            subtitle={`${wins} wins / ${gamesPlayed} games`}
                            icon={TrendingUp}
                            trend={{ value: `${netChange.toFixed(2)} USDT`, isPositive: netChange >= 0 }}
                            color="cyan"
                        />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 100 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                    >
                        <StatCard
                            title="Network"
                            value={user?.directReferrals || 0}
                            subtitle={isRegisteredOnChain ? "On-chain verified" : "Registration pending"}
                            icon={Users}
                            color="purple"
                        />
                    </motion.div>
                </div>

                {/* Row 2: Analytics */}
                <div className="grid lg:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
                        whileHover={{ scale: 1.01 }}
                        className="lg:col-span-2 h-[400px]"
                    >
                        <EarningsNexus />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
                        whileHover={{ scale: 1.01 }}
                        className="lg:col-span-1 h-[400px]"
                    >
                        <HardenedCapital />
                    </motion.div>
                </div>

                {/* Row 3: Performance */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6, type: "spring" }}
                >
                    <PerformanceMetrics />
                </motion.div>

                {/* Row 4: Income Modules */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.6, type: "spring" }}
                >
                    <h2 className="text-2xl font-bold text-white mb-6">Income Streams</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <IncomeModuleCard
                            title="Winners Income"
                            description="Win 2X instantly. 6X auto-reinvested for ecosystem growth."
                            icon={Trophy}
                            moduleId="Module_01"
                            multiplier="8.0x"
                            href="/dashboard/income"
                            color="orange"
                        />
                        <IncomeModuleCard
                            title="Referral Levels"
                            description="Build your network. Earn from 10 dynamic levels."
                            icon={Users}
                            moduleId="Module_02"
                            stat={{ label: "Network Depth", value: "L1-L10" }}
                            href="/dashboard/referral"
                            color="emerald"
                        />
                        <LuckyDraw />
                        <IncomeModuleCard
                            title="Cashback Cycle"
                            description="Sustainable safety net. 100% sustainability for every roll."
                            icon={Zap}
                            moduleId="Module_04"
                            stat={{ label: "Protocol", value: "Auto-Return" }}
                            href="/dashboard/cashback"
                            color="cyan"
                        />
                    </div>
                </motion.div>
            </main>

            {/* Modals */}
            <DepositModal
                isOpen={isDepositOpen}
                onClose={() => setIsDepositOpen(false)}
                onConfirm={async (amount: number) => {
                    await deposit(amount);
                }}
            />
            <WithdrawalModal
                isOpen={isWithdrawOpen}
                onClose={() => setIsWithdrawOpen(false)}
            />
        </div>
    );
}
