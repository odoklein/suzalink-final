"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";
import {
    Plus,
    FileText,
    Download,
    RefreshCw,
    Search,
    Filter,
    Loader2,
} from "lucide-react";
import { Button, Badge, Input, Select, Card, PageHeader } from "@/components/ui";
import Link from "next/link";
import { format } from "date-fns";

interface Invoice {
    id: string;
    invoiceNumber: string | null;
    status: "DRAFT" | "VALIDATED" | "SENT" | "PAID";
    issueDate: string;
    dueDate: string;
    totalTtc: number;
    billingClient: {
        id: string;
        legalName: string;
    };
    _count: {
        items: number;
        payments: number;
    };
}

export default function InvoicesPage() {
    const { success, error: showError } = useToast();
    const router = useRouter();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchInvoices = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== "all") {
                params.set("status", statusFilter);
            }
            if (searchQuery) {
                params.set("search", searchQuery);
            }

            const res = await fetch(`/api/billing/invoices?${params.toString()}`);
            const json = await res.json();

            if (json.success) {
                setInvoices(json.data);
            } else {
                showError("Erreur", json.error);
            }
        } catch (err) {
            console.error("Failed to fetch invoices:", err);
            showError("Erreur", "Impossible de charger les factures");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, [statusFilter]);

    const handleSyncPayments = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch("/api/billing/payments/sync", {
                method: "POST",
            });

            const json = await res.json();

            if (json.success) {
                success("Synchronisation", json.message);
                fetchInvoices();
            } else {
                showError("Erreur", json.error);
            }
        } catch (err) {
            console.error("Sync error:", err);
            showError("Erreur", "Impossible de synchroniser les paiements");
        } finally {
            setIsSyncing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, "default" | "warning" | "success" | "primary"> = {
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

    return (
        <div className="space-y-6">
            <PageHeader
                title="Factures"
                description="Gérez vos factures et suivez les paiements"
            />

            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    fetchInvoices();
                                }
                            }}
                            className="pl-10"
                        />
                    </div>
                    <Select
                        value={statusFilter}
                        onChange={(value) => setStatusFilter(value)}
                        options={[
                            { value: "all", label: "Tous les statuts" },
                            { value: "DRAFT", label: "Brouillon" },
                            { value: "VALIDATED", label: "Validée" },
                            { value: "SENT", label: "Envoyée" },
                            { value: "PAID", label: "Payée" },
                        ]}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleSyncPayments}
                        disabled={isSyncing}
                    >
                        {isSyncing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Sync Qonto
                    </Button>
                    <Link href="/manager/billing/invoices/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Nouvelle facture
                        </Button>
                    </Link>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                </div>
            ) : invoices.length === 0 ? (
                <Card className="p-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune facture</h3>
                    <p className="text-slate-600 mb-4">Commencez par créer votre première facture</p>
                    <Link href="/manager/billing/invoices/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Nouvelle facture
                        </Button>
                    </Link>
                </Card>
            ) : (
                <div className="space-y-3">
                    {invoices.map((invoice) => (
                        <Card
                            key={invoice.id}
                            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => router.push(`/manager/billing/invoices/${invoice.id}`)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="font-semibold text-slate-900">
                                            {invoice.invoiceNumber || "Brouillon"}
                                        </div>
                                        {getStatusBadge(invoice.status)}
                                        {invoice._count.payments > 0 && invoice.status !== "PAID" && (
                                            <Badge variant="warning">Paiement détecté</Badge>
                                        )}
                                    </div>
                                    <div className="text-sm text-slate-600">
                                        {invoice.billingClient.legalName}
                                        <span className="mx-2">•</span>
                                        {format(new Date(invoice.issueDate), "dd MMM yyyy")}
                                        <span className="mx-2">•</span>
                                        {invoice._count.items} article(s)
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-slate-900 text-lg">
                                        {Number(invoice.totalTtc).toFixed(2)} €
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        Échéance: {format(new Date(invoice.dueDate), "dd/MM/yyyy")}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
