"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Confetti {
    id: number;
    x: number;
    y: number;
    rotation: number;
    color: string;
    size: number;
}

export function ConfettiEffect() {
    const [confetti, setConfetti] = useState<Confetti[]>([]);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        const handleDepositSuccess = (event: CustomEvent) => {
            setIsActive(true);
            const pieces: Confetti[] = [];
            const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

            for (let i = 0; i < 50; i++) {
                pieces.push({
                    id: Date.now() + i,
                    x: Math.random() * window.innerWidth,
                    y: -20,
                    rotation: Math.random() * 360,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: Math.random() * 10 + 5
                });
            }

            setConfetti(pieces);

            setTimeout(() => {
                setIsActive(false);
                setConfetti([]);
            }, 3000);
        };

        window.addEventListener('deposit-success', handleDepositSuccess as EventListener);

        return () => {
            window.removeEventListener('deposit-success', handleDepositSuccess as EventListener);
        };
    }, []);

    if (!isActive) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            <AnimatePresence>
                {confetti.map((piece) => (
                    <motion.div
                        key={piece.id}
                        initial={{
                            x: piece.x,
                            y: piece.y,
                            opacity: 1,
                            rotate: piece.rotation
                        }}
                        animate={{
                            y: window.innerHeight + 100,
                            x: piece.x + (Math.random() - 0.5) * 200,
                            rotate: piece.rotation + 720,
                            opacity: 0
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: 2 + Math.random() * 1,
                            ease: "easeIn"
                        }}
                        style={{
                            position: 'absolute',
                            width: piece.size,
                            height: piece.size,
                            backgroundColor: piece.color,
                            borderRadius: Math.random() > 0.5 ? '50%' : '0%'
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
