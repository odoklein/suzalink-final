"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Zap, LogOut, LayoutDashboard, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClientOnboardingModal } from "@/components/client/ClientOnboardingModal";

const navItems = [
    { href: "/client/portal", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/client/contact", label: "Contact", icon: MessageSquare },
];

function getInitials(name: string | null | undefined): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [dismissedForThisVisit, setDismissedForThisVisit] = useState(false);

    const showOnboarding =
        session?.user?.role === "CLIENT" &&
        !(session.user as { clientOnboardingDismissedPermanently?: boolean })?.clientOnboardingDismissedPermanently &&
        !dismissedForThisVisit;

    const handleDismissOnboardingPermanently = async () => {
        const res = await fetch("/api/client/onboarding-dismissed", { method: "PATCH" });
        if (!res.ok) throw new Error("Failed to dismiss");
        await update();
    };

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (session?.user?.role !== "CLIENT") {
            router.push("/unauthorized");
        }
    }, [session, status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center animate-pulse">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20">
            {/* Premium Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
                <div className="h-16 max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
                    {/* Logo + Nav */}
                    <div className="flex items-center gap-6 lg:gap-10">
                        <Link
                            href="/client/portal"
                            className="flex items-center gap-3 group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/35 transition-all duration-300 group-hover:scale-105">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <span className="font-bold text-slate-900">Suzalink</span>
                                <span className="text-xs text-slate-500 block -mt-0.5">Portail Client</span>
                            </div>
                        </Link>

                        <nav className="hidden sm:flex items-center gap-1">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                            isActive
                                                ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* User + Logout */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100/80">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-semibold">
                                {getInitials(session?.user?.name)}
                            </div>
                            <span className="hidden sm:inline text-sm font-medium text-slate-700 max-w-[120px] truncate">
                                {session?.user?.name}
                            </span>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Se déconnecter"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Mobile Nav */}
                <div className="sm:hidden border-t border-slate-100 px-4 py-2">
                    <div className="flex gap-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                        isActive
                                            ? "bg-indigo-50 text-indigo-700"
                                            : "text-slate-600 hover:bg-slate-100"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>

            {/* Client onboarding modal: shown each visit until "Ne plus afficher" */}
            <ClientOnboardingModal
                isOpen={showOnboarding}
                onClose={() => setDismissedForThisVisit(true)}
                onDismissPermanently={handleDismissOnboardingPermanently}
            />
        </div>
    );
}
