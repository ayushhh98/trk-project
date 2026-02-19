"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Save, RefreshCw, Edit3, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSocket } from "@/components/providers/Web3Provider";

interface LegalSection {
    content: string;
    version: number;
    lastUpdated: string;
    updatedBy: string | null;
}

interface LegalContent {
    terms: LegalSection;
    privacy_policy: LegalSection;
    risk_disclaimer: LegalSection;
    cookie_policy: LegalSection;
    aml_notice: LegalSection;
    no_guarantee: LegalSection;
}

const SECTION_META: Record<string, { label: string; description: string; required: boolean }> = {
    terms: { label: "Terms & Conditions", description: "Core platform rules, user obligations, and service terms", required: true },
    privacy_policy: { label: "Privacy Policy", description: "Data collection, usage, and protection policies", required: true },
    risk_disclaimer: { label: "Risk Disclaimer", description: "Financial risk warnings and investment disclaimers", required: true },
    cookie_policy: { label: "Cookie Policy", description: "Usage of cookies and tracking technologies", required: true },
    aml_notice: { label: "AML Notice", description: "Anti-money laundering policy and compliance statement", required: true },
    no_guarantee: { label: "No Guarantee Notice", description: "Income and returns disclaimer for legal compliance", required: true },
};

const PLACEHOLDER_PATTERNS = [
    /content to be updated by admin/i,
    /no content yet/i,
    /enter legal content/i
];

const normalizeContent = (value?: string) =>
    (value || "")
        .replace(/[#>*`_-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const isMeaningfulContent = (value?: string) => {
    const normalized = normalizeContent(value);
    if (normalized.length < 80) return false;
    return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
};

export function LegalCompliance() {
    const socket = useSocket();
    const [content, setContent] = useState<LegalContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [saving, setSaving] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Compliance score: how many sections have content
    const complianceScore = content
        ? Object.keys(SECTION_META).filter(k => isMeaningfulContent((content as any)[k]?.content)).length
        : 0;
    const totalSections = Object.keys(SECTION_META).length;

    const fetchContent = async (showLoader = false) => {
        if (showLoader) setIsLoading(true);
        else setIsRefreshing(true);
        try {
            const token = localStorage.getItem("trk_token");
            const res = await fetch(`/api/admin/legal?t=${Date.now()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                cache: 'no-store'
            });
            const data = await res.json();
            if (data.status === "success") {
                // Ensure all keys from SECTION_META exist in content, even if backend returns partial data
                const completeContent = { ...data.data };
                Object.keys(SECTION_META).forEach(key => {
                    if (!completeContent[key]) {
                        completeContent[key] = { content: "", version: 0, lastUpdated: "", updatedBy: null };
                    }
                });
                setContent(completeContent);
                setLastSync(new Date());
            }
        } catch (e) {
            console.error("Failed to fetch legal content:", e);
        } finally {
            if (showLoader) setIsLoading(false);
            else setIsRefreshing(false);
        }
    };

    useEffect(() => { fetchContent(true); }, []);

    // Auto-refresh every 30s
    useEffect(() => {
        intervalRef.current = setInterval(() => fetchContent(false), 30000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    // Live section updates from backend socket
    useEffect(() => {
        if (!socket) return;

        const handleConnect = () => setIsLive(true);
        const handleDisconnect = () => setIsLive(false);
        const handleLegalUpdate = (payload: { type?: string; section?: LegalSection }) => {
            if (!payload?.type || !payload.section) return;
            setContent((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    [payload.type as keyof LegalContent]: payload.section
                };
            });
            setLastSync(new Date());
        };

        setIsLive(socket.connected);
        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("admin:legal_updated", handleLegalUpdate);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("admin:legal_updated", handleLegalUpdate);
            setIsLive(false);
        };
    }, [socket]);

    const startEdit = (key: string) => {
        setEditingSection(key);
        setEditText((content as any)?.[key]?.content || "");
    };

    const saveSection = async () => {
        if (!editingSection) return;
        setSaving(true);
        try {
            const token = localStorage.getItem("trk_token");
            const res = await fetch(`/api/admin/legal/${editingSection}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ content: editText })
            });
            const data = await res.json();
            if (data.status === "success") {
                toast.success("Legal content updated", { description: `Version ${data.data.version} saved` });
                setEditingSection(null);
                fetchContent(false);
            } else {
                toast.error(data.message || "Failed to save");
            }
        } catch (e) {
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) return (
        <div className="text-center py-12 text-white/20 text-[10px] uppercase tracking-widest animate-pulse">Loading legal content...</div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-rose-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                            Legal & Compliance
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                                complianceScore === totalSections
                                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                    : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                            )}>
                                <ShieldCheck className="h-2.5 w-2.5 inline mr-1" />
                                {complianceScore}/{totalSections} Complete
                            </span>
                        </h2>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Superadmin Only · Versioned content</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        isLive ? "text-emerald-400" : "text-amber-400"
                    )}>
                        {isLive ? "Live" : "Polling"}
                    </span>
                    {lastSync && (
                        <span className="text-[9px] uppercase tracking-widest text-white/30">
                            Synced {new Date(lastSync).toLocaleTimeString()}
                        </span>
                    )}
                    <Button variant="outline" size="sm" onClick={() => fetchContent(false)} className="border-white/10 hover:bg-white/5">
                        <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Legal notice */}
            <Card className="bg-rose-500/5 border-rose-500/20">
                <CardContent className="p-4 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />
                    <p className="text-[11px] text-rose-400/80">
                        <strong>All {totalSections} legal sections are required.</strong> Ensure all content is reviewed by a legal professional before publishing. Changes are versioned and logged.
                    </p>
                </CardContent>
            </Card>

            {/* Sections */}
            <div className="space-y-4">
                {Object.entries(SECTION_META).map(([key, meta]) => {
                    const section = (content as any)?.[key] as LegalSection | undefined;
                    const isEditing = editingSection === key;

                    return (
                        <motion.div key={key} layout>
                            <Card className={cn("bg-black/40 border-white/5 overflow-hidden", isEditing && "border-rose-500/20")}>
                                <CardContent className="p-6 space-y-4">
                                    {/* Section header */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-sm uppercase tracking-wide">{meta.label}</h3>
                                                {meta.required && (
                                                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-rose-400 bg-rose-500/10">Required</span>
                                                )}
                                                {section?.version && (
                                                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white/20 bg-white/5">v{section.version}</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-white/30">{meta.description}</p>
                                            {section?.lastUpdated && (
                                                <p className="text-[9px] text-white/20">
                                                    Last updated: {new Date(section.lastUpdated).toLocaleString()}
                                                    {section.updatedBy ? ` by ${section.updatedBy.slice(0, 8)}...` : ""}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => isEditing ? setEditingSection(null) : startEdit(key)}
                                            variant="outline"
                                            className={cn(
                                                "text-[10px] font-black uppercase tracking-widest flex-shrink-0",
                                                isEditing ? "border-white/10 hover:bg-white/5" : "border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                                            )}
                                        >
                                            {isEditing ? "Cancel" : <><Edit3 className="h-3 w-3 mr-1.5" />Edit</>}
                                        </Button>
                                    </div>

                                    {/* Content preview / editor */}
                                    <AnimatePresence mode="wait">
                                        {isEditing ? (
                                            <motion.div
                                                key="editor"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-3"
                                            >
                                                <textarea
                                                    value={editText}
                                                    onChange={e => setEditText(e.target.value)}
                                                    rows={12}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/70 font-mono resize-none focus:outline-none focus:border-rose-500/30 transition-colors"
                                                    placeholder="Enter legal content in Markdown format..."
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={saveSection}
                                                        disabled={saving || !editText.trim()}
                                                        className="flex-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 font-black uppercase tracking-widest text-[10px]"
                                                    >
                                                        <Save className="h-3.5 w-3.5 mr-1.5" />
                                                        {saving ? "Saving..." : "Save Content"}
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="preview"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="bg-white/[0.02] rounded-xl p-4 max-h-32 overflow-hidden relative"
                                            >
                                                <pre className="text-[10px] text-white/30 font-mono whitespace-pre-wrap line-clamp-4">
                                                    {section?.content || "No content yet. Click Edit to add content."}
                                                </pre>
                                                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/40 to-transparent" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Status indicator */}
                                    {!isEditing && (
                                        <div className="flex items-center gap-2">
                                            {isMeaningfulContent(section?.content) ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                                                    <CheckCircle className="h-3 w-3" /> Content set
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-400">
                                                    <AlertTriangle className="h-3 w-3" /> Needs content
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
