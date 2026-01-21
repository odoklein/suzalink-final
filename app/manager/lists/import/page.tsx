"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Select, FileUpload, useToast } from "@/components/ui";
import {
    ArrowLeft,
    ArrowRight,
    Upload,
    Check,
    Loader2,
    FileText,
    AlertCircle,
    CheckCircle2,
    Table,
} from "lucide-react";
import Link from "next/link";

// ============================================
// TYPES
// ============================================

interface Mission {
    id: string;
    name: string;
}

interface ColumnMapping {
    csvColumn: string;
    targetField: string;
}

interface PreviewRow {
    [key: string]: string;
}

// ============================================
// FIELD OPTIONS
// ============================================

const COMPANY_FIELDS = [
    { value: "", label: "Ignorer" },
    { value: "company.name", label: "Nom de société *" },
    { value: "company.industry", label: "Industrie" },
    { value: "company.country", label: "Pays" },
    { value: "company.website", label: "Site web" },
    { value: "company.size", label: "Taille" },
];

const CONTACT_FIELDS = [
    { value: "contact.firstName", label: "Prénom" },
    { value: "contact.lastName", label: "Nom" },
    { value: "contact.email", label: "Email" },
    { value: "contact.phone", label: "Téléphone" },
    { value: "contact.title", label: "Fonction" },
    { value: "contact.linkedin", label: "LinkedIn" },
];

const ALL_FIELDS = [...COMPANY_FIELDS, ...CONTACT_FIELDS];

// ============================================
// CSV IMPORT PAGE
// ============================================

export default function ImportListPage() {
    const router = useRouter();
    const { success, error: showError } = useToast();

    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Step 1: File & Mission
    const [file, setFile] = useState<File | null>(null);
    const [missionId, setMissionId] = useState("");
    const [listName, setListName] = useState("");

    // Step 2: Column mapping
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [mappings, setMappings] = useState<ColumnMapping[]>([]);
    const [previewData, setPreviewData] = useState<PreviewRow[]>([]);

    // Step 3: Validation
    const [validationResult, setValidationResult] = useState<{
        valid: number;
        errors: string[];
        warnings: string[];
    } | null>(null);

    // Step 4: Import result
    const [importResult, setImportResult] = useState<{
        companies: number;
        contacts: number;
        errors: number;
    } | null>(null);

    // ============================================
    // FETCH MISSIONS
    // ============================================

    useEffect(() => {
        const fetchMissions = async () => {
            setIsLoading(true);
            try {
                const res = await fetch("/api/missions?isActive=true");
                const json = await res.json();
                if (json.success) {
                    setMissions(json.data);
                }
            } catch (err) {
                console.error("Failed to fetch missions:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMissions();
    }, []);

    // ============================================
    // PARSE CSV
    // ============================================

    const parseCSV = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                showError("Erreur", "Le fichier CSV doit contenir au moins une ligne d'en-tête et une ligne de données");
                return;
            }

            // Parse headers
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            setCsvHeaders(headers);

            // Initialize mappings with auto-detect
            const autoMappings = headers.map(header => {
                const lowerHeader = header.toLowerCase();
                let targetField = "";

                // Auto-detect common fields
                if (lowerHeader.includes("company") || lowerHeader.includes("société") || lowerHeader.includes("entreprise")) {
                    targetField = "company.name";
                } else if (lowerHeader.includes("industry") || lowerHeader.includes("secteur")) {
                    targetField = "company.industry";
                } else if (lowerHeader.includes("country") || lowerHeader.includes("pays")) {
                    targetField = "company.country";
                } else if (lowerHeader.includes("website") || lowerHeader.includes("site")) {
                    targetField = "company.website";
                } else if (lowerHeader.includes("firstname") || lowerHeader.includes("prénom") || lowerHeader === "first name") {
                    targetField = "contact.firstName";
                } else if (lowerHeader.includes("lastname") || lowerHeader === "nom" || lowerHeader === "last name") {
                    targetField = "contact.lastName";
                } else if (lowerHeader.includes("email") || lowerHeader.includes("mail")) {
                    targetField = "contact.email";
                } else if (lowerHeader.includes("phone") || lowerHeader.includes("téléphone") || lowerHeader.includes("tel")) {
                    targetField = "contact.phone";
                } else if (lowerHeader.includes("title") || lowerHeader.includes("fonction") || lowerHeader.includes("poste")) {
                    targetField = "contact.title";
                } else if (lowerHeader.includes("linkedin")) {
                    targetField = "contact.linkedin";
                }

                return { csvColumn: header, targetField };
            });

            setMappings(autoMappings);

            // Parse preview data (first 5 rows)
            const dataRows = lines.slice(1, 6).map(line => {
                const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const row: PreviewRow = {};
                headers.forEach((header, i) => {
                    row[header] = values[i] || "";
                });
                return row;
            });

            setPreviewData(dataRows);

            // Auto-generate list name from file
            if (!listName) {
                const name = file.name.replace(/\.csv$/i, '').replace(/[_-]/g, ' ');
                setListName(name);
            }
        };
        reader.readAsText(file);
    }, [listName, showError]);

    // ============================================
    // HANDLE FILE SELECTION
    // ============================================

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            parseCSV(files[0]);
        }
    };

    // ============================================
    // VALIDATE DATA
    // ============================================

    const validateData = () => {
        const hasCompanyName = mappings.some(m => m.targetField === "company.name");
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!hasCompanyName) {
            errors.push("Le champ 'Nom de société' est obligatoire");
        }

        const hasContact = mappings.some(m => m.targetField.startsWith("contact."));
        if (!hasContact) {
            warnings.push("Aucun champ contact mappé - seules les sociétés seront importées");
        }

        const hasEmail = mappings.some(m => m.targetField === "contact.email");
        if (hasContact && !hasEmail) {
            warnings.push("Pas d'email mappé - les contacts ne pourront pas être enrichis");
        }

        setValidationResult({
            valid: errors.length === 0 ? previewData.length : 0,
            errors,
            warnings,
        });

        if (errors.length === 0) {
            setStep(3);
        }
    };

    // ============================================
    // IMPORT DATA
    // ============================================

    const handleImport = async () => {
        if (!file) return;

        setIsImporting(true);

        try {
            // Read the entire CSV file
            const reader = new FileReader();
            reader.onload = async (e) => {
                const text = e.target?.result as string;
                const lines = text.split('\n').filter(line => line.trim());
                const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

                // Parse all data rows
                const csvData = lines.slice(1).map(line => {
                    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                    const row: Record<string, string> = {};
                    headers.forEach((header, i) => {
                        row[header] = values[i] || "";
                    });
                    return row;
                });

                // Send to API
                const res = await fetch('/api/lists/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        missionId,
                        listName,
                        mappings,
                        csvData,
                    }),
                });

                const json = await res.json();

                if (json.success) {
                    setImportResult({
                        companies: json.data.companiesCreated,
                        contacts: json.data.contactsCreated,
                        errors: json.data.errors,
                    });

                    setStep(4);
                    success("Import réussi", `${json.data.companiesCreated} sociétés et ${json.data.contactsCreated} contacts importés`);
                } else {
                    showError("Erreur", json.error || "L'import a échoué");
                }

                setIsImporting(false);
            };

            reader.onerror = () => {
                showError("Erreur", "Impossible de lire le fichier");
                setIsImporting(false);
            };

            reader.readAsText(file);
        } catch (err) {
            console.error("Import failed:", err);
            showError("Erreur", "L'import a échoué");
            setIsImporting(false);
        }
    };

    // ============================================
    // STEP INDICATORS
    // ============================================

    const steps = [
        { num: 1, label: "Fichier" },
        { num: 2, label: "Mapping" },
        { num: 3, label: "Validation" },
        { num: 4, label: "Import" },
    ];

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/manager/lists">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white">Importer CSV</h1>
                    <p className="text-neutral-500 mt-1">
                        Importez des sociétés et contacts depuis un fichier CSV
                    </p>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-between">
                {steps.map((s, i) => (
                    <div key={s.num} className="flex items-center">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${step >= s.num
                            ? "bg-indigo-500/20 text-indigo-400"
                            : "bg-neutral-800 text-neutral-500"
                            }`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step > s.num
                                ? "bg-indigo-500 text-white"
                                : step === s.num
                                    ? "bg-indigo-500/30 text-indigo-400"
                                    : "bg-neutral-700 text-neutral-400"
                                }`}>
                                {step > s.num ? <Check className="w-3 h-3" /> : s.num}
                            </span>
                            <span className="text-sm font-medium">{s.label}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`w-12 h-0.5 mx-2 ${step > s.num ? "bg-indigo-500" : "bg-neutral-700"
                                }`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step 1: File & Mission Selection */}
            {step === 1 && (
                <Card>
                    <div className="space-y-6">
                        <Select
                            label="Mission *"
                            placeholder="Sélectionner une mission..."
                            options={missions.map(m => ({ value: m.id, label: m.name }))}
                            value={missionId}
                            onChange={setMissionId}
                            searchable
                        />

                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-2">
                                Nom de la liste
                            </label>
                            <input
                                type="text"
                                value={listName}
                                onChange={(e) => setListName(e.target.value)}
                                placeholder="Sera généré automatiquement depuis le fichier"
                                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <FileUpload
                            label="Fichier CSV *"
                            accept=".csv"
                            maxSize={10}
                            onFilesSelected={handleFileSelected}
                        />

                        <div className="flex justify-end">
                            <Button
                                variant="primary"
                                onClick={() => setStep(2)}
                                disabled={!file || !missionId}
                                className="gap-2"
                            >
                                Suivant
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Step 2: Column Mapping */}
            {step === 2 && (
                <Card>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-white">Mapper les colonnes</h2>
                                <p className="text-sm text-neutral-500">
                                    Associez chaque colonne CSV à un champ de données
                                </p>
                            </div>
                            <div className="text-sm text-neutral-400">
                                {csvHeaders.length} colonnes détectées
                            </div>
                        </div>

                        <div className="space-y-3">
                            {mappings.map((mapping, i) => (
                                <div key={mapping.csvColumn} className="flex items-center gap-4 p-3 bg-neutral-800/50 rounded-xl">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">{mapping.csvColumn}</p>
                                        <p className="text-xs text-neutral-500 truncate">
                                            Ex: {previewData[0]?.[mapping.csvColumn] || "—"}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-neutral-600" />
                                    <Select
                                        options={ALL_FIELDS}
                                        value={mapping.targetField}
                                        onChange={(value) => {
                                            const newMappings = [...mappings];
                                            newMappings[i].targetField = value;
                                            setMappings(newMappings);
                                        }}
                                        className="w-48"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Preview */}
                        <div>
                            <h3 className="text-sm font-medium text-neutral-400 mb-2">Aperçu des données</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-neutral-800">
                                            {csvHeaders.slice(0, 5).map(h => (
                                                <th key={h} className="text-left py-2 px-3 text-neutral-400 font-medium">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.slice(0, 3).map((row, i) => (
                                            <tr key={i} className="border-b border-neutral-800/50">
                                                {csvHeaders.slice(0, 5).map(h => (
                                                    <td key={h} className="py-2 px-3 text-neutral-300 truncate max-w-[200px]">
                                                        {row[h] || "—"}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                Retour
                            </Button>
                            <Button variant="primary" onClick={validateData} className="gap-2">
                                Valider
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Step 3: Validation */}
            {step === 3 && validationResult && (
                <Card>
                    <div className="space-y-6">
                        <div className="text-center py-8">
                            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-white">Prêt pour l&apos;import</h2>
                            <p className="text-neutral-400 mt-1">
                                {validationResult.valid} lignes valides détectées
                            </p>
                        </div>

                        {validationResult.warnings.length > 0 && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-amber-400">Avertissements</p>
                                        <ul className="text-sm text-amber-300/80 mt-1 space-y-1">
                                            {validationResult.warnings.map((w, i) => (
                                                <li key={i}>• {w}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-neutral-800/50 rounded-xl p-4">
                            <h3 className="font-medium text-white mb-2">Résumé de l&apos;import</h3>
                            <ul className="text-sm text-neutral-300 space-y-1">
                                <li>• Liste: <span className="text-white">{listName}</span></li>
                                <li>• Mission: <span className="text-white">{missions.find(m => m.id === missionId)?.name}</span></li>
                                <li>• Fichier: <span className="text-white">{file?.name}</span></li>
                                <li>• Lignes: <span className="text-white">{validationResult.valid}</span></li>
                            </ul>
                        </div>

                        <div className="flex justify-between">
                            <Button variant="ghost" onClick={() => setStep(2)} className="gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                Retour
                            </Button>
                            <Button
                                variant="success"
                                onClick={handleImport}
                                disabled={isImporting}
                                className="gap-2"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Import en cours...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Lancer l&apos;import
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Step 4: Result */}
            {step === 4 && importResult && (
                <Card>
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">Import terminé !</h2>
                        <p className="text-neutral-400 mt-1">
                            {importResult.companies} sociétés et {importResult.contacts} contacts importés
                        </p>

                        <div className="flex justify-center gap-4 mt-8">
                            <Link href="/manager/lists">
                                <Button variant="secondary" className="gap-2">
                                    <Table className="w-4 h-4" />
                                    Voir les listes
                                </Button>
                            </Link>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    setStep(1);
                                    setFile(null);
                                    setMissionId("");
                                    setListName("");
                                    setCsvHeaders([]);
                                    setMappings([]);
                                    setPreviewData([]);
                                    setValidationResult(null);
                                    setImportResult(null);
                                }}
                                className="gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Nouvel import
                            </Button>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
