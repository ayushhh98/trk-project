"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Footer } from "@/components/layout/Footer";
import { AdminStats } from "@/components/admin/AdminStats";
import { AdminCharts } from "@/components/admin/AdminCharts";
import { AdminLiveFeed } from "@/components/admin/AdminLiveFeed";
import { UserTable } from "@/components/admin/UserTable";
import { BDWallets } from "@/components/admin/BDWallets";
import { WithdrawalMatrix } from "@/components/admin/WithdrawalMatrix";
import { JackpotControl } from "@/components/admin/JackpotControl";
import { BSCScanTransactions } from "@/components/admin/BSCScanTransactions";
import { AdminIdentityPoster } from "@/components/admin/AdminIdentityPoster";
import { Financials } from "@/components/admin/Financials";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
    ShieldCheck,
    AlertTriangle,
} from "lucide-react";

export default function AdminPage() {
    const router = useRouter();
    const { user, isLoading, token } = useWallet();
    const [activeTab, setActiveTab] = useState("overview");

    const isAdmin = user?.role === "admin" || user?.role === "superadmin";
    const hasSession = !!token;
    const currentTier = user?.activation?.tier || "none";
    const totalDeposited = user?.activation?.totalDeposited || 0;

    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            if (hasSession) return;
            router.push("/admin/login");
            return;
        }
        if (!isAdmin) {
            router.push("/admin/login?reason=unauthorized");
        }
    }, [isLoading, user, isAdmin, hasSession, router]);

    if (!isAdmin && !isLoading && !(hasSession && !user)) {
        return (
            <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center p-6">
                <Card className="max-w-lg w-full bg-black/50 border border-white/10 rounded-[2rem]">
                    <CardContent className="p-10 text-center space-y-4">
                        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
                        <h1 className="text-2xl font-display font-black">Access Denied</h1>
                        <p className="text-sm text-white/50">
                            This route is restricted to administrators.
                        </p>
                        <Button onClick={() => router.push("/dashboard")} className="mt-4">
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading || (hasSession && !user)) return null;

    return (
        <div className="min-h-screen bg-[#020202] text-white">
            <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="lg:pl-[248px] min-h-screen flex flex-col transition-all duration-300">
                <main className="flex-1 w-full px-6 md:px-10 py-10 space-y-10">

                    <AdminIdentityPoster />

                    {/* Header section with stats (only visible on Overview for cleaner UI) */}
                    {activeTab === "overview" && <AdminStats />}

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                        <TabsContent value="overview" className="space-y-8 mt-0 outline-none">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                    <AdminCharts />
                                </div>
                                <div>
                                    <AdminLiveFeed />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="text-xs font-black uppercase tracking-[0.3em] text-white/20 px-2 flex items-center gap-3">
                                    <ShieldCheck className="h-4 w-4" /> Withdrawal Infrastructure Matrix
                                </div>
                                <WithdrawalMatrix currentTier={currentTier} totalDeposited={totalDeposited} />
                            </div>
                        </TabsContent>

                        <TabsContent value="users" className="mt-0 outline-none">
                            <UserTable />
                        </TabsContent>



                        <TabsContent value="wallet" className="space-y-6 mt-0 outline-none">
                            <BDWallets />
                        </TabsContent>

                        <TabsContent value="finance" className="space-y-8 mt-0 outline-none">
                            <Financials />
                        </TabsContent>

                        <TabsContent value="jackpot" className="space-y-8 mt-0 outline-none">
                            <JackpotControl />
                            <div className="space-y-6">
                                <div className="text-xs font-black uppercase tracking-[0.3em] text-white/20 px-2 flex items-center gap-3">
                                    <ShieldCheck className="h-4 w-4" /> Global Prize Ledger (BSCScan)
                                </div>
                                <BSCScanTransactions />
                            </div>
                        </TabsContent>

                    </Tabs>
                </main>
                <Footer />
            </div>
        </div>
    );
}
