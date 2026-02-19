"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Database,
    Wallet,
    DollarSign,
    Gift,
    Image as ImageIcon,
    LogOut,
    Menu,
    X,
    ChevronRight,
    ShieldCheck,
    Receipt,
    ShieldAlert,
    Settings,
    Crown,
    Gamepad2,
    FileText,
    BarChart3
} from "lucide-react";
import { useState } from "react";
import { useWallet } from "@/components/providers/WalletProvider";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { useRouter } from "next/navigation";

interface AdminSidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const menuGroups = [
    {
        label: "Core",
        items: [
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "users", label: "User Management", icon: Users },
            { id: "wallet", label: "Wallet Control", icon: Wallet },
        ]
    },
    {
        label: "Finance",
        items: [
            { id: "transactions", label: "Transactions", icon: Receipt, badge: "New" },
            { id: "finance", label: "Financials", icon: DollarSign },
            { id: "jackpot", label: "Jackpot Engine", icon: Gift, badge: "Live" },
            { id: "club", label: "Club Monitor", icon: Crown, badge: "New" },
        ]
    },
    {
        label: "System",
        items: [
            { id: "practice", label: "Practice Control", icon: Gamepad2, badge: "New" },

            { id: "analytics", label: "Analytics", icon: BarChart3 },
        ]
    },
    {
        label: "Security & Legal",
        items: [
            { id: "emergency", label: "Emergency", icon: ShieldAlert, badge: "⚡" },
            { id: "legal", label: "Legal & Compliance", icon: FileText, badge: "New" },
        ]
    }
];

// Flat list for backward compatibility
const menuItems = menuGroups.flatMap(g => g.items);


export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
    const router = useRouter();
    const { disconnect } = useWallet();
    const [isOpen, setIsOpen] = useState(false);

    const handleTerminate = async () => {
        try {
            await disconnect();
            router.push("/admin/login");
        } catch (error) {
            console.error("Logout failed:", error);
            router.push("/admin/login");
        }
    };

    return (
        <>
            {/* Mobile Toggle */}
            <button
                className="lg:hidden fixed top-6 right-6 z-[60] w-12 h-12 bg-primary flex items-center justify-center rounded-2xl text-black shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-transform active:scale-90"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Sidebar Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 lg:hidden"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Main Sidebar */}
            <aside className={cn(
                "fixed left-0 top-0 h-full w-[248px] bg-[#050505]/80 backdrop-blur-3xl border-r border-white/5 z-50 transition-all duration-500 ease-in-out lg:translate-x-0 shadow-2xl",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent" />

                <div className="flex flex-col h-full relative z-10">
                    {/* Header: Logo */}
                    <div className="p-8 pb-10">
                        <Link href="/admin" className="group inline-block mb-10">
                            <Logo withText className="h-10 w-auto group-hover:scale-105 transition-transform duration-300" />
                        </Link>
                    </div>

                    {/* Menu Navigation */}
                    <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar pb-8">
                        {menuGroups.map((group) => (
                            <div key={group.label} className="mb-4">
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/15 px-5 py-2">{group.label}</p>
                                {group.items.map((item) => {
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                onTabChange(item.id);
                                                setIsOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-5 py-3 rounded-2xl text-xs font-black transition-all duration-300 group relative overflow-hidden mb-0.5",
                                                isActive
                                                    ? "bg-gradient-to-r from-primary/20 to-transparent text-primary border border-primary/20"
                                                    : "text-zinc-500 hover:text-white hover:bg-white/[0.03] border border-transparent"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 relative z-10">
                                                <div className={cn(
                                                    "p-1.5 rounded-xl transition-all duration-300",
                                                    isActive ? "bg-primary text-black" : "bg-zinc-900 text-zinc-600 group-hover:text-primary group-hover:bg-primary/10"
                                                )}>
                                                    <item.icon className="h-3.5 w-3.5" />
                                                </div>
                                                <span className="uppercase tracking-widest text-left text-[10px]">{item.label}</span>
                                            </div>

                                            <div className="flex items-center gap-2 relative z-10">
                                                {(item as any).badge && (
                                                    <span className={cn(
                                                        "px-1.5 py-0.5 rounded-md text-[7px] font-mono tracking-tighter uppercase",
                                                        isActive ? "bg-primary/20 text-primary" : "bg-white/5 text-zinc-600"
                                                    )}>
                                                        {(item as any).badge}
                                                    </span>
                                                )}
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeChevron"
                                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                    >
                                                        <ChevronRight className="h-3 w-3 text-primary" />
                                                    </motion.div>
                                                )}
                                            </div>

                                            {/* Active Pulse Glow */}
                                            {isActive && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 0.15 }}
                                                    className="absolute inset-0 bg-primary/20 blur-2xl"
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>


                    <div className="p-6 mt-auto border-t border-white/5 bg-black/40 backdrop-blur-3xl space-y-6">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Secure Admin</span>
                            </div>
                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full w-full bg-emerald-500 animate-pulse" />
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            className="w-full justify-between px-6 py-6 rounded-2xl text-red-500/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 group transition-all"
                            onClick={handleTerminate}
                        >
                            <div className="flex items-center gap-3">
                                <LogOut className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Logout</span>
                            </div>
                            <X className="h-3 w-3 opacity-30" />
                        </Button>
                    </div>
                </div >
            </aside >
        </>
    );
}
