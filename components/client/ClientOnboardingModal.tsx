"use client";

import { useState } from "react";
import { LayoutDashboard, MessageSquare, Target, Sparkles } from "lucide-react";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui";

interface ClientOnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDismissPermanently: () => Promise<void>;
}

const STEPS = [
    {
        icon: LayoutDashboard,
        title: "Tableau de bord",
        description: "Suivez vos missions, les contacts qualifiés et les RDV planifiés en temps réel.",
    },
    {
        icon: MessageSquare,
        title: "Contact",
        description: "Échangez directement avec les SDR et l'équipe dédiée à vos missions.",
    },
    {
        icon: Target,
        title: "Opportunités",
        description: "Consultez les personnes intéressées par vos offres dès qu'elles sont qualifiées.",
    },
];

export function ClientOnboardingModal({
    isOpen,
    onClose,
    onDismissPermanently,
}: ClientOnboardingModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleDismissPermanently = async () => {
        setIsSubmitting(true);
        try {
            await onDismissPermanently();
            onClose();
        } catch {
            // Error handled by parent
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            showCloseButton={true}
            closeOnOverlay={false}
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="text-center pb-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                        Bienvenue sur votre portail client
                    </h2>
                    <p className="text-slate-600 mt-1 max-w-md mx-auto">
                        Voici un aperçu rapide pour tirer le meilleur parti de votre espace.
                    </p>
                </div>

                {/* Steps */}
                <div className="space-y-4">
                    {STEPS.map((step) => {
                        const Icon = step.icon;
                        return (
                            <div
                                key={step.title}
                                className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100"
                            >
                                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">{step.title}</h3>
                                    <p className="text-sm text-slate-600 mt-0.5">{step.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Actions: Fermer (close only) | Ne plus afficher (persist) */}
                <ModalFooter className="flex-col sm:flex-row gap-3 border-t pt-6">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="order-2 sm:order-1"
                    >
                        Fermer
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={handleDismissPermanently}
                        disabled={isSubmitting}
                        isLoading={isSubmitting}
                        className="order-1 sm:order-2 sm:ml-auto text-slate-500 hover:text-slate-700"
                    >
                        Ne plus afficher
                    </Button>
                </ModalFooter>
            </div>
        </Modal>
    );
}
