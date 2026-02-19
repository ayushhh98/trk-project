"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShieldAlert, AlertTriangle, CheckCircle, RefreshCw,
    Lock, Unlock, Clock, Activity, Shield, Zap, Power, Siren
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSocket } from "@/components/providers/Web3Provider";
import { getApiUrl } from "@/lib/api";

interface EmergencyFlags {
    pauseRegistrations: boolean;
    pauseDeposits: boolean;
    pauseLuckyDraw: boolean;
    maintenanceMode: boolean;
    pauseWithdrawals: boolean;
}

interface AuditEntry {
    action: string;
    by: string;
    at: string;
    value: boolean;
}

interface EmergencyAction {
    key: keyof EmergencyFlags;
    apiAction: string;
    label: string;
    description: string;
    danger: "medium" | "high" | "critical";
}

const ACTIONS: EmergencyAction[] = [
    { key: "pauseRegistrations", apiAction: "pause-registrations", label: "Pause Registrations", description: "Prevents new users from signing up. Existing users unaffected.", danger: "medium" },
    { key: "pauseDeposits", apiAction: "pause-deposits", label: "Pause Deposits", description: "Blocks new USDT deposits. Existing balances and withdrawals unaffected.", danger: "high" },
    { key: "pauseWithdrawals", apiAction: "pause-withdrawals", label: "Pause Withdrawals", description: "Blocks all withdrawal requests. Balances remain safe on-chain.", danger: "high" },
    { key: "pauseLuckyDraw", apiAction: "pause-lucky-draw", label: "Pause Lucky Draw", description: "Stops new lucky draw rounds. Ongoing rounds complete normally.", danger: "medium" },
    { key: "maintenanceMode", apiAction: "maintenance-mode", label: "Maintenance Mode", description: "Shows maintenance banner to all users. All on-chain funds remain safe.", danger: "critical" },
];

const DANGER_STYLES: Record<string, string> = {
    medium: "border-amber-500/30 from-amber-500/10 to-transparent",
    high: "border-orange-500/30 from-orange-500/10 to-transparent",
    critical: "border-red-500/30 from-red-500/10 to-transparent",
};

const DANGER_TEXT: Record<string, string> = {
    medium: "text-amber-400",
    high: "text-orange-400",
    critical: "text-red-400",
};

const DANGER_BG: Record<string, string> = {
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
};

function relativeTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(ts).toLocaleDateString();
}

function ActiveDuration({ since }: { since: string }) {
    const [elapsed, setElapsed] = useState("");
    useEffect(() => {
        const update = () => {
            const diff = Date.now() - new Date(since).getTime();
            const s = Math.floor(diff / 1000);
            const m = Math.floor(s / 60);
            const h = Math.floor(m / 60);
            if (h > 0) setElapsed(`${h}h ${m % 60}m`);
            else if (m > 0) setElapsed(`${m}m ${s % 60}s`);
            else setElapsed(`${s}s`);
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [since]);
    return <span className="text-[10px] text-red-400 font-mono bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 animate-pulse">Active {elapsed}</span>;
}

export function EmergencyControls() {
    const socket = useSocket();
    const [flags, setFlags] = useState<EmergencyFlags>({
        pauseRegistrations: false, pauseDeposits: false, pauseLuckyDraw: false,
        maintenanceMode: false, pauseWithdrawals: false
    });
    const [isLoading, setIsLoading] = useState(true);
    const [pendingAction, setPendingAction] = useState<EmergencyAction | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [updatedBy, setUpdatedBy] = useState<string | null>(null);
    const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
    const [isLive, setIsLive] = useState(false);
    const [activeSince, setActiveSince] = useState<Record<string, string>>({});
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchStatus = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("trk_token");
            const res = await fetch(`${getApiUrl()}/admin/emergency/status`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.status === "success") {
                setFlags(data.data.emergencyFlags);
                setLastUpdated(data.data.lastUpdated);
                setUpdatedBy(data.data.updatedBy);
                if (data.data.auditLog) setAuditLog(data.data.auditLog.slice(0, 5));
                if (data.data.activeSince) setActiveSince(data.data.activeSince);
            }
        } catch (e) {
            console.error("Failed to fetch emergency status:", e);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-refresh every 30s
    useEffect(() => {
        fetchStatus();
        intervalRef.current = setInterval(fetchStatus, 30000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    // Socket: another admin changed a flag
    useEffect(() => {
        if (!socket) return;
        setIsLive(true);

        const handleFlagChange = (payload: any) => {
            setFlags(prev => ({ ...prev, ...payload.emergencyFlags }));
            if (payload.lastUpdated) setLastUpdated(payload.lastUpdated);
            if (payload.updatedBy) setUpdatedBy(payload.updatedBy);
            toast.warning("Emergency flag changed by another admin", {
                description: `${payload.action || "Flag"} was ${payload.value ? "activated" : "deactivated"}`
            });
        };

        socket.on("emergency_flag_changed", handleFlagChange);
        return () => {
            socket.off("emergency_flag_changed", handleFlagChange);
            setIsLive(false);
        };
    }, [socket]);

    const handleToggle = async () => {
        if (!pendingAction || !confirmed) return;
        setProcessing(true);
        try {
            const token = localStorage.getItem("trk_token");
            const newValue = !flags[pendingAction.key];
            const res = await fetch(`${getApiUrl()}/admin/emergency/${pendingAction.apiAction}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: newValue })
            });
            const data = await res.json();
            if (data.status === "success") {
                setFlags(data.data.emergencyFlags);
                if (newValue) {
                    setActiveSince(prev => ({ ...prev, [pendingAction.key]: new Date().toISOString() }));
                } else {
                    setActiveSince(prev => { const n = { ...prev }; delete n[pendingAction.key]; return n; });
                }
                toast.success(`${pendingAction.label} ${newValue ? "ACTIVATED" : "deactivated"}`, {
                    description: newValue ? "⚠️ Emergency flag is now active" : "System returned to normal"
                });
                fetchStatus();
            } else {
                toast.error(data.message || "Failed to toggle flag");
            }
        } catch (e: any) {
            if (e.message?.includes('401') || e.status === 401) {
                toast.error("Session expired. Please log in again.");
            } else {
                toast.error("Network error — please try again");
            }
        } finally {
            setProcessing(false);
            setPendingAction(null);
            setConfirmed(false);
        }
    };

    const anyActive = Object.values(flags).some(Boolean);
    const activeCount = Object.values(flags).filter(Boolean).length;
    const healthScore = Math.max(0, 100 - activeCount * 20);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "h-12 w-12 rounded-2xl border flex items-center justify-center shadow-lg transition-all duration-500",
                        anyActive
                            ? "bg-red-500/20 border-red-500/30 shadow-red-500/10"
                            : "bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border-white/10 shadow-emerald-500/10"
                    )}>
                        {anyActive ? (
                            <Siren className="h-6 w-6 text-red-400 animate-pulse" />
                        ) : (
                            <Shield className="h-6 w-6 text-emerald-400" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-white tracking-tight">Emergency Controls</h2>
                            {isLive && (
                                <span className={cn(
                                    "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-[0_0_10px_-3px_rgba(0,0,0,0.3)]",
                                    anyActive
                                        ? "text-red-400 border-red-500/30 bg-red-500/10 shadow-red-500/20"
                                        : "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-emerald-500/20"
                                )}>
                                    <span className="relative flex h-2 w-2">
                                        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", anyActive ? "bg-red-400" : "bg-emerald-400")}></span>
                                        <span className={cn("relative inline-flex rounded-full h-2 w-2", anyActive ? "bg-red-500" : "bg-emerald-500")}></span>
                                    </span>
                                    LIVE
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-white/40 mt-1 flex items-center gap-2">
                            <Lock className="h-3 w-3" />
                            Superadmin Access · <span className={cn("font-bold", anyActive ? "text-red-400" : "text-emerald-400")}>{activeCount} Trigger{activeCount !== 1 ? "s" : ""} Active</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchStatus}
                        className="h-10 w-10 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <RefreshCw className={cn("h-4 w-4 text-white/70", isLoading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* System Health Score */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className={cn(
                    "border col-span-1 overflow-hidden relative group transition-all duration-500",
                    healthScore >= 80 ? "bg-emerald-500/5 border-emerald-500/20" : healthScore >= 60 ? "bg-amber-500/5 border-amber-500/20" : "bg-red-500/5 border-red-500/20"
                )}>
                    <div className={cn("absolute inset-0 opacity-10 blur-xl transition-colors duration-500", healthScore >= 80 ? "bg-emerald-500" : healthScore >= 60 ? "bg-amber-500" : "bg-red-500")} />
                    <CardContent className="p-6 flex items-center gap-5 relative z-10">
                        <div className="relative">
                            <svg className="w-16 h-16 transform -rotate-90">
                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                                <motion.circle
                                    initial={{ strokeDasharray: "0 100" }}
                                    animate={{ strokeDasharray: `${healthScore * 1.75} 100` }}
                                    cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent"
                                    className={cn(healthScore >= 80 ? "text-emerald-500" : healthScore >= 60 ? "text-amber-500" : "text-red-500")}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-white">
                                {healthScore}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">System Health</p>
                            <p className={cn("text-lg font-black uppercase tracking-tight", healthScore >= 80 ? "text-emerald-400" : healthScore >= 60 ? "text-amber-400" : "text-red-400")}>
                                {healthScore >= 80 ? "Nominal" : healthScore >= 60 ? "Degraded" : "Critical"}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="col-span-1 md:col-span-2 space-y-4">
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-white">Chain Security Status</p>
                                <p className="text-xs text-white/50 leading-relaxed">
                                    Funds remain safe on-chain. Emergency controls only affect the frontend UI and new interaction submissions.
                                    All existing user balances and smart contract assets are immutable and protected.
                                </p>
                            </div>
                        </div>
                    </div>

                    <AnimatePresence>
                        {anyActive && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-3 p-3 rounded-xl border border-red-500/30 bg-red-500/10"
                            >
                                <div className="p-1.5 rounded-lg bg-red-500/20 animate-pulse">
                                    <AlertTriangle className="h-4 w-4 text-red-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-black text-red-400 uppercase tracking-wide">Emergency Mode Active</p>
                                    <p className="text-[10px] text-red-200/60">
                                        {updatedBy ? `Last action by ${updatedBy.slice(0, 8)}...` : "System override"}
                                        {lastUpdated ? ` · ${relativeTime(lastUpdated)}` : ""}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {ACTIONS.map((action) => {
                    const isActive = flags[action.key];
                    return (
                        <motion.div
                            key={action.key}
                            whileHover={{ y: -2 }}
                            className={cn(
                                "group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300",
                                isActive ? `${DANGER_STYLES[action.danger]} bg-gradient-to-br shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)]` : "border-white/5 bg-black/40 hover:border-white/10"
                            )}
                        >
                            {isActive && <div className={cn("absolute inset-0 opacity-10", DANGER_BG[action.danger].split(' ')[0])} />}

                            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border", DANGER_BG[action.danger])}>
                                            {action.danger} Impact
                                        </div>
                                        <div className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                                            isActive ? `bg-white/10 ${DANGER_TEXT[action.danger]}` : "bg-white/5 text-white/20"
                                        )}>
                                            {isActive ? <Lock className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className={cn("font-black text-lg uppercase tracking-tight mb-2", isActive ? "text-white" : "text-white/80")}>
                                            {action.label}
                                        </h3>
                                        <p className="text-xs text-white/40 leading-relaxed font-medium">
                                            {action.description}
                                        </p>
                                    </div>

                                    {isActive && activeSince[action.key] && (
                                        <ActiveDuration since={activeSince[action.key]} />
                                    )}
                                </div>

                                <Button
                                    onClick={() => { setPendingAction(action); setConfirmed(false); }}
                                    className={cn(
                                        "w-full h-10 text-[10px] font-black uppercase tracking-widest transition-all",
                                        isActive
                                            ? "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                                            : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/5"
                                    )}
                                    disabled={isLoading}
                                >
                                    {isActive ? "Deactivate Protocol" : "Initiate Protocol"}
                                </Button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Audit Log */}
            {auditLog.length > 0 && (
                <Card className="bg-black/40 backdrop-blur-sm border-white/5">
                    <CardContent className="p-6 space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                            <Activity className="h-3.5 w-3.5" /> Recent Protocol Actions
                        </h3>
                        <div className="space-y-1">
                            {auditLog.map((entry, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]", entry.value ? "text-red-500 bg-red-500" : "text-emerald-500 bg-emerald-500")} />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-white/80">{entry.action}</span>
                                            <span className="text-[10px] text-white/30 font-mono">
                                                By {entry.by?.slice(0, 8) || "System"} • {relativeTime(entry.at)}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "text-[9px] font-black uppercase px-2 py-1 rounded border",
                                        entry.value
                                            ? "text-red-400 border-red-500/20 bg-red-500/10"
                                            : "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                                    )}>
                                        {entry.value ? "ACTIVATED" : "RESOLVED"}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Confirmation Modal */}
            <AnimatePresence>
                {pendingAction && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6"
                        onClick={(e) => { if (e.target === e.currentTarget) { setPendingAction(null); setConfirmed(false); } }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-[#0A0A0A] border border-red-500/30 rounded-3xl p-8 max-w-lg w-full space-y-8 relative overflow-hidden shadow-[0_0_50px_-10px_rgba(239,68,68,0.2)]"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                <AlertTriangle className="h-64 w-64 text-red-500 transform rotate-12 translate-x-20 -translate-y-20" />
                            </div>

                            <div className="flex flex-col items-center text-center gap-4 relative z-10">
                                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-600/20 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-500/10">
                                    <ShieldAlert className="h-8 w-8 text-red-400" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black uppercase tracking-tight text-white">Confirm Protocol Change</h3>
                                    <p className="text-sm text-white/40 font-medium">This action will have immediate effect system-wide.</p>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 relative z-10 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-lg font-black text-white">{pendingAction.label}</p>
                                    <div className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border", DANGER_BG[pendingAction.danger])}>
                                        {pendingAction.danger} Impact
                                    </div>
                                </div>
                                <p className="text-xs text-white/60 leading-relaxed border-l-2 border-white/10 pl-3">
                                    {pendingAction.description}
                                </p>
                                <div className={cn("mt-4 pt-4 border-t border-white/5 text-xs font-bold flex items-center gap-2", flags[pendingAction.key] ? "text-emerald-400" : "text-amber-400")}>
                                    {flags[pendingAction.key] ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                    Proposed Action: {flags[pendingAction.key] ? "DEACTIVATE PROTOCOL (Restore Normal Ops)" : "ACTIVATE PROTOCOL (Emergency Mode)"}
                                </div>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <label className="flex items-start gap-4 p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={confirmed}
                                            onChange={e => setConfirmed(e.target.checked)}
                                            className="peer appearance-none h-5 w-5 rounded border border-white/20 checked:bg-red-500 checked:border-red-500 transition-colors"
                                        />
                                        <CheckCircle className="h-3.5 w-3.5 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none" />
                                    </div>
                                    <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors pt-0.5">
                                        I verify that I have authority to execute this action and understand the consequences for all active users.
                                    </span>
                                </label>

                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => { setPendingAction(null); setConfirmed(false); }}
                                        className="h-12 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-xs font-bold uppercase tracking-widest"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleToggle}
                                        disabled={!confirmed || processing}
                                        className={cn(
                                            "h-12 text-xs font-black uppercase tracking-widest shadow-lg transition-all",
                                            processing ? "opacity-50" : "",
                                            flags[pendingAction.key]
                                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                                                : "bg-red-600 hover:bg-red-500 text-white shadow-red-500/20"
                                        )}
                                    >
                                        {processing ? "Executing..." : "Confirm & Execute"}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
