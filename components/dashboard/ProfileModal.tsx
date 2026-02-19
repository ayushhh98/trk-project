"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { User, Copy, LogOut, Check, ShieldCheck, Wallet } from "lucide-react";
import { useWallet } from "@/components/providers/WalletProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileModalProps {
    children?: React.ReactNode;
    asChild?: boolean;
}

export function ProfileModal({ children, asChild }: ProfileModalProps) {
    const { address, user, disconnect } = useWallet();
    const [copiedAddress, setCopiedAddress] = useState(false);
    const [copiedRef, setCopiedRef] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleCopy = async (text: string, type: 'address' | 'ref' | 'id') => {
        try {
            await navigator.clipboard.writeText(text);
            if (type === 'address') {
                setCopiedAddress(true);
                setTimeout(() => setCopiedAddress(false), 2000);
            } else if (type === 'ref') {
                setCopiedRef(true);
                setTimeout(() => setCopiedRef(false), 2000);
            } else {
                setCopiedId(true);
                setTimeout(() => setCopiedId(false), 2000);
            }
            toast.success("Copied to clipboard");
        } catch (err) {
            toast.error("Failed to copy");
        }
    };

    const handleLogout = () => {
        setIsOpen(false);
        disconnect();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild={asChild}>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-black/90 border-white/10 text-white backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-display font-black uppercase tracking-wider flex items-center gap-2">
                        <User className="h-5 w-5 text-amber-500" />
                        User Profile
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Header / Avatar Section */}
                    <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-2">
                            <ShieldCheck className="h-10 w-10 text-white/50" />
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-lg">{user?.email || "TRK Member"}</div>
                            <div className="text-xs text-white/40 uppercase tracking-widest">{user?.clubRank || "Member"}</div>
                        </div>
                    </div>

                    {/* User ID */}
                    <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/40">User ID</div>
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 font-bold text-xs">
                                ID
                            </div>
                            <code className="text-xs font-mono text-white/80 truncate flex-1">
                                {user?.id || "Loading..."}
                            </code>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-white/40 hover:text-white"
                                onClick={() => user?.id && handleCopy(user.id, 'id')}
                                disabled={!user?.id}
                            >
                                {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                        </div>
                    </div>

                    {/* Wallet Address */}
                    <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Connected Wallet</div>
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                            <Wallet className="h-4 w-4 text-emerald-500" />
                            <code className="text-xs font-mono text-white/80 truncate flex-1">
                                {address || "No Wallet Connected"}
                            </code>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-white/40 hover:text-white"
                                onClick={() => address && handleCopy(address, 'address')}
                                disabled={!address}
                            >
                                {copiedAddress ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                        </div>
                    </div>

                    {/* Referral Code */}
                    <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Referral Code</div>
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                            <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-xs">
                                Ref
                            </div>
                            <div className="flex-1 font-mono font-bold text-amber-500 tracking-wider">
                                {user?.referralCode || "Loading..."}
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-amber-500/50 hover:text-amber-500 hover:bg-amber-500/10"
                                onClick={() => user?.referralCode && handleCopy(user.referralCode, 'ref')}
                                disabled={!user?.referralCode}
                            >
                                {copiedRef ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-white/10">
                        <Button
                            onClick={handleLogout}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 h-12 font-black uppercase tracking-widest text-xs"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Log Out
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
