import { Button } from "@/components/ui/Button";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface QuickActionsProps {
    onDeposit: () => void;
    onWithdraw: () => void;
    isRealMode: boolean;
}

export function QuickActions({ onDeposit, onWithdraw, isRealMode }: QuickActionsProps) {
    if (!isRealMode) return null;

    return (
        <div className="flex items-center gap-3">
            <Button
                onClick={onDeposit}
                size="sm"
                className="h-10 px-6 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 font-bold uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
                <ArrowUpRight className="h-4 w-4 mr-1.5" />
                Deposit
            </Button>
            <Button
                onClick={onWithdraw}
                variant="outline"
                size="sm"
                className="h-10 px-6 rounded-xl border-white/10 text-white hover:bg-white/5 font-bold uppercase tracking-wider text-xs"
            >
                <ArrowDownRight className="h-4 w-4 mr-1.5" />
                Withdraw
            </Button>
        </div>
    );
}
