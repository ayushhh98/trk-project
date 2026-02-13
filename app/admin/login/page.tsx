"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/components/providers/WalletProvider";
import { Button } from "@/components/ui/Button";
import { Wallet, ArrowLeft, Lock } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AdminLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, token, isLoading, connect, disconnect, refreshUser } = useWallet();
    const [showDenied, setShowDenied] = useState(false);

    const isAdmin = useMemo(
        () => user?.role === "admin" || user?.role === "superadmin",
        [user]
    );

    useEffect(() => {
        if (token && !user) {
            refreshUser();
        }
    }, [token, user, refreshUser]);

    useEffect(() => {
        const reason = searchParams.get("reason");
        if (reason === "unauthorized") setShowDenied(true);
    }, [searchParams]);

    useEffect(() => {
        if (isLoading) return;
        if (isAdmin) {
            router.push("/admin");
        } else if (token && user && !isAdmin) {
            setShowDenied(true);
        }
    }, [isLoading, isAdmin, token, user, router]);

    const handleWalletLogin = async () => {
        try {
            // Use the universal modal to avoid connector-specific failures
            await connect("Other");
        } catch (e: any) {
            toast.error(e?.message || "Wallet connection failed");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
            </div>

            {/* Header - Back to Home */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05, x: -3 }}
                className="absolute top-8 left-8 z-20"
            >
                <Link
                    href="/"
                    className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md transition-all duration-300"
                >
                    <svg
                        className="h-4 w-4 text-white/70 group-hover:text-white transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">
                        Back to Home
                    </span>
                </Link>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 text-center space-y-6 max-w-md w-full"
            >

                <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-12 shadow-2xl mb-6">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 mb-6">
                            <Lock className="h-10 w-10 text-emerald-400" />
                        </div>
                        <h1 className="text-4xl font-display font-black text-white mb-3 tracking-tight">
                            Admin Access
                        </h1>
                        <p className="text-white/60 text-sm">
                            Connect your whitelisted wallet to access admin panel
                        </p>
                    </div>



                    {showDenied && (
                        <div className="mb-6 border border-red-500/30 bg-red-500/10 text-red-200 text-sm px-4 py-3 rounded-xl flex items-center gap-3">
                            <Lock className="h-4 w-4 shrink-0" />
                            <span>Access denied. Admin privileges required.</span>
                        </div>
                    )}


                    {/* Connect Button */}
                    <Button
                        onClick={handleWalletLogin}
                        className="w-full h-14 rounded-xl bg-white text-black hover:bg-emerald-500 font-black uppercase text-sm tracking-wider shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all"
                    >
                        <Wallet className="h-5 w-5 mr-2" />
                        Connect Wallet
                    </Button>

                    {/* Admin Info */}
                    <div className="mt-8 pt-8 border-t border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-white/30 text-center mb-4 font-black">
                            Admin Access Required
                        </p>
                        <p className="text-xs text-white/50 text-center">
                            Only whitelisted addresses can access the admin panel
                        </p>
                    </div>

                    {/* Logout Option for stuck sessions */}
                    {token && user && !isAdmin && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => disconnect?.()}
                                className="text-xs text-red-400 hover:text-red-300 hover:underline"
                            >
                                Logout of current session
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Text */}
                <p className="text-center text-xs text-white/30 mt-8">
                    By connecting, you agree to our{" "}
                    <Link href="/terms" className="text-emerald-500 hover:underline">
                        Terms of Service
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
