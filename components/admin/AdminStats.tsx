"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Users, DollarSign, Activity, Server, ShieldAlert } from "lucide-react";
import { adminAPI } from "@/lib/api";
import { useSocket } from "@/components/providers/Web3Provider";
import { cn } from "@/lib/utils";

interface AnalyticsData {
    totalUsers: number;
    totalGames: number;
    bannedUsers: number;
    totalWagered: number;
    totalPayout: number;
    houseEdge: number;
    newUsersToday?: number; // Added
}

interface SystemStatus {
    database: string;
    uptime: number;
    realMoneyEnabled: boolean;
    version: string;
}

export function AdminStats() {
    const socket = useSocket();
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [analyticsRes, statusRes] = await Promise.all([
                adminAPI.getAnalytics(),
                adminAPI.getSystemStatus()
            ]);

            if (analyticsRes.status === 'success') setAnalytics(analyticsRes.data);
            if (statusRes.status === 'success') setStatus(statusRes.data);
        } catch (error) {
            console.error("Failed to fetch admin stats:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        const handleStatsUpdate = (data: any) => {
            setAnalytics(prev => {
                const newData = { ...prev, ...data };
                if (data.totalUsers !== undefined) newData.totalUsers = data.totalUsers;
                if (data.totalWagered !== undefined) newData.totalWagered = data.totalWagered;
                return newData;
            });
        };

        const handleUserRegistered = () => {
            setAnalytics(prev => prev ? ({
                ...prev,
                totalUsers: (prev.totalUsers || 0) + 1,
                newUsersToday: (prev.newUsersToday || 0) + 1 // Increment today's count
            }) : null);
        };

        // Real-time listeners
        if (socket) {
            socket.on("admin:stats_update", handleStatsUpdate);
            socket.on("admin_stats_update", handleStatsUpdate);
            socket.on("user_registered", handleUserRegistered);
        }

        return () => {
            if (socket) {
                socket.off("admin:stats_update", handleStatsUpdate);
                socket.off("admin_stats_update", handleStatsUpdate);
                socket.off("user_registered", handleUserRegistered);
            }
        };
    }, [socket]);

    // Fallback polling for near real-time data
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-white/5 rounded-2xl" />
            ))}
        </div>;
    }

    const stats = [
        {
            title: "Total Users",
            value: analytics?.totalUsers.toLocaleString() || "0",
            icon: Users,
            color: "text-blue-400",
            bg: "bg-blue-400/10",
            sub: (
                <span className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold">
                        +{analytics?.newUsersToday || 0} New
                    </span>
                    <span className="text-white/20">|</span>
                    <span>{analytics?.bannedUsers} Bans</span>
                </span>
            )
        },
        {
            title: "Total Wagered",
            value: `$${analytics?.totalWagered.toLocaleString() || "0"}`,
            icon: DollarSign,
            color: "text-green-400",
            bg: "bg-green-400/10",
            sub: `Edge: $${analytics?.houseEdge.toLocaleString()}`
        },
        {
            title: "Total Games",
            value: analytics?.totalGames.toLocaleString() || "0",
            icon: Activity,
            color: "text-purple-400",
            bg: "bg-purple-400/10",
            sub: "All-time rounds"
        },
        {
            title: "System Status",
            value: status?.database === 'connected' ? "Operational" : "Issues Detected",
            icon: status?.database === 'connected' ? Server : ShieldAlert,
            color: status?.database === 'connected' ? "text-emerald-400" : "text-red-400",
            bg: status?.database === 'connected' ? "bg-emerald-400/10" : "bg-red-400/10",
            sub: `v${status?.version} | Uptime: ${((status?.uptime || 0) / 3600).toFixed(1)}h`
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
                <Card key={index} className="group bg-[#0a0a0a]/50 border-white/5 backdrop-blur-xl overflow-hidden relative hover:border-white/10 transition-all duration-500 rounded-3xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                        <CardTitle className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                            {stat.title}
                        </CardTitle>
                        <div className={cn("p-2.5 rounded-xl border border-white/5 group-hover:scale-110 transition-transform duration-500", stat.bg)}>
                            <stat.icon className={cn("h-4 w-4", stat.color)} />
                        </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-3xl font-black font-mono text-white tracking-tighter group-hover:text-primary transition-colors duration-500">
                            {stat.value}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            {/* Indicator dot */}
                            <div className={cn("w-1 h-1 rounded-full animate-pulse", stat.color.replace('text-', 'bg-'))} />
                            <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-none">
                                {stat.sub}
                            </div>
                        </div>
                    </CardContent>

                    {/* Decorative gradient */}
                    <div className={cn(
                        "absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none",
                        stat.color.replace('text-', 'bg-')
                    )} />
                </Card>
            ))}
        </div>
    );
}

