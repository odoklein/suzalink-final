"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Building2, Loader2, Plus } from "lucide-react";
import { Input, Button, useToast } from "@/components/ui";

interface BillingClient {
    id?: string;
    legalName: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    siret?: string | null;
    vatNumber?: string | null;
    email?: string | null;
    phone?: string | null;
}

interface ClientSearchProps {
    onSelect: (client: BillingClient) => void;
    selectedClient?: BillingClient | null;
    allowManualEntry?: boolean;
}

export function ClientSearch({ onSelect, selectedClient, allowManualEntry = true }: ClientSearchProps) {
    const { success, error: showError } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState<BillingClient[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [showManualForm, setShowManualForm] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout>();

    // Manual entry form state
    const [manualClient, setManualClient] = useState<Partial<BillingClient>>({
        legalName: "",
        address: "",
        city: "",
        postalCode: "",
        country: "France",
        siret: "",
        vatNumber: "",
        email: "",
        phone: "",
    });

    // Search Pappers API
    useEffect(() => {
        if (searchQuery.length < 2) {
            setResults([]);
            setShowResults(false);
            return;
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/billing/clients/search?q=${encodeURIComponent(searchQuery)}`);
                const json = await res.json();

                if (json.success) {
                    setResults(json.data);
                    setShowResults(true);
                } else {
                    showError("Erreur", json.error);
                }
            } catch (err) {
                console.error("Search error:", err);
                showError("Erreur", "Impossible de rechercher les entreprises");
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, showError]);

    const handleSelect = (client: BillingClient) => {
        onSelect(client);
        setSearchQuery("");
        setResults([]);
        setShowResults(false);
    };

    const handleManualSubmit = async () => {
        if (!manualClient.legalName || !manualClient.address || !manualClient.city || !manualClient.postalCode) {
            showError("Erreur", "Veuillez remplir tous les champs obligatoires");
            return;
        }

        try {
            const res = await fetch("/api/billing/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(manualClient),
            });

            const json = await res.json();

            if (json.success) {
                handleSelect(json.data);
                setShowManualForm(false);
                setManualClient({
                    legalName: "",
                    address: "",
                    city: "",
                    postalCode: "",
                    country: "France",
                    siret: "",
                    vatNumber: "",
                    email: "",
                    phone: "",
                });
                success("Client créé", "Le client a été créé avec succès");
            } else {
                showError("Erreur", json.error);
            }
        } catch (err) {
            console.error("Create client error:", err);
            showError("Erreur", "Impossible de créer le client");
        }
    };

    if (selectedClient) {
        return (
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="font-semibold text-slate-900">{selectedClient.legalName}</div>
                        <div className="text-sm text-slate-600 mt-1">
                            {selectedClient.address}
                            <br />
                            {selectedClient.postalCode} {selectedClient.city}
                            {selectedClient.siret && <><br />SIRET: {selectedClient.siret}</>}
                            {selectedClient.vatNumber && <><br />TVA: {selectedClient.vatNumber}</>}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelect(null as any)}
                    >
                        Modifier
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                    type="text"
                    placeholder="Rechercher une entreprise (nom ou SIRET)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                        if (results.length > 0) setShowResults(true);
                    }}
                    className="pl-10"
                />
                {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 animate-spin" />
                )}
            </div>

            {showResults && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {results.map((client, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSelect(client)}
                            className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                        >
                            <div className="flex items-start gap-2">
                                <Building2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-900 truncate">{client.legalName}</div>
                                    <div className="text-sm text-slate-600 truncate">
                                        {client.address}, {client.postalCode} {client.city}
                                    </div>
                                    {client.siret && (
                                        <div className="text-xs text-slate-500 mt-1">SIRET: {client.siret}</div>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {allowManualEntry && !showManualForm && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowManualForm(true)}
                    className="mt-2"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Saisie manuelle
                </Button>
            )}

            {showManualForm && (
                <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                    <h4 className="font-semibold mb-3">Saisie manuelle</h4>
                    <div className="space-y-3">
                        <Input
                            placeholder="Nom légal *"
                            value={manualClient.legalName}
                            onChange={(e) => setManualClient({ ...manualClient, legalName: e.target.value })}
                        />
                        <Input
                            placeholder="Adresse *"
                            value={manualClient.address}
                            onChange={(e) => setManualClient({ ...manualClient, address: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                placeholder="Code postal *"
                                value={manualClient.postalCode}
                                onChange={(e) => setManualClient({ ...manualClient, postalCode: e.target.value })}
                            />
                            <Input
                                placeholder="Ville *"
                                value={manualClient.city}
                                onChange={(e) => setManualClient({ ...manualClient, city: e.target.value })}
                            />
                        </div>
                        <Input
                            placeholder="SIRET (optionnel)"
                            value={manualClient.siret || ""}
                            onChange={(e) => setManualClient({ ...manualClient, siret: e.target.value })}
                        />
                        <Input
                            placeholder="TVA (optionnel)"
                            value={manualClient.vatNumber || ""}
                            onChange={(e) => setManualClient({ ...manualClient, vatNumber: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <Button onClick={handleManualSubmit} size="sm">
                                Créer
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowManualForm(false);
                                    setManualClient({
                                        legalName: "",
                                        address: "",
                                        city: "",
                                        postalCode: "",
                                        country: "France",
                                        siret: "",
                                        vatNumber: "",
                                        email: "",
                                        phone: "",
                                    });
                                }}
                            >
                                Annuler
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
