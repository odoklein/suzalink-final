"use client";

import { useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// DRAWER COMPONENT
// ============================================

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl" | "full";
    side?: "right" | "left";
    showCloseButton?: boolean;
    closeOnOverlay?: boolean;
    closeOnEscape?: boolean;
    className?: string;
    footer?: React.ReactNode;
}

const SIZES = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[95vw]",
};

export function Drawer({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = "lg",
    side = "right",
    showCloseButton = true,
    closeOnOverlay = true,
    closeOnEscape = true,
    className,
    footer,
}: DrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);

    // Handle ESC key
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape" && closeOnEscape) {
                onClose();
            }
        },
        [closeOnEscape, onClose]
    );

    // Lock body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            document.addEventListener("keydown", handleKeyDown);
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);

    // Focus trap
    useEffect(() => {
        if (isOpen && drawerRef.current) {
            drawerRef.current.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOverlayClickClose = () => {
        if (closeOnOverlay) onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Overlay — click here to close */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in cursor-pointer"
                onClick={handleOverlayClickClose}
                aria-hidden="true"
            />

            {/* Drawer panel — clicks don't close */}
            <div
                ref={drawerRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                className={cn(
                    "fixed top-0 bottom-0 w-full flex flex-col bg-white shadow-2xl z-[51]",
                    side === "right"
                        ? "right-0 animate-slide-in-right"
                        : "left-0 animate-slide-in-left",
                    SIZES[size],
                    className
                )}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex-1 min-w-0 pr-4">
                            {title && (
                                <h2 className="text-xl font-bold text-slate-900 truncate">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p className="text-sm text-slate-500 mt-1">
                                    {description}
                                </p>
                            )}
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-2 -m-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-6 pt-4 border-t border-slate-100 bg-slate-50/30">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// DRAWER SECTION (for organizing content)
// ============================================

interface DrawerSectionProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function DrawerSection({ title, children, className }: DrawerSectionProps) {
    return (
        <div className={cn("space-y-4", className)}>
            {title && (
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                    {title}
                </h3>
            )}
            {children}
        </div>
    );
}

// ============================================
// DRAWER FIELD (for displaying info)
// ============================================

interface DrawerFieldProps {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
}

export function DrawerField({ label, value, icon, className }: DrawerFieldProps) {
    return (
        <div className={cn("flex items-start gap-3", className)}>
            {icon && (
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    {icon}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <div className="text-slate-900 mt-0.5">
                    {value || <span className="text-slate-400 italic">Non renseigné</span>}
                </div>
            </div>
        </div>
    );
}

export default Drawer;
