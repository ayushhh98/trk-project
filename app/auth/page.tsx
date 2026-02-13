"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Button } from "@/components/ui/Button";
import { Wallet } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AuthPage() {
    const { token, user, connect, refreshUser } = useWallet();
    const router = useRouter();
    const didRedirectRef = useRef(false);

    // Redirect authenticated users
    useEffect(() => {
        if (didRedirectRef.current) return;
        if (!token) return;

        if (!user) {
            refreshUser();
            return;
        }

        didRedirectRef.current = true;

        // Always redirect to dashboard
        router.replace("/dashboard");
    }, [token, user, refreshUser, router]);

    const handleWalletConnect = async () => {
        try {
            await connect("MetaMask");
        } catch (e: any) {
            toast.error(e?.message || "Wallet connection failed");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
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

            {/* Main Content */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Card */}
                <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-12 shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 mb-6">
                            <Wallet className="h-10 w-10 text-primary" />
                        </div>
                        <h1 className="text-4xl font-display font-black text-white mb-3 tracking-tight">
                            Connect Wallet
                        </h1>
                        <p className="text-white/60 text-sm">
                            Connect your Web3 wallet to access the TRK ecosystem
                        </p>
                    </div>

                    {/* Connect Button */}
                    <Button
                        onClick={handleWalletConnect}
                        className="w-full h-14 rounded-xl bg-white text-black hover:bg-primary font-black uppercase text-sm tracking-wider shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all"
                    >
                        <Wallet className="h-5 w-5 mr-2" />
                        Connect Wallet
                    </Button>

                    {/* Supported Wallets */}
                    <div className="mt-8 pt-8 border-t border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-white/30 text-center mb-4 font-black">
                            Supported Wallets
                        </p>
                        <div className="flex justify-center gap-4">
                            <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 font-bold">
                                MetaMask
                            </div>
                            <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 font-bold">
                                Trust Wallet
                            </div>
                            <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 font-bold">
                                WalletConnect
                            </div>
                        </div>
                    </div>

                    {/* Admin Link */}
                    <div className="mt-6 text-center">
                        <Link
                            href="/admin/login"
                            className="text-xs text-white/40 hover:text-white/80 transition-colors underline underline-offset-4"
                        >
                            Admin Access
                        </Link>
                    </div>
                </div>

                {/* Footer Text */}
                <p className="text-center text-xs text-white/30 mt-8">
                    By connecting, you agree to our{" "}
                    <Link href="/terms" className="text-primary hover:underline">
                        Terms of Service
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
