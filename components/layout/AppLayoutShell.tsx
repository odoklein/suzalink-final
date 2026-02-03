"use client";

import React, { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";
import { SidebarProvider, useSidebar } from "./SidebarProvider";
import { PermissionProvider } from "@/lib/permissions/PermissionProvider";
import { GlobalSidebar, MobileMenuButton } from "./GlobalSidebar";
import { NavSection, getNavByRole, ROLE_CONFIG } from "@/lib/navigation/config";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface AppLayoutShellProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
    customNavigation?: NavSection[];
}

// ============================================
// INNER LAYOUT (needs sidebar context)
// ============================================

function InnerLayout({ 
    children, 
    allowedRoles, 
    customNavigation 
}: AppLayoutShellProps) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const { isCollapsed } = useSidebar();

    const userRole = session?.user?.role as UserRole | undefined;
    const roleConfig = userRole ? ROLE_CONFIG[userRole] : null;

    // Auth check
    useEffect(() => {
        if (status === "loading") return;
        
        if (status === "unauthenticated") {
            router.push("/login");
            return;
        }

        if (status === "authenticated") {
            // Check if user is active
            // This would ideally come from the session, we'll add it later
            
            // Check role authorization
            if (userRole && !allowedRoles.includes(userRole)) {
                router.push("/unauthorized");
            }
        }
    }, [session, status, router, allowedRoles, userRole]);

    // Loading state
    if (status === "loading" || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="flex flex-col items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 border-3 border-t-transparent rounded-full animate-spin",
                        roleConfig?.color === "indigo" && "border-indigo-500",
                        roleConfig?.color === "emerald" && "border-emerald-500",
                        roleConfig?.color === "blue" && "border-blue-500",
                        !roleConfig && "border-indigo-500"
                    )} />
                    <p className="text-sm text-slate-500">Chargement...</p>
                </div>
            </div>
        );
    }

    // Unauthorized check
    if (userRole && !allowedRoles.includes(userRole)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Get navigation based on role or use custom
    const navigation = customNavigation || (userRole ? getNavByRole(userRole) : []);

    // Get breadcrumb from pathname
    const pathParts = pathname.split("/").filter(Boolean);
    const currentPage = pathParts[pathParts.length - 1]?.replace(/-/g, " ") || "Dashboard";

    return (
        <div className="h-screen bg-slate-100 overflow-hidden">
            {/* Sidebar - Fixed */}
            <GlobalSidebar navigation={navigation} />

            {/* Main Content - Scrollable with left margin for sidebar */}
            <main className={cn(
                "h-screen overflow-y-auto flex flex-col",
                "transition-all duration-300",
                // Add margin for sidebar width (60px collapsed, 224px expanded)
                isCollapsed ? "lg:ml-[60px]" : "lg:ml-56"
            )}>
                {/* Header - Sticky within main */}
                <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        {/* Mobile menu button */}
                        <MobileMenuButton />
                        
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="font-medium text-slate-900 capitalize">
                                {roleConfig?.label || "App"}
                            </span>
                            <span>/</span>
                            <span className="capitalize">{currentPage}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {/* Notification bell */}
                        <NotificationBell />
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-4 lg:p-6">
                    <div className="max-w-[1400px] mx-auto w-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}

// ============================================
// APP LAYOUT SHELL
// ============================================

export function AppLayoutShell(props: AppLayoutShellProps) {
    return (
        <SidebarProvider>
            <PermissionProvider>
                <InnerLayout {...props} />
            </PermissionProvider>
        </SidebarProvider>
    );
}

export default AppLayoutShell;
