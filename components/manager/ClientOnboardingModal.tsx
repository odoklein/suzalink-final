"use client";

import { useState } from "react";
import { useToast } from "@/components/ui";
import {
    Building2,
    Users,
    Target,
    FileText,
    Calendar,
    Sparkles,
    ChevronRight,
    ChevronLeft,
    Check,
    Loader2,
    Plus,
    X,
} from "lucide-react";
import { Button, Badge, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";

// ============================================
// WIZARD STEPS
// ============================================

const STEPS = [
    { id: "client", label: "Fiche Client", icon: Building2, description: "Informations de base" },
    { id: "targets", label: "Cibles & ICP", icon: Target, description: "Profil client idéal" },
    { id: "listing", label: "Base de données", icon: Users, description: "Critères de listing" },
    { id: "scripts", label: "Scripts", icon: FileText, description: "Scripts d'appel" },
    { id: "planning", label: "Planning", icon: Calendar, description: "Date de lancement" },
];

interface FormData {
    // Client info
    name: string;
    email: string;
    phone: string;
    industry: string;
    website: string;
    // Targets/ICP
    icp: string;
    targetIndustries: string[];
    targetCompanySize: string;
    targetJobTitles: string[];
    targetGeographies: string[];
    // Listing
    listingSources: string[];
    listingCriteria: string;
    estimatedContacts: string;
    // Scripts
    introScript: string;
    discoveryScript: string;
    objectionScript: string;
    closingScript: string;
    // Planning
    targetLaunchDate: string;
    notes: string;
    // Mission creation
    createMission: boolean;
    missionName: string;
    missionObjective: string;
    missionChannel: "CALL" | "EMAIL" | "LINKEDIN";
}

const INITIAL_FORM_DATA: FormData = {
    name: "",
    email: "",
    phone: "",
    industry: "",
    website: "",
    icp: "",
    targetIndustries: [],
    targetCompanySize: "",
    targetJobTitles: [],
    targetGeographies: [],
    listingSources: [],
    listingCriteria: "",
    estimatedContacts: "",
    introScript: "",
    discoveryScript: "",
    objectionScript: "",
    closingScript: "",
    targetLaunchDate: "",
    notes: "",
    createMission: false,
    missionName: "",
    missionObjective: "",
    missionChannel: "CALL",
};

const INDUSTRY_OPTIONS = [
    "SaaS / Tech",
    "E-commerce",
    "Finance / Banque",
    "Santé",
    "Immobilier",
    "Industrie",
    "Services B2B",
    "Retail",
    "Éducation",
    "Autre",
];

const COMPANY_SIZE_OPTIONS = [
    "1-10 employés",
    "11-50 employés",
    "51-200 employés",
    "201-500 employés",
    "501-1000 employés",
    "1000+ employés",
];

const LISTING_SOURCE_OPTIONS = [
    "Apollo.io",
    "LinkedIn Sales Navigator",
    "Clay",
    "Pharow",
    "Base interne",
    "Autre",
];

interface ClientOnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (clientId: string) => void;
}

export function ClientOnboardingModal({ isOpen, onClose, onSuccess }: ClientOnboardingModalProps) {
    const { success, error: showError } = useToast();
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newTag, setNewTag] = useState("");

    // ============================================
    // FORM HANDLERS
    // ============================================

    const updateField = (field: keyof FormData, value: string | string[] | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addTag = (field: "targetIndustries" | "targetJobTitles" | "targetGeographies" | "listingSources", value: string) => {
        if (value.trim() && !formData[field].includes(value.trim())) {
            updateField(field, [...formData[field], value.trim()]);
        }
    };

    const removeTag = (field: "targetIndustries" | "targetJobTitles" | "targetGeographies" | "listingSources", value: string) => {
        updateField(field, formData[field].filter(t => t !== value));
    };

    // ============================================
    // NAVIGATION
    // ============================================

    const canProceed = () => {
        switch (currentStep) {
            case 0: // Client info
                return formData.name.trim().length > 0;
            case 1: // Targets
                return true; // Optional for manager
            case 2: // Listing
                return true;
            case 3: // Scripts
                return true;
            case 4: // Planning
                return true;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (canProceed() && currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleClose = () => {
        setCurrentStep(0);
        setFormData(INITIAL_FORM_DATA);
        onClose();
    };

    // ============================================
    // SUBMIT
    // ============================================

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            showError("Erreur", "Le nom du client est requis");
            return;
        }

        setIsSubmitting(true);
        try {
            const onboardingData = {
                icp: formData.icp,
                targetIndustries: formData.targetIndustries,
                targetCompanySize: formData.targetCompanySize,
                targetJobTitles: formData.targetJobTitles,
                targetGeographies: formData.targetGeographies,
                listingSources: formData.listingSources,
                listingCriteria: formData.listingCriteria,
                estimatedContacts: formData.estimatedContacts,
            };

            const scripts = {
                intro: formData.introScript,
                discovery: formData.discoveryScript,
                objection: formData.objectionScript,
                closing: formData.closingScript,
            };

            // Create client with onboarding
            const clientRes = await fetch("/api/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email || null,
                    phone: formData.phone || null,
                    industry: formData.industry || null,
                    // Onboarding data
                    onboardingData,
                    targetLaunchDate: formData.targetLaunchDate || null,
                    scripts,
                    notes: formData.notes || null,
                    // Mission creation
                    createMission: formData.createMission,
                    missionName: formData.missionName || null,
                    missionObjective: formData.missionObjective || null,
                    missionChannel: formData.missionChannel,
                }),
            });

            const clientJson = await clientRes.json();

            if (!clientJson.success) {
                showError("Erreur", clientJson.error || "Impossible de créer le client");
                setIsSubmitting(false);
                return;
            }

            success("Client créé", `${formData.name} a été créé avec succès`);
            handleClose();
            onSuccess(clientJson.data.id);
        } catch (err) {
            console.error("Failed to create client:", err);
            showError("Erreur", "Une erreur est survenue");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ============================================
    // RENDER STEP CONTENT
    // ============================================

    const renderStepContent = () => {
        switch (currentStep) {
            case 0: // Client info
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Nom de l'entreprise *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => updateField("name", e.target.value)}
                                    placeholder="Ex: Acme Corp"
                                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Secteur d'activité
                                </label>
                                <select
                                    value={formData.industry}
                                    onChange={(e) => updateField("industry", e.target.value)}
                                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                >
                                    <option value="">Sélectionner...</option>
                                    {INDUSTRY_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Site web
                                </label>
                                <input
                                    type="text"
                                    value={formData.website}
                                    onChange={(e) => updateField("website", e.target.value)}
                                    placeholder="www.acme.com"
                                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Email de contact
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => updateField("email", e.target.value)}
                                    placeholder="contact@acme.com"
                                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Téléphone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => updateField("phone", e.target.value)}
                                    placeholder="+33 1 23 45 67 89"
                                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 1: // Targets/ICP
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Profil Client Idéal (ICP)
                            </label>
                            <textarea
                                value={formData.icp}
                                onChange={(e) => updateField("icp", e.target.value)}
                                placeholder="Décrivez le profil type des prospects à cibler..."
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Secteurs cibles
                            </label>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {formData.targetIndustries.map(tag => (
                                    <Badge key={tag} variant="primary" className="gap-1 text-xs">
                                        {tag}
                                        <button onClick={() => removeTag("targetIndustries", tag)}>
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                            <select
                                onChange={(e) => {
                                    if (e.target.value) {
                                        addTag("targetIndustries", e.target.value);
                                        e.target.value = "";
                                    }
                                }}
                                className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            >
                                <option value="">Ajouter un secteur...</option>
                                {INDUSTRY_OPTIONS.filter(i => !formData.targetIndustries.includes(i)).map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Taille d'entreprise cible
                            </label>
                            <select
                                value={formData.targetCompanySize}
                                onChange={(e) => updateField("targetCompanySize", e.target.value)}
                                className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            >
                                <option value="">Sélectionner...</option>
                                {COMPANY_SIZE_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Titres/Fonctions cibles
                            </label>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {formData.targetJobTitles.map(tag => (
                                    <Badge key={tag} variant="primary" className="gap-1 text-xs">
                                        {tag}
                                        <button onClick={() => removeTag("targetJobTitles", tag)}>
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addTag("targetJobTitles", newTag);
                                            setNewTag("");
                                        }
                                    }}
                                    placeholder="Ex: CEO, CTO, Directeur Commercial..."
                                    className="flex-1 h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                />
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        addTag("targetJobTitles", newTag);
                                        setNewTag("");
                                    }}
                                    disabled={!newTag.trim()}
                                    className="h-10 px-3"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                );

            case 2: // Listing
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Sources de données
                            </label>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {formData.listingSources.map(tag => (
                                    <Badge key={tag} variant="primary" className="gap-1 text-xs">
                                        {tag}
                                        <button onClick={() => removeTag("listingSources", tag)}>
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                            <select
                                onChange={(e) => {
                                    if (e.target.value) {
                                        addTag("listingSources", e.target.value);
                                        e.target.value = "";
                                    }
                                }}
                                className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            >
                                <option value="">Ajouter une source...</option>
                                {LISTING_SOURCE_OPTIONS.filter(s => !formData.listingSources.includes(s)).map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Critères de listing
                            </label>
                            <textarea
                                value={formData.listingCriteria}
                                onChange={(e) => updateField("listingCriteria", e.target.value)}
                                placeholder="Critères spécifiques pour le sourcing des contacts..."
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Volume estimé de contacts
                            </label>
                            <input
                                type="text"
                                value={formData.estimatedContacts}
                                onChange={(e) => updateField("estimatedContacts", e.target.value)}
                                placeholder="Ex: 500-1000 contacts"
                                className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            />
                        </div>
                    </div>
                );

            case 3: // Scripts
                return (
                    <div className="space-y-4">
                        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <p className="text-xs text-indigo-700">
                                <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                                Les scripts seront utilisés par les SDRs lors des appels.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Script d'introduction
                            </label>
                            <textarea
                                value={formData.introScript}
                                onChange={(e) => updateField("introScript", e.target.value)}
                                placeholder="Bonjour, je suis [Prénom] de [Entreprise]..."
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Questions de découverte
                            </label>
                            <textarea
                                value={formData.discoveryScript}
                                onChange={(e) => updateField("discoveryScript", e.target.value)}
                                placeholder="Questions pour qualifier le prospect..."
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Réponses aux objections
                            </label>
                            <textarea
                                value={formData.objectionScript}
                                onChange={(e) => updateField("objectionScript", e.target.value)}
                                placeholder="Si le prospect dit 'Pas le temps' → ..."
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Script de closing
                            </label>
                            <textarea
                                value={formData.closingScript}
                                onChange={(e) => updateField("closingScript", e.target.value)}
                                placeholder="Pour conclure et fixer un RDV..."
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                            />
                        </div>
                    </div>
                );

            case 4: // Planning
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Date de lancement souhaitée
                            </label>
                            <input
                                type="date"
                                value={formData.targetLaunchDate}
                                onChange={(e) => updateField("targetLaunchDate", e.target.value)}
                                className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Notes additionnelles
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => updateField("notes", e.target.value)}
                                placeholder="Informations complémentaires pour l'équipe..."
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                            />
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <input
                                    type="checkbox"
                                    id="createMission"
                                    checked={formData.createMission}
                                    onChange={(e) => updateField("createMission", e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="createMission" className="text-sm font-medium text-slate-700">
                                    Créer une mission initiale
                                </label>
                            </div>

                            {formData.createMission && (
                                <div className="space-y-3 pt-3 border-t border-slate-200">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Nom de la mission
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.missionName}
                                            onChange={(e) => updateField("missionName", e.target.value)}
                                            placeholder={`Mission ${formData.name || "Client"}`}
                                            className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Canal principal
                                        </label>
                                        <select
                                            value={formData.missionChannel}
                                            onChange={(e) => updateField("missionChannel", e.target.value as "CALL" | "EMAIL" | "LINKEDIN")}
                                            className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        >
                                            <option value="CALL">Appel</option>
                                            <option value="EMAIL">Email</option>
                                            <option value="LINKEDIN">LinkedIn</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Objectif
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.missionObjective}
                                            onChange={(e) => updateField("missionObjective", e.target.value)}
                                            placeholder="Ex: Générer des RDV qualifiés"
                                            className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title=""
            className="!max-w-3xl"
        >
            <div className="flex flex-col h-full max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Onboarding Client</h2>
                        <p className="text-sm text-slate-500">Créez un nouveau client avec toutes les informations</p>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-6 px-2">
                    {STEPS.map((step, index) => (
                        <div
                            key={step.id}
                            className={cn(
                                "flex items-center",
                                index < STEPS.length - 1 && "flex-1"
                            )}
                        >
                            <button
                                onClick={() => setCurrentStep(index)}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1 rounded-lg transition-colors",
                                    index === currentStep && "bg-indigo-50",
                                    index < currentStep && "text-indigo-600"
                                )}
                            >
                                <div className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold",
                                    index === currentStep && "bg-indigo-500 text-white",
                                    index < currentStep && "bg-indigo-500 text-white",
                                    index > currentStep && "bg-slate-200 text-slate-500"
                                )}>
                                    {index < currentStep ? <Check className="w-3.5 h-3.5" /> : index + 1}
                                </div>
                                <span className={cn(
                                    "text-xs font-medium hidden md:block",
                                    index === currentStep ? "text-indigo-600" : "text-slate-500"
                                )}>
                                    {step.label}
                                </span>
                            </button>
                            {index < STEPS.length - 1 && (
                                <div className={cn(
                                    "flex-1 h-0.5 mx-2",
                                    index < currentStep ? "bg-indigo-500" : "bg-slate-200"
                                )} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                            {(() => {
                                const StepIcon = STEPS[currentStep].icon;
                                return <StepIcon className="w-4 h-4 text-indigo-600" />;
                            })()}
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">{STEPS[currentStep].label}</h3>
                            <p className="text-xs text-slate-500">{STEPS[currentStep].description}</p>
                        </div>
                    </div>

                    {renderStepContent()}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200">
                    <Button
                        variant="secondary"
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className="gap-2"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Retour
                    </Button>

                    {currentStep === STEPS.length - 1 ? (
                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !canProceed()}
                            isLoading={isSubmitting}
                            className="gap-2"
                        >
                            Créer le client
                            <Check className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={handleNext}
                            disabled={!canProceed()}
                            className="gap-2"
                        >
                            Suivant
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
