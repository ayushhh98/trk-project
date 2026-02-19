"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { apiRequest, getApiUrl } from "@/lib/api";

interface ReferralCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCodeValidated: (code: string) => void;
}

export function ReferralCodeModal({ isOpen, onClose, onCodeValidated }: ReferralCodeModalProps) {
    const [referralCode, setReferralCode] = useState("");
    const [isValidating, setIsValidating] = useState(false);
    const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid'>('idle');
    const [errorMessage, setErrorMessage] = useState("");
    const [referrerInfo, setReferrerInfo] = useState<{ address?: string; code?: string } | null>(null);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setReferralCode("");
            setValidationState('idle');
            setErrorMessage("");
            setReferrerInfo(null);
        }
    }, [isOpen]);

    // Real-time validation (debounced)
    useEffect(() => {
        if (!referralCode || referralCode.length < 4) {
            setValidationState('idle');
            setErrorMessage("");
            return;
        }

        const timer = setTimeout(async () => {
            await validateCode(referralCode);
        }, 500);

        return () => clearTimeout(timer);
    }, [referralCode]);

    const validateCode = async (code: string) => {
        setIsValidating(true);
        setErrorMessage("");

        try {
            const data = await apiRequest('/referral/resolve/' + encodeURIComponent(code.trim().toUpperCase()));

            if (data?.status === 'success' || data?.data?.walletAddress) {
                setValidationState('valid');
                setReferrerInfo({
                    address: data.data?.walletAddress || data.walletAddress,
                    code: code.trim().toUpperCase()
                });
            } else {
                setValidationState('invalid');
                setErrorMessage(data.message || 'Invalid referral code');
            }
        } catch (error: any) {
            setValidationState('invalid');
            setErrorMessage(error.message || 'Failed to validate code. Please try again.');
        } finally {
            setIsValidating(false);
        }
    };

    const handleContinue = () => {
        if (validationState === 'valid') {
            onCodeValidated(referralCode.trim().toUpperCase());
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase().trim();
        setReferralCode(value);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md"
                    >
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-3xl" />

                        {/* Modal Content */}
                        <div className="relative bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors group"
                            >
                                <X className="h-5 w-5 text-zinc-400 group-hover:text-white" />
                            </button>

                            {/* Header */}
                            <div className="text-center mb-8">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.1, type: "spring" }}
                                    className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20"
                                >
                                    <ShieldCheck className="h-8 w-8 text-primary" />
                                </motion.div>
                                <h2 className="text-2xl font-bold text-white mb-2">Referral Code Required</h2>
                                <p className="text-sm text-zinc-400">Enter a valid referral code to join the TRK ecosystem</p>
                            </div>

                            {/* Input */}
                            <div className="space-y-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={referralCode}
                                        onChange={handleInputChange}
                                        placeholder="Enter referral code"
                                        className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-primary/50 transition-colors text-center text-lg font-mono tracking-wider uppercase"
                                        maxLength={20}
                                        autoFocus
                                    />

                                    {/* Validation Indicator */}
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        {isValidating && (
                                            <Loader2 className="h-5 w-5 text-primary animate-spin" />
                                        )}
                                        {!isValidating && validationState === 'valid' && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center"
                                            >
                                                <Check className="h-4 w-4 text-green-500" />
                                            </motion.div>
                                        )}
                                        {!isValidating && validationState === 'invalid' && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center"
                                            >
                                                <AlertCircle className="h-4 w-4 text-red-500" />
                                            </motion.div>
                                        )}
                                    </div>
                                </div>

                                {/* Referrer Info */}
                                <AnimatePresence>
                                    {validationState === 'valid' && referrerInfo && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl"
                                        >
                                            <p className="text-xs text-green-400 text-center">
                                                ✓ Valid code from {referrerInfo.address || 'verified user'}
                                            </p>
                                        </motion.div>
                                    )}

                                    {validationState === 'invalid' && errorMessage && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                                        >
                                            <p className="text-xs text-red-400 text-center">{errorMessage}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Continue Button */}
                                <button
                                    onClick={handleContinue}
                                    disabled={validationState !== 'valid' || isValidating}
                                    className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/50 transition-all disabled:hover:shadow-none"
                                >
                                    {isValidating ? 'Validating...' : 'Complete Registration'}
                                </button>

                                {/* Help Text */}
                                <p className="text-xs text-center text-zinc-500">
                                    Don't have a referral code?{' '}
                                    <a href="#" className="text-primary hover:underline">
                                        Contact support
                                    </a>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
