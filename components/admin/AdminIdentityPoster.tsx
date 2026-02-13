"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Command, ArrowRight, Hexagon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function AdminIdentityPoster() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
        >
            <Card className="relative overflow-hidden bg-[#0A0A0A] border-white/5 rounded-[2.5rem] min-h-[300px] flex items-center group perspective-1000">
                {/* Background Animations */}
                <motion.div
                    className="absolute inset-0 bg-[url('/admin-access-control-bg-v2.jpg')] bg-cover bg-center"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{
                        opacity: 0.5,
                        scale: 1,
                        filter: "contrast(1.25) saturate(1.5)"
                    }}
                    whileHover={{
                        scale: 1.05,
                        opacity: 0.6
                    }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                />

                {/* Animated Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/80" />
                <motion.div
                    className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 mixed-blend-overlay"
                    animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />

                {/* Dynamic Glow Orbs */}
                <motion.div
                    className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.2, 0.3, 0.2]
                    }}
                    transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
                />
                <motion.div
                    className="absolute top-1/2 -right-24 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", delay: 1 }}
                />

                <CardContent className="relative z-10 w-full p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-8 max-w-2xl">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]"
                        >
                            <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            >
                                <Command className="h-3 w-3" />
                            </motion.div>
                            Brand Command
                        </motion.div>

                        <div className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.6 }}
                                className="flex items-center gap-5"
                            >
                                <div className="relative group/icon">
                                    <div className="absolute inset-0 bg-yellow-500/20 rounded-xl blur-xl group-hover/icon:blur-2xl transition-all duration-500" />
                                    <div className="relative h-14 w-14 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 flex items-center justify-center text-yellow-500 shadow-[0_0_30px_-10px_rgba(234,179,8,0.3)]">
                                        <Hexagon className="h-8 w-8 fill-yellow-500/20" strokeWidth={2.5} />
                                    </div>
                                </div>
                                <div>
                                    <h1 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter italic leading-none">
                                        TRK <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40 not-italic">Admin</span>
                                    </h1>
                                </div>
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4, duration: 0.6 }}
                                className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/50 uppercase tracking-widest leading-none pl-1"
                            >
                                Access Control
                            </motion.h2>
                        </div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                            className="text-sm font-medium text-white/50 leading-relaxed max-w-lg border-l-2 border-white/10 pl-4 py-2"
                        >
                            Showcase your protocol&apos;s brand directly in the admin overview. Use this panel to reinforce trust, highlight milestones, and route operators to key actions.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <Button
                            size="lg"
                            className="relative h-16 px-10 rounded-2xl bg-white text-black hover:bg-white/90 font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] group overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Manage Access
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </Button>
                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-medium animate-pulse">
                            Restricted Area
                        </span>
                    </motion.div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
