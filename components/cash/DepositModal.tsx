"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { X, Wallet, ShieldCheck, ArrowRight, AlertTriangle } from "lucide-react";
import { useSocket } from "@/components/providers/Web3Provider";
import { PausedOverlay } from "@/components/ui/PausedOverlay";

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => Promise<void>;
}

export function DepositModal({ isOpen, onClose, onConfirm }: DepositModalProps) {
    const [amount, setAmount] = useState<string>("50");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const socket = useSocket();
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (!socket) return;

        const handlePause = (data: { paused: boolean }) => {
            setIsPaused(data.paused);
            // Removed auto-close to show overlay instead
        };

        socket.on('system:deposits_paused', handlePause);
        return () => {
            socket.off('system:deposits_paused', handlePause);
        };
    }, [socket]);

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isPaused) return;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;

        setIsSubmitting(true);
        try {
            await onConfirm(numAmount);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="absolute inset-0 bg-amber-500/10 blur-3xl -z-10" />

                <Card className="border-0 bg-[#0A0A0A] ring-1 ring-white/10 rounded-[2rem] overflow-hidden relative">
                    {isPaused && <PausedOverlay title="Deposits Paused" message="Deposits are temporarily suspended by the administrator." />}
                    <div className="relative border-b border-white/5 p-8 flex items-center justify-between overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none" />

                        <div className="relative z-10 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl flex items-center justify-center border border-amber-500/30 bg-amber-500/10 text-amber-500">
                                <Wallet className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-1">Vault_Entry</h2>
                                <h3 className="text-xl font-display font-black tracking-tighter uppercase">USDT_DEPOSIT</h3>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="h-10 w-10 border border-white/10 hover:bg-white/5 flex items-center justify-center transition-colors rounded-lg"
                        >
                            <X className="h-4 w-4 text-white/40" />
                        </button>
                    </div>

                    <CardContent className="p-8 space-y-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Select_Amount</label>
                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Min 1.0 USDT</span>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                {[10, 50, 100, 500].map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => setAmount(val.toString())}
                                        className="py-3 rounded-xl bg-white/5 border border-white/5 hover:border-amber-500/50 hover:bg-amber-500/5 text-xs font-mono font-bold transition-all text-white/60 hover:text-white"
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>

                            <div className="relative group">
                                <div className="absolute inset-0 bg-amber-500/5 rounded-2xl blur-xl group-focus-within:bg-amber-500/10 transition-all" />
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="relative h-16 bg-white/[0.03] border-white/10 rounded-2xl text-center text-2xl font-mono font-bold text-white focus:border-amber-500/50 focus:ring-0 transition-all pr-16"
                                    placeholder="0.00"
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-amber-500 uppercase tracking-widest">
                                    USDT
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                                <ShieldCheck className="h-3 w-3 text-emerald-500" /> Security Protocol
                            </div>
                            <p className="text-[10px] text-white/30 leading-relaxed uppercase tracking-widest">
                                Funds are deposited directly into the TRK Game Contract. Your assets are secured by blockchain transparency.
                            </p>
                        </div>

                        <Button
                            onClick={handleConfirm}
                            disabled={isSubmitting || !amount || parseFloat(amount) <= 0 || isPaused}
                            className={`w-full h-16 bg-amber-500 text-black hover:bg-amber-400 font-black uppercase tracking-widest text-sm rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.2)] transition-all active:scale-[0.98] ${isPaused ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                        >
                            {isSubmitting ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="h-5 w-5 border-2 border-black/30 border-t-black rounded-full"
                                />
                            ) : isPaused ? (
                                <span className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" /> Deposits Paused
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Initialize Proof of Funds <ArrowRight className="h-4 w-4" />
                                </span>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
