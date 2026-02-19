"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { useWallet } from "@/components/providers/WalletProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Footer } from "@/components/layout/Footer";
import { NotificationProvider } from "@/components/providers/NotificationProvider";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isConnected, isLoading, isSwitchingWallet, user } = useWallet();
    const router = useRouter();

    // Redirect to auth if not connected, or enforce referral
    useEffect(() => {
        if (isLoading || isSwitchingWallet) return;

        const hasToken = typeof window !== "undefined" && !!localStorage.getItem("trk_token");

        if (!hasToken && !isConnected) {
            router.push("/");
            return;
        }

        if (user && user.role === "player" && !user.referredBy) {
            router.push("/auth");
            return;
        }

    }, [isConnected, isLoading, isSwitchingWallet, user, router]);

    return (
        <NotificationProvider userId={user?.id}>
            <div className="min-h-screen bg-background">
                <Sidebar />
                <div className="lg:pl-[248px] min-h-screen flex flex-col overflow-x-hidden">
                    <div className="flex-1">
                        {children}
                    </div>
                    <Footer />
                </div>
            </div>
        </NotificationProvider>
    );
}
