"use client";

import { useState, useCallback } from "react";
import { Modal, ModalFooter, Button, Select, FileUpload, useToast } from "@/components/ui";
import {
    Upload,
    FileText,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Sparkles,
    Table,
    X,
} from "lucide-react";

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

interface ImportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (listId: string) => void;
    missions: Mission[];
}

// ============================================
// FIELD OPTIONS
// ============================================

const FIELD_OPTIONS = [
    { value: "", label: "❌ Ignorer cette colonne", group: "Actions" },

    // Company fields
    { value: "company.name", label: "🏢 Nom de société *", group: "Société" },
    { value: "company.industry", label: "🏭 Industrie", group: "Société" },
    { value: "company.country", label: "🌍 Pays", group: "Société" },
    { value: "company.website", label: "🌐 Site web", group: "Société" },
    { value: "company.size", label: "👥 Taille", group: "Société" },

    // Contact fields
    { value: "contact.firstName", label: "👤 Prénom", group: "Contact" },
    { value: "contact.lastName", label: "👤 Nom", group: "Contact" },
    { value: "contact.email", label: "📧 Email", group: "Contact" },
    { value: "contact.phone", label: "📱 Téléphone", group: "Contact" },
    { value: "contact.title", label: "💼 Fonction", group: "Contact" },
    { value: "contact.linkedin", label: "🔗 LinkedIn", group: "Contact" },
];

// ============================================
// CSV IMPORT DIALOG
// ============================================

export function CSVImportDialog({ isOpen, onClose, onSuccess, missions }: ImportDialogProps) {
    const { success, error: showError } = useToast();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isImporting, setIsImporting] = useState(false);

    // Step 1: Basic info
    const [file, setFile] = useState<File | null>(null);
    const [missionId, setMissionId] = useState("");
    const [listName, setListName] = useState("");

    // Step 2: Mapping
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [mappings, setMappings] = useState<ColumnMapping[]>([]);
    const [previewData, setPreviewData] = useState<PreviewRow[]>([]);

    // ============================================
    // AUTO-DETECT FIELD MAPPINGS
    // ============================================

    const autoDetectMapping = (header: string): string => {
        const lower = header.toLowerCase();

        // Company fields
        if (lower.includes("company") || lower.includes("société") || lower.includes("entreprise") || lower.includes("organization")) {
            return "company.name";
        }
        if (lower.includes("industry") || lower.includes("secteur") || lower.includes("industrie")) {
            return "company.industry";
        }
        if (lower.includes("country") || lower.includes("pays")) {
            return "company.country";
        }
        if (lower.includes("website") || lower.includes("site") || lower.includes("url")) {
            return "company.website";
        }
        if (lower.includes("size") || lower.includes("taille") || lower.includes("employees")) {
            return "company.size";
        }

        // Contact fields
        if (lower.includes("firstname") || lower.includes("prénom") || lower === "first name" || lower === "prenom") {
            return "contact.firstName";
        }
        if (lower.includes("lastname") || lower === "nom" || lower === "last name" || lower.includes("surname")) {
            return "contact.lastName";
        }
        if (lower.includes("email") || lower.includes("mail") || lower.includes("e-mail")) {
            return "contact.email";
        }
        if (lower.includes("phone") || lower.includes("téléphone") || lower.includes("tel") || lower.includes("mobile")) {
            return "contact.phone";
        }
        if (lower.includes("title") || lower.includes("fonction") || lower.includes("poste") || lower.includes("job")) {
            return "contact.title";
        }
        if (lower.includes("linkedin")) {
            return "contact.linkedin";
        }

        return ""; // Ignore by default
    };

    // ============================================
    // PARSE CSV
    // ============================================

    const parseCSV = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                showError("Fichier invalide", "Le CSV doit contenir au moins une ligne d'en-tête et une ligne de données");
                return;
            }

            // Parse headers
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            setCsvHeaders(headers);

            // Auto-detect mappings
            const autoMappings = headers.map(header => ({
                csvColumn: header,
                targetField: autoDetectMapping(header),
            }));
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

            // Auto-generate list name
            if (!listName) {
                const name = file.name.replace(/\.csv$/i, '').replace(/[_-]/g, ' ');
                setListName(name);
            }

            setStep(2);
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
    // VALIDATE MAPPINGS
    // ============================================

    const validateMappings = () => {
        const hasCompanyName = mappings.some(m => m.targetField === "company.name");

        if (!hasCompanyName) {
            showError("Mapping invalide", "Le champ 'Nom de société' est obligatoire");
            return false;
        }

        return true;
    };

    // ============================================
    // IMPORT DATA
    // ============================================

    const handleImport = async () => {
        if (!file || !validateMappings()) return;

        setIsImporting(true);

        try {
            // Read entire CSV
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

                // Call API
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
                    success(
                        "Import réussi!",
                        `${json.data.companiesCreated} sociétés et ${json.data.contactsCreated} contacts importés`
                    );
                    onSuccess?.(json.data.listId);
                    handleClose();
                } else {
                    showError("Erreur d'import", json.error || "L'import a échoué");
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
    // RESET & CLOSE
    // ============================================

    const handleClose = () => {
        setStep(1);
        setFile(null);
        setMissionId("");
        setListName("");
        setCsvHeaders([]);
        setMappings([]);
        setPreviewData([]);
        setIsImporting(false);
        onClose();
    };

    // ============================================
    // RENDER STEP 1: FILE & INFO
    // ============================================

    const renderStep1 = () => (
        <div className="space-y-6">
            <div className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Importer une liste CSV</h3>
                <p className="text-slate-500">
                    Importez vos sociétés et contacts en quelques clics
                </p>
            </div>

            <Select
                label="Mission *"
                placeholder="Sélectionner une mission..."
                options={missions.map(m => ({ value: m.id, label: m.name }))}
                value={missionId}
                onChange={setMissionId}
                searchable
            />

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom de la liste *
                </label>
                <input
                    type="text"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    placeholder="Ex: Prospects Q1 2024"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
            </div>

            <FileUpload
                label="Fichier CSV *"
                accept=".csv"
                maxSize={10}
                onFilesSelected={handleFileSelected}
            />

            {file && (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-emerald-900">{file.name}</p>
                        <p className="text-xs text-emerald-600">
                            {(file.size / 1024).toFixed(1)} KB
                        </p>
                    </div>
                    <button
                        onClick={() => setFile(null)}
                        className="p-1 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-emerald-600" />
                    </button>
                </div>
            )}
        </div>
    );

    // ============================================
    // RENDER STEP 2: MAPPING
    // ============================================

    const renderStep2 = () => {
        const hasCompanyName = mappings.some(m => m.targetField === "company.name");
        const hasContact = mappings.some(m => m.targetField.startsWith("contact."));
        const mappedCount = mappings.filter(m => m.targetField !== "").length;

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Mapper les colonnes</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {csvHeaders.length} colonnes détectées · {mappedCount} mappées
                        </p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm font-medium text-indigo-700">Auto-détecté</span>
                    </div>
                </div>

                {/* Validation warnings */}
                {!hasCompanyName && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-900">Champ obligatoire manquant</p>
                            <p className="text-xs text-red-700 mt-0.5">
                                Vous devez mapper au moins une colonne au champ "Nom de société"
                            </p>
                        </div>
                    </div>
                )}

                {!hasContact && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-amber-900">Aucun contact mappé</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                                Seules les sociétés seront importées sans contacts
                            </p>
                        </div>
                    </div>
                )}

                {/* Mapping list */}
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                    {mappings.map((mapping, i) => (
                        <div key={mapping.csvColumn} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                    {mapping.csvColumn}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                    Ex: {previewData[0]?.[mapping.csvColumn] || "—"}
                                </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <Select
                                options={FIELD_OPTIONS}
                                value={mapping.targetField}
                                onChange={(value) => {
                                    const newMappings = [...mappings];
                                    newMappings[i].targetField = value;
                                    setMappings(newMappings);
                                }}
                                className="w-64 flex-shrink-0"
                            />
                        </div>
                    ))}
                </div>

                {/* Preview */}
                <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <Table className="w-4 h-4" />
                        Aperçu des données
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {csvHeaders.slice(0, 4).map(h => (
                                        <th key={h} className="text-left py-2 px-3 text-slate-700 font-medium">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.slice(0, 3).map((row, i) => (
                                    <tr key={i} className="border-b border-slate-100 last:border-0">
                                        {csvHeaders.slice(0, 4).map(h => (
                                            <td key={h} className="py-2 px-3 text-slate-600 truncate max-w-[200px]">
                                                {row[h] || "—"}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={step === 1 ? "Nouvelle liste" : "Configuration de l'import"}
            size="lg"
        >
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}

            <ModalFooter>
                {step === 2 && (
                    <Button
                        variant="ghost"
                        onClick={() => setStep(1)}
                    >
                        Retour
                    </Button>
                )}
                <Button
                    variant="ghost"
                    onClick={handleClose}
                >
                    Annuler
                </Button>
                {step === 1 ? (
                    <Button
                        variant="primary"
                        onClick={() => {
                            if (!file || !missionId || !listName) {
                                showError("Champs manquants", "Veuillez remplir tous les champs requis");
                                return;
                            }
                            // File parsing happens in handleFileSelected, so we just validate here
                            if (csvHeaders.length === 0) {
                                showError("Erreur", "Le fichier CSV n'a pas pu être analysé");
                                return;
                            }
                            setStep(2);
                        }}
                        disabled={!file || !missionId || !listName}
                        className="gap-2"
                    >
                        Suivant
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button
                        variant="success"
                        onClick={handleImport}
                        disabled={isImporting || !validateMappings()}
                        className="gap-2"
                    >
                        {isImporting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Import en cours...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                Lancer l'import
                            </>
                        )}
                    </Button>
                )}
            </ModalFooter>
        </Modal>
    );
}
