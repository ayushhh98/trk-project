"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import { parseAbiItem, formatUnits } from "viem";
import { ERC20ABI } from "@/config/abis";
import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { History, ExternalLink, ArrowDownCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LedgerEntry = {
    source: "game" | "wallet";
    amount: number;
    createdAt: string;
    txHash?: string;
};

export function DepositHistoryTable() {
    const { deposits, isLoading, address, addresses, currentChainId } = useWallet();
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

    const hydrateLogs = async (logs: any[]) => {
        if (!publicClient) return [];
        if (!logs.length) return [];

        const uniqueBlocks = Array.from(
            new Set(
                logs
                    .map((l) => l.blockNumber)
                    .filter((bn): bn is bigint => typeof bn === "bigint")
            )
        );
        const blockMap = new Map<string, bigint>();
        await Promise.all(uniqueBlocks.map(async (blockNumber: bigint) => {
            const block = await publicClient.getBlock({ blockNumber });
            blockMap.set(blockNumber.toString(), block.timestamp);
        }));

        return logs.map((log) => {
            const value = (log.args?.value ?? 0n) as bigint;
            const amount = Number(formatUnits(value, 18));
            const ts = log.blockNumber ? blockMap.get(log.blockNumber.toString()) : undefined;
            const createdAt = ts ? new Date(Number(ts) * 1000).toISOString() : new Date().toISOString();

            return {
                source: "wallet",
                amount,
                createdAt,
                txHash: log.transactionHash
            } as LedgerEntry;
        });
    };

    useEffect(() => {
        if (!publicClient || !address || !usdtAddress) return;

        let cancelled = false;
        const fetchRecent = async () => {
            setIsWalletSyncing(true);
            try {
                const latest = await publicClient.getBlockNumber();
                const lookback = 10000n;
                const fromBlock = latest > lookback ? latest - lookback : 0n;
                const logs = await publicClient.getLogs({
                    address: usdtAddress,
                    event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
                    args: { to: address as `0x${string}` },
                    fromBlock,
                    toBlock: latest
                });

                const sorted = [...logs].sort((a: any, b: any) => {
                    const aBlock = a.blockNumber ?? 0n;
                    const bBlock = b.blockNumber ?? 0n;
                    if (aBlock === bBlock) return Number((b.logIndex ?? 0) - (a.logIndex ?? 0));
                    return Number(bBlock - aBlock);
                });

                const trimmed = sorted.slice(0, 20);
                const entries = await hydrateLogs(trimmed);

                if (!cancelled) {
                    setWalletInflows(entries);
                    seenTxsRef.current = new Set(entries.map((e) => e.txHash || ""));
                }
            } catch (err: any) {
                if (!cancelled) {
                    console.error("Failed to load wallet inflows:", err);
                }
            } finally {
                if (!cancelled) setIsWalletSyncing(false);
            }
        };

        fetchRecent();
        return () => {
            cancelled = true;
        };
    }, [publicClient, address, usdtAddress]);

    useEffect(() => {
        if (!publicClient || !address || !usdtAddress) return;

        const unwatch = publicClient.watchContractEvent({
            address: usdtAddress,
            abi: ERC20ABI,
            eventName: "Transfer",
            args: { to: address as `0x${string}` },
            onLogs: async (logs) => {
                const entries = await hydrateLogs(logs);
                setWalletInflows((prev) => {
                    const next = [...entries, ...prev];
                    const deduped: LedgerEntry[] = [];
                    const seen = new Set<string>();
                    for (const item of next) {
                        if (!item.txHash) continue;
                        if (seen.has(item.txHash)) continue;
                        seen.add(item.txHash);
                        deduped.push(item);
                    }
                    seenTxsRef.current = new Set(seen);
                    return deduped.slice(0, 50);
                });
            }
        });

        setIsLive(true);
        return () => {
            setIsLive(false);
            if (unwatch) unwatch();
        };
    }, [publicClient, address, usdtAddress]);

    const entries: LedgerEntry[] = useMemo(() => {
        const fromBackend = (deposits || []).map((item) => ({
            source: "game",
            amount: item.amount,
            createdAt: item.createdAt,
            txHash: item.txHash
        }));
        return [...walletInflows, ...fromBackend].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [deposits, walletInflows]);

    if ((isLoading || isWalletSyncing) && entries.length === 0) {
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
                        <span className="text-white/30">{isLive ? "Live Feed" : "Syncing"}</span>
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
