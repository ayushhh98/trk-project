"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Wallet, Copy, ExternalLink, RefreshCw, Plus, Trash2 } from "lucide-react";
import { adminAPI } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner"; // Assuming sonner is used for toasts
import { cn } from "@/lib/utils";

interface BDWallet {
    _id: string;
    name: string;
    address: string;
    balance: string;
    type: string;
}

export function BDWallets() {
    const [wallets, setWallets] = useState<BDWallet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newWallet, setNewWallet] = useState({ name: '', address: '', type: 'BD' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await adminAPI.getWallets();
            if (res.status === 'success') {
                setWallets(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch BD wallets:", error);
            toast.error("Failed to load wallets");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const copyAddress = (addr: string) => {
        navigator.clipboard.writeText(addr);
        toast.success("Address copied to clipboard");
    };

    const handleAddWallet = async () => {
        if (!newWallet.name || !newWallet.address) {
            toast.error("Name and Address are required");
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await adminAPI.addWallet(newWallet);
            if (res.status === 'success') {
                toast.success("Wallet added successfully");
                setIsAddOpen(false);
                setNewWallet({ name: '', address: '', type: 'BD' });
                fetchData();
            } else {
                toast.error(res.message || "Failed to add wallet");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to add wallet");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteWallet = async (id: string) => {
        if (!confirm("Are you sure you want to delete this wallet?")) return;
        try {
            const res = await adminAPI.deleteWallet(id);
            if (res.status === 'success') {
                toast.success("Wallet deleted");
                fetchData();
            } else {
                toast.error(res.message || "Failed to delete wallet");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to delete wallet");
        }
    };

    return (
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Strategic Wallets (BD)
                    </CardTitle>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1 font-bold">
                        Treasury & Liquidity Management
                    </p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="h-8 gap-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50">
                                <Plus className="h-3 w-3" /> Add Wallet
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-black/90 border-white/10 text-white">
                            <DialogHeader>
                                <DialogTitle>Add Strategic Wallet</DialogTitle>
                                <DialogDescription className="text-white/50">
                                    Add a new wallet to track in the BD section.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Wallet Name</label>
                                    <Input
                                        placeholder="e.g. Marketing Fund"
                                        value={newWallet.name}
                                        onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
                                        className="bg-white/5 border-white/10 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Wallet Address</label>
                                    <Input
                                        placeholder="0x..."
                                        value={newWallet.address}
                                        onChange={(e) => setNewWallet({ ...newWallet, address: e.target.value })}
                                        className="bg-white/5 border-white/10 text-white font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Type</label>
                                    <select
                                        value={newWallet.type}
                                        onChange={(e) => setNewWallet({ ...newWallet, type: e.target.value })}
                                        className="w-full h-10 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="BD">Business Development</option>
                                        <option value="TREASURY">Treasury</option>
                                        <option value="MARKETING">Marketing</option>
                                        <option value="JACKPOT">Jackpot</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddWallet} disabled={isSubmitting}>
                                    {isSubmitting ? "Adding..." : "Add Wallet"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchData}
                        disabled={isLoading}
                        className="h-8 w-8 hover:bg-white/10"
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    {isLoading ? (
                        [1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
                        ))
                    ) : wallets.length === 0 ? (
                        <div className="col-span-full border border-white/10 bg-white/[0.02] p-8 text-center rounded-2xl">
                            <p className="text-sm text-white/50 mb-2">No wallets configured</p>
                            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)}>
                                Add your first wallet
                            </Button>
                        </div>
                    ) : (
                        wallets.map((wallet, idx) => (
                            <div
                                key={wallet._id || idx}
                                className="group relative p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-primary/30 transition-all duration-300"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                        <Wallet className="h-4 w-4" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-[10px] font-black text-white/20 uppercase tracking-tighter">
                                            {wallet.type}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteWallet(wallet._id)}
                                            className="text-white/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider truncate" title={wallet.name}>
                                        {wallet.name}
                                    </h3>
                                    <div className="text-xl font-mono font-black text-white tracking-tighter truncate" title={wallet.balance}>
                                        {wallet.balance} <span className="text-[10px] font-normal text-white/40">USDT</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                    <code className="text-[10px] text-white/30 font-mono">
                                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                                    </code>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => copyAddress(wallet.address)}
                                            className="p-1.5 rounded-md hover:bg-white/10 text-white/20 hover:text-white transition-all"
                                        >
                                            <Copy className="h-3 w-3" />
                                        </button>
                                        <a
                                            href={`https://bscscan.com/address/${wallet.address}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-1.5 rounded-md hover:bg-white/10 text-white/20 hover:text-white transition-all"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                </div>

                                {/* Hover Glow */}
                                <div className="absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
