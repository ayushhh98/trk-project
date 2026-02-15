"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TrendingUp, Download, Share2, Users, Target, Activity, Zap, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

export function PerformanceMetrics() {
    const { user, realBalances, gameHistory, totalProfit } = useWallet();
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    // ROI Calculation using totalProfit
    const totalDeposited = user?.activation?.totalDeposited || 0;
    const safeProfit = totalProfit || 0;
    const roi = totalDeposited > 0 && !isNaN(safeProfit)
        ? (safeProfit / totalDeposited) * 100
        : 0;

    // 2. Lifetime Earnings
    // Sum of all winnings + recovered cashback + commissions
    const lifetimeEarnings = Number((user?.totalWinnings || 0)) +
        Number((user?.cashbackStats?.totalRecovered || 0)) +
        Number((user?.teamStats?.totalCommission || 0));

    // 3. Network Acceleration (Active Members)
    const activeMembers = user?.teamStats?.activeMembers || 0;
    const totalMembers = user?.teamStats?.totalMembers || 0;

    // 4. Credit Estimate (Projected)
    // Simple projection: If ROI > 0, project next month based on current velocity
    const currentBalance = Number(realBalances?.totalUnified) || 0;
    const projectionMultiplier = isNaN(roi) ? 1 : (1 + (roi / 100));
    const creditEstimate = currentBalance * projectionMultiplier;

    // Actions
    const handleDownloadReport = () => {
        if (!gameHistory || gameHistory.length === 0) {
            toast.error("No data available for report generation.");
            return;
        }

        // Generate CSV
        const headers = ["ID", "Time", "Game", "Prediction", "Entry", "Outcome", "Payout", "Hash"];
        const rows = gameHistory.map(g => [
            g.id,
            new Date(g.timestamp).toISOString(),
            g.gameType,
            g.prediction,
            g.amount,
            g.won ? "WIN" : "LOSS",
            g.payout,
            g.hash
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `TRK_Performance_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Performance Report Downloaded");
    };

    const referralLink = user?.walletAddress
        ? `https://trk.game/?ref=${user.referralCode || user.walletAddress.slice(2, 8)}`
        : "";

    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink);
        toast.success("Referral Uplink Copied");
    };

    return (
        <div className="space-y-6 mb-8">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-500" />
                    Performance Command Center
                </h3>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                        onClick={handleDownloadReport}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                    </Button>
                    <Button
                        size="sm"
                        className="bg-emerald-500 text-black hover:bg-emerald-400 font-bold"
                        onClick={() => setIsInviteOpen(true)}
                    >
                        <Share2 className="h-4 w-4 mr-2" />
                        Enlist Partner
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Net Profit/Loss Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 }}
                >
                    <Card className="relative overflow-hidden bg-gradient-to-br from-black/60 via-black/40 to-black/60 border border-emerald-500/20 backdrop-blur-xl group hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="p-6 relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className={cn(
                                    "p-2.5 rounded-xl border backdrop-blur-sm",
                                    totalProfit >= 0 ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-rose-500/20 border-rose-500/30 text-rose-400"
                                )}>
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full", totalProfit >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10")}>
                                    {totalProfit >= 0 ? "GAIN" : "LOSS"}
                                </span>
                            </div>
                            <div className="space-y-1.5">
                                <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">Net Winnings</div>
                                <div className={cn("text-2xl font-mono font-black", totalProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                    {totalProfit >= 0 ? "+" : ""}{(isNaN(totalProfit) ? 0 : totalProfit).toFixed(2)} <span className="text-xs opacity-60">USDT</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* ROI Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="relative overflow-hidden bg-gradient-to-br from-black/60 via-black/40 to-black/60 border border-cyan-500/20 backdrop-blur-xl group hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="p-6 relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 backdrop-blur-sm">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full", roi >= 0 ? "text-cyan-400 bg-cyan-500/10" : "text-rose-400 bg-rose-500/10")}>
                                    {roi >= 0 ? "+" : ""}{(isNaN(roi) ? 0 : roi).toFixed(2)}%
                                </span>
                            </div>
                            <div className="space-y-1.5">
                                <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">Performance Index</div>
                                <div className="text-2xl font-mono font-black text-white">
                                    {(isNaN(roi) ? 0 : roi).toFixed(2)}<span className="text-lg opacity-60">%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Lifetime Earnings */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="relative overflow-hidden bg-gradient-to-br from-black/60 via-black/40 to-black/60 border border-amber-500/20 backdrop-blur-xl group hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="p-6 relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 backdrop-blur-sm">
                                    <Target className="h-5 w-5" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full text-amber-400 bg-amber-500/10">Total</span>
                            </div>
                            <div className="space-y-1.5">
                                <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">Lifetime Rewards</div>
                                <div className="text-2xl font-mono font-black text-white">
                                    {(isNaN(lifetimeEarnings) ? 0 : lifetimeEarnings).toFixed(2)} <span className="text-xs opacity-60">USDT</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Network Acceleration */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="relative overflow-hidden bg-gradient-to-br from-black/60 via-black/40 to-black/60 border border-blue-500/20 backdrop-blur-xl group hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="p-6 relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 backdrop-blur-sm">
                                    <Users className="h-5 w-5" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full text-blue-400 bg-blue-500/10">Active</span>
                            </div>
                            <div className="space-y-1.5">
                                <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">Network Speed</div>
                                <div className="text-2xl font-mono font-black text-white">
                                    {activeMembers} <span className="text-xs opacity-40">/ {totalMembers}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Credit Estimate */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="relative overflow-hidden bg-gradient-to-br from-black/60 via-black/40 to-black/60 border border-purple-500/20 backdrop-blur-xl group hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="p-6 relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 backdrop-blur-sm">
                                    <Zap className="h-5 w-5" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full text-purple-400 bg-purple-500/10">Proj.</span>
                            </div>
                            <div className="space-y-1.5">
                                <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">Projected Balance</div>
                                <div className="text-2xl font-mono font-black text-white">
                                    {(isNaN(creditEstimate) ? 0 : creditEstimate).toFixed(2)} <span className="text-xs opacity-60">USDT</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Invite Modal */}
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogContent className="bg-black/90 border-white/10 backdrop-blur-xl text-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-display font-bold uppercase tracking-wider">Enlist Strategic Partner</DialogTitle>
                        <DialogDescription className="text-white/60">
                            Expand your network influence. Partners contribute 10 levels deep to your volume.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center gap-6 py-4">
                        <div className="p-4 bg-white rounded-xl">
                            <QRCodeSVG value={referralLink} size={150} />
                        </div>

                        <div className="w-full space-y-2">
                            <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">Secure Uplink</div>
                            <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                                <code className="flex-1 text-xs font-mono text-emerald-500 truncate">{referralLink}</code>
                                <Button size="sm" onClick={handleCopyLink} className="h-8 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black">
                                    Copy
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            <Button className="w-full bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white" onClick={() => window.open(`https://twitter.com/intent/tweet?text=Join%20my%20syndicate%20on%20TRK%20Game!&url=${referralLink}`, '_blank')}>
                                Twitter
                            </Button>
                            <Button className="w-full bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc] hover:text-white" onClick={() => window.open(`https://t.me/share/url?url=${referralLink}&text=Join%20my%20syndicate!`, '_blank')}>
                                Telegram
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
