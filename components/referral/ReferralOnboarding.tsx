"use client";

import { useState } from "react";
import { useWallet } from "@/components/providers/WalletProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Gift, Zap, Users, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export function ReferralOnboarding() {
    const { showReferralPrompt, setShowReferralPrompt, applyReferral } = useWallet();
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!code.trim()) {
            toast.error("Please enter a referral code");
            return;
        }
        setIsLoading(true);
        const success = await applyReferral(code);
        setIsLoading(false);
        if (success) {
            setShowReferralPrompt(false);
        }
    };

    return (
        <AnimatePresence>
            {showReferralPrompt && (
                <Dialog open={true} onOpenChange={() => setShowReferralPrompt(false)}>
                    <DialogContent className="sm:max-w-md bg-black/90 border-emerald-500/20 backdrop-blur-2xl rounded-[2.5rem] p-8 overflow-hidden z-[100]">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] pointer-events-none" />

                        <DialogHeader className="space-y-4 relative z-10">
                            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-2">
                                <Gift className="h-8 w-8" />
                            </div>
                            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-white text-left">
                                Welcome <span className="text-emerald-500">Player</span>
                            </DialogTitle>
                            <DialogDescription className="text-white/60 text-sm font-medium leading-relaxed uppercase tracking-widest text-left">
                                Enter a referral code to join a team and unlock exclusive rewards across 15 levels.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-6 relative z-10">
                            <div className="space-y-2">
                                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">Referral Protocol</div>
                                <Input
                                    placeholder="ENTER CODE (e.g. TRK999)"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    className="h-14 bg-white/5 border-white/10 rounded-2xl px-6 text-white font-mono tracking-widest focus:border-emerald-500/50 transition-all uppercase placeholder:text-white/20"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { icon: Zap, label: "Boost" },
                                    { icon: Users, label: "Team" },
                                    { icon: CheckCircle2, label: "Verify" }
                                ].map((item, i) => (
                                    <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col items-center gap-1">
                                        <item.icon className="h-4 w-4 text-white/20" />
                                        <div className="text-[8px] font-black text-white/40 uppercase tracking-tighter">{item.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="relative z-10 flex flex-col gap-3 sm:flex-col sm:justify-start sm:space-x-0">
                            <Button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="h-14 w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                            >
                                {isLoading ? "Synchronizing..." : "Initialize Onboarding"}
                            </Button>
                            <button
                                onClick={() => setShowReferralPrompt(false)}
                                className="text-[10px] font-black text-white/20 hover:text-white transition-colors uppercase tracking-[0.3em] py-4 w-full text-center"
                            >
                                Skip for now
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </AnimatePresence>
    );
}
