"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import { formatUnits, isAddress } from "viem";
import { ERC20ABI } from "@/config/abis";
import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { History, ExternalLink, ArrowDownCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/components/providers/Web3Provider";

type LedgerEntry = {
    source: "game" | "wallet";
    amount: number;
    createdAt: string;
    txHash?: string;
};

export function DepositHistoryTable() {
    const { deposits, isLoading, address, addresses, currentChainId } = useWallet();
    const socket = useSocket();
    const publicClient = usePublicClient();
    const [walletInflows, setWalletInflows] = useState<LedgerEntry[]>([]);
    const [isWalletSyncing, setIsWalletSyncing] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const seenTxsRef = useRef<Set<string>>(new Set());

    const explorerBase = currentChainId === 97 ? "https://testnet.bscscan.com" : "https://bscscan.com";

    const usdtAddress = useMemo(() => {
        const addr = addresses?.USDT;
        if (!addr || addr === "0x0000000000000000000000000000000000000000") return null;
        return addr as `0x${string}`;
    }, [addresses?.USDT]);

    // â”€â”€ Fetch historical inflows via backend (avoids all public RPC getLogs issues) â”€â”€
    useEffect(() => {
        if (!address || !isAddress(address)) {
            setIsWalletSyncing(false);
            return;
        }

        let cancelled = false;
        setIsWalletSyncing(true);

        const fetchFromBackend = async () => {
            // Safety timeout: unblock UI after 8s regardless
            const syncTimeout = setTimeout(() => {
                if (!cancelled) setIsWalletSyncing(false);
            }, 8_000);

            try {
                const token = localStorage.getItem("trk_token");
                const headers: Record<string, string> = {};
                if (token) headers["Authorization"] = `Bearer ${token}`;

                // Backend proxies BSCScan â€” no RPC getLogs needed
                const res = await fetch(
                    `/api/users/wallet/inflows?address=${address}&limit=20`,
                    { headers }
                );

                if (cancelled) return;

                if (res.ok) {
                    const data = await res.json();
                    const inflows: LedgerEntry[] = (data.transactions || []).map((tx: any) => ({
                        source: "wallet" as const,
                        amount: parseFloat(tx.value || tx.amount || "0"),
                        createdAt: tx.timeStamp
                            ? new Date(Number(tx.timeStamp) * 1000).toISOString()
                            : (tx.createdAt || new Date().toISOString()),
                        txHash: tx.hash || tx.txHash
                    }));
                    if (!cancelled) {
                        setWalletInflows(inflows);
                        seenTxsRef.current = new Set(inflows.map(e => e.txHash || ""));
                    }
                }
                // If endpoint 404s, silently fall through â€” backend deposits still show
            } catch (err: any) {
                if (!cancelled) {
                    console.warn("[Ledger] Could not fetch wallet inflows:", err.message);
                }
            } finally {
                clearTimeout(syncTimeout);
                if (!cancelled) setIsWalletSyncing(false);
            }
        };

        fetchFromBackend();
        return () => { cancelled = true; };
    }, [address]);

    // â”€â”€ Live watch for new incoming transfers (Server-Side Source of Truth via Socket) â”€â”€
    useEffect(() => {
        if (!socket) return;

        const handleNewDeposit = (data: any) => {
            // Filter for current user's wallet
            if (!address || (data.walletAddress && data.walletAddress.toLowerCase() !== address.toLowerCase())) return;

            const newEntry: LedgerEntry = {
                source: "wallet",
                amount: typeof data.amount === 'number' ? data.amount : parseFloat(data.amount),
                createdAt: data.createdAt || new Date().toISOString(),
                txHash: data.txHash || `socket_dep_${Date.now()}`
            };

            setWalletInflows(prev => {
                const next = [newEntry, ...prev];
                // Dedupe
                const seen = new Set<string>();
                const deduped: LedgerEntry[] = [];
                for (const item of next) {
                    if (!item.txHash || seen.has(item.txHash)) continue;
                    seen.add(item.txHash);
                    deduped.push(item);
                }
                seenTxsRef.current = new Set(seen);
                return deduped.slice(0, 50);
            });

            // Flash live indicator
            setIsLive(true);
            setTimeout(() => setIsLive(false), 3000);
        };

        socket.on('new_deposit', handleNewDeposit);
        // Also listen for generic transaction_created if type is deposit
        socket.on('transaction_created', (data: any) => {
            if (data.type === 'deposit') handleNewDeposit(data);
        });

        // Set live state to true if socket is connected
        if (socket.connected) setIsLive(true);

        return () => {
            if (socket) {
                socket.off('new_deposit', handleNewDeposit);
                socket.off('transaction_created');
            }
        };
    }, [address, socket]);

    const entries: LedgerEntry[] = useMemo(() => {
        const fromBackend = (deposits || []).map((item) => ({
            source: "game" as const,
            amount: item.amount,
            createdAt: item.createdAt,
            txHash: item.txHash
        }));
        return [...walletInflows, ...fromBackend].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [deposits, walletInflows]);

    if (isLoading && entries.length === 0) {
        return (
            <Card className="bg-black/40 backdrop-blur-xl border-white/5">
                <CardContent className="p-8 text-center text-white/20 uppercase tracking-[0.2em] font-black text-[10px] animate-pulse">
                    Synching Ledger...
                </CardContent>
            </Card>
        );
    }

    if (entries.length === 0) {
        return (
            <Card className="bg-black/40 backdrop-blur-xl border-white/5 p-12 text-center rounded-[2rem]">
                <div className="flex flex-col items-center gap-4 opacity-20">
                    <History className="h-12 w-12" />
                    <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest">No Injections Recorded</p>
                        <p className="text-[10px] uppercase tracking-widest leading-relaxed">System protocol: All incoming liquid assets will appear here.</p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="bg-black/40 backdrop-blur-xl border-white/5 rounded-[2rem] overflow-hidden group border border-emerald-500/10">
            <CardHeader className="border-b border-white/5 p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center rounded-xl">
                            <ArrowDownCircle className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-display font-black tracking-tighter uppercase italic">Injection_Logs</CardTitle>
                            <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Capital_Sync_History</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                        <div className={cn(
                            "h-2 w-2 rounded-full",
                            isLive ? "bg-emerald-500 animate-pulse" : "bg-white/10"
                        )} />
                        <span className="text-white/30">{isLive ? "Live Feed" : isWalletSyncing ? "Syncing" : "Ready"}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 h-16 px-8">Arrival_Time</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 h-16">Volume</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 h-16">Network_Status</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 h-16 text-right px-8">Trace_Hash</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.map((item, idx) => (
                                <TableRow key={item.txHash || idx} className="border-white/5 hover:bg-white/[0.02] transition-colors group/row">
                                    <TableCell className="px-8 h-20">
                                        <div className="text-[10px] font-mono font-bold text-white/60">
                                            {format(new Date(item.createdAt), "yyyy.MM.dd // HH:mm:ss")}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-sm font-display font-black text-white">{item.amount.toFixed(2)}</span>
                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">USDT</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={cn(
                                            "inline-flex items-center gap-2 px-3 py-1 rounded-full border",
                                            item.source === "wallet"
                                                ? "bg-cyan-500/5 border-cyan-500/10"
                                                : "bg-emerald-500/5 border-emerald-500/10"
                                        )}>
                                            <div className={cn(
                                                "h-1 w-1 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]",
                                                item.source === "wallet" ? "bg-cyan-400" : "bg-emerald-500"
                                            )} />
                                            <span className={cn(
                                                "text-[8px] font-black uppercase tracking-widest",
                                                item.source === "wallet" ? "text-cyan-400" : "text-emerald-500"
                                            )}>
                                                {item.source === "wallet" ? "EXTERNAL_INFLOW" : "CONFIRMED_ON_CHAIN"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right px-8">
                                        {item.txHash && !item.txHash.startsWith('mock_') ? (
                                            <a
                                                href={`${explorerBase}/tx/${item.txHash}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 text-[10px] font-mono font-bold text-white/20 hover:text-emerald-500 transition-colors"
                                            >
                                                {item.txHash.slice(0, 6)}...{item.txHash.slice(-4)}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold text-white/10 uppercase italic">
                                                Internal_Transfer
                                                <CheckCircle2 className="h-3 w-3" />
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}


