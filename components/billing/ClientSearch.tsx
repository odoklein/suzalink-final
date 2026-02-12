"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Building2, Loader2, Plus, MapPin, Hash, X, UserCheck } from "lucide-react";
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
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    // Search Pappers API or local clients
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
                }
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [searchQuery]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = async (client: BillingClient) => {
        setShowResults(false);
        setSearchQuery("");

        if (client.id) {
            onSelect(client);
        } else {
            // Save new client to database
            try {
                const res = await fetch("/api/billing/clients", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(client),
                });
                const json = await res.json();
                if (json.success) {
                    onSelect(json.data);
                    success("Client enregistré", "Le client a été créé avec succès");
                }
            } catch (err) {
                showError("Erreur", "Impossible d'enregistrer le client");
            }
        }
    };

    const handleManualSubmit = async () => {
        if (!manualClient.legalName || !manualClient.address || !manualClient.city || !manualClient.postalCode) {
            showError("Erreur", "Veuillez remplir les champs obligatoires");
            return;
        }
        await handleSelect(manualClient as BillingClient);
        setShowManualForm(false);
    };

    // Selected client display
    if (selectedClient) {
        return (
            <div className="relative group rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 p-5 transition-all duration-200">
                <div className="absolute top-3 right-3">
                    <button
                        onClick={() => onSelect(null as any)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-all duration-150"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <UserCheck className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-slate-900 text-base">{selectedClient.legalName}</h4>
                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span>{selectedClient.address}, {selectedClient.postalCode} {selectedClient.city}</span>
                            </div>
                            {selectedClient.siret && (
                                <div className="flex items-center gap-2">
                                    <Hash className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    <span className="font-mono text-xs">SIRET {selectedClient.siret}</span>
                                </div>
                            )}
                            {selectedClient.vatNumber && (
                                <div className="flex items-center gap-2">
                                    <Hash className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    <span className="font-mono text-xs">TVA {selectedClient.vatNumber}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Search input */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Rechercher une entreprise par nom ou SIRET..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                        if (results.length > 0) setShowResults(true);
                    }}
                    className="w-full pl-11 pr-10 py-3 border border-slate-200 rounded-xl bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all duration-200"
                />
                {isSearching && (
                    <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 text-indigo-400 w-4 h-4 animate-spin" />
                )}
            </div>

            {/* Results dropdown */}
            {showResults && results.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl shadow-slate-200/40 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-xs font-medium text-slate-400">{results.length} résultat(s)</p>
                    </div>
                    {results.map((client, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSelect(client)}
                            className="w-full text-left px-4 py-3 hover:bg-indigo-50/50 transition-colors duration-100 border-b border-slate-50 last:border-b-0 group"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-colors duration-150">
                                    <Building2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors duration-150" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-900 text-sm truncate group-hover:text-indigo-700 transition-colors">
                                        {client.legalName}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate mt-0.5">
                                        {client.address}, {client.postalCode} {client.city}
                                    </div>
                                    {client.siret && (
                                        <div className="mt-1">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-500">
                                                {client.siret}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Manual entry toggle */}
            {allowManualEntry && !showManualForm && (
                <button
                    onClick={() => setShowManualForm(true)}
                    className="mt-3 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Saisie manuelle
                </button>
            )}

            {/* Manual entry form */}
            {showManualForm && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-slate-900">Nouveau client</h4>
                        <button
                            onClick={() => setShowManualForm(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Nom légal *</label>
                            <Input
                                placeholder="Entreprise SAS"
                                value={manualClient.legalName}
                                onChange={(e) => setManualClient({ ...manualClient, legalName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Adresse *</label>
                            <Input
                                placeholder="123 rue de la Paix"
                                value={manualClient.address}
                                onChange={(e) => setManualClient({ ...manualClient, address: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Code postal *</label>
                                <Input
                                    placeholder="75001"
                                    value={manualClient.postalCode}
                                    onChange={(e) => setManualClient({ ...manualClient, postalCode: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Ville *</label>
                                <Input
                                    placeholder="Paris"
                                    value={manualClient.city}
                                    onChange={(e) => setManualClient({ ...manualClient, city: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">SIRET</label>
                                <Input
                                    placeholder="12345678901234"
                                    value={manualClient.siret || ""}
                                    onChange={(e) => setManualClient({ ...manualClient, siret: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">TVA intracom.</label>
                                <Input
                                    placeholder="FR12345678901"
                                    value={manualClient.vatNumber || ""}
                                    onChange={(e) => setManualClient({ ...manualClient, vatNumber: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button onClick={handleManualSubmit} size="sm" className="flex-1">
                                <Plus className="w-4 h-4 mr-1.5" />
                                Créer le client
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowManualForm(false);
                                    setManualClient({
                                        legalName: "", address: "", city: "", postalCode: "", country: "France",
                                        siret: "", vatNumber: "", email: "", phone: "",
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
