"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface Slide {
    id: number;
    title: string;
    subtitle: string;
    bgGradient: string;
    glowColor: string;
    buttonText: string;
    href: string;
}

const slides: Slide[] = [
    {
        id: 1,
        title: "Ready to Play?",
        subtitle: "Start earning rewards and building your empire.",
        bgGradient: "from-amber-500/10 via-black to-black",
        glowColor: "rgba(251,191,36,0.15)",
        buttonText: "Launch Game",
        href: "/dashboard/practice"
    },
    {
        id: 2,
        title: "Win 2X Instantly",
        subtitle: "6X Auto-Reinvested for exponential growth.",
        bgGradient: "from-emerald-500/10 via-black to-black",
        glowColor: "rgba(16,185,129,0.15)",
        buttonText: "Start Winning",
        href: "/dashboard/practice"
    },
    {
        id: 3,
        title: "Build Your Network",
        subtitle: "Earn from 10 levels deep. Unlimited potential.",
        bgGradient: "from-cyan-500/10 via-black to-black",
        glowColor: "rgba(6,182,212,0.15)",
        buttonText: "Grow Network",
        href: "/dashboard/referral"
    },
    {
        id: 4,
        title: "Jackpot Rewards",
        subtitle: "Win up to $100,000 USDT in weekly draws.",
        bgGradient: "from-purple-500/10 via-black to-black",
        glowColor: "rgba(168,85,247,0.15)",
        buttonText: "Join Draw",
        href: "/dashboard/lucky-draw"
    }
];

export function PromoCarousel() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Auto-advance slides every 5 seconds
    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [isPaused]);

    const goToSlide = (index: number) => {
        setCurrentSlide(index);
    };

    const goToPrevious = () => {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    };

    const goToNext = () => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
    };

    const current = slides[currentSlide];

    return (
        <div
            className="relative rounded-3xl overflow-hidden border border-white/10"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={current.id}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className={`relative bg-gradient-to-br ${current.bgGradient} p-8 min-h-[200px]`}
                >
                    {/* Glow Effect */}
                    <div
                        className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--glow),transparent_70%)]"
                        style={{ '--glow': current.glowColor } as React.CSSProperties}
                    />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <motion.h3
                                className="text-3xl font-bold text-white mb-2"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {current.title}
                            </motion.h3>
                            <motion.p
                                className="text-white/60"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                {current.subtitle}
                            </motion.p>
                        </div>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Link href={current.href}>
                                <Button className="bg-white text-black hover:bg-primary text-lg font-black uppercase px-8 h-14 rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                    {current.buttonText}
                                    <Play className="h-5 w-5 fill-current" />
                                </Button>
                            </Link>
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 border border-white/10 text-white hover:bg-white/10 transition-all backdrop-blur-sm"
                aria-label="Previous slide"
            >
                <ChevronLeft className="h-6 w-6" />
            </button>
            <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 border border-white/10 text-white hover:bg-white/10 transition-all backdrop-blur-sm"
                aria-label="Next slide"
            >
                <ChevronRight className="h-6 w-6" />
            </button>

            {/* Slide Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`h-2 rounded-full transition-all ${index === currentSlide
                            ? "w-8 bg-white"
                            : "w-2 bg-white/30 hover:bg-white/50"
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
