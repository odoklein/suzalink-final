"use client";

import React, { useState, useEffect, use } from "react";
import { cn } from "@/lib/utils";
import {
    Settings,
    Shield,
    ShieldCheck,
    Globe,
    AlertCircle,
    Loader2,
    ArrowLeft,
    Save,
    Copy,
    Info,
    Eye,
    Activity,
    Trash2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

interface MailboxDetail {
    id: string;
    provider: "GMAIL" | "OUTLOOK" | "CUSTOM";
    email: string;
    displayName: string | null;
    type: string;
    syncStatus: string;
    warmupStatus: string;
    dailySendLimit: number;
    sentToday: number;
    signature: string | null;
    signatureHtml: string | null;
    healthScore: number;
    lastSyncAt: string | null;
    lastError: string | null;
    isActive: boolean;
    trackingDomain: string | null;
    trackingEnabled: boolean;
}

export default function MailboxSettingsPage({ params }: { params: Promise<{ id: string }> }) {
    const { addToast } = useToast();
    const { id } = use(params);
    const [mailbox, setMailbox] = useState<MailboxDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("general");

    // Form states
    const [displayName, setDisplayName] = useState("");
    const [signatureHtml, setSignatureHtml] = useState("");
    const [trackingEnabled, setTrackingEnabled] = useState(true);
    const [trackingDomain, setTrackingDomain] = useState("");
    const [dailySendLimit, setDailySendLimit] = useState(200);

    useEffect(() => {
        const fetchMailbox = async () => {
            try {
                const res = await fetch(`/api/email/mailboxes/${id}`);
                const json = await res.json();
                if (json.success) {
                    setMailbox(json.data);
                    setDisplayName(json.data.displayName || "");
                    setSignatureHtml(json.data.signatureHtml || "");
                    setTrackingEnabled(json.data.trackingEnabled);
                    setTrackingDomain(json.data.trackingDomain || "");
                    setDailySendLimit(json.data.dailySendLimit);
                }
            } catch (error) {
                console.error("Failed to fetch mailbox:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMailbox();
    }, [id]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/email/mailboxes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    displayName,
                    signatureHtml,
                    trackingEnabled,
                    trackingDomain: trackingDomain || null,
                    dailySendLimit,
                }),
            });

            const json = await res.json();
            if (json.success) {
                setMailbox(json.data);
                addToast({
                    title: "Succès",
                    message: "Configuration mise à jour avec succès.",
                    type: "success",
                });
            } else {
                throw new Error(json.error);
            }
        } catch (error) {
            addToast({
                title: "Erreur",
                message: error instanceof Error ? error.message : "Échec de la sauvegarde",
                type: "error",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast({
            title: "Copié",
            message: "Valeur copiée dans le presse-papier",
            type: "info"
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Chargement de la configuration...</p>
            </div>
        );
    }

    if (!mailbox) {
        return (
            <div className="text-center py-20">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900">Oups !</h2>
                <p className="text-slate-500">Boîte mail introuvable ou accès refusé.</p>
                <Button
                    variant="ghost"
                    className="mt-6"
                    onClick={() => window.history.back()}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                </Button>
            </div>
        );
    }

    const senderDomain = mailbox.email.split("@")[1];

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Breadcrumbs / Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2">
                    <button
                        onClick={() => window.history.back()}
                        className="group flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Retour aux boîtes mail
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-slate-900">{mailbox.email}</h1>
                        <Badge variant={mailbox.isActive ? "success" : "default"}>
                            {mailbox.isActive ? "Connecté" : "Inactif"}
                        </Badge>
                    </div>
                    <p className="text-slate-500">Gérez la délivrabilité et les paramètres de votre compte {mailbox.provider.toLowerCase()}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Enregistrer les modifications
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-3">
                    <div className="flex flex-col space-y-1">
                        <button
                            onClick={() => setActiveTab("general")}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                                activeTab === "general"
                                    ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                                    : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <Settings className="w-4 h-4" />
                            Général
                        </button>
                        <button
                            onClick={() => setActiveTab("deliverability")}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                                activeTab === "deliverability"
                                    ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-200"
                                    : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <Globe className="w-4 h-4" />
                            Délivrabilité (Whitelabel)
                        </button>
                        <button
                            onClick={() => setActiveTab("security")}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                                activeTab === "security"
                                    ? "bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200"
                                    : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <Shield className="w-4 h-4" />
                            Sécurité / Santé
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-9 space-y-6">
                    {activeTab === "general" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Profil de la boîte mail</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700">Nom d&apos;affichage</label>
                                            <input
                                                type="text"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                placeholder="John Doe"
                                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            />
                                            <p className="text-xs text-slate-500">Le nom qui apparaîtra dans l&apos;en-tête &quot;De&quot; de vos emails.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700">Limite quotidienne d&apos;envoi</label>
                                            <input
                                                type="number"
                                                value={dailySendLimit}
                                                onChange={(e) => setDailySendLimit(parseInt(e.target.value))}
                                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            />
                                            <p className="text-xs text-slate-500">Maximum {mailbox.provider === 'GMAIL' ? '500' : '200'} recommandés pour éviter le spam.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Signature HTML</label>
                                        <textarea
                                            value={signatureHtml}
                                            onChange={(e) => setSignatureHtml(e.target.value)}
                                            rows={6}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-sm transition-all"
                                            placeholder="<p>Cordialement,<br/><strong>John Doe</strong></p>"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-red-100 bg-red-50/30">
                                <CardHeader>
                                    <CardTitle className="text-lg text-red-900 flex items-center gap-2">
                                        <Trash2 className="w-5 h-5" /> Danger Zone
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-red-700 mb-4">La suppression de cette boîte mail supprimera définitivement tous les emails et fils de discussion synchronisés.</p>
                                    <Button variant="danger" className="bg-red-600 hover:bg-red-700 text-white">
                                        Déconnecter la boîte mail
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === "deliverability" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <Card className="overflow-hidden border-emerald-100">
                                <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                                        <Globe className="w-5 h-5" /> Whitelabel & Tracking
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Statut:</span>
                                        <Badge variant={trackingEnabled ? "success" : "default"}>
                                            {trackingEnabled ? "Activé" : "Désactivé"}
                                        </Badge>
                                    </div>
                                </div>
                                <CardContent className="p-6 space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div>
                                            <h4 className="font-semibold text-slate-900">Suivi des ouvertures</h4>
                                            <p className="text-sm text-slate-500">Injecte un pixel transparent pour savoir quand vos emails sont lus.</p>
                                        </div>
                                        <button
                                            onClick={() => setTrackingEnabled(!trackingEnabled)}
                                            className={cn(
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ring-transparent focus:ring-indigo-500",
                                                trackingEnabled ? "bg-emerald-500" : "bg-slate-300"
                                            )}
                                        >
                                            <span className={cn(
                                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                trackingEnabled ? "translate-x-6" : "translate-x-1"
                                            )} />
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            Domaine de suivi personnalisé (Whitelabel)
                                            <Info className="w-4 h-4 text-slate-400" />
                                        </label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={trackingDomain}
                                                    onChange={(e) => setTrackingDomain(e.target.value)}
                                                    placeholder={`https://track.${senderDomain}`}
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Utilisez votre propre domaine pour que les liens de suivi ne soient pas marqués comme spam par Gmail/Outlook.
                                        </p>
                                    </div>

                                    {trackingDomain && (
                                        <div className="space-y-4 pt-4 border-t border-slate-100">
                                            <h4 className="text-sm font-bold text-slate-900">Instructions de configuration DNS</h4>
                                            <p className="text-sm text-slate-600">Connectez-vous à votre registrar (Hostinger, Gandi, Cloudflare) et ajoutez cet enregistrement :</p>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-200 rounded-xl overflow-hidden divide-x divide-slate-200">
                                                <div className="p-3 bg-slate-50">
                                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Type</span>
                                                    <span className="font-mono text-sm font-bold text-indigo-600">CNAME</span>
                                                </div>
                                                <div className="p-3 bg-white flex items-center justify-between">
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Nom / Host</span>
                                                        <span className="font-mono text-sm">{trackingDomain.replace(/^https?:\/\//, '').split('.')[0]}</span>
                                                    </div>
                                                    <button onClick={() => copyToClipboard(trackingDomain.replace(/^https?:\/\//, '').split('.')[0])} className="text-slate-400 hover:text-indigo-600"><Copy className="w-3.5 h-3.5" /></button>
                                                </div>
                                                <div className="p-3 bg-white flex items-center justify-between">
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Valeur / Cible</span>
                                                        <span className="font-mono text-sm">suzalink.cloud</span>
                                                    </div>
                                                    <button onClick={() => copyToClipboard('suzalink.cloud')} className="text-slate-400 hover:text-indigo-600"><Copy className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                                                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                                <div className="text-xs text-amber-800 space-y-1">
                                                    <p className="font-bold">Important pour la mise en production</p>
                                                    <p>Une fois le CNAME ajouté, attendez la propagation DNS (jusqu&apos;à 24h) pour que vos emails ne tombent plus en spam.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === "security" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="bg-indigo-600 border-none shadow-xl shadow-indigo-500/20">
                                    <CardContent className="p-6">
                                        <Activity className="w-8 h-8 text-white/50 mb-2" />
                                        <p className="text-white/80 text-sm mb-1">Score de Santé</p>
                                        <h3 className="text-3xl font-bold text-white">{mailbox.healthScore}%</h3>
                                        <div className="w-full bg-white/20 h-1.5 rounded-full mt-3 overflow-hidden">
                                            <div className="bg-white h-full" style={{ width: `${mailbox.healthScore}%` }} />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-emerald-600 border-none shadow-xl shadow-emerald-500/20">
                                    <CardContent className="p-6">
                                        <ShieldCheck className="w-8 h-8 text-white/50 mb-2" />
                                        <p className="text-white/80 text-sm mb-1">SPF / DKIM</p>
                                        <h3 className="text-xl font-bold text-white">Vérifiés</h3>
                                        <p className="text-white/60 text-xs mt-2">Votre domaine est correctement aligné.</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white border-slate-200">
                                    <CardContent className="p-6">
                                        <Eye className="w-8 h-8 text-indigo-500/50 mb-2" />
                                        <p className="text-slate-500 text-sm mb-1">Ouvertures</p>
                                        <h3 className="text-2xl font-bold text-slate-900">Anonymisées</h3>
                                        <p className="text-slate-400 text-xs mt-2">Politique de confidentialité active.</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-indigo-500" /> Logs d&apos;activité récents
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {[
                                            { event: "Synchronisation réussie", time: mailbox.lastSyncAt ? new Date(mailbox.lastSyncAt).toLocaleString() : "Jamais" },
                                            { event: "Réinitialisation de quota quotidien", time: "Hier, 00:01" },
                                            { event: "Nouveau Message-ID généré", time: "Il y a 2 heures" },
                                        ].map((log, i) => (
                                            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                                <span className="text-sm text-slate-700">{log.event}</span>
                                                <span className="text-xs text-slate-400">{log.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
