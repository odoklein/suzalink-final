"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
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
import { formatCallbackDate } from "@/lib/utils/parseDateFromNote";

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

    const linkClass = cn(
                "sidebar-nav-item flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group relative",
                isActive
                    ? "text-indigo-400 bg-gradient-to-r from-indigo-500/15 to-indigo-600/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
            );

    const content = (
        <>
            {/* Active indicator */}
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[60%] bg-gradient-to-b from-indigo-400 to-indigo-600 rounded-r-full" />
            )}
            
            <item.icon className={cn(
                "w-4 h-4 flex-shrink-0 transition-transform duration-200",
                isActive && "scale-110"
            )} />
            
            {/* Label with collapse animation */}
            <div className={cn(
                "flex-1 min-w-0 transition-all duration-300",
                isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}>
                <span className="block truncate">{item.label}</span>
                {item.badgeDetail && !isCollapsed && (
                    <span className="block text-[11px] text-slate-500 truncate" title={item.badgeDetail}>
                        {item.badgeDetail}
                    </span>
                )}
            </div>

            {/* Badge (e.g. rappels count, unread messages) */}
            {(() => {
                const variant = (item as NavItem & { badgeVariant?: "rappels" | "comms" }).badgeVariant ?? "rappels";
                const badgeClasses = variant === "comms"
                    ? "min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-semibold bg-indigo-500/25 text-indigo-300 border border-indigo-400/30"
                    : "min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-md text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30";
                const collapsedClasses = variant === "comms"
                    ? "min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full text-[10px] font-semibold bg-indigo-500/25 text-indigo-300 border border-indigo-400/30"
                    : "min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-md text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30";
                if (item.badge == null || item.badge === "") return null;
                return isCollapsed ? (
                    <span className={cn("absolute right-1 top-1/2 -translate-y-1/2 flex-shrink-0", collapsedClasses)}>
                        {Number(item.badge) > 99 ? "99+" : item.badge}
                    </span>
                ) : (
                    <span className={cn("flex-shrink-0", badgeClasses)}>
                        {Number(item.badge) > 99 ? "99+" : item.badge}
                    </span>
                );
            })()}
            
            {/* Active chevron */}
            {isActive && !isCollapsed && (
                <ChevronRight className="w-4 h-4 text-indigo-500/50 flex-shrink-0" />
            )}

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                    {item.label}
                    {item.badge != null && item.badge !== "" && ` (${item.badge})`}
                    {item.badgeDetail && ` · ${item.badgeDetail}`}
                </div>
            )}
        </>
    );

    if (item.openInNewTab) {
        return (
            <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onMobileClose}
                className={linkClass}
            >
                {content}
            </a>
        );
    }

    return (
        <Link
            href={item.href}
            onClick={onMobileClose}
            className={linkClass}
        >
            {content}
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
    isFirst,
}: { 
    section: NavSection;
    isCollapsed: boolean;
    onMobileClose?: () => void;
    isFirst?: boolean;
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
            {/* Section divider + title */}
            {section.title && (
                <>
                    {/* Subtle divider line between groups */}
                    {!isFirst && (
                        <div className={cn(
                            "mx-2 border-t border-white/[0.06]",
                            isCollapsed ? "my-2" : "mt-3 mb-1"
                        )} />
                    )}
                    {!isCollapsed ? (
                        <div className="px-2.5 pt-1.5 pb-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500/70">
                                {section.title}
                            </span>
                        </div>
                    ) : (
                        /* Collapsed: small dot indicator for section boundary */
                        <div className="flex justify-center py-1">
                            <div className="w-1 h-1 rounded-full bg-slate-600/50" />
                        </div>
                    )}
                </>
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

const RAPPELS_HREF = "/sdr/callbacks";
const COMMS_HREFS = ["/manager/comms", "/sdr/comms", "/bd/comms", "/developer/comms", "/client/comms"];

export function GlobalSidebar({ navigation }: GlobalSidebarProps) {
    const { data: session } = useSession();
    const { isCollapsed, isMobileOpen, toggleCollapsed, closeMobile } = useSidebar();
    const [callbacksCount, setCallbacksCount] = useState<number | null>(null);
    const [nextCallbackDate, setNextCallbackDate] = useState<string | null>(null);
    const [commsUnreadCount, setCommsUnreadCount] = useState<number>(0);

    const userRole = session?.user?.role as UserRole | undefined;
    const roleConfig = userRole ? ROLE_CONFIG[userRole] : null;

    // Fetch unread messages count for Communication sidebar badge
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/comms/inbox/stats");
                const json = await res.json();
                if (cancelled) return;
                const total = (json?.totalUnread ?? 0) as number;
                setCommsUnreadCount(total);
            } catch {
                if (!cancelled) setCommsUnreadCount(0);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Fetch rappels count and next date for SDR/BD sidebar badge
    useEffect(() => {
        if (userRole !== "SDR" && userRole !== "BUSINESS_DEVELOPER") return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/sdr/callbacks?limit=200");
                const json = await res.json();
                if (cancelled || !json.success) return;
                const list = json.data as Array<{ callbackDate?: string | null }>;
                setCallbacksCount(list.length);
                const now = new Date();
                const futureWithDate = list
                    .filter((c) => c.callbackDate && new Date(c.callbackDate) >= now)
                    .map((c) => new Date(c.callbackDate!))
                    .sort((a, b) => a.getTime() - b.getTime());
                const next = futureWithDate[0] ?? null;
                setNextCallbackDate(next ? `Proch. ${formatCallbackDate(next)}` : null);
            } catch {
                if (!cancelled) {
                    setCallbacksCount(0);
                    setNextCallbackDate(null);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [userRole]);

    // Inject rappels count, next date, and comms unread into nav items
    const effectiveNavigation = useMemo(() => {
        const hasRappels = callbacksCount !== null || nextCallbackDate;
        const hasComms = commsUnreadCount > 0;
        if (!hasRappels && !hasComms) return navigation;
        return navigation.map((section) => ({
            ...section,
            items: section.items.map((item) => {
                if (item.href === RAPPELS_HREF && hasRappels) {
                    return {
                        ...item,
                        badge: callbacksCount != null ? String(callbacksCount) : undefined,
                        badgeDetail: nextCallbackDate ?? undefined,
                        badgeVariant: "rappels" as const,
                    };
                }
                if (COMMS_HREFS.includes(item.href) && hasComms) {
                    return {
                        ...item,
                        badge: String(commsUnreadCount),
                        badgeVariant: "comms" as const,
                    };
                }
                return item;
            }),
        }));
    }, [navigation, callbacksCount, nextCallbackDate, commsUnreadCount]);

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
                    "bg-[#051423]",
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
                    {/* Logo - full when expanded, favicon when collapsed on desktop */}
                    <Link href="/" className={cn(
                        "flex items-center min-w-0 flex-shrink-0",
                        isCollapsed && "lg:justify-center lg:w-full"
                    )}>
                        {isCollapsed && !isMobileOpen ? (
                            <Image
                                src="/favicon.png"
                                alt="Suzalink"
                                width={36}
                                height={36}
                                className="h-9 w-9 object-contain lg:mx-auto"
                                priority
                            />
                        ) : (
                            <Image
                                src="/logowithsidebar.png"
                                alt="Suzalink"
                                width={140}
                                height={36}
                                className="h-9 w-auto object-contain object-left"
                                priority
                            />
                        )}
                    </Link>

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
                    {effectiveNavigation.map((section, idx) => (
                        <SidebarSection
                            key={idx}
                            section={section}
                            isCollapsed={isCollapsed}
                            onMobileClose={closeMobile}
                            isFirst={idx === 0}
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
