import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LucideIcon, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface IncomeModuleCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    moduleId: string;
    multiplier?: string;
    stat?: {
        label: string;
        value: string;
    };
    href: string;
    color?: "emerald" | "amber" | "cyan" | "orange" | "purple" | "blue" | "indigo";
    isLocked?: boolean;
}

export function IncomeModuleCard({
    title,
    description,
    icon: Icon,
    moduleId,
    multiplier,
    stat,
    href,
    color = "emerald",
    isLocked = false
}: IncomeModuleCardProps) {
    const colorClasses = {
        emerald: {
            border: "border-emerald-500/20 hover:border-emerald-500/50",
            bg: "bg-emerald-500/5 group-hover:bg-emerald-500/10",
            icon: "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black",
            badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
            text: "text-emerald-500",
            button: "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-black",
            glow: "hover:shadow-[0_0_40px_rgba(16,185,29,0.15)]",
            scanline: "bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"
        },
        amber: {
            border: "border-amber-500/20 hover:border-amber-500/50",
            bg: "bg-amber-500/5 group-hover:bg-amber-500/10",
            icon: "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-black",
            badge: "bg-amber-500/10 border-amber-500/20 text-amber-500",
            text: "text-amber-500",
            button: "border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-black",
            glow: "hover:shadow-[0_0_40px_rgba(245,158,11,0.15)]",
            scanline: "bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
        },
        orange: {
            border: "border-orange-500/20 hover:border-orange-500/50",
            bg: "bg-orange-500/5 group-hover:bg-orange-500/10",
            icon: "bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-black",
            badge: "bg-orange-500/10 border-orange-500/20 text-orange-500",
            text: "text-orange-500",
            button: "border-orange-500/30 text-orange-500 hover:bg-orange-500 hover:text-black",
            glow: "hover:shadow-[0_0_40px_rgba(249,115,22,0.15)]",
            scanline: "bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"
        },
        cyan: {
            border: "border-cyan-500/20 hover:border-cyan-500/50",
            bg: "bg-cyan-500/5 group-hover:bg-cyan-500/10",
            icon: "bg-cyan-500/10 text-cyan-500 group-hover:bg-cyan-500 group-hover:text-black",
            badge: "bg-cyan-500/10 border-cyan-500/20 text-cyan-500",
            text: "text-cyan-500",
            button: "border-cyan-500/30 text-cyan-500 hover:bg-cyan-500 hover:text-black",
            glow: "hover:shadow-[0_0_40px_rgba(6,182,212,0.15)]",
            scanline: "bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"
        },
        purple: {
            border: "border-purple-500/20 hover:border-purple-500/50",
            bg: "bg-purple-500/5 group-hover:bg-purple-500/10",
            icon: "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-black",
            badge: "bg-purple-500/10 border-purple-500/20 text-purple-500",
            text: "text-purple-500",
            button: "border-purple-500/30 text-purple-500 hover:bg-purple-500 hover:text-black",
            glow: "hover:shadow-[0_0_40px_rgba(168,85,247,0.15)]",
            scanline: "bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"
        },
        blue: {
            border: "border-blue-500/20 hover:border-blue-500/50",
            bg: "bg-blue-500/5 group-hover:bg-blue-500/10",
            icon: "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-black",
            badge: "bg-blue-500/10 border-blue-500/20 text-blue-500",
            text: "text-blue-500",
            button: "border-blue-500/30 text-blue-500 hover:bg-blue-500 hover:text-black",
            glow: "hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]",
            scanline: "bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"
        },
        indigo: {
            border: "border-indigo-500/20 hover:border-indigo-500/50",
            bg: "bg-indigo-500/5 group-hover:bg-indigo-500/10",
            icon: "bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-black",
            badge: "bg-indigo-500/10 border-indigo-500/20 text-indigo-500",
            text: "text-indigo-500",
            button: "border-indigo-500/30 text-indigo-500 hover:bg-indigo-500 hover:text-black",
            glow: "hover:shadow-[0_0_40px_rgba(79,70,229,0.15)]",
            scanline: "bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"
        }
    };

    const colors = colorClasses[color];

    return (
        <Card className={cn(
            "h-full bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden group relative transition-all duration-500",
            colors.border,
            !isLocked && colors.glow,
            isLocked && "opacity-75 grayscale brightness-75 hover:opacity-100 hover:grayscale-0 hover:brightness-100"
        )}>
            <div className={cn("absolute inset-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100", !isLocked && colors.bg)} />

            {isLocked && (
                <div className="absolute top-4 right-4 z-20">
                    <div className="h-8 w-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-md">
                        <Lock className="h-4 w-4 text-white/50" />
                    </div>
                </div>
            )}

            <CardContent className="p-6 space-y-6 relative z-10">
                <div className="flex justify-between items-start">
                    <div className={cn(
                        "h-14 w-14 rounded-xl flex items-center justify-center transition-all duration-300",
                        !isLocked ? colors.icon : "bg-white/5 text-white/20"
                    )}>
                        <Icon className="h-7 w-7" />
                    </div>
                    <div className={cn(
                        "px-3 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-widest",
                        !isLocked ? colors.badge : "bg-white/5 border-white/10 text-white/30"
                    )}>
                        {moduleId}
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className={cn("text-xl font-bold", isLocked ? "text-white/60" : "text-white")}>{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    {stat && (
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">{stat.label}</span>
                            <span className={cn("text-lg font-mono font-bold", !isLocked ? colors.text : "text-white/40")}>{stat.value}</span>
                        </div>
                    )}
                    {multiplier && !stat && (
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Multiplier</span>
                            <span className={cn("text-lg font-mono font-bold", !isLocked ? colors.text : "text-white/40")}>{multiplier}</span>
                        </div>
                    )}

                    {isLocked ? (
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-white/10 text-white/30 cursor-not-allowed hover:bg-transparent"
                            disabled
                        >
                            Locked
                        </Button>
                    ) : (
                        <Link href={href}>
                            <Button
                                size="sm"
                                variant="outline"
                                className={cn(
                                    "group-hover:translate-x-1 transition-all",
                                    colors.button
                                )}
                            >
                                View
                            </Button>
                        </Link>
                    )}
                </div>
            </CardContent>

            {/* Scanline Effect */}
            {!isLocked && (
                <div className={cn(
                    "absolute inset-x-0 bottom-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                    colors.scanline
                )} />
            )}
        </Card>
    );
}
