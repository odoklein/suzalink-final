"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";
import { Save, FileCheck, Loader2, ArrowLeft } from "lucide-react";
import { Button, Input, Card, PageHeader } from "@/components/ui";
import { ClientSearch } from "@/components/billing/ClientSearch";
import { InvoiceItemsTable, InvoiceItem } from "@/components/billing/InvoiceItemsTable";
import Link from "next/link";

interface BillingClient {
    id?: string;
    legalName: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    siret?: string | null;
    vatNumber?: string | null;
}

export default function NewInvoicePage() {
    const { success, error: showError } = useToast();
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [companyIssuer, setCompanyIssuer] = useState<any>(null);
    const [selectedClient, setSelectedClient] = useState<BillingClient | null>(null);
    const [items, setItems] = useState<InvoiceItem[]>([
        {
            description: "",
            quantity: 1,
            unitPriceHt: 0,
            vatRate: 20,
        },
    ]);
    const [issueDate, setIssueDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [dueDate, setDueDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toISOString().split("T")[0];
    });

    useEffect(() => {
        // Fetch company issuer
        fetch("/api/billing/company-issuer")
            .then((res) => res.json())
            .then((json) => {
                if (json.success) {
                    setCompanyIssuer(json.data);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch company issuer:", err);
            });
    }, []);

    const calculateTotals = () => {
        const totals = items.reduce(
            (acc, item) => {
                const totalHt = item.totalHt || 0;
                const totalVat = item.totalVat || 0;
                const totalTtc = item.totalTtc || 0;
                return {
                    totalHt: acc.totalHt + totalHt,
                    totalVat: acc.totalVat + totalVat,
                    totalTtc: acc.totalTtc + totalTtc,
                };
            },
            { totalHt: 0, totalVat: 0, totalTtc: 0 }
        );

        return {
            totalHt: Math.round(totals.totalHt * 100) / 100,
            totalVat: Math.round(totals.totalVat * 100) / 100,
            totalTtc: Math.round(totals.totalTtc * 100) / 100,
        };
    };

    const handleSave = async () => {
        if (!selectedClient) {
            showError("Erreur", "Veuillez sélectionner un client");
            return;
        }

        if (!selectedClient.id) {
            showError("Erreur", "Le client doit être enregistré");
            return;
        }

        if (!companyIssuer) {
            showError("Erreur", "Émetteur non configuré");
            return;
        }

        if (items.length === 0 || items.some((item) => !item.description)) {
            showError("Erreur", "Veuillez ajouter au moins un article avec une description");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch("/api/billing/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    billingClientId: selectedClient.id,
                    companyIssuerId: companyIssuer.id,
                    issueDate,
                    dueDate,
                    items: items.map((item) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPriceHt: item.unitPriceHt,
                        vatRate: item.vatRate,
                    })),
                }),
            });

            const json = await res.json();

            if (json.success) {
                success("Facture créée", "La facture a été créée avec succès");
                router.push(`/manager/billing/invoices/${json.data.id}`);
            } else {
                showError("Erreur", json.error);
            }
        } catch (err) {
            console.error("Create invoice error:", err);
            showError("Erreur", "Impossible de créer la facture");
        } finally {
            setIsSaving(false);
        }
    };

    const totals = calculateTotals();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Nouvelle facture"
                description="Créez une nouvelle facture"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Client</h2>
                        <ClientSearch
                            onSelect={setSelectedClient}
                            selectedClient={selectedClient}
                        />
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Articles</h2>
                        <InvoiceItemsTable items={items} onChange={setItems} />
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Dates</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Date d'émission
                                </label>
                                <Input
                                    type="date"
                                    value={issueDate}
                                    onChange={(e) => setIssueDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Date d'échéance
                                </label>
                                <Input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Totaux</h2>
                        <div className="space-y-2">
                            <div className="flex justify-between text-slate-600">
                                <span>Total HT:</span>
                                <span>{totals.totalHt.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>TVA:</span>
                                <span>{totals.totalVat.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between font-semibold text-lg text-slate-900 pt-2 border-t">
                                <span>Total TTC:</span>
                                <span>{totals.totalTtc.toFixed(2)} €</span>
                            </div>
                        </div>
                    </Card>

                    <div className="flex gap-2">
                        <Link href="/manager/billing/invoices" className="flex-1">
                            <Button variant="outline" className="w-full">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Annuler
                            </Button>
                        </Link>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Enregistrer
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
