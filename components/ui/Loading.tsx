"use client";

import React from "react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

interface LoadingProps {
    className?: string;
    text?: string;
    fullScreen?: boolean;
    overlay?: boolean;
}

export function Loading({
    className,
    text = "Initializing",
    fullScreen = false,
    overlay = false
}: LoadingProps) {
    const containerClasses = cn(
        "flex flex-col items-center justify-center",
        fullScreen && "fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl",
        overlay && "absolute inset-0 z-[50] bg-black/40 backdrop-blur-md rounded-[inherit]",
        className
    );

    return (
        <div className={containerClasses}>
            <div className="relative h-24 w-24">
                <Logo className="h-full w-full animate-pulse" />
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            </div>
            {text && (
                <div className="mt-8 flex flex-col items-center gap-2">
                    <h2 className="text-xl font-display font-bold text-white tracking-widest uppercase italic">
                        {text}
                    </h2>
                    <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default Loading;
