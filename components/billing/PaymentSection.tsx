"use client";

import { useState } from "react";
import { Check, X, Clock, Loader2 } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { useToast } from "@/components/ui";
import { format } from "date-fns";

interface Payment {
    id: string;
    amount: number;
    paymentDate: string;
    status: "MATCHED" | "CONFIRMED";
    matchedAt: string;
    confirmedAt?: string | null;
    confirmedBy?: {
        name: string;
    } | null;
}

interface PaymentSectionProps {
    invoiceId: string;
    payments: Payment[];
    invoiceStatus: string;
    onPaymentUpdate: () => void;
}

export function PaymentSection({
    invoiceId,
    payments,
    invoiceStatus,
    onPaymentUpdate,
}: PaymentSectionProps) {
    const { success, error: showError } = useToast();
    const [processing, setProcessing] = useState<string | null>(null);

    const handleConfirm = async (paymentId: string) => {
        setProcessing(paymentId);
        try {
            const res = await fetch(`/api/billing/payments/${paymentId}/confirm`, {
                method: "POST",
            });

            const json = await res.json();

            if (json.success) {
                success("Paiement confirmé", "Le paiement a été confirmé avec succès");
                onPaymentUpdate();
            } else {
                showError("Erreur", json.error);
            }
        } catch (err) {
            console.error("Confirm payment error:", err);
            showError("Erreur", "Impossible de confirmer le paiement");
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (paymentId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir rejeter ce paiement ?")) {
            return;
        }

        setProcessing(paymentId);
        try {
            const res = await fetch(`/api/billing/payments/${paymentId}/reject`, {
                method: "POST",
            });

            const json = await res.json();

            if (json.success) {
                success("Paiement rejeté", "Le paiement a été rejeté");
                onPaymentUpdate();
            } else {
                showError("Erreur", json.error);
            }
        } catch (err) {
            console.error("Reject payment error:", err);
            showError("Erreur", "Impossible de rejeter le paiement");
        } finally {
            setProcessing(null);
        }
    };

    const matchedPayments = payments.filter((p) => p.status === "MATCHED");
    const confirmedPayments = payments.filter((p) => p.status === "CONFIRMED");

    if (invoiceStatus === "PAID" && confirmedPayments.length > 0) {
        const payment = confirmedPayments[0];
        return (
            <div className="p-4 border border-emerald-200 rounded-lg bg-emerald-50">
                <div className="flex items-center gap-2 text-emerald-700">
                    <Check className="w-5 h-5" />
                    <div>
                        <div className="font-semibold">Facture payée</div>
                        <div className="text-sm">
                            Payé le {format(new Date(payment.confirmedAt || payment.paymentDate), "dd MMMM yyyy")}
                            {payment.confirmedBy && ` par ${payment.confirmedBy.name}`}
                        </div>
                        <div className="text-sm mt-1">Montant: {payment.amount.toFixed(2)} €</div>
                    </div>
                </div>
            </div>
        );
    }

    if (matchedPayments.length > 0) {
        return (
            <div className="space-y-3">
                {matchedPayments.map((payment) => (
                    <div key={payment.id} className="p-4 border border-amber-200 rounded-lg bg-amber-50">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-5 h-5 text-amber-600" />
                                    <div className="font-semibold text-amber-900">Paiement détecté</div>
                                    <Badge variant="warning">À confirmer</Badge>
                                </div>
                                <div className="text-sm text-amber-800 mt-1">
                                    Montant: {payment.amount.toFixed(2)} €
                                    <br />
                                    Date: {format(new Date(payment.paymentDate), "dd/MM/yyyy")}
                                    <br />
                                    Détecté le: {format(new Date(payment.matchedAt), "dd/MM/yyyy à HH:mm")}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => handleConfirm(payment.id)}
                                    disabled={processing === payment.id}
                                >
                                    {processing === payment.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4 mr-1" />
                                            Confirmer
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReject(payment.id)}
                                    disabled={processing === payment.id}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-5 h-5" />
                <div>
                    <div className="font-semibold">En attente de paiement</div>
                    <div className="text-sm mt-1">Aucun paiement détecté pour cette facture</div>
                </div>
            </div>
        </div>
    );
}
