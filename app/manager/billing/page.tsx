"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";
import {
    Receipt,
    TrendingUp,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Users,
    FileText,
    Euro,
    Calendar,
    ArrowUpRight,
    Loader2,
    Plus,
} from "lucide-react";
import { Button, Card, Badge, PageHeader } from "@/components/ui";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

interface BillingStats {
    totalInvoices: number;
    totalClients: number;
    totalHt: number;
    totalTtc: number;
    draftCount: number;
    validatedCount: number;
    sentCount: number;
    paidCount: number;
    overdueCount: number;
    thisMonthTtc: number;
    lastMonthTtc: number;
}

interface RecentInvoice {
    id: string;
    invoiceNumber: string | null;
    status: string;
    totalTtc: number;
    issueDate: string;
    dueDate: string;
    billingClient: {
        legalName: string;
    };
}

export default function BillingDashboardPage() {
    const { error: showError } = useToast();
    const router = useRouter();
    const [stats, setStats] = useState<BillingStats | null>(null);
    const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchBillingData();
    }, []);

    const fetchBillingData = async () => {
        setIsLoading(true);
        try {
            const [invoicesRes, clientsRes] = await Promise.all([
                fetch("/api/billing/invoices?limit=100"),
                fetch("/api/billing/clients"),
            ]);

            const [invoicesJson, clientsJson] = await Promise.all([
                invoicesRes.json(),
                clientsRes.json(),
            ]);

            if (invoicesJson.success && clientsJson.success) {
                const invoices = invoicesJson.data;
                const clients = clientsJson.data;

                // Calculate stats
                const now = new Date();
                const thisMonthStart = startOfMonth(now);
                const thisMonthEnd = endOfMonth(now);
                const lastMonthStart = startOfMonth(subMonths(now, 1));
                const lastMonthEnd = endOfMonth(subMonths(now, 1));

                const stats: BillingStats = {
                    totalInvoices: invoices.length,
                    totalClients: clients.length,
                    totalHt: invoices.reduce((sum: number, inv: any) => sum + Number(inv.totalHt || 0), 0),
                    totalTtc: invoices.reduce((sum: number, inv: any) => sum + Number(inv.totalTtc || 0), 0),
                    draftCount: invoices.filter((inv: any) => inv.status === "DRAFT").length,
                    validatedCount: invoices.filter((inv: any) => inv.status === "VALIDATED").length,
                    sentCount: invoices.filter((inv: any) => inv.status === "SENT").length,
                    paidCount: invoices.filter((inv: any) => inv.status === "PAID").length,
                    overdueCount: invoices.filter((inv: any) => {
                        if (inv.status === "PAID") return false;
                        return new Date(inv.dueDate) < now;
                    }).length,
                    thisMonthTtc: invoices
                        .filter((inv: any) => {
                            const date = new Date(inv.issueDate);
                            return date >= thisMonthStart && date <= thisMonthEnd;
                        })
                        .reduce((sum: number, inv: any) => sum + Number(inv.totalTtc || 0), 0),
                    lastMonthTtc: invoices
                        .filter((inv: any) => {
                            const date = new Date(inv.issueDate);
                            return date >= lastMonthStart && date <= lastMonthEnd;
                        })
                        .reduce((sum: number, inv: any) => sum + Number(inv.totalTtc || 0), 0),
                };

                setStats(stats);
                setRecentInvoices(invoices.slice(0, 5));
            } else {
                if (!invoicesJson.success) showError("Erreur", invoicesJson.error);
                if (!clientsJson.success) showError("Erreur", clientsJson.error);
            }
        } catch (err) {
            console.error("Failed to fetch billing data:", err);
            showError("Erreur", "Impossible de charger les données de facturation");
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
        }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, "default" | "warning" | "success" | "primary" | "danger"> = {
            DRAFT: "default",
            VALIDATED: "primary",
            SENT: "warning",
            PAID: "success",
        };

        const labels: Record<string, string> = {
            DRAFT: "Brouillon",
            VALIDATED: "Validée",
            SENT: "Envoyée",
            PAID: "Payée",
        };

        return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
    };

    const getGrowthPercentage = () => {
        if (!stats) return 0;
        if (stats.lastMonthTtc === 0) return stats.thisMonthTtc > 0 ? 100 : 0;
        return Math.round(((stats.thisMonthTtc - stats.lastMonthTtc) / stats.lastMonthTtc) * 100);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <PageHeader
                    title="Facturation"
                    subtitle="Vue d'ensemble de votre activité de facturation"
                />
                <div className="flex items-center gap-2">
                    <Link href="/manager/billing/settings">
                        <Button variant="secondary">Paramètres</Button>
                    </Link>
                    <Link href="/manager/billing/invoices/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Nouvelle facture
                        </Button>
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Chiffre d'affaires</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">
                                {formatCurrency(stats?.totalTtc || 0)}
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                                {getGrowthPercentage() >= 0 ? (
                                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                                ) : (
                                    <ArrowUpRight className="w-4 h-4 text-red-600 rotate-180" />
                                )}
                                <span className={`text-sm ${getGrowthPercentage() >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    {Math.abs(getGrowthPercentage())}% vs mois dernier
                                </span>
                            </div>
                        </div>
                        <div className="p-3 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50">
                            <Euro className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Factures</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">
                                {stats?.totalInvoices || 0}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                                <span>{stats?.paidCount || 0} payées</span>
                                <span>•</span>
                                <span>{stats?.sentCount || 0} en attente</span>
                            </div>
                        </div>
                        <div className="p-3 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50">
                            <FileText className="w-6 h-6 text-indigo-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Clients</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">
                                {stats?.totalClients || 0}
                            </p>
                            <Link
                                href="/manager/billing/clients"
                                className="text-sm text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
                            >
                                Gérer les clients →
                            </Link>
                        </div>
                        <div className="p-3 rounded-full bg-gradient-to-br from-violet-100 to-violet-50">
                            <Users className="w-6 h-6 text-violet-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">En retard</p>
                            <p className={`text-2xl font-bold mt-1 ${(stats?.overdueCount || 0) > 0 ? "text-red-600" : "text-slate-900"}`}>
                                {stats?.overdueCount || 0}
                            </p>
                            {(stats?.overdueCount || 0) > 0 && (
                                <p className="text-sm text-red-500 mt-2">
                                    Action requise
                                </p>
                            )}
                        </div>
                        <div className={`p-3 rounded-full ${(stats?.overdueCount || 0) > 0 ? "bg-gradient-to-br from-red-100 to-red-50" : "bg-gradient-to-br from-slate-100 to-slate-50"}`}>
                            <AlertTriangle className={`w-6 h-6 ${(stats?.overdueCount || 0) > 0 ? "text-red-600" : "text-slate-400"}`} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6 col-span-2">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Factures récentes</h3>
                    {recentInvoices.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p>Aucune facture pour le moment</p>
                            <Link href="/manager/billing/invoices/new">
                                <Button className="mt-4" size="sm">
                                    <Plus className="w-4 h-4 mr-1" />
                                    Créer une facture
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentInvoices.map((invoice) => (
                                <div
                                    key={invoice.id}
                                    onClick={() => router.push(`/manager/billing/invoices/${invoice.id}`)}
                                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-white">
                                            <Receipt className="w-5 h-5 text-slate-600" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900">
                                                {invoice.invoiceNumber || "Brouillon"}
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                {invoice.billingClient.legalName}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {getStatusBadge(invoice.status)}
                                        <div className="text-right">
                                            <div className="font-semibold text-slate-900">
                                                {formatCurrency(Number(invoice.totalTtc))}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {format(new Date(invoice.issueDate), "dd MMM yyyy", { locale: fr })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Link href="/manager/billing/invoices">
                                <Button variant="ghost" className="w-full mt-2">
                                    Voir toutes les factures →
                                </Button>
                            </Link>
                        </div>
                    )}
                </Card>

                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Statuts</h3>
                    <div className="space-y-4">
                        <Link href="/manager/billing/invoices?status=DRAFT" className="block">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-slate-400" />
                                    <span className="text-slate-700">Brouillons</span>
                                </div>
                                <span className="font-semibold text-slate-900">{stats?.draftCount || 0}</span>
                            </div>
                        </Link>
                        <Link href="/manager/billing/invoices?status=VALIDATED" className="block">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                                    <span className="text-slate-700">Validées</span>
                                </div>
                                <span className="font-semibold text-slate-900">{stats?.validatedCount || 0}</span>
                            </div>
                        </Link>
                        <Link href="/manager/billing/invoices?status=SENT" className="block">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                                    <span className="text-slate-700">Envoyées</span>
                                </div>
                                <span className="font-semibold text-slate-900">{stats?.sentCount || 0}</span>
                            </div>
                        </Link>
                        <Link href="/manager/billing/invoices?status=PAID" className="block">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    <span className="text-slate-700">Payées</span>
                                </div>
                                <span className="font-semibold text-slate-900">{stats?.paidCount || 0}</span>
                            </div>
                        </Link>
                    </div>

                    <div className="border-t border-slate-200 mt-6 pt-4">
                        <h4 className="text-sm font-medium text-slate-700 mb-3">Actions rapides</h4>
                        <div className="space-y-2">
                            <Link href="/manager/billing/invoices/new" className="block">
                                <Button variant="secondary" size="sm" className="w-full justify-start">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Nouvelle facture
                                </Button>
                            </Link>
                            <Link href="/manager/billing/clients" className="block">
                                <Button variant="secondary" size="sm" className="w-full justify-start">
                                    <Users className="w-4 h-4 mr-2" />
                                    Gérer les clients
                                </Button>
                            </Link>
                            <Link href="/manager/billing/settings" className="block">
                                <Button variant="secondary" size="sm" className="w-full justify-start">
                                    <Receipt className="w-4 h-4 mr-2" />
                                    Paramètres
                                </Button>
                            </Link>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
