"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { Zap, LogOut, LayoutDashboard, MessageSquare, Building2 } from "lucide-react";

const navItems = [
    { href: "/client/portal", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/client/contact", label: "Contact", icon: MessageSquare },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (session?.user?.role !== "CLIENT") {
            router.push("/unauthorized");
        }
    }, [session, status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="h-16 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-50 shadow-sm">
                <div className="h-full max-w-6xl mx-auto px-6 flex items-center justify-between">
                    {/* Logo + Nav */}
                    <div className="flex items-center gap-8">
                        <Link
                            href="/client/portal"
                            className="flex items-center gap-3 group"
                        >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/30 transition-shadow">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <span className="font-semibold text-slate-900">Suzalink</span>
                                <span className="text-xs text-slate-500 block">Portail Client</span>
                            </div>
                        </Link>

                        <nav className="flex items-center gap-1">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`
                                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                                            ${isActive
                                                ? "bg-indigo-50 text-indigo-700"
                                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                            }
                                        `}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* User */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                            <Building2 className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-700">{session?.user?.name}</span>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="p-2.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Se déconnecter"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        </div>
    );
}
