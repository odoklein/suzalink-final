"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, Button, Badge } from "@/components/ui";
import {
    Mail,
    Settings,
    User,
    Check,
    X,
    Loader2,
    AlertCircle,
    ChevronRight,
    Server,
    Shield,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface EmailStatus {
    connected: boolean;
    provider: "gmail" | "outlook" | "smtp" | null;
    email: string | null;
}

type SMTPConfig = {
    host: string;
    port: string;
    user: string;
    password: string;
}

// ============================================
// EMAIL PROVIDERS
// ============================================

const EMAIL_PROVIDERS = [
    {
        id: "gmail",
        name: "Gmail",
        icon: "/icons/gmail.svg",
        color: "bg-red-50 text-red-600 border-red-200",
        description: "Connectez votre compte Google",
    },
    {
        id: "outlook",
        name: "Outlook",
        icon: "/icons/outlook.svg",
        color: "bg-blue-50 text-blue-600 border-blue-200",
        description: "Connectez votre compte Microsoft",
    },
    {
        id: "smtp",
        name: "SMTP",
        icon: "/icons/smtp.svg",
        color: "bg-slate-50 text-slate-600 border-slate-200",
        description: "Configuration manuelle",
    },
];

// ============================================
// SDR SETTINGS PAGE
// ============================================

export default function SDRSettingsPage() {
    const { data: session } = useSession();
    const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [showSMTPModal, setShowSMTPModal] = useState(false);
    const [smtpConfig, setSMTPConfig] = useState<SMTPConfig>({
        host: "",
        port: "587",
        user: "",
        password: "",
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // ============================================
    // FETCH EMAIL STATUS
    // ============================================

    const fetchEmailStatus = async () => {
        try {
            const res = await fetch("/api/sdr/email");
            const json = await res.json();
            if (json.success) {
                setEmailStatus(json.data);
            }
        } catch (err) {
            console.error("Failed to fetch email status:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEmailStatus();
    }, []);

    // ============================================
    // CONNECT EMAIL
    // ============================================

    const handleConnectEmail = async (provider: string) => {
        setError(null);
        setSuccess(null);

        if (provider === "smtp") {
            setShowSMTPModal(true);
            return;
        }

        // For OAuth providers (Gmail, Outlook)
        // In a real implementation, this would redirect to OAuth flow
        setIsConnecting(true);

        // Simulate OAuth (in production, redirect to OAuth URL)
        setTimeout(() => {
            setError("L'intégration OAuth n'est pas encore disponible. Utilisez SMTP pour le moment.");
            setIsConnecting(false);
        }, 1000);
    };

    // ============================================
    // CONNECT SMTP
    // ============================================

    const handleConnectSMTP = async () => {
        setError(null);
        setIsConnecting(true);

        try {
            const res = await fetch("/api/sdr/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: "smtp",
                    smtpHost: smtpConfig.host,
                    smtpPort: parseInt(smtpConfig.port),
                    smtpUser: smtpConfig.user,
                    smtpPassword: smtpConfig.password,
                }),
            });

            const json = await res.json();

            if (json.success) {
                setSuccess("Email connecté avec succès!");
                setShowSMTPModal(false);
                fetchEmailStatus();
            } else {
                setError(json.error || "Erreur lors de la connexion");
            }
        } catch (err) {
            setError("Erreur de connexion au serveur");
        } finally {
            setIsConnecting(false);
        }
    };

    // ============================================
    // DISCONNECT EMAIL
    // ============================================

    const handleDisconnect = async () => {
        setError(null);
        setIsConnecting(true);

        try {
            const res = await fetch("/api/sdr/email", {
                method: "DELETE",
            });

            const json = await res.json();

            if (json.success) {
                setSuccess("Email déconnecté");
                fetchEmailStatus();
            } else {
                setError(json.error || "Erreur lors de la déconnexion");
            }
        } catch (err) {
            setError("Erreur de connexion au serveur");
        } finally {
            setIsConnecting(false);
        }
    };

    // ============================================
    // LOADING STATE
    // ============================================

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">Chargement des paramètres...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-900">Paramètres</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Gérez vos préférences et connexions
                </p>
            </div>

            {/* Alerts */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-400 hover:text-red-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
                    <Check className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{success}</p>
                    <button
                        onClick={() => setSuccess(null)}
                        className="ml-auto text-emerald-400 hover:text-emerald-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Profile Card */}
            <Card className="!p-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-xl font-semibold">
                        {session?.user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1">
                        <h2 className="font-semibold text-lg text-slate-900">{session?.user?.name}</h2>
                        <p className="text-sm text-slate-500">{session?.user?.email}</p>
                        <Badge variant="primary" className="mt-1">SDR</Badge>
                    </div>
                </div>
            </Card>

            {/* Email Connection */}
            <Card className="!p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">Connexion Email</h3>
                            <p className="text-xs text-slate-500">
                                Connectez votre email pour envoyer des campagnes
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4">
                    {emailStatus?.connected ? (
                        // Connected state
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Check className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-emerald-900">Connecté</p>
                                    <p className="text-sm text-emerald-700">
                                        {emailStatus.provider?.toUpperCase()} - {emailStatus.email}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="danger"
                                className="w-full"
                                onClick={handleDisconnect}
                                isLoading={isConnecting}
                            >
                                Déconnecter
                            </Button>
                        </div>
                    ) : (
                        // Not connected state
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                                <p className="text-sm text-amber-700">
                                    Aucun email connecté
                                </p>
                            </div>

                            <p className="text-sm text-slate-600">
                                Choisissez un fournisseur pour connecter votre email:
                            </p>

                            <div className="space-y-2">
                                {EMAIL_PROVIDERS.map((provider) => (
                                    <button
                                        key={provider.id}
                                        onClick={() => handleConnectEmail(provider.id)}
                                        disabled={isConnecting}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                            "hover:border-indigo-300 hover:bg-indigo-50/50",
                                            provider.color
                                        )}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                                            {provider.id === "gmail" && <Mail className="w-5 h-5 text-red-500" />}
                                            {provider.id === "outlook" && <Mail className="w-5 h-5 text-blue-500" />}
                                            {provider.id === "smtp" && <Server className="w-5 h-5 text-slate-500" />}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-medium text-slate-900">{provider.name}</p>
                                            <p className="text-xs text-slate-500">{provider.description}</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Security Info */}
            <Card className="!p-4 bg-slate-50 border-slate-200">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                        <h3 className="font-medium text-slate-900">Sécurité</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Vos identifiants sont chiffrés et stockés de manière sécurisée.
                            Nous ne partageons jamais vos données avec des tiers.
                        </p>
                    </div>
                </div>
            </Card>

            {/* SMTP Modal */}
            {showSMTPModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md animate-scale-in">
                        <div className="p-4 border-b border-slate-100">
                            <h3 className="font-semibold text-lg text-slate-900">Configuration SMTP</h3>
                            <p className="text-sm text-slate-500">Entrez vos paramètres de serveur mail</p>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Serveur SMTP
                                </label>
                                <input
                                    type="text"
                                    value={smtpConfig.host}
                                    onChange={(e) => setSMTPConfig({ ...smtpConfig, host: e.target.value })}
                                    placeholder="smtp.gmail.com"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Port
                                </label>
                                <input
                                    type="text"
                                    value={smtpConfig.port}
                                    onChange={(e) => setSMTPConfig({ ...smtpConfig, port: e.target.value })}
                                    placeholder="587"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Email / Utilisateur
                                </label>
                                <input
                                    type="email"
                                    value={smtpConfig.user}
                                    onChange={(e) => setSMTPConfig({ ...smtpConfig, user: e.target.value })}
                                    placeholder="votre@email.com"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Mot de passe / App Password
                                </label>
                                <input
                                    type="password"
                                    value={smtpConfig.password}
                                    onChange={(e) => setSMTPConfig({ ...smtpConfig, password: e.target.value })}
                                    placeholder="••••••••••••"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Pour Gmail, utilisez un mot de passe d'application
                                </p>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex gap-3">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => setShowSMTPModal(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1"
                                onClick={handleConnectSMTP}
                                isLoading={isConnecting}
                                disabled={!smtpConfig.host || !smtpConfig.user || !smtpConfig.password}
                            >
                                Connecter
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
