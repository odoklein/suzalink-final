"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    Zap,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarProvider";
import { usePermissions } from "@/lib/permissions/PermissionProvider";
import { NavSection, NavItem, ROLE_CONFIG } from "@/lib/navigation/config";
import { UserRole } from "@prisma/client";

// ============================================
// TYPES
// ============================================

interface GlobalSidebarProps {
    navigation: NavSection[];
}

// ============================================
// SIDEBAR NAV ITEM
// ============================================

function SidebarNavItem({ 
    item, 
    isCollapsed,
    onMobileClose,
}: { 
    item: NavItem;
    isCollapsed: boolean;
    onMobileClose?: () => void;
}) {
    const pathname = usePathname();
    const { hasPermission } = usePermissions();
    
    // Check permission
    if (item.permission && !hasPermission(item.permission)) {
        return null;
    }

    const isActive = pathname === item.href || 
        (item.href !== "/" && pathname.startsWith(item.href + "/"));

    return (
        <Link
            href={item.href}
            onClick={onMobileClose}
            className={cn(
                "sidebar-nav-item flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group relative",
                isActive
                    ? "text-indigo-400 bg-gradient-to-r from-indigo-500/15 to-indigo-600/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
        >
            {/* Active indicator */}
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[60%] bg-gradient-to-b from-indigo-400 to-indigo-600 rounded-r-full" />
            )}
            
            <item.icon className={cn(
                "w-4 h-4 flex-shrink-0 transition-transform duration-200",
                isActive && "scale-110"
            )} />
            
            {/* Label with collapse animation */}
            <span className={cn(
                "flex-1 whitespace-nowrap transition-all duration-300",
                isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}>
                {item.label}
            </span>
            
            {/* Active chevron */}
            {isActive && !isCollapsed && (
                <ChevronRight className="w-4 h-4 text-indigo-500/50" />
            )}

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                    {item.label}
                </div>
            )}
        </Link>
    );
}

// ============================================
// SIDEBAR SECTION
// ============================================

function SidebarSection({ 
    section, 
    isCollapsed,
    onMobileClose,
}: { 
    section: NavSection;
    isCollapsed: boolean;
    onMobileClose?: () => void;
}) {
    const { hasPermission } = usePermissions();
    
    // Filter items based on permissions
    const visibleItems = section.items.filter(item => 
        !item.permission || hasPermission(item.permission)
    );

    // Don't render empty sections
    if (visibleItems.length === 0) return null;

    return (
        <div className="space-y-0.5">
            {/* Section title */}
            {section.title && !isCollapsed && (
                <div className="px-2.5 pt-3 pb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500/80">
                        {section.title}
                    </span>
                </div>
            )}
            
            {/* Section items */}
            {visibleItems.map((item) => (
                <SidebarNavItem
                    key={item.href}
                    item={item}
                    isCollapsed={isCollapsed}
                    onMobileClose={onMobileClose}
                />
            ))}
        </div>
    );
}

// ============================================
// MAIN GLOBAL SIDEBAR
// ============================================

export function GlobalSidebar({ navigation }: GlobalSidebarProps) {
    const { data: session } = useSession();
    const { isCollapsed, isMobileOpen, toggleCollapsed, closeMobile } = useSidebar();
    
    const userRole = session?.user?.role as UserRole | undefined;
    const roleConfig = userRole ? ROLE_CONFIG[userRole] : null;

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={closeMobile}
                />
            )}

            {/* Sidebar - Always fixed */}
            <aside
                className={cn(
                    // Base styles - Fixed positioning
                    "sidebar-container fixed top-0 left-0 h-screen z-50",
                    "bg-gradient-to-b from-slate-900 to-slate-800",
                    "flex flex-col border-r border-white/5 shadow-xl",
                    // Width transitions
                    "transition-all duration-300 ease-in-out",
                    isCollapsed ? "lg:w-[60px]" : "lg:w-56",
                    // Mobile positioning
                    isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
                    "w-56"
                )}
            >
                {/* Header */}
                <div className={cn(
                    "h-16 flex items-center gap-3 px-4 border-b border-white/5",
                    isCollapsed && "lg:justify-center lg:px-0"
                )}>
                    {/* Logo */}
                    <div className={cn(
                        "w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-lg flex-shrink-0",
                        roleConfig?.gradient || "from-indigo-500 to-indigo-600",
                        roleConfig?.color === "indigo" && "shadow-indigo-500/25",
                        roleConfig?.color === "emerald" && "shadow-emerald-500/25",
                        roleConfig?.color === "blue" && "shadow-blue-500/25"
                    )}>
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    
                    {/* Brand text */}
                    <div className={cn(
                        "flex items-center gap-2 transition-all duration-300",
                        isCollapsed ? "lg:hidden" : ""
                    )}>
                        <span className="font-semibold text-white tracking-tight">Suzalink</span>
                        {roleConfig && (
                            <span className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded-full border",
                                roleConfig.color === "indigo" && "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
                                roleConfig.color === "emerald" && "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                                roleConfig.color === "blue" && "text-blue-400 bg-blue-500/10 border-blue-500/20",
                                roleConfig.color === "slate" && "text-slate-400 bg-slate-500/10 border-slate-500/20"
                            )}>
                                {roleConfig.label}
                            </span>
                        )}
                    </div>

                    {/* Mobile close button */}
                    <button
                        onClick={closeMobile}
                        className="ml-auto p-2 text-slate-400 hover:text-white lg:hidden"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto dev-scrollbar">
                    {navigation.map((section, idx) => (
                        <SidebarSection
                            key={idx}
                            section={section}
                            isCollapsed={isCollapsed}
                            onMobileClose={closeMobile}
                        />
                    ))}
                </nav>

                {/* Collapse Toggle - Desktop only */}
                <div className="hidden lg:block px-2.5 py-2 border-t border-white/5">
                    <button
                        onClick={toggleCollapsed}
                        className={cn(
                            "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium",
                            "text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                        )}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <>
                                <ChevronLeft className="w-4 h-4" />
                                <span>Réduire</span>
                            </>
                        )}
                    </button>
                </div>

                {/* User Section */}
                <div className="p-2.5 border-t border-white/5">
                    {/* User info */}
                    <div className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/5 mb-2",
                        isCollapsed && "lg:justify-center lg:px-0"
                    )}>
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <div className={cn(
                                "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-semibold",
                                roleConfig?.gradient || "from-indigo-400 to-indigo-600"
                            )}>
                                {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-800" />
                        </div>
                        
                        {/* User details */}
                        <div className={cn(
                            "flex-1 min-w-0 transition-all duration-300",
                            isCollapsed ? "lg:hidden" : ""
                        )}>
                            <p className="text-[13px] font-medium text-white truncate">
                                {session?.user?.name}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                                {session?.user?.email}
                            </p>
                        </div>
                    </div>

                    {/* Logout button */}
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className={cn(
                            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium",
                            "text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200",
                            isCollapsed && "lg:justify-center"
                        )}
                    >
                        <LogOut className="w-4 h-4" />
                        <span className={cn(
                            "transition-all duration-300",
                            isCollapsed ? "lg:hidden" : ""
                        )}>
                            Déconnexion
                        </span>
                    </button>
                </div>
            </aside>
        </>
    );
}

// ============================================
// MOBILE MENU BUTTON
// ============================================

export function MobileMenuButton() {
    const { toggleMobile } = useSidebar();

    return (
        <button
            onClick={toggleMobile}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
            <Menu className="w-5 h-5" />
        </button>
    );
}

export default GlobalSidebar;
