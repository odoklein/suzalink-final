"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast, Button } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { WizardForm, WizardStep } from "@/components/common/WizardForm";
import { MissionDetails } from "./_components/MissionDetails";
import { AudienceFilter } from "./_components/AudienceFilter";
import { ReviewLaunch } from "./_components/ReviewLaunch";
import { CreateMissionInput, createMission } from "@/app/actions/mission-wizard";
import { Channel } from "@prisma/client";

// ============================================
// TYPES
// ============================================

interface Client {
    id: string;
    name: string;
}

// ============================================
// NEW MISSION WIZARD PAGE
// ============================================

export default function NewMissionPage() {
    const router = useRouter();
    const { success, error: showError } = useToast();

    // Data State
    const [missionData, setMissionData] = useState<CreateMissionInput>({
        name: "",
        objective: "",
        channel: "CALL" as Channel,
        clientId: "",
        startDate: "",
        endDate: "",
    });

    // UI State
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);


    // ============================================
    // FETCH CLIENTS
    // ============================================

    useEffect(() => {
        const fetchClients = async () => {
            setIsLoadingClients(true);
            try {
                const res = await fetch("/api/clients");
                const json = await res.json();
                if (json.success) {
                    setClients(json.data);
                    // Auto-select first client if only one
                    if (json.data.length === 1) {
                        setMissionData(prev => ({ ...prev, clientId: json.data[0].id }));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch clients:", err);
            } finally {
                setIsLoadingClients(false);
            }
        };
        fetchClients();
    }, []);

    // ============================================
    // VALIDATION LOGIC
    // ============================================

    const step1Errors = (() => {
        const errs: Record<string, string> = {};
        if (!missionData.name.trim()) errs.name = "Le nom est requis";
        if (!missionData.clientId) errs.clientId = "Le client est requis";
        if (!missionData.channel) errs.channel = "Le canal est requis";

        if (missionData.startDate && missionData.endDate) {
            if (new Date(missionData.endDate) < new Date(missionData.startDate)) {
                errs.endDate = "La date de fin doit être après la date de début";
            }
        }
        return errs;
    })();

    const isStep1Valid = Object.keys(step1Errors).length === 0;

    // ============================================
    // SUBMIT
    // ============================================

    const handleComplete = async () => {
        setIsSubmitting(true);
        try {
            const res = await createMission(missionData);

            if (res.success) {
                success(
                    "Mission créée", 
                    res.message || "La mission a été créée avec succès."
                );
                router.push(`/manager/missions/${res.missionId}`);
            } else {
                showError("Erreur", res.error || "Impossible de créer la mission");
                setIsSubmitting(false);
            }
        } catch (err) {
            console.error(err);
            showError("Erreur", "Une erreur inattendue est survenue");
            setIsSubmitting(false);
        }
    };

    // ============================================
    // STEPS CONFIG
    // ============================================

    const steps: WizardStep[] = [
        {
            id: "details",
            label: "Détails Mission",
            component: (
                <MissionDetails
                    data={missionData}
                    onChange={setMissionData}
                    clients={clients}
                    errors={step1Errors}
                />
            ),
            isValid: isStep1Valid,
            validationError: !isStep1Valid ? "Veuillez corriger les erreurs" : undefined
        },
        {
            id: "review",
            label: "Récapitulatif",
            component: (
                <ReviewLaunch
                    data={missionData}
                    clientName={clients.find(c => c.id === missionData.clientId)?.name}
                />
            ),
            isValid: true
        }
    ];

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/manager/missions">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Nouvelle mission</h1>
                    <p className="text-slate-500 mt-1">
                        Assistant de création de mission
                    </p>
                </div>
            </div>

            {/* Wizard */}
            {isLoadingClients ? (
                <div className="p-12 text-center text-slate-500">Chargement...</div>
            ) : (
                <WizardForm
                    steps={steps}
                    onComplete={handleComplete}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}
