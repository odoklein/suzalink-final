"use client";

import { useState, useEffect, useRef } from "react";
import { Drawer, DrawerSection, DrawerField, Button, Input, Badge, Select, useToast } from "@/components/ui";
import { ACTION_RESULT_LABELS, type ActionResult } from "@/lib/types";
import {
    Building2,
    Globe,
    MapPin,
    Users,
    Briefcase,
    Tag,
    Edit,
    Save,
    X,
    Copy,
    ExternalLink,
    AlertCircle,
    Clock,
    CheckCircle,
    User,
    Mail,
    Phone,
    Linkedin,
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
}

interface Company {
    id: string;
    name: string;
    industry: string | null;
    country: string | null;
    website: string | null;
    size: string | null;
    status: "INCOMPLETE" | "PARTIAL" | "ACTIONABLE";
    contacts: Contact[];
    _count: {
        contacts: number;
    };
    missionId?: string;
}

interface CompanyDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    company: Company | null;
    onUpdate?: (company: Company) => void;
    onCreate?: (company: Company) => void;
    onContactClick?: (contact: Contact) => void;
    isManager?: boolean;
    listId?: string;
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
// COMPANY DRAWER COMPONENT
// ============================================

export function CompanyDrawer({
    isOpen,
    onClose,
    company,
    onUpdate,
    onCreate,
    onContactClick,
    isManager = false,
    listId,
    isCreating = false,
}: CompanyDrawerProps) {
    const { success, error: showError } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        industry: "",
        country: "",
        website: "",
        size: "",
    });
    const [actions, setActions] = useState<Array<{ id: string; result: string; note: string | null; createdAt: string; campaign?: { name: string } }>>([]);
    const [actionsLoading, setActionsLoading] = useState(false);
    const lastCompanyIdRef = useRef<string | null>(null);
    const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string; mission?: { channel: string } }>>([]);
    const [campaignsLoading, setCampaignsLoading] = useState(false);
    const [resolvedMissionId, setResolvedMissionId] = useState<string | null>(null);
    const [missionIdLoading, setMissionIdLoading] = useState(false);
    const [newActionResult, setNewActionResult] = useState<string>("");
    const [newActionNote, setNewActionNote] = useState("");
    const [newActionCampaignId, setNewActionCampaignId] = useState("");
    const [newActionSaving, setNewActionSaving] = useState(false);

    const effectiveMissionId = company?.missionId ?? resolvedMissionId ?? undefined;

    // Resolve missionId when company has no missionId (e.g. opened from list)
    useEffect(() => {
        if (!company?.id || isCreating || company.missionId) {
            setResolvedMissionId(null);
            return;
        }
        setMissionIdLoading(true);
        fetch(`/api/companies/${company.id}/mission`)
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
    }, [company?.id, company?.missionId, isCreating]);

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

    // Fetch actions history when drawer opens with a company
    useEffect(() => {
        if (!isOpen || isCreating || !company?.id) {
            setActions([]);
            return;
        }
        setActionsLoading(true);
        fetch(`/api/actions?companyId=${company.id}&limit=20`)
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
    }, [isOpen, isCreating, company?.id]);

    // Reset form only when company *id* changes (not on every parent re-render with new object ref)
    useEffect(() => {
        if (isCreating) {
            lastCompanyIdRef.current = null;
            setFormData({
                name: "",
                industry: "",
                country: "",
                website: "",
                size: "",
            });
            setIsEditing(true);
        } else if (company) {
            const isNewCompany = lastCompanyIdRef.current !== company.id;
            lastCompanyIdRef.current = company.id;
            if (isNewCompany) {
                setFormData({
                    name: company.name || "",
                    industry: company.industry || "",
                    country: company.country || "",
                    website: company.website || "",
                    size: company.size || "",
                });
                setIsEditing(false);
            }
        } else {
            lastCompanyIdRef.current = null;
        }
    }, [company?.id, isCreating]);

    // ============================================
    // SAVE HANDLER
    // ============================================

    const handleSave = async () => {
        if (isCreating) {
            // Create new company
            if (!listId || !formData.name.trim()) {
                showError("Erreur", "Le nom de la société est requis");
                return;
            }

            setIsSaving(true);
            try {
                const res = await fetch(`/api/lists/${listId}/companies`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: formData.name,
                        industry: formData.industry || undefined,
                        country: formData.country || undefined,
                        website: formData.website || undefined,
                        size: formData.size || undefined,
                    }),
                });

                const json = await res.json();

                if (json.success) {
                    success("Société créée", `${formData.name} a été créée`);
                    if (onCreate) {
                        onCreate(json.data);
                    }
                    onClose();
                } else {
                    showError("Erreur", json.error || "Impossible de créer la société");
                }
            } catch (err) {
                showError("Erreur", "Impossible de créer la société");
            } finally {
                setIsSaving(false);
            }
        } else {
            // Update existing company (listId only required for create)
            if (!company) return;

            setIsSaving(true);
            try {
                const res = await fetch(`/api/companies/${company.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                });

                const json = await res.json();

                if (json.success) {
                    success("Société mise à jour", `${formData.name} a été mis à jour`);
                    setIsEditing(false);
                    if (onUpdate) {
                        onUpdate({ ...company, ...formData });
                    }
                } else {
                    showError("Erreur", json.error || "Impossible de mettre à jour");
                }
            } catch (err) {
                showError("Erreur", "Impossible de mettre à jour la société");
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
        if (!company || !newActionCampaignId || !newActionResult) {
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
                    companyId: company.id,
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

    if (!isCreating && !company) return null;

    const statusConfig = isCreating ? null : STATUS_CONFIG[company!.status];
    const StatusIcon = statusConfig?.icon;

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={isCreating ? "Nouvelle société" : (isEditing ? "Modifier la société" : company!.name)}
            description={isCreating ? "Ajoutez une nouvelle société à la liste" : (isEditing ? "Modifiez les informations de la société" : undefined)}
            size="lg"
            footer={
                isManager && (
                    <div className="flex items-center justify-end gap-3">
                        {isEditing || isCreating ? (
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
                                    disabled={isSaving || !formData.name.trim()}
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
                {/* Status Badge */}
                {!isEditing && !isCreating && statusConfig && (
                    <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
                        statusConfig.bg,
                        statusConfig.borderColor,
                        "border"
                    )}>
                        <StatusIcon className={cn("w-4 h-4", statusConfig.color)} />
                        <span className={cn("text-sm font-medium", statusConfig.color)}>
                            {statusConfig.label}
                        </span>
                    </div>
                )}

                {/* Company Info */}
                <DrawerSection title="Informations">
                    {(isEditing || isCreating) ? (
                        <div className="space-y-4">
                            <Input
                                label="Nom de la société *"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                icon={<Building2 className="w-4 h-4 text-slate-400" />}
                            />
                            <Input
                                label="Industrie"
                                value={formData.industry}
                                onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                                icon={<Briefcase className="w-4 h-4 text-slate-400" />}
                            />
                            <Input
                                label="Pays"
                                value={formData.country}
                                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                                icon={<MapPin className="w-4 h-4 text-slate-400" />}
                            />
                            <Input
                                label="Site web"
                                value={formData.website}
                                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                                icon={<Globe className="w-4 h-4 text-slate-400" />}
                            />
                            <Input
                                label="Taille"
                                value={formData.size}
                                onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                                placeholder="ex: 50-100, PME, Grande entreprise"
                                icon={<Users className="w-4 h-4 text-slate-400" />}
                            />
                        </div>
                    ) : company ? (
                        <div className="space-y-4">
                            <DrawerField
                                label="Industrie"
                                value={company!.industry}
                                icon={<Briefcase className="w-5 h-5 text-indigo-500" />}
                            />
                            <DrawerField
                                label="Pays"
                                value={company!.country}
                                icon={<MapPin className="w-5 h-5 text-indigo-500" />}
                            />
                            <DrawerField
                                label="Site web"
                                value={
                                    company!.website && (
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={company!.website.startsWith("http") ? company!.website : `https://${company!.website}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:underline truncate max-w-[200px]"
                                            >
                                                {company!.website}
                                            </a>
                                            <button
                                                onClick={() => copyToClipboard(company!.website!, "Site web")}
                                                className="text-slate-400 hover:text-slate-600"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                            <a
                                                href={company!.website.startsWith("http") ? company!.website : `https://${company!.website}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-slate-400 hover:text-slate-600"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    )
                                }
                                icon={<Globe className="w-5 h-5 text-indigo-500" />}
                            />
                            <DrawerField
                                label="Taille"
                                value={company!.size}
                                icon={<Users className="w-5 h-5 text-indigo-500" />}
                            />
                        </div>
                    ) : null}
                </DrawerSection>

                {/* Contacts List */}
                {!isEditing && !isCreating && company && (
                    <DrawerSection title={`Contacts (${company.contacts.length})`}>
                        {company.contacts.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">Aucun contact</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {company!.contacts.map((contact) => {
                                    const contactStatus = STATUS_CONFIG[contact.status];
                                    const ContactStatusIcon = contactStatus.icon;

                                    return (
                                        <button
                                            key={contact.id}
                                            onClick={() => onContactClick?.(contact)}
                                            className="w-full text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-5 h-5 text-emerald-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                            {contact.firstName || ""} {contact.lastName || ""}
                                                            {!contact.firstName && !contact.lastName && (
                                                                <span className="text-slate-400 italic">Sans nom</span>
                                                            )}
                                                        </p>
                                                        <div className={cn(
                                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                                                            contactStatus.bg
                                                        )}>
                                                            <ContactStatusIcon className={cn("w-3 h-3", contactStatus.color)} />
                                                            <span className={contactStatus.color}>{contactStatus.label}</span>
                                                        </div>
                                                    </div>
                                                    {contact.title && (
                                                        <p className="text-sm text-slate-500 truncate">{contact.title}</p>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                                                        {contact.email && (
                                                            <span className="flex items-center gap-1">
                                                                <Mail className="w-3 h-3" />
                                                                {isManager ? contact.email : `${contact.email.split("@")[0][0]}***@${contact.email.split("@")[1]}`}
                                                            </span>
                                                        )}
                                                        {contact.phone && (
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="w-3 h-3" />
                                                                {isManager ? contact.phone : `${contact.phone.substring(0, 3)}***`}
                                                            </span>
                                                        )}
                                                        {contact.linkedin && (
                                                            <span className="flex items-center gap-1">
                                                                <Linkedin className="w-3 h-3" />
                                                                LinkedIn
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </DrawerSection>
                )}

                {/* Ajouter une action / note — always show when in view mode so user can leave a note */}
                {!isEditing && !isCreating && company && (
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
                            <p className="text-sm text-slate-500 py-4">Impossible de charger la mission pour cette société.</p>
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
                {!isEditing && !isCreating && company && (
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

export default CompanyDrawer;
