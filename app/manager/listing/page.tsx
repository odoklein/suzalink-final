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

    // Basic Filters
    const [industry, setIndustry] = useState("");
    const [companySize, setCompanySize] = useState("");
    const [country, setCountry] = useState("");
    const [region, setRegion] = useState("");
    const [state, setState] = useState("");
    const [keywords, setKeywords] = useState("");

    // Revenue & Funding
    const [revenueRange, setRevenueRange] = useState("");
    const [fundingMin, setFundingMin] = useState("");
    const [fundingMax, setFundingMax] = useState("");
    const [latestFundingStage, setLatestFundingStage] = useState("");

    // Company Details
    const [yearFoundedMin, setYearFoundedMin] = useState("");
    const [yearFoundedMax, setYearFoundedMax] = useState("");
    const [companyType, setCompanyType] = useState("");
    const [technologies, setTechnologies] = useState("");

    // Growth & Intent
    const [isHiring, setIsHiring] = useState(false);
    const [departmentHeadcount, setDepartmentHeadcount] = useState("");
    const [jobPostings, setJobPostings] = useState("");

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
        // Validate - at least one filter required
        const hasFilter = industry || companySize || country || state || region || keywords ||
            revenueRange || fundingMin || fundingMax || latestFundingStage ||
            yearFoundedMin || yearFoundedMax || companyType || technologies ||
            isHiring || departmentHeadcount || jobPostings;

        if (!hasFilter) {
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
                    revenueRange,
                    fundingMin: fundingMin ? parseInt(fundingMin) : undefined,
                    fundingMax: fundingMax ? parseInt(fundingMax) : undefined,
                    latestFundingStage,
                    yearFoundedMin: yearFoundedMin ? parseInt(yearFoundedMin) : undefined,
                    yearFoundedMax: yearFoundedMax ? parseInt(yearFoundedMax) : undefined,
                    companyType,
                    technologies: technologies ? technologies.split(',').map(t => t.trim()) : undefined,
                    isHiring,
                    departmentHeadcount,
                    jobPostings,
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
                    <div className="font-medium text-slate-900 text-sm flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {result.company.name}
                    </div>
                    {result.company.domain ? (
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Globe className="w-3 h-3 text-slate-400" />
                            {result.company.domain}
                        </div>
                    ) : null}
                </div>
            ),
        },
        {
            key: "industry",
            header: "Secteur",
            render: (_value, result) => (
                <span className={result.company.industry ? "text-slate-700 text-sm" : "text-slate-400 text-xs"}>{result.company.industry || "—"}</span>
            ),
        },
        {
            key: "size",
            header: "Taille",
            render: (_value, result) => (
                <span className={result.company.size ? "text-slate-700 text-sm" : "text-slate-400 text-xs"}>{result.company.size || "—"}</span>
            ),
        },
        {
            key: "country",
            header: "Pays",
            render: (_value, result) => (
                <span className={result.company.country ? "text-slate-700 text-sm" : "text-slate-400 text-xs"}>{result.company.country || "—"}</span>
            ),
        },
        {
            key: "phone",
            header: "Téléphone",
            render: (_value, result) => (
                <div className="whitespace-nowrap text-sm">
                    {result.company.phone ? (
                        <a href={`tel:${result.company.phone}`} className="text-slate-700 hover:text-indigo-600">
                            {result.company.phone}
                        </a>
                    ) : (
                        <span className="text-slate-400 text-xs">—</span>
                    )}
                </div>
            ),
        },
        {
            key: "state",
            header: "État / Province",
            render: (_value, result) => (
                <span className={result.company.state ? "text-slate-700 text-sm" : "text-slate-400 text-xs"}>{result.company.state || "—"}</span>
            ),
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
                        className="text-indigo-600 hover:text-indigo-700 text-sm inline-flex items-center gap-1"
                    >
                        <Globe className="w-3 h-3" />
                        Visiter
                    </a>
                ) : (
                    <span className="text-slate-400 text-xs">—</span>
                )
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
                    <Badge className={`${color} text-xs font-medium`}>
                        {result.confidence}%
                    </Badge>
                );
            },
        },
        {
            key: "source",
            header: "Source",
            render: (_value, result) => (
                <Badge className="bg-slate-100 text-slate-600 text-xs font-medium">
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

    const revenueOptions = [
        { value: "", label: "Tous les revenus" },
        { value: "0-1M", label: "$0 - $1M" },
        { value: "1M-10M", label: "$1M - $10M" },
        { value: "10M-50M", label: "$10M - $50M" },
        { value: "50M-100M", label: "$50M - $100M" },
        { value: "100M-500M", label: "$100M - $500M" },
        { value: "500M-1B", label: "$500M - $1B" },
        { value: "1B+", label: "$1B+" },
    ];

    const fundingStageOptions = [
        { value: "", label: "Tous les stades" },
        { value: "seed", label: "Seed" },
        { value: "series_a", label: "Series A" },
        { value: "series_b", label: "Series B" },
        { value: "series_c", label: "Series C" },
        { value: "series_d", label: "Series D+" },
        { value: "ipo", label: "IPO" },
        { value: "acquired", label: "Acquired" },
    ];

    const companyTypeOptions = [
        { value: "", label: "Tous les types" },
        { value: "public", label: "Publique" },
        { value: "private", label: "Privée" },
        { value: "nonprofit", label: "Non-profit" },
        { value: "government", label: "Gouvernement" },
    ];

    // ============================================
    // RENDER
    // ============================================

    const pageSize = parseInt(limit, 10) || 25;

    return (
        <div className="flex gap-4 min-h-0">
            {/* Left filter sidebar — condensed, clear hierarchy */}
            <aside className="w-52 shrink-0 flex flex-col">
                <Card className="p-3 flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="flex items-center gap-1.5 mb-3 shrink-0">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Filtres</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 text-[13px]">
                        {/* Basic */}
                        <div className="space-y-1.5">
                            <h3 className="text-[10px] font-medium uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">Base</h3>
                            <div className="space-y-1.5">
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">Secteur</label>
                                    <Select options={industryOptions} value={industry} onChange={setIndustry} className="[&_button]:!py-2 [&_button]:!text-xs [&_button]:!rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">Taille</label>
                                    <Select options={sizeOptions} value={companySize} onChange={setCompanySize} className="[&_button]:!py-2 [&_button]:!text-xs [&_button]:!rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">Pays</label>
                                    <Select options={countryOptions} value={country} onChange={handleCountryChange} className="[&_button]:!py-2 [&_button]:!text-xs [&_button]:!rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">Région</label>
                                    <Select options={regionOptions} value={region} onChange={handleRegionChange} disabled={!country} className="[&_button]:!py-2 [&_button]:!text-xs [&_button]:!rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">État</label>
                                    <Select options={stateOptions} value={state} onChange={setState} disabled={!region} className="[&_button]:!py-2 [&_button]:!text-xs [&_button]:!rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">Keywords</label>
                                    <Input placeholder="SaaS, E-commerce..." value={keywords} onChange={(e) => setKeywords(e.target.value)} className="!py-1.5 !text-xs !rounded-lg" />
                                </div>
                            </div>
                        </div>

                        {/* Revenue & Funding */}
                        <div className="space-y-1.5">
                            <h3 className="text-[10px] font-medium uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">Revenu & financement</h3>
                            <div className="space-y-1.5">
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">Revenu</label>
                                    <Select options={revenueOptions} value={revenueRange} onChange={setRevenueRange} className="[&_button]:!py-2 [&_button]:!text-xs [&_button]:!rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">Financement min ($)</label>
                                    <Input type="number" placeholder="1M" value={fundingMin} onChange={(e) => setFundingMin(e.target.value)} className="!py-1.5 !text-xs !rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">Financement max ($)</label>
                                    <Input type="number" placeholder="10M" value={fundingMax} onChange={(e) => setFundingMax(e.target.value)} className="!py-1.5 !text-xs !rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">Dernier tour</label>
                                    <Select options={fundingStageOptions} value={latestFundingStage} onChange={setLatestFundingStage} className="[&_button]:!py-2 [&_button]:!text-xs [&_button]:!rounded-lg" />
                                </div>
                            </div>
                        </div>

                        {/* Company Details */}
                        <div className="space-y-1.5">
                            <h3 className="text-[10px] font-medium uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">Entreprise</h3>
                            <div className="space-y-1.5">
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">Année min / max</label>
                                    <div className="flex gap-1">
                                        <Input type="number" placeholder="2000" value={yearFoundedMin} onChange={(e) => setYearFoundedMin(e.target.value)} className="!py-1.5 !text-xs !rounded-lg flex-1" />
                                        <Input type="number" placeholder="2023" value={yearFoundedMax} onChange={(e) => setYearFoundedMax(e.target.value)} className="!py-1.5 !text-xs !rounded-lg flex-1" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">Type</label>
                                    <Select options={companyTypeOptions} value={companyType} onChange={setCompanyType} className="[&_button]:!py-2 [&_button]:!text-xs [&_button]:!rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">Technologies</label>
                                    <Input placeholder="Salesforce, AWS..." value={technologies} onChange={(e) => setTechnologies(e.target.value)} className="!py-1.5 !text-xs !rounded-lg" />
                                </div>
                            </div>
                        </div>

                        {/* Growth & Intent */}
                        <div className="space-y-1.5">
                            <h3 className="text-[10px] font-medium uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">Croissance</h3>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="isHiring" checked={isHiring} onChange={(e) => setIsHiring(e.target.checked)} className="rounded border-slate-300 w-3.5 h-3.5" />
                                    <label htmlFor="isHiring" className="text-[11px] text-slate-500">Recrutent</label>
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">Effectif dépt.</label>
                                    <Input placeholder="Engineering, Sales..." value={departmentHeadcount} onChange={(e) => setDepartmentHeadcount(e.target.value)} className="!py-1.5 !text-xs !rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">Offres d&apos;emploi</label>
                                    <Input placeholder="VP Sales..." value={jobPostings} onChange={(e) => setJobPostings(e.target.value)} className="!py-1.5 !text-xs !rounded-lg" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-1.5 border-t border-slate-100">
                            <label className="block text-[11px] text-slate-500 mb-0.5">Par page</label>
                            <Select options={limitOptions} value={limit} onChange={setLimit} className="[&_button]:!py-2 [&_button]:!text-xs [&_button]:!rounded-lg" />
                        </div>
                    </div>
                    <div className="pt-3 mt-2 border-t border-slate-200 shrink-0">
                        <Button variant="primary" onClick={handleSearch} disabled={isLoading} className="w-full !py-2 text-xs">
                            {isLoading ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    Recherche...
                                </>
                            ) : (
                                <>
                                    <Search className="w-3.5 h-3.5 mr-1.5" />
                                    Rechercher
                                </>
                            )}
                        </Button>
                    </div>
                </Card>
            </aside>

            {/* Main: header + bulk actions + table — clear hierarchy */}
            <main className="flex-1 min-w-0 flex flex-col gap-3">
                <div className="flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise Listing</h1>
                        <p className="text-xs text-slate-500 mt-0.5">Découvrir et générer des leads B2B</p>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-600 text-[11px] font-medium border border-indigo-100">Apollo.io</Badge>
                </div>

                {/* Bulk actions bar */}
                {selected.size > 0 && (
                    <Card className="p-3 bg-indigo-50/80 border-indigo-100 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                                <span className="text-sm font-medium text-indigo-900">{selected.size} sélectionné(s)</span>
                            </div>
                            <Button variant="primary" onClick={handleBulkImport} className="!py-2 text-xs">
                                Envoyer au Pipeline
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Data table + pagination */}
                <Card className="flex-1 min-h-0 flex flex-col overflow-hidden p-4">
                    {isLoading ? (
                        <LoadingState message="Recherche en cours sur Apollo.io..." />
                    ) : results.length === 0 ? (
                        <EmptyState
                            icon={Search}
                            title="Aucun résultat"
                            description="Utilisez les filtres à gauche pour rechercher des leads B2B"
                        />
                    ) : (
                        <div className="flex flex-col min-h-0 flex-1">
                            <div className="flex items-center justify-between mb-3 shrink-0">
                                <span className="text-xs text-slate-500">{results.length} résultat(s)</span>
                                {selected.size > 0 && <span className="text-xs font-medium text-indigo-600">{selected.size} sélectionné(s)</span>}
                            </div>
                            <div className="flex-1 min-h-0 overflow-auto">
                                <DataTable
                                    data={results}
                                    columns={columns}
                                    keyField="id"
                                    pagination={true}
                                    pageSize={pageSize}
                                    loading={false}
                                    emptyMessage="Aucune donnée"
                                    className="text-sm"
                                />
                            </div>
                        </div>
                    )}
                </Card>
            </main>
        </div>
    );
}
