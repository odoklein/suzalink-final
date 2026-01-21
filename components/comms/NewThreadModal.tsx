"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X, Target, Building2, FileText, Users, MessageCircle, Megaphone, Search, Loader2 } from "lucide-react";
import { Modal, Input, Button } from "@/components/ui";
import type { CommsChannelType, CreateThreadRequest } from "@/lib/comms/types";

interface NewThreadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (request: CreateThreadRequest) => Promise<void>;
    userRole: string;
    // Pre-selected context (optional)
    defaultChannelType?: CommsChannelType;
    defaultAnchorId?: string;
    defaultAnchorName?: string;
}

interface SelectableItem {
    id: string;
    name: string;
    subtitle?: string;
}

const CHANNEL_OPTIONS: {
    type: CommsChannelType;
    label: string;
    icon: typeof Target;
    description: string;
    roles: string[];
}[] = [
    {
        type: "MISSION",
        label: "Mission",
        icon: Target,
        description: "Discussion liée à une mission",
        roles: ["MANAGER", "SDR", "BUSINESS_DEVELOPER"],
    },
    {
        type: "CLIENT",
        label: "Client",
        icon: Building2,
        description: "Discussion liée à un client",
        roles: ["MANAGER", "BUSINESS_DEVELOPER"],
    },
    {
        type: "CAMPAIGN",
        label: "Campagne",
        icon: FileText,
        description: "Discussion liée à une campagne",
        roles: ["MANAGER", "SDR", "BUSINESS_DEVELOPER"],
    },
    {
        type: "GROUP",
        label: "Groupe",
        icon: Users,
        description: "Discussion avec un groupe",
        roles: ["MANAGER", "BUSINESS_DEVELOPER"],
    },
    {
        type: "DIRECT",
        label: "Message direct",
        icon: MessageCircle,
        description: "Discussion privée avec un collègue",
        roles: ["MANAGER", "SDR", "BUSINESS_DEVELOPER", "DEVELOPER"],
    },
    {
        type: "BROADCAST",
        label: "Annonce",
        icon: Megaphone,
        description: "Annonce à l'équipe (managers uniquement)",
        roles: ["MANAGER"],
    },
];

export function NewThreadModal({
    isOpen,
    onClose,
    onSubmit,
    userRole,
    defaultChannelType,
    defaultAnchorId,
    defaultAnchorName,
}: NewThreadModalProps) {
    const [step, setStep] = useState<"type" | "anchor" | "compose">("type");
    const [channelType, setChannelType] = useState<CommsChannelType | null>(
        defaultChannelType || null
    );
    const [anchorId, setAnchorId] = useState<string | null>(defaultAnchorId || null);
    const [anchorName, setAnchorName] = useState<string>(defaultAnchorName || "");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [isBroadcast, setIsBroadcast] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // For DIRECT type
    const [selectedUser, setSelectedUser] = useState<SelectableItem | null>(null);

    // Searchable items for anchor selection
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SelectableItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep("type");
            setChannelType(defaultChannelType || null);
            setAnchorId(defaultAnchorId || null);
            setAnchorName(defaultAnchorName || "");
            setSubject("");
            setMessage("");
            setIsBroadcast(false);
            setSelectedUser(null);
            setSearchQuery("");
            setSearchResults([]);
        }
    }, [isOpen, defaultChannelType, defaultAnchorId, defaultAnchorName]);

    // Skip to compose if defaults provided
    useEffect(() => {
        if (defaultChannelType && defaultAnchorId) {
            setStep("compose");
        }
    }, [defaultChannelType, defaultAnchorId]);

    // Search for anchors when query changes
    useEffect(() => {
        if (!searchQuery || !channelType) {
            setSearchResults([]);
            return;
        }

        const searchAnchors = async () => {
            setIsSearching(true);
            try {
                let endpoint = "";
                switch (channelType) {
                    case "MISSION":
                        endpoint = `/api/missions?search=${encodeURIComponent(searchQuery)}`;
                        break;
                    case "CLIENT":
                        endpoint = `/api/clients?search=${encodeURIComponent(searchQuery)}`;
                        break;
                    case "CAMPAIGN":
                        endpoint = `/api/campaigns?search=${encodeURIComponent(searchQuery)}`;
                        break;
                    case "GROUP":
                        endpoint = `/api/comms/groups?search=${encodeURIComponent(searchQuery)}`;
                        break;
                    case "DIRECT":
                        endpoint = `/api/users?search=${encodeURIComponent(searchQuery)}`;
                        break;
                    default:
                        return;
                }

                const res = await fetch(endpoint);
                if (res.ok) {
                    const data = await res.json();
                    // Normalize results
                    const items: SelectableItem[] = (data.missions || data.clients || data.campaigns || data.groups || data.users || data || []).map(
                        (item: { id: string; name: string; email?: string; clientName?: string }) => ({
                            id: item.id,
                            name: item.name,
                            subtitle: item.email || item.clientName,
                        })
                    );
                    setSearchResults(items.slice(0, 10));
                }
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(searchAnchors, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, channelType]);

    const handleSelectType = (type: CommsChannelType) => {
        setChannelType(type);
        if (type === "BROADCAST") {
            setIsBroadcast(true);
            setStep("compose");
        } else {
            setStep("anchor");
        }
    };

    const handleSelectAnchor = (item: SelectableItem) => {
        if (channelType === "DIRECT") {
            setSelectedUser(item);
        }
        setAnchorId(item.id);
        setAnchorName(item.name);
        setStep("compose");
    };

    const handleSubmit = async () => {
        if (!channelType || !subject.trim() || !message.trim()) return;

        setIsSubmitting(true);
        try {
            const request: CreateThreadRequest = {
                channelType,
                subject: subject.trim(),
                initialMessage: message.trim(),
                isBroadcast,
            };

            if (channelType === "DIRECT" && selectedUser) {
                request.participantIds = [selectedUser.id];
            } else if (anchorId) {
                request.anchorId = anchorId;
            }

            await onSubmit(request);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const availableChannelOptions = CHANNEL_OPTIONS.filter((opt) =>
        opt.roles.includes(userRole)
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">
                        {step === "type" && "Nouvelle discussion"}
                        {step === "anchor" && `Sélectionner ${channelType === "DIRECT" ? "un destinataire" : channelType === "GROUP" ? "un groupe" : "un contexte"}`}
                        {step === "compose" && "Composer le message"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Step 1: Select type */}
                {step === "type" && (
                    <div className="grid gap-2">
                        {availableChannelOptions.map((opt) => (
                            <button
                                key={opt.type}
                                onClick={() => handleSelectType(opt.type)}
                                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors text-left"
                            >
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                    <opt.icon className="w-5 h-5 text-slate-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{opt.label}</p>
                                    <p className="text-xs text-slate-500">{opt.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 2: Select anchor */}
                {step === "anchor" && (
                    <div>
                        {/* Back button */}
                        <button
                            onClick={() => setStep("type")}
                            className="text-sm text-slate-500 hover:text-slate-700 mb-4"
                        >
                            ← Retour
                        </button>

                        {/* Search input */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`Rechercher ${channelType === "DIRECT" ? "un utilisateur" : channelType === "GROUP" ? "un groupe" : "..."}`}
                                className="pl-9"
                                autoFocus
                            />
                        </div>

                        {/* Results */}
                        <div className="max-h-64 overflow-y-auto">
                            {isSearching && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                </div>
                            )}
                            {!isSearching && searchResults.length === 0 && searchQuery && (
                                <p className="text-sm text-slate-500 text-center py-8">
                                    Aucun résultat trouvé
                                </p>
                            )}
                            {!isSearching && searchResults.length > 0 && (
                                <div className="space-y-1">
                                    {searchResults.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleSelectAnchor(item)}
                                            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                                                {item.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">
                                                    {item.name}
                                                </p>
                                                {item.subtitle && (
                                                    <p className="text-xs text-slate-500">
                                                        {item.subtitle}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Compose */}
                {step === "compose" && (
                    <div className="space-y-4">
                        {/* Back button (if not from defaults) */}
                        {!defaultAnchorId && (
                            <button
                                onClick={() => setStep(channelType === "BROADCAST" ? "type" : "anchor")}
                                className="text-sm text-slate-500 hover:text-slate-700"
                            >
                                ← Retour
                            </button>
                        )}

                        {/* Context indicator */}
                        {anchorName && (
                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                <span className="text-xs text-slate-500">Contexte:</span>
                                <span className="text-sm font-medium text-slate-700">
                                    {anchorName}
                                </span>
                            </div>
                        )}

                        {/* Subject */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Sujet
                            </label>
                            <Input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Objet de la discussion"
                                autoFocus={!anchorName}
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Message
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Écrivez votre message..."
                                rows={4}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={onClose}>
                                Annuler
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!subject.trim() || !message.trim() || isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    "Créer la discussion"
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default NewThreadModal;
