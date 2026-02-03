"use client";

import { useState } from "react";
import {
    Card,
    Badge,
    Button,
    Select,
    Input,
    useToast,
    DataTable,
    EmptyState,
    LoadingState,
} from "@/components/ui";
import type { Column } from "@/components/ui/DataTable";
import {
    Search,
    Filter,
    Building2,
    Globe,
    CheckCircle2,
    RefreshCw,
} from "lucide-react";
import { LOCATION_DATA } from "@/lib/location-data";

// ============================================
// TYPES
// ============================================

interface ListingResult {
    id: string;
    source: string;
    company: {
        name: string;
        domain?: string;
        industry?: string;
        size?: string;
        country?: string;
        state?: string;
        city?: string;
        phone?: string;
    };
    person?: {
        firstName?: string;
        lastName?: string;
        title?: string;
        email?: string;
        linkedin?: string;
    };
    confidence: number;
}

// ============================================
// LISTING PAGE
// ============================================

export default function ListingPage() {
    const { success, error: showError } = useToast();

    // State
    const [results, setResults] = useState<ListingResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Filters
    const [industry, setIndustry] = useState("");
    const [companySize, setCompanySize] = useState("");
    const [country, setCountry] = useState("");
    const [region, setRegion] = useState("");
    const [state, setState] = useState("");
    const [keywords, setKeywords] = useState("");
    const [limit, setLimit] = useState("25");

    // Location Logic
    const handleCountryChange = (val: string) => {
        setCountry(val);
        setRegion("");
        setState("");
    };

    const handleRegionChange = (val: string) => {
        setRegion(val);
        setState("");
    };

    // ============================================
    // SEARCH
    // ============================================

    const handleSearch = async () => {
        // Validate
        if (!industry && !companySize && !country && !state && !region && !keywords) {
            showError("Erreur", "Veuillez sélectionner au moins un filtre");
            return;
        }

        setIsLoading(true);
        setResults([]);
        setSelected(new Set());

        try {
            const res = await fetch("/api/prospects/listing/apollo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    industry,
                    companySize,
                    country,
                    state,
                    region,
                    keywords,
                    limit: parseInt(limit),
                }),
            });

            const json = await res.json();

            if (json.success) {
                setResults(json.data);
                success(
                    "Recherche terminée",
                    `${json.data.length} résultat(s) trouvé(s)`
                );
            } else {
                showError("Erreur", json.error || "Erreur lors de la recherche");
            }
        } catch (err) {
            console.error("Search failed:", err);
            showError("Erreur", "Impossible de rechercher les leads");
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================
    // SELECTION
    // ============================================

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selected);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelected(newSelected);
    };

    const toggleSelectAll = () => {
        if (selected.size === results.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(results.map((r) => r.id)));
        }
    };

    // ============================================
    // BULK IMPORT
    // ============================================

    const handleBulkImport = async () => {
        const selectedResults = results.filter((r) => selected.has(r.id));

        if (selectedResults.length === 0) {
            showError("Erreur", "Veuillez sélectionner au moins un prospect");
            return;
        }

        try {
            // TODO: Call import API
            console.log("Importing:", selectedResults);

            success(
                "Import en cours",
                `${selectedResults.length} prospect(s) envoyé(s) au pipeline`
            );

            setSelected(new Set());
        } catch (err) {
            console.error("Import failed:", err);
            showError("Erreur", "Impossible d'importer les prospects");
        }
    };

    // ============================================
    // TABLE COLUMNS
    // ============================================

    const columns: Column<ListingResult>[] = [
        {
            key: "select",
            header: (
                <input
                    type="checkbox"
                    checked={selected.size === results.length && results.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300"
                />
            ),
            render: (_value, result) => (
                <input
                    type="checkbox"
                    checked={selected.has(result.id)}
                    onChange={() => toggleSelection(result.id)}
                    className="rounded border-slate-300"
                />
            ),
        },
        {
            key: "company",
            header: "Entreprise",
            render: (_value, result) => (
                <div>
                    <div className="font-medium text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {result.company.name}
                    </div>
                    {result.company.domain && (
                        <div className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <Globe className="w-3 h-3" />
                            {result.company.domain}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: "industry",
            header: "Secteur",
            render: (_value, result) => result.company.industry || "—",
        },
        {
            key: "size",
            header: "Taille",
            render: (_value, result) => result.company.size || "—",
        },
        {
            key: "country",
            header: "Pays",
            render: (_value, result) => result.company.country || "—",
        },
        {
            key: "phone",
            header: "Téléphone",
            render: (_value, result) => (
                <div className="text-sm text-slate-600 whitespace-nowrap">
                    {result.company.phone ? (
                        <a href={`tel:${result.company.phone}`} className="hover:text-indigo-600">
                            {result.company.phone}
                        </a>
                    ) : (
                        "—"
                    )}
                </div>
            ),
        },
        {
            key: "state",
            header: "État / Province",
            render: (_value, result) => result.company.state || "—",
        },
        {
            key: "website",
            header: "Site Web",
            render: (_value, result) => (
                result.company.domain ? (
                    <a
                        href={`https://${result.company.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                        <Globe className="w-3 h-3" />
                        Visiter
                    </a>
                ) : "—"
            ),
        },
        {
            key: "confidence",
            header: "Confiance",
            render: (_value, result) => {
                const color =
                    result.confidence >= 80
                        ? "bg-emerald-100 text-emerald-700"
                        : result.confidence >= 60
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700";
                return (
                    <Badge className={color}>
                        {result.confidence}%
                    </Badge>
                );
            },
        },
        {
            key: "source",
            header: "Source",
            render: (_value, result) => (
                <Badge className="bg-indigo-100 text-indigo-700">
                    {result.source}
                </Badge>
            ),
        },
    ];

    // ============================================
    // FILTERS CONFIG
    // ============================================

    const industryOptions = [
        { value: "", label: "Tous les secteurs" },
        { value: "Technology", label: "Technologie" },
        { value: "Finance", label: "Finance" },
        { value: "Healthcare", label: "Santé" },
        { value: "Retail", label: "Commerce" },
        { value: "Manufacturing", label: "Industrie" },
        { value: "Consulting", label: "Conseil" },
    ];

    const sizeOptions = [
        { value: "", label: "Toutes les tailles" },
        { value: "1-10", label: "1-10 employés" },
        { value: "11-50", label: "11-50 employés" },
        { value: "51-200", label: "51-200 employés" },
        { value: "201-500", label: "201-500 employés" },
        { value: "501-1000", label: "501-1000 employés" },
        { value: "1001-5000", label: "1001-5000 employés" },
        { value: "5001+", label: "5001+ employés" },
    ];

    const countryOptions = [
        { value: "", label: "Tous les pays" },
        ...Object.keys(LOCATION_DATA).map(key => ({
            value: key,
            label: LOCATION_DATA[key].label
        }))
    ];

    const regionOptions = [
        { value: "", label: "Toutes les régions" },
        ...(country && LOCATION_DATA[country]?.regions
            ? Object.keys(LOCATION_DATA[country].regions).map(key => ({
                value: key,
                label: LOCATION_DATA[country].regions[key].label
            }))
            : [])
    ];

    const stateOptions = [
        { value: "", label: "Tous les états / provinces" },
        ...(country && region && LOCATION_DATA[country]?.regions[region]?.states
            ? LOCATION_DATA[country].regions[region].states
            : [])
    ];

    const limitOptions = [
        { value: "10", label: "10 résultats" },
        { value: "25", label: "25 résultats" },
        { value: "50", label: "50 résultats" },
        { value: "100", label: "100 résultats" },
    ];

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Enterprise Listing
                    </h1>
                    <p className="text-slate-600 mt-1">
                        Découvrir et générer des leads B2B
                    </p>
                </div>
                <Badge className="bg-indigo-100 text-indigo-700">
                    Powered by Apollo.io
                </Badge>
            </div>

            {/* Filters */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-900">Filtres</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Secteur d&apos;activité
                        </label>
                        <Select
                            options={industryOptions}
                            value={industry}
                            onChange={setIndustry}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Taille d&apos;entreprise
                        </label>
                        <Select
                            options={sizeOptions}
                            value={companySize}
                            onChange={setCompanySize}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Pays
                        </label>
                        <Select
                            options={countryOptions}
                            value={country}
                            onChange={handleCountryChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Région
                        </label>
                        <Select
                            options={regionOptions}
                            value={region}
                            onChange={handleRegionChange}
                            disabled={!country}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            État / Province
                        </label>
                        <Select
                            options={stateOptions}
                            value={state}
                            onChange={setState}
                            disabled={!region}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Keywords
                        </label>
                        <Input
                            placeholder="SaaS, E-commerce..."
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nombre de résultats
                        </label>
                        <Select
                            options={limitOptions}
                            value={limit}
                            onChange={setLimit}
                        />
                    </div>
                </div>

                <div className="flex justify-end mt-6">
                    <Button
                        variant="primary"
                        onClick={handleSearch}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Recherche en cours...
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4 mr-2" />
                                Rechercher
                            </>
                        )}
                    </Button>
                </div>
            </Card>

            {/* Bulk Actions */}
            {selected.size > 0 && (
                <Card className="p-4 bg-indigo-50 border-indigo-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-900">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-medium">
                                {selected.size} prospect(s) sélectionné(s)
                            </span>
                        </div>
                        <Button variant="primary" onClick={handleBulkImport}>
                            Envoyer au Pipeline
                        </Button>
                    </div>
                </Card>
            )}

            {/* Results */}
            <Card>
                {isLoading ? (
                    <LoadingState message="Recherche en cours sur Apollo.io..." />
                ) : results.length === 0 ? (
                    <EmptyState
                        icon={Search}
                        title="Aucun résultat"
                        description="Utilisez les filtres ci-dessus pour rechercher des leads B2B"
                    />
                ) : (
                    <>
                        <div className="p-4 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-slate-600">
                                    {results.length} résultat(s) trouvé(s)
                                </div>
                                {selected.size > 0 && (
                                    <div className="text-sm text-indigo-600">
                                        {selected.size} sélectionné(s)
                                    </div>
                                )}
                            </div>
                        </div>
                        <DataTable
                            data={results}
                            columns={columns}
                            keyField="id"
                            pagination={false}
                        />
                    </>
                )}
            </Card>
        </div>
    );
}
