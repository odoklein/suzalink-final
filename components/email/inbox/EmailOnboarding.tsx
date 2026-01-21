"use client";

import React, { useState } from "react";
import {
    Mail,
    Inbox,
    Send,
    Users,
    Zap,
    Shield,
    ArrowRight,
    CheckCircle2,
    Loader2,
    Server,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface EmailOnboardingProps {
    onMailboxConnected?: () => void;
}

type ProviderType = 'gmail' | 'outlook' | 'imap' | null;

// ============================================
// PROVIDER CARDS DATA
// ============================================

const PROVIDERS = [
    {
        id: 'gmail' as const,
        name: 'Gmail',
        description: 'Connexion via Google OAuth',
        icon: '/icons/gmail.svg',
        color: 'from-red-500 to-orange-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200 hover:border-red-400',
        features: ['Synchronisation automatique', 'OAuth sécurisé', 'Labels Gmail'],
    },
    {
        id: 'outlook' as const,
        name: 'Outlook / Microsoft 365',
        description: 'Connexion via Microsoft OAuth',
        icon: '/icons/outlook.svg',
        color: 'from-blue-500 to-cyan-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200 hover:border-blue-400',
        features: ['Synchronisation automatique', 'OAuth sécurisé', 'Catégories Outlook'],
    },
    {
        id: 'imap' as const,
        name: 'IMAP / SMTP',
        description: 'Configuration manuelle',
        icon: null,
        color: 'from-slate-500 to-slate-600',
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-200 hover:border-slate-400',
        features: ['Compatible tous fournisseurs', 'Yahoo, iCloud, etc.', 'Configuration personnalisée'],
    },
];

const FEATURES = [
    {
        icon: Inbox,
        title: 'Boîte de réception unifiée',
        description: 'Tous vos emails au même endroit',
    },
    {
        icon: Users,
        title: 'Lien CRM automatique',
        description: 'Associez les emails à vos clients',
    },
    {
        icon: Zap,
        title: 'Séquences automatisées',
        description: 'Automatisez vos campagnes email',
    },
    {
        icon: Shield,
        title: 'Sécurité maximale',
        description: 'Tokens chiffrés, OAuth2 sécurisé',
    },
];

// ============================================
// IMAP FORM
// ============================================

interface ImapFormData {
    email: string;
    password: string;
    imapHost: string;
    imapPort: string;
    smtpHost: string;
    smtpPort: string;
    displayName: string;
}

function ImapConfigForm({
    onSubmit,
    onBack,
    isLoading,
}: {
    onSubmit: (data: ImapFormData) => void;
    onBack: () => void;
    isLoading: boolean;
}) {
    const [formData, setFormData] = useState<ImapFormData>({
        email: '',
        password: '',
        imapHost: '',
        imapPort: '993',
        smtpHost: '',
        smtpPort: '587',
        displayName: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Adresse email
                    </label>
                    <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                        placeholder="vous@example.com"
                    />
                </div>

                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Nom d'affichage
                    </label>
                    <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                        placeholder="John Doe"
                    />
                </div>

                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Mot de passe / App Password
                    </label>
                    <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                        placeholder="••••••••"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        Pour Gmail, utilisez un mot de passe d'application
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Serveur IMAP
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.imapHost}
                        onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                        placeholder="imap.example.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Port IMAP
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.imapPort}
                        onChange={(e) => setFormData({ ...formData, imapPort: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                        placeholder="993"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Serveur SMTP
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.smtpHost}
                        onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                        placeholder="smtp.example.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Port SMTP
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.smtpPort}
                        onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                        placeholder="587"
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm transition-colors disabled:opacity-50"
                >
                    Retour
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-medium text-sm hover:from-indigo-400 hover:to-indigo-500 transition-all disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Connexion...
                        </>
                    ) : (
                        <>
                            Connecter
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}

// ============================================
// MAIN ONBOARDING COMPONENT
// ============================================

export function EmailOnboarding({ onMailboxConnected }: EmailOnboardingProps) {
    const [selectedProvider, setSelectedProvider] = useState<ProviderType>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleProviderSelect = async (providerId: ProviderType) => {
        setError(null);

        if (providerId === 'gmail') {
            // Redirect to Gmail OAuth
            window.location.href = '/api/email/oauth/gmail/connect';
        } else if (providerId === 'outlook') {
            // Redirect to Outlook OAuth
            window.location.href = '/api/email/oauth/outlook/connect';
        } else if (providerId === 'imap') {
            setSelectedProvider('imap');
        }
    };

    const handleImapSubmit = async (data: ImapFormData) => {
        setIsLoading(true);
        setError(null);

        try {
            // First, test the connection
            const testResponse = await fetch('/api/email/mailboxes/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: data.email,
                    password: data.password,
                    imapHost: data.imapHost,
                    imapPort: parseInt(data.imapPort),
                    smtpHost: data.smtpHost,
                    smtpPort: parseInt(data.smtpPort),
                }),
            });

            const testResult = await testResponse.json();

            if (!testResult.success) {
                let errorMsg = 'Échec de la connexion: ';
                if (!testResult.imapOk) errorMsg += 'IMAP échoué. ';
                if (!testResult.smtpOk) errorMsg += 'SMTP échoué. ';
                if (testResult.error) errorMsg += testResult.error;
                throw new Error(errorMsg);
            }

            // Connection test passed, create the mailbox
            const response = await fetch('/api/email/mailboxes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'CUSTOM',
                    email: data.email,
                    displayName: data.displayName || data.email.split('@')[0],
                    password: data.password,
                    imapHost: data.imapHost,
                    imapPort: parseInt(data.imapPort),
                    smtpHost: data.smtpHost,
                    smtpPort: parseInt(data.smtpPort),
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Erreur lors de la création de la boîte mail');
            }

            onMailboxConnected?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de la connexion');
        } finally {
            setIsLoading(false);
        }
    };

    // IMAP Configuration View
    if (selectedProvider === 'imap') {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <div className="w-full max-w-lg">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-lg shadow-slate-500/20">
                                <Server className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Configuration IMAP/SMTP</h2>
                                <p className="text-sm text-slate-500">Entrez les paramètres de votre serveur mail</p>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <ImapConfigForm
                            onSubmit={handleImapSubmit}
                            onBack={() => setSelectedProvider(null)}
                            isLoading={isLoading}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Main Onboarding View
    return (
        <div className="h-full flex flex-col items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-3xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                        <Mail className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">
                        Bienvenue dans Email Hub
                    </h1>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Connectez votre boîte mail pour commencer à gérer vos emails directement depuis Suzalink
                    </p>
                </div>

                {/* Provider Selection */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-slate-700 mb-3">
                        Choisissez votre fournisseur email
                    </h2>
                    <div className="grid gap-3">
                        {PROVIDERS.map((provider) => (
                            <button
                                key={provider.id}
                                onClick={() => handleProviderSelect(provider.id)}
                                className={cn(
                                    "group relative flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                                    provider.borderColor,
                                    provider.bgColor,
                                    "hover:shadow-md hover:-translate-y-0.5"
                                )}
                            >
                                {/* Icon */}
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                                    provider.color
                                )}>
                                    {provider.icon ? (
                                        <img src={provider.icon} alt={provider.name} className="w-6 h-6" />
                                    ) : (
                                        <Server className="w-6 h-6 text-white" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-900">{provider.name}</h3>
                                        {provider.id !== 'imap' && (
                                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                                Recommandé
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 mb-2">{provider.description}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {provider.features.map((feature, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 text-xs text-slate-600"
                                            >
                                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                {feature}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Arrow */}
                                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Features */}
                <div className="border-t border-slate-200 pt-6">
                    <h2 className="text-sm font-semibold text-slate-700 mb-4 text-center">
                        Ce que vous pouvez faire avec Email Hub
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {FEATURES.map((feature, idx) => (
                            <div key={idx} className="text-center p-3">
                                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-indigo-50 flex items-center justify-center">
                                    <feature.icon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h3 className="text-sm font-medium text-slate-900 mb-0.5">
                                    {feature.title}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EmailOnboarding;
