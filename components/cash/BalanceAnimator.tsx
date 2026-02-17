"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BalanceAnimatorProps {
    balance: string | number;
    className?: string;
    prefix?: string;
    suffix?: string;
}

export function BalanceAnimator({ balance, className = "", prefix = "", suffix = " USDT" }: BalanceAnimatorProps) {
    const [displayBalance, setDisplayBalance] = useState(balance);
    const [isAnimating, setIsAnimating] = useState(false);
    const [delta, setDelta] = useState<number | null>(null);

    useEffect(() => {
        const numBalance = typeof balance === 'string' ? parseFloat(balance) : balance;
        const numDisplay = typeof displayBalance === 'string' ? parseFloat(displayBalance) : displayBalance;

        if (numBalance !== numDisplay) {
            const diff = numBalance - numDisplay;
            setDelta(diff);
            setIsAnimating(true);

            // Animate number counting up/down
            const duration = 800;
            const steps = 30;
            const increment = diff / steps;
            let currentStep = 0;

            const interval = setInterval(() => {
                currentStep++;
                if (currentStep >= steps) {
                    setDisplayBalance(balance);
                    clearInterval(interval);
                    setTimeout(() => {
                        setIsAnimating(false);
                        setDelta(null);
                    }, 1000);
                } else {
                    setDisplayBalance((numDisplay + (increment * currentStep)).toFixed(2));
                }
            }, duration / steps);

            return () => clearInterval(interval);
        }
    }, [balance]);

    return (
        <div className="relative inline-block">
            <motion.div
                className={className}
                animate={isAnimating ? {
                    scale: [1, 1.1, 1],
                    color: delta && delta > 0 ? ['#ffffff', '#10b981', '#ffffff'] : ['#ffffff', '#ef4444', '#ffffff']
                } : {}}
                transition={{ duration: 0.5 }}
            >
                {prefix}{displayBalance}{suffix}
            </motion.div>

            <AnimatePresence>
                {delta !== null && (
                    <motion.div
                        initial={{ opacity: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: 1, y: -30, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.5 }}
                        transition={{ duration: 1 }}
                        className={`absolute left-full ml-2 top-0 font-mono font-bold text-sm ${delta > 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                    >
                        {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
