"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

const SCROLL_THRESHOLD = 60;

interface CommsPageHeaderProps {
    title: string;
    subtitle?: string;
    /** Slim one-liner when collapsed, e.g. "Messages — Mission Industrie Transport" */
    slimTitle?: string;
    icon?: ReactNode;
    actions?: ReactNode;
    /** When true, header collapses to slim line on scroll */
    collapsible?: boolean;
    className?: string;
}

export function CommsPageHeader({
    title,
    subtitle,
    slimTitle,
    icon,
    actions,
    collapsible = true,
    className,
}: CommsPageHeaderProps) {
    const [slim, setSlim] = useState(false);

    useEffect(() => {
        if (!collapsible || typeof window === "undefined") return;
        const onScroll = () => setSlim(window.scrollY > SCROLL_THRESHOLD);
        onScroll(); // initial
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [collapsible]);

    const displaySlim = collapsible && slim;
    const oneLiner = slimTitle ?? (subtitle ? `${title} — ${subtitle}` : title);

    if (displaySlim) {
        return (
            <header
                className={cn(
                    "sticky top-0 z-20 flex items-center justify-between gap-3 py-2.5 px-1 -mx-1",
                    "bg-white/95 dark:bg-[#151c2a]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800",
                    "transition-all duration-300 ease-out",
                    className
                )}
            >
                <h1 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                    {oneLiner}
                </h1>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">{actions}</div>
            </header>
        );
    }

    return (
        <header
            className={cn(
                "flex items-center justify-between gap-3 sm:gap-4",
                "transition-all duration-300 ease-out",
                className
            )}
        >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {icon && (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0 text-white">
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">{actions}</div>
        </header>
    );
}
