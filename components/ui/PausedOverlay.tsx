import { Lock } from "lucide-react";

interface PausedOverlayProps {
    title?: string;
    message?: string;
}

export function PausedOverlay({ title = "Protocol Paused", message = "This feature is temporarily suspended by the administrator." }: PausedOverlayProps) {
    return (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 rounded-[inherit]">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 mb-4 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                <Lock className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-white/50 max-w-[200px]">
                {message}
            </p>
        </div>
    );
}
