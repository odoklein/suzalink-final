"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";
import {
    ArrowLeft,
    Save,
    Loader2,
    Building2,
    Receipt,
    AlertCircle,
} from "lucide-react";
import { Button, Input, Card, PageHeader, Badge } from "@/components/ui";
import Link from "next/link";

interface CompanyIssuer {
    id?: string;
    legalName: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    siret: string;
    vatNumber: string;
    email: string;
    phone: string;
    logo: string;
}

export default function BillingSettingsPage() {
    const { success, error: showError } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [issuer, setIssuer] = useState<CompanyIssuer>({
        legalName: "",
        address: "",
        city: "",
        postalCode: "",
        country: "France",
        siret: "",
        vatNumber: "",
        email: "",
        phone: "",
        logo: "",
    });
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        fetchIssuer();
    }, []);

    const fetchIssuer = async () => {
        try {
            const res = await fetch("/api/billing/company-issuer");
            const json = await res.json();

            if (json.success) {
                setIssuer({
                    id: json.data.id,
                    legalName: json.data.legalName || "",
                    address: json.data.address || "",
                    city: json.data.city || "",
                    postalCode: json.data.postalCode || "",
                    country: json.data.country || "France",
                    siret: json.data.siret || "",
                    vatNumber: json.data.vatNumber || "",
                    email: json.data.email || "",
                    phone: json.data.phone || "",
                    logo: json.data.logo || "",
                });
                setIsConfigured(true);
            } else {
                // 404 is expected if not configured yet
                setIsConfigured(false);
            }
        } catch (err) {
            console.error("Failed to fetch issuer:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!issuer.legalName || !issuer.address || !issuer.city || !issuer.postalCode || !issuer.siret) {
            showError("Erreur", "Veuillez remplir tous les champs obligatoires");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch("/api/billing/company-issuer", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(issuer),
            });

            const json = await res.json();

            if (json.success) {
                success("Configuration sauvegardée", "L'émetteur a été configuré avec succès");
                setIsConfigured(true);
                if (json.data.id) {
                    setIssuer((prev) => ({ ...prev, id: json.data.id }));
                }
            } else {
                showError("Erreur", json.error);
            }
        } catch (err) {
            console.error("Save error:", err);
            showError("Erreur", "Impossible de sauvegarder la configuration");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <Link href="/manager/billing">
                    <Button variant="ghost" size="sm" className="mb-2">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour
                    </Button>
                </Link>
                <PageHeader
                    title="Paramètres de facturation"
                    subtitle="Configurez les informations de votre entreprise pour la facturation"
                />
            </div>

            {!isConfigured && (
                <Card className="p-4 border-amber-200 bg-amber-50">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="font-medium text-amber-900">Configuration requise</h4>
                            <p className="text-sm text-amber-700 mt-1">
                                Vous devez configurer les informations de votre entreprise avant de pouvoir créer des factures.
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            <Card className="p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-indigo-100">
                            <Receipt className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900">Émetteur des factures</h2>
                            <p className="text-sm text-slate-600">Ces informations apparaîtront sur vos factures</p>
                        </div>
                    </div>
                    {isConfigured && (
                        <Badge variant="success">Configuré</Badge>
                    )}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Raison sociale *
                        </label>
                        <Input
                            value={issuer.legalName}
                            onChange={(e) => setIssuer({ ...issuer, legalName: e.target.value })}
                            placeholder="Nom légal de votre entreprise"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Adresse *
                        </label>
                        <Input
                            value={issuer.address}
                            onChange={(e) => setIssuer({ ...issuer, address: e.target.value })}
                            placeholder="Adresse du siège social"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Code postal *
                            </label>
                            <Input
                                value={issuer.postalCode}
                                onChange={(e) => setIssuer({ ...issuer, postalCode: e.target.value })}
                                placeholder="75001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Ville *
                            </label>
                            <Input
                                value={issuer.city}
                                onChange={(e) => setIssuer({ ...issuer, city: e.target.value })}
                                placeholder="Paris"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Pays
                        </label>
                        <Input
                            value={issuer.country}
                            onChange={(e) => setIssuer({ ...issuer, country: e.target.value })}
                            placeholder="France"
                        />
                    </div>

                    <div className="border-t border-slate-200 pt-4 mt-4">
                        <h3 className="font-medium text-slate-900 mb-3">Informations fiscales</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    SIRET *
                                </label>
                                <Input
                                    value={issuer.siret}
                                    onChange={(e) => setIssuer({ ...issuer, siret: e.target.value })}
                                    placeholder="12345678901234"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Numéro à 14 chiffres (SIREN + NIC)
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Numéro de TVA intracommunautaire
                                </label>
                                <Input
                                    value={issuer.vatNumber}
                                    onChange={(e) => setIssuer({ ...issuer, vatNumber: e.target.value })}
                                    placeholder="FR12345678901"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4 mt-4">
                        <h3 className="font-medium text-slate-900 mb-3">Contact</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Email
                                </label>
                                <Input
                                    type="email"
                                    value={issuer.email}
                                    onChange={(e) => setIssuer({ ...issuer, email: e.target.value })}
                                    placeholder="facturation@entreprise.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Téléphone
                                </label>
                                <Input
                                    value={issuer.phone}
                                    onChange={(e) => setIssuer({ ...issuer, phone: e.target.value })}
                                    placeholder="+33 1 23 45 67 89"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 mt-6 pt-4 border-t border-slate-200">
                    <Link href="/manager/billing" className="flex-1">
                        <Button variant="secondary" className="w-full">
                            Annuler
                        </Button>
                    </Link>
                    <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Enregistrer
                    </Button>
                </div>
            </Card>

            <Card className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Intégrations</h3>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white">
                                <Building2 className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-900">Qonto</h4>
                                <p className="text-sm text-slate-600">Rapprochement automatique des paiements</p>
                            </div>
                        </div>
                        <Badge variant={process.env.NEXT_PUBLIC_QONTO_ENABLED === "true" ? "success" : "default"}>
                            {process.env.NEXT_PUBLIC_QONTO_ENABLED === "true" ? "Connecté" : "Non configuré"}
                        </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white">
                                <Building2 className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-900">Pappers</h4>
                                <p className="text-sm text-slate-600">Recherche d'entreprises françaises</p>
                            </div>
                        </div>
                        <Badge variant={process.env.NEXT_PUBLIC_PAPPERS_ENABLED === "true" ? "success" : "default"}>
                            {process.env.NEXT_PUBLIC_PAPPERS_ENABLED === "true" ? "Connecté" : "Non configuré"}
                        </Badge>
                    </div>
                </div>
            </Card>
        </div>
    );
}
