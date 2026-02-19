"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Sparkles, Ticket, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

interface Stat {
    label: string;
    value: string;
}

interface LaunchPosterProps {
    title?: string;
    description?: string;
    link?: string;
    stats?: Stat[];
    imageUrl?: string;
}

export function LaunchPoster({
    title,
    description,
    link = "/dashboard/lucky-draw",
    stats = [],
    imageUrl
}: LaunchPosterProps) {
    if (!title) return null; // Don't render if no title is provided (ensures no fake data)

    const defaultCards = [
        { color: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/30" },
        { color: "from-orange-500/20 to-red-500/20", border: "border-orange-500/30" },
        { color: "from-red-500/20 to-amber-500/20", border: "border-red-500/30" }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
            whileHover={{ scale: 1.01, y: -4 }}
            className="group relative overflow-hidden rounded-[2.5rem] border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-black p-10 shadow-[0_0_80px_rgba(245,158,11,0.15)] transition-all duration-500 hover:shadow-[0_0_120px_rgba(245,158,11,0.25)]"
        >
            {imageUrl && (
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-20"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                />
            )}
            {/* Animated Background Effects */}
            <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-amber-500/30 blur-[140px] group-hover:scale-125 transition-transform duration-700" />
            <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-orange-500/20 blur-[100px] group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.25),transparent_60%)] opacity-80 group-hover:opacity-100 transition-opacity" />

            {/* Animated Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(245,158,11,0.05)_1px,transparent_1px),linear-gradient(rgba(245,158,11,0.05)_1px,transparent_1px)] bg-[size:24px_24px] opacity-30 group-hover:opacity-50 transition-opacity" />

            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

            <div className="relative z-10 space-y-8">
                {/* Badge */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] backdrop-blur-sm"
                >
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                    Featured Drop
                    <Zap className="h-3.5 w-3.5" />
                </motion.div>

                {/* Title Section */}
                <div className="space-y-3">
                    <motion.h3
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-4xl md:text-5xl font-display font-black uppercase tracking-tight"
                    >
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-500 drop-shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                            {title}
                        </span>
                    </motion.h3>
                    <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-sm text-white/70 max-w-xl leading-relaxed"
                    >
                        {description}
                    </motion.p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 + i * 0.1 }}
                            whileHover={{ scale: 1.05, y: -3 }}
                            className={`rounded-2xl border ${defaultCards[i]?.border || defaultCards[0].border} bg-gradient-to-br ${defaultCards[i]?.color || defaultCards[0].color} backdrop-blur-md p-5 shadow-lg hover:shadow-xl transition-all duration-300`}
                        >
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/50">{stat.label}</div>
                            <div className="text-2xl font-black text-white mt-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{stat.value}</div>
                        </motion.div>
                    ))}
                </div>

                {/* CTA Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2"
                >
                    <Link href={link} className="w-full sm:w-auto">
                        <Button className="group/btn w-full sm:w-auto h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black uppercase text-sm px-8 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_50px_rgba(245,158,11,0.6)] transition-all duration-300 hover:scale-105">
                            <Ticket className="h-5 w-5" />
                            Enter Lucky Draw
                            <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/50">
                        <ShieldCheck className="h-4 w-4 text-amber-400" />
                        Verified & Audited
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
