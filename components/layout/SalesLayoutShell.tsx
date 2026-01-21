"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
    Zap,
    LogOut,
    User,
    ChevronDown,
    Target,
    Menu,
    X,
    LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

export interface Mission {
    id: string;
    name: string;
    client: { name: string };
    channel: string;
}

export interface NavItem {
    href: string;
    icon: LucideIcon;
    label: string;
    bdOnly?: boolean; // If true, only shown for BD role
}

export interface SalesLayoutShellProps {
    children: React.ReactNode;
    allowedRoles: ("SDR" | "BUSINESS_DEVELOPER")[];
    navItems: NavItem[];
    roleLabel: string;
    roleColor: string; // Tailwind color class like "indigo" or "emerald"
}

// ============================================
// SALES LAYOUT SHELL
// Shared layout for SDR and Business Developer
// ============================================

export default function SalesLayoutShell({
    children,
    allowedRoles,
    navItems,
    roleLabel,
    roleColor,
}: SalesLayoutShellProps) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [missions, setMissions] = useState<Mission[]>([]);
    const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
    const [showMissionDropdown, setShowMissionDropdown] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // Determine the user's actual role for styling/filtering
    const userRole = session?.user?.role as "SDR" | "BUSINESS_DEVELOPER" | undefined;

    // ============================================
    // AUTH CHECK
    // ============================================

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated") {
            const currentRole = session?.user?.role;
            if (!allowedRoles.includes(currentRole as "SDR" | "BUSINESS_DEVELOPER")) {
                router.push("/unauthorized");
            }
        }
    }, [session, status, router, allowedRoles]);

    // ============================================
    // FETCH MISSIONS
    // ============================================

    useEffect(() => {
        const fetchMissions = async () => {
            try {
                const res = await fetch("/api/sdr/missions");
                const json = await res.json();
                if (json.success && json.data.length > 0) {
                    setMissions(json.data);
                    // Load from localStorage or use first mission
                    const storageKey = `sales_selected_mission`;
                    const saved = localStorage.getItem(storageKey);
                    if (saved && json.data.some((m: Mission) => m.id === saved)) {
                        setSelectedMissionId(saved);
                    } else {
                        setSelectedMissionId(json.data[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch missions:", err);
            }
        };

        if (session?.user) {
            fetchMissions();
        }
    }, [session]);

    // ============================================
    // MISSION SELECTION
    // ============================================

    const handleMissionSelect = useCallback((missionId: string) => {
        setSelectedMissionId(missionId);
        const storageKey = `sales_selected_mission`;
        localStorage.setItem(storageKey, missionId);
        setShowMissionDropdown(false);
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent("sdr_mission_changed", { detail: missionId }));
    }, []);

    const selectedMission = missions.find(m => m.id === selectedMissionId);

    // Filter nav items based on user's actual role
    const filteredNavItems = navItems.filter(item => {
        if (item.bdOnly && userRole !== "BUSINESS_DEVELOPER") return false;
        return true;
    });

    // Color classes based on role
    const colorClasses = {
        badge: roleColor === "emerald" 
            ? "text-emerald-600 bg-emerald-50" 
            : "text-indigo-600 bg-indigo-50",
        badgeActive: roleColor === "emerald"
            ? "bg-emerald-500 text-white"
            : "bg-indigo-500 text-white",
        icon: roleColor === "emerald"
            ? "from-emerald-500 to-emerald-600"
            : "from-indigo-500 to-indigo-600",
        missionIcon: roleColor === "emerald"
            ? "text-emerald-500"
            : "text-indigo-500",
        activeNav: roleColor === "emerald"
            ? "text-emerald-600"
            : "text-indigo-600",
        userBg: roleColor === "emerald"
            ? "bg-emerald-100"
            : "bg-indigo-100",
        userIcon: roleColor === "emerald"
            ? "text-emerald-600"
            : "text-indigo-600",
    };

    // ============================================
    // LOADING STATE
    // ============================================

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className={cn(
                    "w-8 h-8 border-2 border-t-transparent rounded-full animate-spin",
                    roleColor === "emerald" ? "border-emerald-500" : "border-indigo-500"
                )} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 z-50 shadow-sm">
                <div className="h-full max-w-6xl mx-auto px-4 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-md",
                            colorClasses.icon,
                            roleColor === "emerald" ? "shadow-emerald-500/20" : "shadow-indigo-500/20"
                        )}>
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-semibold text-slate-900">Suzalink</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", colorClasses.badge)}>
                            {roleLabel}
                        </span>
                    </div>

                    {/* Mission Selector - Desktop */}
                    {missions.length > 0 && (
                        <div className="relative hidden sm:block">
                            <button
                                onClick={() => setShowMissionDropdown(!showMissionDropdown)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                            >
                                <Target className={cn("w-4 h-4", colorClasses.missionIcon)} />
                                <span className="text-sm font-medium text-slate-700 max-w-[200px] truncate">
                                    {selectedMission?.name || "Sélectionner mission"}
                                </span>
                                <ChevronDown className={cn(
                                    "w-4 h-4 text-slate-400 transition-transform",
                                    showMissionDropdown && "rotate-180"
                                )} />
                            </button>

                            {/* Dropdown */}
                            {showMissionDropdown && (
                                <div className="absolute top-full mt-2 right-0 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in">
                                    <div className="px-3 py-2 border-b border-slate-100">
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                            Mes Missions
                                        </p>
                                    </div>
                                    {missions.map((mission) => (
                                        <button
                                            key={mission.id}
                                            onClick={() => handleMissionSelect(mission.id)}
                                            className={cn(
                                                "w-full px-3 py-2.5 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left",
                                                selectedMissionId === mission.id && (roleColor === "emerald" ? "bg-emerald-50" : "bg-indigo-50")
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold",
                                                selectedMissionId === mission.id
                                                    ? colorClasses.badgeActive
                                                    : "bg-slate-100 text-slate-600"
                                            )}>
                                                {mission.client.name[0]}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={cn(
                                                    "font-medium truncate",
                                                    selectedMissionId === mission.id
                                                        ? colorClasses.activeNav
                                                        : "text-slate-700"
                                                )}>
                                                    {mission.name}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate">
                                                    {mission.client.name}
                                                </p>
                                            </div>
                                            {selectedMissionId === mission.id && (
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full mt-2",
                                                    roleColor === "emerald" ? "bg-emerald-500" : "bg-indigo-500"
                                                )} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* User Info & Mobile Menu Toggle */}
                    <div className="flex items-center gap-3">
                        {/* User Info - Desktop */}
                        <div className="hidden sm:flex items-center gap-2 text-sm">
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", colorClasses.userBg)}>
                                <User className={cn("w-4 h-4", colorClasses.userIcon)} />
                            </div>
                            <span className="text-slate-600">{session?.user?.name}</span>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="hidden sm:block p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Se déconnecter"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            className="sm:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu */}
            {showMobileMenu && (
                <div className="fixed inset-0 z-40 sm:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileMenu(false)} />
                    <div className="absolute top-16 left-0 right-0 bg-white border-b border-slate-200 shadow-lg animate-slide-in-up">
                        {/* Mission Selector - Mobile */}
                        {missions.length > 0 && (
                            <div className="p-4 border-b border-slate-100">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                                    Mission active
                                </p>
                                <select
                                    value={selectedMissionId || ""}
                                    onChange={(e) => handleMissionSelect(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm"
                                >
                                    {missions.map((mission) => (
                                        <option key={mission.id} value={mission.id}>
                                            {mission.name} - {mission.client.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* User Info - Mobile */}
                        <div className="p-4 flex items-center justify-between border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", colorClasses.userBg)}>
                                    <User className={cn("w-5 h-5", colorClasses.userIcon)} />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{session?.user?.name}</p>
                                    <p className="text-xs text-slate-500">{session?.user?.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Nav Items - Mobile */}
                        <nav className="p-2">
                            {filteredNavItems.map((item) => {
                                const isActive = pathname === item.href ||
                                    (item.href !== "/sdr" && item.href !== "/bd/dashboard" && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setShowMobileMenu(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                            isActive
                                                ? cn("bg-slate-100", colorClasses.activeNav)
                                                : "text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                        {item.bdOnly && (
                                            <span className="ml-auto text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                BD
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="pt-20 pb-24 sm:pb-8 px-4">
                <div className="max-w-4xl mx-auto">{children}</div>
            </main>

            {/* Bottom Navigation - Mobile Only */}
            <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-50 sm:hidden">
                <div className="h-full max-w-lg mx-auto flex items-center justify-around">
                    {filteredNavItems.slice(0, 5).map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== "/sdr" && item.href !== "/bd/dashboard" && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors",
                                    isActive
                                        ? colorClasses.activeNav
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Click outside to close dropdown */}
            {showMissionDropdown && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMissionDropdown(false)}
                />
            )}
        </div>
    );
}
