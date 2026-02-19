"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { UserCog, RefreshCw, Shield, Check, X, Activity, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSocket } from "@/components/providers/Web3Provider";

interface AdminUser {
    _id: string;
    walletAddress: string;
    email: string;
    role: string;
    adminPermissions: string[];
    createdAt: string;
    lastLoginAt: string | null;
    isActive: boolean;
}

const ALL_PERMISSIONS = [
    { key: "view_users", label: "View Users" },
    { key: "manage_users", label: "Manage Users" },
    { key: "view_finance", label: "View Finance" },
    { key: "manage_config", label: "Manage Config" },
    { key: "view_transactions", label: "View Transactions" },
    { key: "manage_jackpot", label: "Manage Jackpot" },
    { key: "view_analytics", label: "View Analytics" },
];

export function SubAdminManager() {
    const socket = useSocket();
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPerms, setEditPerms] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [activityFeed, setActivityFeed] = useState<{ msg: string; ts: Date }[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchAdmins = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("trk_token");
            const res = await fetch("/api/admin/sub-admins", { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.status === "success") setAdmins(data.data.admins || []);
        } catch (e) {
            console.error("Failed to fetch admins:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchAdmins(); }, []);

    // Auto-refresh every 60s
    useEffect(() => {
        intervalRef.current = setInterval(fetchAdmins, 60000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    // Socket: listen for admin actions
    useEffect(() => {
        if (!socket) return;
        const handleAdminAction = (payload: any) => {
            const msg = payload?.message || `Admin action: ${payload?.action || "unknown"}`;
            setActivityFeed(prev => [{ msg, ts: new Date() }, ...prev].slice(0, 10));
            setIsLive(true);
        };
        socket.on("admin_action", handleAdminAction);
        socket.on("admin:action", handleAdminAction);
        return () => {
            socket.off("admin_action", handleAdminAction);
            socket.off("admin:action", handleAdminAction);
            setIsLive(false);
        };
    }, [socket]);

    const startEdit = (admin: AdminUser) => {
        setEditingId(admin._id);
        setEditPerms(admin.adminPermissions || []);
    };

    const togglePerm = (perm: string) => {
        setEditPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
    };

    const savePermissions = async (id: string) => {
        setSaving(true);
        try {
            const token = localStorage.getItem("trk_token");
            const res = await fetch(`/api/admin/sub-admins/${id}/permissions`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ permissions: editPerms })
            });
            const data = await res.json();
            if (data.status === "success") {
                toast.success("Permissions updated");
                setEditingId(null);
                fetchAdmins();
            } else {
                toast.error(data.message || "Failed to update");
            }
        } catch (e) {
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    const removeAdmin = async (id: string, addr: string) => {
        if (!window.confirm(`Are you sure you want to REMOVE ${addr.slice(0, 10)} as an admin? This will demote them to a player.`)) return;

        setSaving(true);
        try {
            const token = localStorage.getItem("trk_token");
            const res = await fetch(`/api/admin/sub-admins/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status === "success") {
                toast.success("Admin removed and demoted to player");
                fetchAdmins();
            } else {
                toast.error(data.message || "Failed to remove");
            }
        } catch (e) {
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <UserCog className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                            Sub-Admin Management
                            {isLive && (
                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
                                    LIVE
                                </span>
                            )}
                        </h2>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Superadmin Only · Granular permissions</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAdmins} className="border-white/10 hover:bg-white/5">
                    <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                </Button>
            </div>

            {/* Activity Feed */}
            {activityFeed.length > 0 && (
                <Card className="bg-indigo-500/5 border-indigo-500/20">
                    <CardContent className="p-4 space-y-2">
                        <div className="text-[9px] font-black uppercase tracking-widest text-indigo-400/60 flex items-center gap-2">
                            <Activity className="h-3 w-3" /> Recent Admin Activity
                        </div>
                        {activityFeed.map((item, i) => (
                            <div key={i} className="flex items-start gap-2 text-[10px] text-white/40">
                                <Clock className="h-3 w-3 mt-0.5 flex-shrink-0 text-indigo-400/40" />
                                <span className="text-indigo-300/60">{item.ts.toLocaleTimeString()}</span>
                                <span>{item.msg}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {isLoading ? (
                <div className="text-center py-12 text-white/20 text-[10px] uppercase tracking-widest animate-pulse">Loading admins...</div>
            ) : admins.length === 0 ? (
                <Card className="bg-black/40 border-white/5">
                    <CardContent className="p-12 text-center">
                        <Shield className="h-8 w-8 text-white/10 mx-auto mb-3" />
                        <p className="text-[10px] text-white/20 uppercase tracking-widest">No admin users found</p>
                        <p className="text-[9px] text-white/10 mt-1">Promote users to admin via the Users tab</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {admins.map((admin) => (
                        <motion.div
                            key={admin._id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="bg-black/40 border-white/5">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                                                    admin.role === "superadmin" ? "text-amber-400 bg-amber-500/10" : "text-blue-400 bg-blue-500/10"
                                                )}>
                                                    {admin.role}
                                                </span>
                                                {admin.isActive && <span className="text-[8px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Active</span>}
                                            </div>
                                            <p className="font-mono text-sm text-white/70">
                                                {admin.walletAddress ? `${admin.walletAddress.slice(0, 10)}...${admin.walletAddress.slice(-6)}` : admin.email || "Unknown"}
                                            </p>
                                            <p className="text-[9px] text-white/20">
                                                Joined {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : "—"}
                                                {admin.lastLoginAt ? ` · Last login ${new Date(admin.lastLoginAt).toLocaleDateString()}` : ""}
                                            </p>
                                        </div>
                                        {admin.role !== "superadmin" && (
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => editingId === admin._id ? setEditingId(null) : startEdit(admin)}
                                                    className="border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest"
                                                    variant="outline"
                                                >
                                                    {editingId === admin._id ? "Cancel" : "Edit Permissions"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => removeAdmin(admin._id, admin.walletAddress)}
                                                    className="border-red-500/10 hover:bg-red-500/5 text-red-500/60 hover:text-red-500 text-[10px] font-black uppercase tracking-widest"
                                                    variant="outline"
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Permissions display */}
                                    <div className="flex flex-wrap gap-2">
                                        {admin.role === "superadmin" ? (
                                            <span className="text-[9px] text-amber-400/60 italic">Superadmin has all permissions</span>
                                        ) : (
                                            ALL_PERMISSIONS.map(({ key, label }) => {
                                                const hasIt = editingId === admin._id
                                                    ? editPerms.includes(key)
                                                    : (admin.adminPermissions || []).includes(key);
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => editingId === admin._id && togglePerm(key)}
                                                        disabled={editingId !== admin._id}
                                                        className={cn(
                                                            "inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border transition-all",
                                                            hasIt
                                                                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                                                : "text-white/20 bg-white/5 border-white/5",
                                                            editingId === admin._id && "cursor-pointer hover:opacity-80"
                                                        )}
                                                    >
                                                        {hasIt ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                                                        {label}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Save button */}
                                    <AnimatePresence>
                                        {editingId === admin._id && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                                                <Button
                                                    onClick={() => savePermissions(admin._id)}
                                                    disabled={saving}
                                                    className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 font-black uppercase tracking-widest text-[10px] w-full"
                                                >
                                                    {saving ? "Saving..." : "Save Permissions"}
                                                </Button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

