import { Card, CardContent } from "@/components/ui/Card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    color?: "emerald" | "amber" | "cyan" | "purple";
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = "emerald" }: StatCardProps) {
    const colorClasses = {
        emerald: {
            border: "border-emerald-500/30 hover:border-emerald-500/60",
            bg: "bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent",
            glow: "shadow-[0_0_40px_rgba(16,185,129,0.15)] hover:shadow-[0_0_60px_rgba(16,185,129,0.25)]",
            iconBg: "bg-gradient-to-br from-emerald-500/25 to-emerald-500/10 border-emerald-500/30",
            iconColor: "text-emerald-400",
            gridPattern: "bg-[linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px)]"
        },
        amber: {
            border: "border-amber-500/30 hover:border-amber-500/60",
            bg: "bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent",
            glow: "shadow-[0_0_40px_rgba(245,158,11,0.15)] hover:shadow-[0_0_60px_rgba(245,158,11,0.25)]",
            iconBg: "bg-gradient-to-br from-amber-500/25 to-amber-500/10 border-amber-500/30",
            iconColor: "text-amber-400",
            gridPattern: "bg-[linear-gradient(90deg,rgba(245,158,11,0.05)_1px,transparent_1px),linear-gradient(rgba(245,158,11,0.05)_1px,transparent_1px)]"
        },
        cyan: {
            border: "border-cyan-500/30 hover:border-cyan-500/60",
            bg: "bg-gradient-to-br from-cyan-500/15 via-cyan-500/5 to-transparent",
            glow: "shadow-[0_0_40px_rgba(6,182,212,0.15)] hover:shadow-[0_0_60px_rgba(6,182,212,0.25)]",
            iconBg: "bg-gradient-to-br from-cyan-500/25 to-cyan-500/10 border-cyan-500/30",
            iconColor: "text-cyan-400",
            gridPattern: "bg-[linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px)]"
        },
        purple: {
            border: "border-purple-500/30 hover:border-purple-500/60",
            bg: "bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-transparent",
            glow: "shadow-[0_0_40px_rgba(168,85,247,0.15)] hover:shadow-[0_0_60px_rgba(168,85,247,0.25)]",
            iconBg: "bg-gradient-to-br from-purple-500/25 to-purple-500/10 border-purple-500/30",
            iconColor: "text-purple-400",
            gridPattern: "bg-[linear-gradient(90deg,rgba(168,85,247,0.05)_1px,transparent_1px),linear-gradient(rgba(168,85,247,0.05)_1px,transparent_1px)]"
        },
    };

    const currentColors = colorClasses[color];

    return (
        <Card className={cn(
            "relative overflow-hidden border bg-black/60 backdrop-blur-xl rounded-[1.75rem] transition-all duration-500 group",
            currentColors.border,
            currentColors.bg,
            currentColors.glow
        )}>
            {/* Animated Grid Pattern */}
            <div className={cn(
                "absolute inset-0 bg-[size:20px_20px] opacity-30 group-hover:opacity-50 transition-opacity duration-500",
                currentColors.gridPattern
            )} />

            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

            <CardContent className="relative p-7">
                <div className="flex items-start justify-between mb-5">
                    <div className={cn(
                        "h-14 w-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-lg",
                        currentColors.iconBg
                    )}>
                        <Icon className={cn("h-7 w-7", currentColors.iconColor)} />
                    </div>
                    {trend && (
                        <div className={cn(
                            "text-sm font-black px-3 py-1.5 rounded-xl backdrop-blur-sm border",
                            trend.isPositive
                                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                                : "text-red-400 bg-red-500/10 border-red-500/30"
                        )}>
                            {trend.isPositive ? "+" : ""}{trend.value}
                        </div>
                    )}
                </div>
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">{title}</p>
                    <p className="text-4xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">{value}</p>
                    {subtitle && (
                        <p className="text-xs text-white/60 font-medium">{subtitle}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
