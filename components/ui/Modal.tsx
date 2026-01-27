"use client";

import { useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// MODAL COMPONENT
// ============================================

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl" | "full";
    showCloseButton?: boolean;
    closeOnOverlay?: boolean;
    closeOnEscape?: boolean;
    className?: string;
}

const SIZES = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[95vw] max-h-[95vh]",
};

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = "md",
    showCloseButton = true,
    closeOnOverlay = true,
    closeOnEscape = true,
    className,
}: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    // Handle ESC key
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape" && closeOnEscape) {
                onClose();
            }
        },
        [closeOnEscape, onClose]
    );

    // Handle overlay click
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && closeOnOverlay) {
            onClose();
        }
    };

    // Lock body scroll when modal is open
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
        if (isOpen && modalRef.current) {
            modalRef.current.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={handleOverlayClick}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[4px] animate-fade-in transition-all duration-300" />

            {/* Modal */}
            <div
                ref={modalRef}
                tabIndex={-1}
                className={cn(
                    "relative w-full bg-white/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-3xl overflow-hidden flex flex-col",
                    "transform transition-all duration-300 ease-out animate-scale-in max-h-[85vh]",
                    SIZES[size],
                    className
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex-shrink-0 flex items-start justify-between px-6 py-5 border-b border-slate-100/50 bg-gradient-to-b from-white/50 to-transparent">
                        <div className="pr-8">
                            {title && (
                                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p className="text-sm text-slate-500 mt-1.5 font-medium">
                                    {description}
                                </p>
                            )}
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100/80 rounded-full transition-all duration-200 hover:rotate-90 z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">{children}</div>
            </div>
        </div>
    );
}

// ============================================
// MODAL FOOTER (for buttons)
// ============================================

interface ModalFooterProps {
    children: React.ReactNode;
    className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
    return (
        <div
            className={cn(
                "flex items-center justify-end gap-3 pt-4 mt-4 border-t border-slate-100",
                className
            )}
        >
            {children}
        </div>
    );
}

// ============================================
// CONFIRMATION MODAL
// ============================================

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "default";
    isLoading?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirmer",
    cancelText = "Annuler",
    variant = "default",
    isLoading = false,
}: ConfirmModalProps) {
    const buttonVariants = {
        danger: "bg-red-600 hover:bg-red-700 text-white",
        warning: "bg-amber-600 hover:bg-amber-700 text-white",
        default: "bg-indigo-600 hover:bg-indigo-700 text-white",
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <p className="text-slate-600">{message}</p>
            <ModalFooter>
                <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                    {cancelText}
                </button>
                <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50",
                        buttonVariants[variant]
                    )}
                >
                    {isLoading ? "Chargement..." : confirmText}
                </button>
            </ModalFooter>
        </Modal>
    );
}

export default Modal;
