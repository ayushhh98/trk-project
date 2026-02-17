'use client';

import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationBellProps {
    unreadCount: number;
    onClick: () => void;
    pulse?: boolean;
}

export function NotificationBell({ unreadCount, onClick, pulse }: NotificationBellProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative h-10 w-10 rounded-lg border transition-all duration-300",
                "flex items-center justify-center group",
                unreadCount > 0
                    ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
                "active:scale-95"
            )}
        >
            {/* Bell Icon with glow effect when active */}
            <div className="relative">
                <Bell className={cn(
                    "h-4 w-4 transition-all duration-300",
                    unreadCount > 0
                        ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                        : "text-white/40 group-hover:text-white/60"
                )} />

                {/* Subtle pulse ring when active */}
                {unreadCount > 0 && (
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                )}
            </div>

            {/* Unread Badge */}
            <AnimatePresence>
                {unreadCount > 0 && (
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        className="absolute -top-1.5 -right-1.5"
                    >
                        {/* Ping effect */}
                        {pulse && (
                            <span className="absolute inset-0 h-5 w-5 rounded-full bg-emerald-500 animate-ping opacity-75" />
                        )}

                        {/* Badge */}
                        <div className={cn(
                            "relative h-5 min-w-[20px] px-1 rounded-full",
                            "bg-gradient-to-br from-emerald-400 to-emerald-600",
                            "border-2 border-black",
                            "flex items-center justify-center",
                            "shadow-lg shadow-emerald-500/50",
                            pulse && "animate-pulse"
                        )}>
                            <span className="text-[9px] font-black text-black leading-none">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hover glow effect */}
            <div className={cn(
                "absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                "bg-gradient-to-br from-emerald-500/5 to-transparent"
            )} />
        </button>
    );
}
