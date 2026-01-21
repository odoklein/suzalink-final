"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";
import {
    FileCheck,
    Download,
    ArrowLeft,
    Loader2,
    Check,
} from "lucide-react";
import { Button, Badge, Card, PageHeader } from "@/components/ui";
import { InvoiceItemsTable, InvoiceItem } from "@/components/billing/InvoiceItemsTable";
import { PaymentSection } from "@/components/billing/PaymentSection";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Invoice {
    id: string;
    invoiceNumber: string | null;
    status: "DRAFT" | "VALIDATED" | "SENT" | "PAID";
    issueDate: string;
    dueDate: string;
    totalHt: number;
    totalVat: number;
    totalTtc: number;
    facturxPdfUrl: string | null;
    billingClient: {
        id: string;
        legalName: string;
        address: string;
        city: string;
        postalCode: string;
        siret: string | null;
        vatNumber: string | null;
    };
    companyIssuer: {
        legalName: string;
        address: string;
        city: string;
        postalCode: string;
        siret: string;
        vatNumber: string | null;
    };
    items: Array<{
        id: string;
        description: string;
        quantity: number;
        unitPriceHt: number;
        vatRate: number;
        totalHt: number;
        totalVat: number;
        totalTtc: number;
    }>;
    payments: Array<{
        id: string;
        amount: number;
        paymentDate: string;
        status: "MATCHED" | "CONFIRMED";
        matchedAt: string;
        confirmedAt: string | null;
        confirmedBy: {
            name: string;
        } | null;
    }>;
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { success, error: showError } = useToast();
    const router = useRouter();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isValidating, setIsValidating] = useState(false);
    const [invoiceId, setInvoiceId] = useState<string>("");

    useEffect(() => {
        params.then((p) => {
            setInvoiceId(p.id);
            fetchInvoice(p.id);
        });
    }, [params]);

    const fetchInvoice = async (id: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/billing/invoices/${id}`);
            const json = await res.json();

            if (json.success) {
                setInvoice(json.data);
            } else {
                showError("Erreur", json.error);
                router.push("/manager/billing/invoices");
            }
        } catch (err) {
            console.error("Failed to fetch invoice:", err);
            showError("Erreur", "Impossible de charger la facture");
            router.push("/manager/billing/invoices");
        } finally {
            setIsLoading(false);
        }
    };

    const handleValidate = async () => {
        if (!confirm("Valider cette facture ? Un numéro sera attribué et un PDF sera généré.")) {
            return;
        }

        setIsValidating(true);
        try {
            const res = await fetch(`/api/billing/invoices/${invoiceId}/validate`, {
                method: "POST",
            });

            const json = await res.json();

            if (json.success) {
                success("Facture validée", "La facture a été validée et le PDF généré");
                fetchInvoice(invoiceId);
            } else {
                showError("Erreur", json.error);
            }
        } catch (err) {
            console.error("Validate error:", err);
            showError("Erreur", "Impossible de valider la facture");
        } finally {
            setIsValidating(false);
        }
    };

    const handleDownloadPDF = () => {
        window.open(`/api/billing/invoices/${invoiceId}/pdf`, "_blank");
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

    if (isLoading) {
        return (
            <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
            </div>
        );
    }

    if (!invoice) {
        return null;
    }

    const isReadOnly = invoice.status !== "DRAFT";
    const items: InvoiceItem[] = invoice.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unitPriceHt: Number(item.unitPriceHt),
        vatRate: Number(item.vatRate),
        totalHt: Number(item.totalHt),
        totalVat: Number(item.totalVat),
        totalTtc: Number(item.totalTtc),
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/manager/billing/invoices">
                        <Button variant="ghost" size="sm" className="mb-2">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Retour
                        </Button>
                    </Link>
                    <PageHeader
                        title={invoice.invoiceNumber || "Brouillon"}
                        description={`Facture ${invoice.billingClient.legalName}`}
                    />
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge(invoice.status)}
                    {invoice.facturxPdfUrl && (
                        <Button variant="outline" onClick={handleDownloadPDF}>
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger PDF
                        </Button>
                    )}
                    {invoice.status === "DRAFT" && (
                        <Button onClick={handleValidate} disabled={isValidating}>
                            {isValidating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <FileCheck className="w-4 h-4 mr-2" />
                            )}
                            Valider & générer la facture
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6">
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 mb-2">Émetteur</h3>
                                <div className="text-sm text-slate-900">
                                    {invoice.companyIssuer.legalName}
                                    <br />
                                    {invoice.companyIssuer.address}
                                    <br />
                                    {invoice.companyIssuer.postalCode} {invoice.companyIssuer.city}
                                    <br />
                                    SIRET: {invoice.companyIssuer.siret}
                                    {invoice.companyIssuer.vatNumber && (
                                        <>
                                            <br />
                                            TVA: {invoice.companyIssuer.vatNumber}
                                        </>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 mb-2">Client</h3>
                                <div className="text-sm text-slate-900">
                                    {invoice.billingClient.legalName}
                                    <br />
                                    {invoice.billingClient.address}
                                    <br />
                                    {invoice.billingClient.postalCode} {invoice.billingClient.city}
                                    {invoice.billingClient.siret && (
                                        <>
                                            <br />
                                            SIRET: {invoice.billingClient.siret}
                                        </>
                                    )}
                                    {invoice.billingClient.vatNumber && (
                                        <>
                                            <br />
                                            TVA: {invoice.billingClient.vatNumber}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-600">Date d'émission:</span>
                                <span className="ml-2 text-slate-900">
                                    {format(new Date(invoice.issueDate), "dd MMMM yyyy")}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-600">Date d'échéance:</span>
                                <span className="ml-2 text-slate-900">
                                    {format(new Date(invoice.dueDate), "dd MMMM yyyy")}
                                </span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Articles</h2>
                        <InvoiceItemsTable items={items} onChange={() => {}} readOnly={isReadOnly} />
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Totaux</h2>
                        <div className="space-y-2">
                            <div className="flex justify-between text-slate-600">
                                <span>Total HT:</span>
                                <span>{Number(invoice.totalHt).toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>TVA:</span>
                                <span>{Number(invoice.totalVat).toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between font-semibold text-lg text-slate-900 pt-2 border-t">
                                <span>Total TTC:</span>
                                <span>{Number(invoice.totalTtc).toFixed(2)} €</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Paiement</h2>
                        <PaymentSection
                            invoiceId={invoiceId}
                            payments={invoice.payments}
                            invoiceStatus={invoice.status}
                            onPaymentUpdate={() => fetchInvoice(invoiceId)}
                        />
                    </Card>
                </div>
            </div>
        </div>
    );
}
