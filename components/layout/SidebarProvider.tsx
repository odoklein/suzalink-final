"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

// ============================================
// SIDEBAR CONTEXT TYPES
// ============================================

interface SidebarContextValue {
    isCollapsed: boolean;
    isMobileOpen: boolean;
    toggleCollapsed: () => void;
    setCollapsed: (collapsed: boolean) => void;
    openMobile: () => void;
    closeMobile: () => void;
    toggleMobile: () => void;
}

// ============================================
// SIDEBAR CONTEXT
// ============================================

const SidebarContext = createContext<SidebarContextValue | null>(null);

// ============================================
// LOCAL STORAGE KEY
// ============================================

const SIDEBAR_COLLAPSED_KEY = "suzalink_sidebar_collapsed";

// ============================================
// SIDEBAR PROVIDER
// ============================================

interface SidebarProviderProps {
    children: React.ReactNode;
    defaultCollapsed?: boolean;
}

export function SidebarProvider({ 
    children, 
    defaultCollapsed = false 
}: SidebarProviderProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    // Load collapsed state from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        if (stored !== null) {
            setIsCollapsed(stored === "true");
        }
        setIsHydrated(true);
    }, []);

    // Persist collapsed state to localStorage
    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
        }
    }, [isCollapsed, isHydrated]);

    // Close mobile menu on resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024 && isMobileOpen) {
                setIsMobileOpen(false);
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [isMobileOpen]);

    // Close mobile menu on escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isMobileOpen) {
                setIsMobileOpen(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isMobileOpen]);

    // Toggle collapsed state
    const toggleCollapsed = useCallback(() => {
        setIsCollapsed((prev) => !prev);
    }, []);

    // Set collapsed state directly
    const setCollapsed = useCallback((collapsed: boolean) => {
        setIsCollapsed(collapsed);
    }, []);

    // Open mobile menu
    const openMobile = useCallback(() => {
        setIsMobileOpen(true);
    }, []);

    // Close mobile menu
    const closeMobile = useCallback(() => {
        setIsMobileOpen(false);
    }, []);

    // Toggle mobile menu
    const toggleMobile = useCallback(() => {
        setIsMobileOpen((prev) => !prev);
    }, []);

    // Memoized context value
    const contextValue = useMemo<SidebarContextValue>(
        () => ({
            isCollapsed,
            isMobileOpen,
            toggleCollapsed,
            setCollapsed,
            openMobile,
            closeMobile,
            toggleMobile,
        }),
        [isCollapsed, isMobileOpen, toggleCollapsed, setCollapsed, openMobile, closeMobile, toggleMobile]
    );

    return (
        <SidebarContext.Provider value={contextValue}>
            {children}
        </SidebarContext.Provider>
    );
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to access the sidebar context
 */
export function useSidebar(): SidebarContextValue {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
}

export default SidebarProvider;
