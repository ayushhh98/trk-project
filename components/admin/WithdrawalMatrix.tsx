"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CheckCircle2, Lock, Shield, Zap, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const TIERS = [
    {
        id: "none",
        name: "Inactive",
        threshold: 0,
        color: "zinc",
        icon: Lock,
        benefits: [
            { text: "Play Standard Games (Fun)", unlocked: true },
            { text: "Withdraw Direct Level Income", unlocked: false },
            { text: "Withdraw Winners Income", unlocked: false },
            { text: "Access Practice Transfer", unlocked: false }
        ]
    },
    {
        id: "tier1",
        name: "Basic Node",
        threshold: 10,
        color: "blue",
        icon: Zap,
        benefits: [
            { text: "Withdraw Direct Level Income", unlocked: true },
            { text: "Withdraw Winners Income", unlocked: true },
            { text: "Participation in Lucky Draw", unlocked: true },
            { text: "Access Practice Transfer", unlocked: false }
        ]
    },
    {
        id: "tier2",
        name: "Full Activation",
        threshold: 100,
        color: "emerald",
        icon: Shield,
        benefits: [
            { text: "Transfer Practice to Real", unlocked: true },
            { text: "Withdraw All Profit Streams", unlocked: true },
            { text: "Cashback Protection Active", unlocked: true },
            { text: "All 15 Income Levels Unlocked", unlocked: true }
        ]
    }
];

interface WithdrawalMatrixProps {
    currentTier?: string;
    totalDeposited?: number;
}

export function WithdrawalMatrix({ currentTier = "none", totalDeposited = 0 }: WithdrawalMatrixProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier) => {
                const isActive = currentTier === tier.id;
                const isCompleted = (tier.id === 'none') ||
                    (tier.id === 'tier1' && (currentTier === 'tier1' || currentTier === 'tier2')) ||
                    (tier.id === 'tier2' && currentTier === 'tier2');

                return (
                    <Card
                        key={tier.id}
                        className={cn(
                            "relative overflow-hidden transition-all duration-500",
                            isActive ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-white/5 bg-white/[0.02]"
                        )}
                    >
                        {isActive && (
                            <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-bl-xl">
                                Current Status
                            </div>
                        )}

                        <CardHeader className="pb-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-500",
                                isActive ? "bg-primary text-black scale-110" : "bg-white/5 text-white/20"
                            )}>
                                <tier.icon className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-xl font-display font-black italic uppercase tracking-tight text-white">
                                {tier.name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
                                {tier.threshold === 0 ? "Entry Level" : `Min Deposit: ${tier.threshold} USDT`}
                            </p>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                {tier.benefits.map((benefit, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        {benefit.unlocked ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                                        ) : (
                                            <Lock className="h-4 w-4 text-white/10 mt-0.5" />
                                        )}
                                        <span className={cn(
                                            "text-xs font-medium",
                                            benefit.unlocked ? "text-white/80" : "text-white/20"
                                        )}>
                                            {benefit.text}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 mt-4 border-t border-white/5">
                                <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-white/30 mb-2">
                                    <span>Deployment Progress</span>
                                    <span>{Math.min(100, Math.round((totalDeposited / (tier.threshold || 1)) * 100))}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full transition-all duration-1000",
                                            isActive ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "bg-white/10"
                                        )}
                                        style={{ width: `${Math.min(100, (totalDeposited / (tier.threshold || 1)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
