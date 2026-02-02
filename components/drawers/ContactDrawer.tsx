"use client";

import { useState, useEffect, useRef } from "react";
import { Drawer, DrawerSection, DrawerField, Button, Input, Select, useToast } from "@/components/ui";
import { ACTION_RESULT_LABELS, type ActionResult } from "@/lib/types";
import {
    User,
    Mail,
    Phone,
    Linkedin,
    Briefcase,
    Building2,
    Edit,
    Save,
    X,
    Copy,
    ExternalLink,
    AlertCircle,
    Clock,
    CheckCircle,
    Send,
    PhoneCall,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface Contact {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    title: string | null;
    linkedin: string | null;
    status: "INCOMPLETE" | "PARTIAL" | "ACTIONABLE";
    companyId: string;
    companyName?: string;
    missionId?: string;
}

interface ContactDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    contact: Contact | null;
    onUpdate?: (contact: Contact) => void;
    onCreate?: (contact: Contact & { companyName: string }) => void;
    isManager?: boolean;
    listId?: string;
    companies?: Array<{ id: string; name: string }>;
    isCreating?: boolean;
}

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG = {
    INCOMPLETE: { label: "Incomplet", color: "text-red-500", bg: "bg-red-50", borderColor: "border-red-200", icon: AlertCircle },
    PARTIAL: { label: "Partiel", color: "text-amber-500", bg: "bg-amber-50", borderColor: "border-amber-200", icon: Clock },
    ACTIONABLE: { label: "Actionnable", color: "text-emerald-500", bg: "bg-emerald-50", borderColor: "border-emerald-200", icon: CheckCircle },
};

// ============================================
// CONTACT DRAWER COMPONENT
// ============================================

export function ContactDrawer({
    isOpen,
    onClose,
    contact,
    onUpdate,
    onCreate,
    isManager = false,
    listId,
    companies = [],
    isCreating = false,
}: ContactDrawerProps) {
    const { success, error: showError } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        title: "",
        linkedin: "",
    });

    const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
    const [actions, setActions] = useState<Array<{ id: string; result: string; note: string | null; createdAt: string; campaign?: { name: string } }>>([]);
    const [actionsLoading, setActionsLoading] = useState(false);
    const lastContactIdRef = useRef<string | null>(null);
    const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string; mission?: { channel: string } }>>([]);
    const [campaignsLoading, setCampaignsLoading] = useState(false);
    const [resolvedMissionId, setResolvedMissionId] = useState<string | null>(null);
    const [missionIdLoading, setMissionIdLoading] = useState(false);
    const [newActionResult, setNewActionResult] = useState<string>("");
    const [newActionNote, setNewActionNote] = useState("");
    const [newActionCampaignId, setNewActionCampaignId] = useState("");
    const [newActionSaving, setNewActionSaving] = useState(false);

    const effectiveMissionId = contact?.missionId ?? resolvedMissionId ?? undefined;

    // Resolve missionId when contact has no missionId (e.g. opened from list)
    useEffect(() => {
        if (!contact?.id || isCreating || contact.missionId) {
            setResolvedMissionId(null);
            return;
        }
        setMissionIdLoading(true);
        fetch(`/api/contacts/${contact.id}/mission`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success && json.data?.missionId) {
                    setResolvedMissionId(json.data.missionId);
                } else {
                    setResolvedMissionId(null);
                }
            })
            .catch(() => setResolvedMissionId(null))
            .finally(() => setMissionIdLoading(false));
    }, [contact?.id, contact?.missionId, isCreating]);

    // Fetch campaigns when we have missionId (for "add action" form)
    useEffect(() => {
        if (!effectiveMissionId || isCreating) {
            setCampaigns([]);
            setCampaignsLoading(false);
            return;
        }
        setCampaignsLoading(true);
        fetch(`/api/campaigns?missionId=${effectiveMissionId}&isActive=true&limit=50`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success && Array.isArray(json.data)) {
                    setCampaigns(json.data);
                } else {
                    setCampaigns([]);
                }
            })
            .catch(() => setCampaigns([]))
            .finally(() => setCampaignsLoading(false));
    }, [effectiveMissionId, isCreating]);

    // Fetch actions history when drawer opens with a contact
    useEffect(() => {
        if (!isOpen || isCreating || !contact?.id) {
            setActions([]);
            return;
        }
        setActionsLoading(true);
        fetch(`/api/actions?contactId=${contact.id}&limit=20`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success && Array.isArray(json.data)) {
                    setActions(
                        (json.data as Array<{ id: string; result: string; note: string | null; createdAt: string; campaign?: { name: string } }>).map(
                            (a: { id: string; result: string; note: string | null; createdAt: string; campaign?: { name: string } }) => ({
                                id: a.id,
                                result: a.result,
                                note: a.note ?? null,
                                createdAt: a.createdAt,
                                campaign: a.campaign,
                            })
                        )
                    );
                } else {
                    setActions([]);
                }
            })
            .catch(() => setActions([]))
            .finally(() => setActionsLoading(false));
    }, [isOpen, isCreating, contact?.id]);

    // Reset form only when contact *id* changes (not on every parent re-render with new object ref)
    useEffect(() => {
        if (isCreating) {
            lastContactIdRef.current = null;
            setFormData({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                title: "",
                linkedin: "",
            });
            setSelectedCompanyId(companies.length > 0 ? companies[0].id : "");
            setIsEditing(true);
        } else if (contact) {
            const isNewContact = lastContactIdRef.current !== contact.id;
            lastContactIdRef.current = contact.id;
            if (isNewContact) {
                setFormData({
                    firstName: contact.firstName || "",
                    lastName: contact.lastName || "",
                    email: contact.email || "",
                    phone: contact.phone || "",
                    title: contact.title || "",
                    linkedin: contact.linkedin || "",
                });
                setSelectedCompanyId(contact.companyId);
                setIsEditing(false);
            }
        } else {
            lastContactIdRef.current = null;
        }
    }, [contact?.id, isCreating, companies.length]);

    // ============================================
    // SAVE HANDLER
    // ============================================

    const handleSave = async () => {
        if (isCreating) {
            // Create new contact
            if (!selectedCompanyId) {
                showError("Erreur", "Veuillez sélectionner une société");
                return;
            }

            setIsSaving(true);
            try {
                const res = await fetch(`/api/contacts`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        companyId: selectedCompanyId,
                        firstName: formData.firstName || undefined,
                        lastName: formData.lastName || undefined,
                        email: formData.email || undefined,
                        phone: formData.phone || undefined,
                        title: formData.title || undefined,
                        linkedin: formData.linkedin || undefined,
                    }),
                });

                const json = await res.json();

                if (json.success) {
                    const companyName = companies.find(c => c.id === selectedCompanyId)?.name || "";
                    const fullName = `${formData.firstName || ""} ${formData.lastName || ""}`.trim();
                    const displayName = fullName || "Contact créé";
                    success("Contact créé", displayName);
                    if (onCreate) {
                        onCreate({
                            ...json.data,
                            companyName,
                        });
                    }
                    onClose();
                } else {
                    showError("Erreur", json.error || "Impossible de créer le contact");
                }
            } catch (err) {
                showError("Erreur", "Impossible de créer le contact");
            } finally {
                setIsSaving(false);
            }
        } else {
            // Update existing contact
            if (!contact) return;

            setIsSaving(true);
            try {
                const res = await fetch(`/api/contacts/${contact.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                });

                const json = await res.json();

                if (json.success) {
                    success("Contact mis à jour", `${formData.firstName} ${formData.lastName} a été mis à jour`);
                    setIsEditing(false);
                    if (onUpdate) {
                        onUpdate({ ...contact, ...formData });
                    }
                } else {
                    showError("Erreur", json.error || "Impossible de mettre à jour");
                }
            } catch (err) {
                showError("Erreur", "Impossible de mettre à jour le contact");
            } finally {
                setIsSaving(false);
            }
        }
    };

    // ============================================
    // COPY TO CLIPBOARD
    // ============================================

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        success("Copié", `${label} copié dans le presse-papier`);
    };

    const handleAddAction = async () => {
        if (!contact || !newActionCampaignId || !newActionResult) {
            showError("Erreur", "Sélectionnez une campagne et un résultat");
            return;
        }
        if ((newActionResult === "INTERESTED" || newActionResult === "CALLBACK_REQUESTED") && !newActionNote.trim()) {
            showError("Erreur", "Une note est requise pour ce résultat");
            return;
        }
        setNewActionSaving(true);
        try {
            const selectedCampaign = campaigns.find((c) => c.id === newActionCampaignId);
            const channel = (selectedCampaign?.mission?.channel ?? "CALL") as "CALL" | "EMAIL" | "LINKEDIN";
            const res = await fetch("/api/actions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contactId: contact.id,
                    campaignId: newActionCampaignId,
                    channel,
                    result: newActionResult,
                    note: newActionNote.trim() || undefined,
                }),
            });
            const json = await res.json();
            if (json.success) {
                success("Action enregistrée", "L'action a été ajoutée à l'historique");
                setNewActionNote("");
                setActions((prev) => [
                    {
                        id: json.data.id,
                        result: json.data.result,
                        note: json.data.note ?? null,
                        createdAt: json.data.createdAt,
                        campaign: json.data.campaign,
                    },
                    ...prev,
                ]);
            } else {
                showError("Erreur", json.error || "Impossible d'enregistrer l'action");
            }
        } catch {
            showError("Erreur", "Impossible d'enregistrer l'action");
        } finally {
            setNewActionSaving(false);
        }
    };

    if (!isCreating && !contact) return null;

    const statusConfig = isCreating ? null : STATUS_CONFIG[contact!.status];
    const StatusIcon = statusConfig?.icon;
    const fullName = isCreating ? "Nouveau contact" : `${contact!.firstName || ""} ${contact!.lastName || ""}`.trim() || "Sans nom";

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={isCreating ? "Nouveau contact" : (isEditing ? "Modifier le contact" : fullName)}
            description={isCreating ? "Ajoutez un nouveau contact à une société" : (isEditing ? "Modifiez les informations du contact" : contact!.companyName)}
            size="lg"
            footer={
                isManager && (
                    <div className="flex items-center justify-end gap-3">
                        {(isEditing || isCreating) ? (
                            <>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                        setIsEditing(false);
                                        onClose();
                                    }}
                                    disabled={isSaving}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Annuler
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={handleSave}
                                    disabled={isSaving || (isCreating && !selectedCompanyId)}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isSaving ? (isCreating ? "Création..." : "Enregistrement...") : (isCreating ? "Créer" : "Enregistrer")}
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Modifier
                            </Button>
                        )}
                    </div>
                )
            }
        >
            <div className="space-y-6">
                {/* Avatar & Status */}
                {!isEditing && !isCreating && (
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-2xl font-bold text-emerald-600">
                            {(contact!.firstName?.[0] || contact!.lastName?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                            <div className={cn(
                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
                                statusConfig!.bg,
                                statusConfig!.borderColor,
                                "border"
                            )}>
                                <StatusIcon className={cn("w-4 h-4", statusConfig!.color)} />
                                <span className={cn("text-sm font-medium", statusConfig!.color)}>
                                    {statusConfig!.label}
                                </span>
                            </div>
                            {contact!.title && (
                                <p className="text-sm text-slate-500 mt-1">{contact!.title}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                {!isEditing && !isCreating && contact && (contact.email || contact.phone) && (
                    <div className="flex items-center gap-2">
                        {contact.email && (
                            <a
                                href={`mailto:${contact.email}`}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-medium text-sm hover:bg-indigo-100 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                                Envoyer un email
                            </a>
                        )}
                        {contact.phone && (
                            <a
                                href={`tel:${contact.phone}`}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium text-sm hover:bg-emerald-100 transition-colors"
                            >
                                <PhoneCall className="w-4 h-4" />
                                Appeler
                            </a>
                        )}
                    </div>
                )}

                {/* Contact Info */}
                <DrawerSection title="Informations">
                    {(isEditing || isCreating) ? (
                        <div className="space-y-4">
                            {isCreating && (
                                <Select
                                    label="Société *"
                                    placeholder="Sélectionner une société..."
                                    options={companies.map(c => ({ value: c.id, label: c.name }))}
                                    value={selectedCompanyId}
                                    onChange={setSelectedCompanyId}
                                />
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Prénom"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                    icon={<User className="w-4 h-4 text-slate-400" />}
                                />
                                <Input
                                    label="Nom"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                    icon={<User className="w-4 h-4 text-slate-400" />}
                                />
                            </div>
                            <Input
                                label="Poste"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                icon={<Briefcase className="w-4 h-4 text-slate-400" />}
                            />
                            <Input
                                label="Email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                icon={<Mail className="w-4 h-4 text-slate-400" />}
                            />
                            <Input
                                label="Téléphone"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                icon={<Phone className="w-4 h-4 text-slate-400" />}
                            />
                            <Input
                                label="LinkedIn"
                                value={formData.linkedin}
                                onChange={(e) => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
                                icon={<Linkedin className="w-4 h-4 text-slate-400" />}
                            />
                        </div>
                    ) : contact ? (
                        <div className="space-y-4">
                            <DrawerField
                                label="Société"
                                value={contact.companyName}
                                icon={<Building2 className="w-5 h-5 text-indigo-500" />}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <DrawerField
                                    label="Prénom"
                                    value={contact.firstName}
                                    icon={<User className="w-5 h-5 text-indigo-500" />}
                                />
                                <DrawerField
                                    label="Nom"
                                    value={contact.lastName}
                                    icon={<User className="w-5 h-5 text-indigo-500" />}
                                />
                            </div>
                            <DrawerField
                                label="Poste"
                                value={contact.title}
                                icon={<Briefcase className="w-5 h-5 text-indigo-500" />}
                            />
                            <DrawerField
                                label="Email"
                                value={
                                    contact.email && (
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={`mailto:${contact.email}`}
                                                className="text-indigo-600 hover:underline truncate max-w-[200px]"
                                            >
                                                {contact.email}
                                            </a>
                                            <button
                                                onClick={() => copyToClipboard(contact.email!, "Email")}
                                                className="text-slate-400 hover:text-slate-600"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )
                                }
                                icon={<Mail className="w-5 h-5 text-indigo-500" />}
                            />
                            <DrawerField
                                label="Téléphone"
                                value={
                                    contact.phone && (
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={`tel:${contact.phone}`}
                                                className="text-slate-600"
                                            >
                                                {contact.phone}
                                            </a>
                                            <button
                                                onClick={() => copyToClipboard(contact.phone!, "Téléphone")}
                                                className="text-slate-400 hover:text-slate-600"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )
                                }
                                icon={<Phone className="w-5 h-5 text-indigo-500" />}
                            />
                            <DrawerField
                                label="LinkedIn"
                                value={
                                    contact.linkedin && (
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:underline truncate max-w-[200px]"
                                            >
                                                {contact.linkedin}
                                            </a>
                                            <button
                                                onClick={() => copyToClipboard(contact.linkedin!, "LinkedIn")}
                                                className="text-slate-400 hover:text-slate-600"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                            <a
                                                href={contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-slate-400 hover:text-slate-600"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    )
                                }
                                icon={<Linkedin className="w-5 h-5 text-indigo-500" />}
                            />
                        </div>
                    ) : null}
                </DrawerSection>

                {/* Ajouter une action / note — always show when in view mode so user can leave a note */}
                {!isEditing && !isCreating && contact && (
                    <DrawerSection title="Ajouter une action / note">
                        {missionIdLoading ? (
                            <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Chargement...
                            </div>
                        ) : campaignsLoading ? (
                            <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Chargement des campagnes...
                            </div>
                        ) : !effectiveMissionId ? (
                            <p className="text-sm text-slate-500 py-4">Impossible de charger la mission pour ce contact.</p>
                        ) : campaigns.length === 0 ? (
                            <p className="text-sm text-slate-500 py-4">Aucune campagne disponible pour cette mission.</p>
                        ) : (
                            <div className="space-y-4">
                                <Select
                                    label="Campagne"
                                    placeholder="Sélectionner une campagne..."
                                    options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
                                    value={newActionCampaignId || campaigns[0]?.id}
                                    onChange={setNewActionCampaignId}
                                />
                                <Select
                                    label="Résultat"
                                    placeholder="Sélectionner un résultat..."
                                    options={[
                                        { value: "NO_RESPONSE", label: "Pas de réponse" },
                                        { value: "BAD_CONTACT", label: "Mauvais contact" },
                                        { value: "INTERESTED", label: "Intéressé" },
                                        { value: "CALLBACK_REQUESTED", label: "Rappel demandé" },
                                        { value: "MEETING_BOOKED", label: "RDV pris" },
                                        { value: "DISQUALIFIED", label: "Disqualifié" },
                                    ]}
                                    value={newActionResult}
                                    onChange={setNewActionResult}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
                                    <textarea
                                        value={newActionNote}
                                        onChange={(e) => setNewActionNote(e.target.value)}
                                        placeholder="Ajouter une note (requise pour Intéressé / Rappel demandé)..."
                                        rows={3}
                                        maxLength={500}
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                    />
                                    <p className="text-xs text-slate-400 mt-1 text-right">{newActionNote.length}/500</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={handleAddAction}
                                    disabled={newActionSaving || !newActionResult}
                                    isLoading={newActionSaving}
                                >
                                    Enregistrer l'action
                                </Button>
                            </div>
                        )}
                    </DrawerSection>
                )}

                {/* Historique des actions (result + note) */}
                {!isEditing && !isCreating && contact && (
                    <DrawerSection title="Historique des actions">
                        {actionsLoading ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                            </div>
                        ) : actions.length === 0 ? (
                            <p className="text-sm text-slate-500 py-4">Aucune action enregistrée</p>
                        ) : (
                            <div className="space-y-3 max-h-[280px] overflow-y-auto">
                                {actions.map((a) => (
                                    <div
                                        key={a.id}
                                        className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-sm"
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="font-medium text-slate-700">
                                                {ACTION_RESULT_LABELS[a.result as keyof typeof ACTION_RESULT_LABELS] ?? a.result}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {new Date(a.createdAt).toLocaleDateString("fr-FR", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                        {a.campaign?.name && (
                                            <p className="text-xs text-slate-500 mb-1">{a.campaign.name}</p>
                                        )}
                                        {a.note && (
                                            <p className="text-slate-600 mt-1 whitespace-pre-wrap">{a.note}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </DrawerSection>
                )}
            </div>
        </Drawer>
    );
}

export default ContactDrawer;
