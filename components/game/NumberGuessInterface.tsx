"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Dices, Trophy, XCircle, Timer, History as HistoryIcon } from "lucide-react";

interface NumberGuessInterfaceProps {
    onPlaceEntry: (prediction: number, amount: number) => void;
    isProcessing: boolean;
    lastResult: { won: boolean; number: number; pick: number; hash: string; amount: number } | null;
    currencyLabel?: string;
}

export function NumberGuessInterface({ onPlaceEntry, isProcessing, lastResult, currencyLabel = "USDT" }: NumberGuessInterfaceProps) {
    const [selectedNumber, setSelectedNumber] = useState<number | null>(7); // Default to 7 like in screenshot
    const [amount, setAmount] = useState<string>("1");

    const quickBets = [1, 5, 10, 50];

    const handlePlaceBet = () => {
        if (selectedNumber === null || isProcessing) return;
        const betAmount = parseFloat(amount);
        if (isNaN(betAmount) || betAmount <= 0) return;
        onPlaceEntry(selectedNumber, betAmount);
    };

    const [timeLeft, setTimeLeft] = useState(363); // Starts at 06:03

    // Timer logic
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 363));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate precision ring progress
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const progress = (timeLeft / 363) * 100;
    const dashOffset = circumference - (progress / 100) * circumference;

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Timer Header */}
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                    {/* Glow effect matching screenshot */}
                    <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full" />

                    <div className="relative bg-black/80 border border-yellow-500/30 rounded-full h-36 w-36 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.1)]">
                        <div className="text-center z-10">
                            <Dices className="h-6 w-6 text-white mx-auto mb-1 opacity-80" />
                            <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">Next Draw</div>
                            <div className="text-3xl font-black text-amber-500 font-mono tracking-tighter drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                                {formatTime(timeLeft)}
                            </div>
                        </div>

                        {/* Ring Progress */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90 p-1">
                            {/* Track */}
                            <circle
                                cx="50%" cy="50%" r={radius}
                                stroke="currentColor" strokeWidth="3"
                                fill="transparent"
                                className="text-white/10"
                            />
                            {/* Progress Indicator */}
                            <circle
                                cx="50%" cy="50%" r={radius}
                                stroke="currentColor" strokeWidth="3"
                                fill="transparent"
                                className="text-amber-500 transition-all duration-1000 ease-linear"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Game Board */}
            <div className="bg-[#0F1115] border border-white/5 rounded-3xl p-6 space-y-6 shadow-2xl">
                <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Select Winning Number</span>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-5 gap-3">
                    {Array.from({ length: 10 }, (_, i) => i).map((num) => (
                        <motion.button
                            key={num}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => !isProcessing && setSelectedNumber(num)}
                            className={cn(
                                "aspect-square rounded-xl font-black text-xl flex items-center justify-center transition-all duration-300",
                                selectedNumber === num
                                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-110 z-10"
                                    : "bg-[#1A1D24] text-white hover:bg-[#252830]"
                            )}
                        >
                            {num}
                        </motion.button>
                    ))}
                </div>

                {/* Bet Input */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-[#0A0B0D] p-1.5 rounded-2xl border border-white/5">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-transparent w-full px-4 text-white font-mono font-bold focus:outline-none"
                            placeholder="Amount"
                        />
                        <div className="flex gap-1">
                            {quickBets.map(val => (
                                <button
                                    key={val}
                                    onClick={() => setAmount(val.toString())}
                                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white/60 transition-colors"
                                >
                                    {val}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <Button
                    onClick={handlePlaceBet}
                    disabled={isProcessing || selectedNumber === null}
                    className={cn(
                        "w-full h-14 rounded-xl font-black uppercase tracking-widest text-sm transition-all duration-300 shadow-lg",
                        isProcessing
                            ? "bg-white/10 text-white/20 cursor-wait"
                            : "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20"
                    )}
                >
                    {isProcessing ? (
                        <span className="flex items-center gap-2 animate-pulse">
                            <Dices className="h-4 w-4 animate-spin" /> Processing Protocol...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Dices className="h-4 w-4" /> Place Bet
                        </span>
                    )}
                </Button>
            </div>

            {/* Recent Results (Placeholder UI matching screenshot) */}
            <div className="bg-[#0F1115] border border-white/5 rounded-3xl p-6 space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/30">Recent Results</div>
                <div className="flex gap-2">
                    {/* Just a static placeholder to match the '1' in the screenshot, or last result if available */}
                    {lastResult && (
                        <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm border",
                            lastResult.won
                                ? "bg-green-500/20 border-green-500/50 text-green-500"
                                : "bg-pink-500/20 border-pink-500/50 text-pink-500"
                        )}>
                            {lastResult.number}
                        </div>
                    )}
                    <div className="h-8 w-8 rounded-lg bg-pink-500/20 border border-pink-500/50 flex items-center justify-center font-bold text-sm text-pink-500 opacity-50">1</div>
                </div>
            </div>

        </div>
    );
}
