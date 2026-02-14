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

                    {/* Wallet Actions */}
                    <div className="space-y-3">
                        <Button
                            onClick={() => connect("MetaMask")}
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-90 font-bold shadow-lg shadow-orange-500/20"
                        >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" className="w-6 h-6 mr-3" alt="MetaMask" />
                            MetaMask
                        </Button>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={() => connect("Trust Wallet")}
                                className="h-12 rounded-xl bg-[#0500FF] text-white hover:opacity-90 font-bold shadow-lg shadow-blue-500/20 border border-white/10"
                            >
                                <svg className="w-6 h-6 mr-2" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5.85 28.5L25.65 20.3L29.35 15.6V3.5H2.65V15.6L5.85 28.5Z" fill="#ffffff" />
                                    <path d="M16 32L2.65 15.6V2H29.35V15.6L16 32Z" fill="#3275BB" />
                                    <path d="M16 30.2L4.5 15.9V4H27.5V15.9L16 30.2Z" fill="#ffffff" />
                                    <path d="M11 12H21V14H11V12Z" fill="#0500FF" />
                                </svg>
                                {/* Using generic Shield icon for Trust Wallet representation if SVG fails, but trying inline SVG approx first or just text/icon from library */}
                                Trust Wallet
                            </Button>

                            <Button
                                onClick={() => connect("WalletConnect")}
                                className="h-12 rounded-xl bg-[#3B99FC] text-white hover:opacity-90 font-bold shadow-lg shadow-blue-400/20 border border-white/10"
                            >
                                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 17L7 12H10V8H14V12H17L12 17Z" fill="currentColor" />
                                </svg>
                                WalletConnect
                            </Button>
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
