"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Database, RefreshCw, Layers, HardDrive, ShieldCheck, Activity, Server, Zap, Cpu, Archive } from "lucide-react";
import { adminAPI } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdminSocket } from "@/hooks/useAdminSocket";

interface DBStats {
    users: number;
    games: number;
    jackpots: number;
    audits: number;
    dbSize: number;
    collections: number;
}

export function AdminDB() {
    const [stats, setStats] = useState<DBStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
    const isFetchingRef = useRef(false);

    // Action states
    const [isPurging, setIsPurging] = useState(false);
    const [isRebuilding, setIsRebuilding] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    // Real-time updates
    const { isConnected } = useAdminSocket({
        onStatsUpdate: (newStats) => {
            setStats(prev => ({ ...prev, ...newStats }));
            setLastUpdatedAt(new Date());
            setIsLoading(false);
        }
    });

    const fetchStats = useCallback(async (options?: { silent?: boolean }) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        setIsLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await adminAPI.getDBStats({ signal: controller.signal });
            if (res.status === 'success') {
                setStats(res.data);
                setLastUpdatedAt(new Date());
                if (!isConnected) {
                    if (!options?.silent) {
                        toast.success("Database metrics updated");
                    }
                }
            }
        } catch (error) {
            if (!options?.silent) {
                toast.error("Failed to fetch database health metrics");
            }
        } finally {
            clearTimeout(timeoutId);
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, [isConnected]);

    useEffect(() => {
        fetchStats({ silent: true });
    }, [isConnected, fetchStats]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchStats({ silent: true });
        }, 10000);
        return () => clearInterval(interval);
    }, [isConnected, fetchStats]);

    const formatSize = (bytes: number) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handlePurgeCache = async () => {
        setIsPurging(true);
        const toastId = toast.loading("Purging system cache...");

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));

        toast.dismiss(toastId);
        toast.success("Cache cleared successfully", {
            description: "System memory buffer has been reset."
        });
        setIsPurging(false);
    };

    const handleRebuildIndex = async () => {
        setIsRebuilding(true);
        const toastId = toast.loading("Rebuilding database indexes...");

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 3500));

        toast.dismiss(toastId);
        toast.success("Indexes rebuilt", {
            description: "Database query performance optimized."
        });
        setIsRebuilding(false);
    };

    const handleArchiveLogs = async () => {
        setIsArchiving(true);
        const toastId = toast.loading("Archiving old audit logs...");

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2500));

        toast.dismiss(toastId);
        toast.success("Logs archived", {
            description: "24,501 records moved to cold storage."
        });
        setIsArchiving(false);
    };

    const dbCards = [
        { label: "Total Identities", value: stats?.users || 0, icon: Layers, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
        { label: "Game Records", value: stats?.games || 0, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        { label: "Audit Logs", value: stats?.audits || 0, icon: ShieldCheck, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
        { label: "Storage Used", value: formatSize(stats?.dbSize || 0), icon: HardDrive, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" }
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                        <Database className="h-4 w-4 text-emerald-400" />
                        Database Infrastructure
                    </h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold pl-6">
                        Systems Health & Resource Capacity
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => fetchStats()}
                        disabled={isLoading}
                        variant="outline"
                        className={cn(
                            "h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-3 transition-all hover:scale-105 active:scale-95 border",
                            isConnected
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                        )}
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                        {isConnected ? "Live System Feed" : "Refresh Core"}
                    </Button>
                    {lastUpdatedAt && (
                        <div className="text-[9px] uppercase tracking-widest text-white/30 font-black">
                            Updated {lastUpdatedAt.toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dbCards.map((card, i) => (
                    <Card key={i} className="bg-[#0A0A0A] border-white/5 backdrop-blur-xl rounded-[2rem] overflow-hidden group hover:border-white/10 transition-all duration-300 shadow-lg hover:shadow-xl">
                        <CardContent className="p-8">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300", card.bg, card.color)}>
                                    <card.icon className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest group-hover:text-white/50 transition-colors">
                                    {card.label}
                                </span>
                            </div>
                            <div className="text-3xl font-black text-white group-hover:scale-105 transition-transform origin-left tracking-tight">
                                {isLoading ? (
                                    <div className="h-8 w-24 bg-white/5 rounded animate-pulse" />
                                ) : (
                                    card.value
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="bg-[#0A0A0A] border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
                    <Server className="h-64 w-64 text-white/5" />
                </div>

                <CardHeader className="p-8 border-b border-white/5 bg-white/[0.02]">
                    <CardTitle className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-blue-400" />
                        System Optimization Tools
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 rounded-[1.5rem] border border-white/5 bg-white/[0.02] space-y-4 hover:bg-white/[0.04] transition-colors group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                    <Zap className="h-4 w-4" />
                                </div>
                                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest group-hover:text-white/60 transition-colors">Memory Cache</div>
                            </div>
                            <p className="text-[11px] text-white/40 leading-relaxed min-h-[40px]">Redistribute system cache and clear temporary session identifiers to free up resources.</p>
                            <Button
                                onClick={handlePurgeCache}
                                disabled={isPurging}
                                className="w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest h-10 rounded-xl transition-all active:scale-[0.98]"
                            >
                                {isPurging ? 'PURGING...' : 'PURGE_CACHE'}
                            </Button>
                        </div>

                        <div className="p-6 rounded-[1.5rem] border border-white/5 bg-white/[0.02] space-y-4 hover:bg-white/[0.04] transition-colors group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                    <Database className="h-4 w-4" />
                                </div>
                                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest group-hover:text-white/60 transition-colors">Index Recovery</div>
                            </div>
                            <p className="text-[11px] text-white/40 leading-relaxed min-h-[40px]">Rebuild database indexes to optimize query performance across core user collections.</p>
                            <Button
                                onClick={handleRebuildIndex}
                                disabled={isRebuilding}
                                className="w-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest h-10 rounded-xl transition-all active:scale-[0.98]"
                            >
                                {isRebuilding ? 'REBUILDING...' : 'REBUILD_INDEX'}
                            </Button>
                        </div>

                        <div className="p-6 rounded-[1.5rem] border border-white/5 bg-white/[0.02] space-y-4 hover:bg-white/[0.04] transition-colors group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                                    <Archive className="h-4 w-4" />
                                </div>
                                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest group-hover:text-white/60 transition-colors">Audit Archive</div>
                            </div>
                            <p className="text-[11px] text-white/40 leading-relaxed min-h-[40px]">Archive audit logs older than 90 days to external secure cold storage.</p>
                            <Button
                                onClick={handleArchiveLogs}
                                disabled={isArchiving}
                                className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest h-10 rounded-xl transition-all active:scale-[0.98]"
                            >
                                {isArchiving ? 'ARCHIVING...' : 'ARCHIVE_LOGS'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
