"use client";

import { useState, useEffect, useMemo } from "react";
import { Drawer, Button, Badge, Select, useToast } from "@/components/ui";
import { ACTION_RESULT_LABELS, type ActionResult } from "@/lib/types";
import {
    Building2,
    User,
    Phone,
    Mail,
    Globe,
    Linkedin,
    MapPin,
    Users,
    Briefcase,
    Copy,
    ExternalLink,
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2,
    PhoneCall,
    Send,
    MessageSquare,
    History,
    ChevronRight,
    Sparkles,
    Pencil,
    Save,
    X,
    Calendar,
    Plus,
    Trash2,
} from "lucide-react";
import { BookingModal } from "@/components/sdr/BookingModal";
import { ContactDrawer } from "./ContactDrawer";
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
    additionalPhones?: string[] | null;
    additionalEmails?: string[] | null;
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
    phone: string | null;
    status: "INCOMPLETE" | "PARTIAL" | "ACTIONABLE";
    contacts: Contact[];
    _count?: { contacts: number };
}

interface UnifiedActionDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    contactId: string | null;
    companyId: string;
    missionId?: string;
    missionName?: string;
    /** Client booking URL (Calendly etc.) for MEETING_BOOKED - when set, drawer shows "Planifier un RDV" and calendar modal */
    clientBookingUrl?: string;
    onActionRecorded?: () => void;
    /** When user selects "Envoie mail" in the drawer, call this to open the email sending modal (table view) */
    onOpenEmailModal?: () => void;
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
// UNIFIED ACTION DRAWER COMPONENT
// ============================================

export function UnifiedActionDrawer({
    isOpen,
    onClose,
    contactId,
    companyId,
    missionId,
    missionName,
    clientBookingUrl,
    onActionRecorded,
    onOpenEmailModal,
}: UnifiedActionDrawerProps) {
    const { success, error: showError } = useToast();

    // Tab state
    const [activeTab, setActiveTab] = useState<"contact" | "company">("contact");

    // Data states
    const [contact, setContact] = useState<Contact | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(false);

    // Actions state
    const [actions, setActions] = useState<Array<{ id: string; result: string; note: string | null; createdAt: string; campaign?: { name: string } }>>([]);
    const [actionsLoading, setActionsLoading] = useState(false);

    // Campaign state for recording actions
    const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string; mission?: { channel: string } }>>([]);
    const [campaignsLoading, setCampaignsLoading] = useState(false);

    // New action form
    const [newActionResult, setNewActionResult] = useState<string>("");
    const [newActionNote, setNewActionNote] = useState("");
    const [newActionSaving, setNewActionSaving] = useState(false);
    const [newCallbackDateValue, setNewCallbackDateValue] = useState("");
    const [isImprovingNote, setIsImprovingNote] = useState(false);

    const [showBookingModal, setShowBookingModal] = useState(false);
    const [showAddContact, setShowAddContact] = useState(false);

    // Inline editing states
    const [isEditingContact, setIsEditingContact] = useState(false);
    const [isEditingCompany, setIsEditingCompany] = useState(false);
    const [editContactData, setEditContactData] = useState<Partial<Contact>>({});
    const [editCompanyData, setEditCompanyData] = useState<Partial<Company>>({});
    const [savingContact, setSavingContact] = useState(false);
    const [savingCompany, setSavingCompany] = useState(false);

    // Fetch data when drawer opens
    useEffect(() => {
        if (!isOpen || !companyId) {
            setContact(null);
            setCompany(null);
            setActions([]);
            return;
        }

        setLoading(true);

        // Fetch company data
        fetch(`/api/companies/${companyId}`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success && json.data) {
                    setCompany(json.data);
                }
            })
            .catch(() => setCompany(null));

        // Fetch contact data if contactId provided
        if (contactId) {
            fetch(`/api/contacts/${contactId}`)
                .then((res) => res.json())
                .then((json) => {
                    if (json.success && json.data) {
                        setContact(json.data);
                    }
                })
                .catch(() => setContact(null));

            // Set default tab to contact
            setActiveTab("contact");
        } else {
            setContact(null);
            setActiveTab("company");
        }

        setLoading(false);
    }, [isOpen, contactId, companyId]);

    // Fetch actions history
    useEffect(() => {
        if (!isOpen) {
            setActions([]);
            return;
        }

        setActionsLoading(true);
        const queryParam = contactId ? `contactId=${contactId}` : `companyId=${companyId}`;

        fetch(`/api/actions?${queryParam}&limit=10`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success && Array.isArray(json.data)) {
                    setActions(json.data);
                } else {
                    setActions([]);
                }
            })
            .catch(() => setActions([]))
            .finally(() => setActionsLoading(false));
    }, [isOpen, contactId, companyId]);

    // Fetch campaigns for action recording
    useEffect(() => {
        if (!isOpen || !missionId) {
            setCampaigns([]);
            return;
        }

        setCampaignsLoading(true);
        fetch(`/api/campaigns?missionId=${missionId}&isActive=true&limit=50`)
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
    }, [isOpen, missionId]);

    // Get primary phone number
    const primaryPhone = useMemo(() => {
        if (contact?.phone) return { number: contact.phone, label: "Contact" };
        if (company?.phone) return { number: company.phone, label: "Société" };
        return null;
    }, [contact, company]);

    // Get primary email
    const primaryEmail = useMemo(() => {
        if (contact?.email) return contact.email;
        const contactWithEmail = company?.contacts?.find(c => c.email);
        return contactWithEmail?.email || null;
    }, [contact, company]);

    // Copy to clipboard
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        success("Copié", `${label} copié dans le presse-papier`);
    };

    // Improve note with Mistral (orthography + rephrase)
    const handleImproveNote = async () => {
        const trimmed = newActionNote.trim();
        if (!trimmed) return;
        setIsImprovingNote(true);
        try {
            const res = await fetch("/api/ai/mistral/note-improve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: trimmed }),
            });
            const json = await res.json();
            if (json.success && json.data?.improvedText) {
                setNewActionNote(json.data.improvedText);
            } else {
                showError("Erreur", json.error || "Impossible d'améliorer la note");
            }
        } catch {
            showError("Erreur", "Connexion à l'IA impossible");
        } finally {
            setIsImprovingNote(false);
        }
    };

    // Record action
    const handleAddAction = async () => {
        const campaignId = campaigns[0]?.id;
        if (!campaignId) {
            showError("Erreur", "Aucune campagne disponible pour cette mission");
            return;
        }
        if (!newActionResult) {
            showError("Erreur", "Sélectionnez un résultat");
            return;
        }

        const noteRequired = ["INTERESTED", "CALLBACK_REQUESTED"].includes(newActionResult);
        if (noteRequired && !newActionNote.trim()) {
            showError("Erreur", "Une note est requise pour ce résultat");
            return;
        }

        setNewActionSaving(true);
        try {
            const selectedCampaign = campaigns[0];
            const channel = (selectedCampaign?.mission?.channel ?? "CALL") as "CALL" | "EMAIL" | "LINKEDIN";

            const res = await fetch("/api/actions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contactId: contactId || undefined,
                    companyId: contactId ? undefined : companyId,
                    campaignId,
                    channel: newActionResult === "ENVOIE_MAIL" ? "EMAIL" : channel,
                    result: newActionResult,
                    note: newActionNote.trim() || undefined,
                    callbackDate: newActionResult === "CALLBACK_REQUESTED" && newCallbackDateValue
                        ? new Date(newCallbackDateValue).toISOString()
                        : undefined,
                }),
            });

            const json = await res.json();

            if (json.success) {
                success("Action enregistrée", "L'action a été ajoutée à l'historique");
                setNewActionNote("");
                setNewActionResult("");
                setNewCallbackDateValue("");
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
                onActionRecorded?.();
            } else {
                showError("Erreur", json.error || "Impossible d'enregistrer l'action");
            }
        } catch {
            showError("Erreur", "Impossible d'enregistrer l'action");
        } finally {
            setNewActionSaving(false);
        }
    };


    // Handle saving contact
    const handleSaveContact = async () => {
        if (!contactId || !editContactData) return;
        setSavingContact(true);
        try {
            const payload = {
                ...editContactData,
                additionalPhones: (editContactData.additionalPhones ?? []).filter(Boolean),
                additionalEmails: (editContactData.additionalEmails ?? []).filter(Boolean),
            };
            const res = await fetch(`/api/contacts/${contactId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (json.success) {
                setContact({ ...contact!, ...editContactData });
                setIsEditingContact(false);
                success("Succès", "Contact mis à jour");
            } else {
                showError("Erreur", json.error || "Impossible de mettre à jour le contact");
            }
        } catch {
            showError("Erreur", "Une erreur est survenue");
        } finally {
            setSavingContact(false);
        }
    };

    // Handle saving company
    const handleSaveCompany = async () => {
        if (!companyId || !editCompanyData) return;
        setSavingCompany(true);
        try {
            const res = await fetch(`/api/companies/${companyId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editCompanyData),
            });
            const json = await res.json();
            if (json.success) {
                setCompany({ ...company!, ...editCompanyData });
                setIsEditingCompany(false);
                success("Succès", "Société mise à jour");
            } else {
                showError("Erreur", json.error || "Impossible de mettre à jour la société");
            }
        } catch {
            showError("Erreur", "Une erreur est survenue");
        } finally {
            setSavingCompany(false);
        }
    };

    // Generate display name
    const displayName = useMemo(() => {
        if (contact) {
            const name = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
            return name || company?.name || "Sans nom";
        }
        return company?.name || "Sans nom";
    }, [contact, company]);

    if (!isOpen) return null;

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={displayName}
            description={missionName ? `Mission: ${missionName}` : undefined}
            size="lg"
        >
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Quick Actions Bar */}
                    <div className="flex flex-wrap gap-2">
                        {primaryPhone && (
                            <a
                                href={`tel:${primaryPhone.number}`}
                                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:scale-[1.02]"
                            >
                                <PhoneCall className="w-4 h-4" />
                                <span>Appeler</span>
                                {primaryPhone.label === "Société" && (
                                    <span className="text-xs opacity-80">({primaryPhone.label})</span>
                                )}
                            </a>
                        )}
                        {primaryEmail && (
                            <a
                                href={`mailto:${primaryEmail}`}
                                className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all hover:shadow-xl hover:scale-[1.02]"
                            >
                                <Send className="w-4 h-4" />
                                Email
                            </a>
                        )}
                        {(contact?.linkedin || company?.website) && (
                            <a
                                href={contact?.linkedin
                                    ? (contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`)
                                    : (company?.website?.startsWith("http") ? company.website : `https://${company?.website}`)
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-all"
                            >
                                {contact?.linkedin ? <Linkedin className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                {contact?.linkedin ? "LinkedIn" : "Site web"}
                            </a>
                        )}
                    </div>

                    {/* Tab Navigation */}
                    {contact && (
                        <div className="flex rounded-xl bg-slate-100/80 p-1">
                            <button
                                onClick={() => setActiveTab("contact")}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                                    activeTab === "contact"
                                        ? "bg-white text-indigo-600 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                <User className="w-4 h-4" />
                                Contact
                            </button>
                            <button
                                onClick={() => setActiveTab("company")}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                                    activeTab === "company"
                                        ? "bg-white text-indigo-600 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                )}
                            >
                                <Building2 className="w-4 h-4" />
                                Société
                            </button>
                        </div>
                    )}

                    {/* Contact Tab Content */}
                    {activeTab === "contact" && contact && (
                        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/60 p-5 space-y-4">
                            {/* Contact Header */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-xl font-bold text-indigo-600 shadow-sm shrink-0">
                                        {(contact.firstName?.[0] || contact.lastName?.[0] || "?").toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {isEditingContact ? (
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={editContactData.firstName || ""}
                                                        onChange={(e) => setEditContactData({ ...editContactData, firstName: e.target.value })}
                                                        placeholder="Prénom"
                                                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={editContactData.lastName || ""}
                                                        onChange={(e) => setEditContactData({ ...editContactData, lastName: e.target.value })}
                                                        placeholder="Nom"
                                                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={editContactData.title || ""}
                                                    onChange={(e) => setEditContactData({ ...editContactData, title: e.target.value })}
                                                    placeholder="Titre / Poste"
                                                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <h3 className="text-lg font-semibold text-slate-900">
                                                    {contact.firstName || ""} {contact.lastName || ""}
                                                    {!contact.firstName && !contact.lastName && (
                                                        <span className="text-slate-400 italic">Sans nom</span>
                                                    )}
                                                </h3>
                                                {contact.title && (
                                                    <p className="text-sm text-slate-500 mt-0.5">{contact.title}</p>
                                                )}
                                                <div className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-2",
                                                    STATUS_CONFIG[contact.status].bg,
                                                    STATUS_CONFIG[contact.status].color
                                                )}>
                                                    {(() => {
                                                        const StatusIcon = STATUS_CONFIG[contact.status].icon;
                                                        return <StatusIcon className="w-3 h-3" />;
                                                    })()}
                                                    {STATUS_CONFIG[contact.status].label}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {isEditingContact ? (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setIsEditingContact(false)}
                                                disabled={savingContact}
                                                className="h-8 w-8 p-0 text-slate-500"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={handleSaveContact}
                                                isLoading={savingContact}
                                                className="h-8 w-8 p-0 bg-indigo-600 hover:bg-indigo-700"
                                            >
                                                <Save className="w-4 h-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                const extraPhones = contact.additionalPhones && Array.isArray(contact.additionalPhones) ? contact.additionalPhones : [];
                                                const extraEmails = contact.additionalEmails && Array.isArray(contact.additionalEmails) ? contact.additionalEmails : [];
                                                setEditContactData({
                                                    firstName: contact.firstName,
                                                    lastName: contact.lastName,
                                                    title: contact.title,
                                                    email: contact.email,
                                                    phone: contact.phone,
                                                    additionalPhones: extraPhones,
                                                    additionalEmails: extraEmails,
                                                    linkedin: contact.linkedin
                                                });
                                                setIsEditingContact(true);
                                            }}
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Contact Details */}
                            <div className="grid gap-3 pt-2">
                                {(contact.phone || isEditingContact) && (
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                            <Phone className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-400 uppercase tracking-wider">Téléphone</p>
                                            {isEditingContact ? (
                                                <input
                                                    type="text"
                                                    value={editContactData.phone || ""}
                                                    onChange={(e) => setEditContactData({ ...editContactData, phone: e.target.value })}
                                                    placeholder="Numéro de téléphone"
                                                    className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded-md"
                                                />
                                            ) : (
                                                <a href={`tel:${contact.phone}`} className="text-sm font-medium text-emerald-600 hover:underline">
                                                    {contact.phone}
                                                </a>
                                            )}
                                        </div>
                                        {!isEditingContact && contact.phone && (
                                            <button
                                                onClick={() => copyToClipboard(contact.phone!, "Téléphone")}
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {(contact.email || isEditingContact) && (
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                            <Mail className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-400 uppercase tracking-wider">Email</p>
                                            {isEditingContact ? (
                                                <input
                                                    type="email"
                                                    value={editContactData.email || ""}
                                                    onChange={(e) => setEditContactData({ ...editContactData, email: e.target.value })}
                                                    placeholder="Adresse email"
                                                    className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded-md"
                                                />
                                            ) : (
                                                <a href={`mailto:${contact.email}`} className="text-sm font-medium text-indigo-600 hover:underline truncate block">
                                                    {contact.email}
                                                </a>
                                            )}
                                        </div>
                                        {!isEditingContact && contact.email && (
                                            <button
                                                onClick={() => copyToClipboard(contact.email!, "Email")}
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Additional phone numbers */}
                                {(isEditingContact ? (editContactData.additionalPhones?.length ?? 0) > 0 : (contact.additionalPhones && Array.isArray(contact.additionalPhones) && contact.additionalPhones.filter(Boolean).length > 0)) && (
                                    <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-2">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                            Autres numéros
                                        </p>
                                        {isEditingContact ? (
                                            <>
                                                {(editContactData.additionalPhones ?? []).map((num, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={num}
                                                            onChange={(e) => {
                                                                const next = [...(editContactData.additionalPhones ?? [])];
                                                                next[idx] = e.target.value;
                                                                setEditContactData({ ...editContactData, additionalPhones: next });
                                                            }}
                                                            placeholder="Numéro"
                                                            className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded-md"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditContactData({
                                                                ...editContactData,
                                                                additionalPhones: (editContactData.additionalPhones ?? []).filter((_, i) => i !== idx),
                                                            })}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <Button type="button" variant="outline" size="sm" onClick={() => setEditContactData({
                                                    ...editContactData,
                                                    additionalPhones: [...(editContactData.additionalPhones ?? []), ""],
                                                })} className="gap-2">
                                                    <Plus className="w-4 h-4" />
                                                    Ajouter un numéro
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {(contact.additionalPhones && Array.isArray(contact.additionalPhones) ? contact.additionalPhones.filter(Boolean) : []).map((num, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-sm">
                                                        <a href={`tel:${num}`} className="text-emerald-700 hover:underline font-medium">{num}</a>
                                                        <button onClick={() => copyToClipboard(num, "Numéro")} className="p-1 text-emerald-500 hover:bg-emerald-100 rounded-lg">
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {isEditingContact && (editContactData.additionalPhones?.length ?? 0) === 0 && (
                                    <div className="p-3 bg-white rounded-xl border border-slate-100">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Autres numéros</p>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setEditContactData({
                                            ...editContactData,
                                            additionalPhones: [...(editContactData.additionalPhones ?? []), ""],
                                        })} className="gap-2">
                                            <Plus className="w-4 h-4" />
                                            Ajouter un numéro
                                        </Button>
                                    </div>
                                )}

                                {/* Additional emails */}
                                {(isEditingContact ? (editContactData.additionalEmails?.length ?? 0) > 0 : (contact.additionalEmails && Array.isArray(contact.additionalEmails) && contact.additionalEmails.filter(Boolean).length > 0)) && (
                                    <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-2">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5 text-indigo-500" />
                                            Autres emails
                                        </p>
                                        {isEditingContact ? (
                                            <>
                                                {(editContactData.additionalEmails ?? []).map((em, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <input
                                                            type="email"
                                                            value={em}
                                                            onChange={(e) => {
                                                                const next = [...(editContactData.additionalEmails ?? [])];
                                                                next[idx] = e.target.value;
                                                                setEditContactData({ ...editContactData, additionalEmails: next });
                                                            }}
                                                            placeholder="Email"
                                                            className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded-md"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditContactData({
                                                                ...editContactData,
                                                                additionalEmails: (editContactData.additionalEmails ?? []).filter((_, i) => i !== idx),
                                                            })}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <Button type="button" variant="outline" size="sm" onClick={() => setEditContactData({
                                                    ...editContactData,
                                                    additionalEmails: [...(editContactData.additionalEmails ?? []), ""],
                                                })} className="gap-2">
                                                    <Plus className="w-4 h-4" />
                                                    Ajouter un email
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {(contact.additionalEmails && Array.isArray(contact.additionalEmails) ? contact.additionalEmails.filter(Boolean) : []).map((em, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-sm">
                                                        <a href={`mailto:${em}`} className="text-indigo-700 hover:underline truncate max-w-[160px]">{em}</a>
                                                        <button onClick={() => copyToClipboard(em, "Email")} className="p-1 text-indigo-500 hover:bg-indigo-100 rounded-lg shrink-0">
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {isEditingContact && (editContactData.additionalEmails?.length ?? 0) === 0 && (
                                    <div className="p-3 bg-white rounded-xl border border-slate-100">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Autres emails</p>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setEditContactData({
                                            ...editContactData,
                                            additionalEmails: [...(editContactData.additionalEmails ?? []), ""],
                                        })} className="gap-2">
                                            <Plus className="w-4 h-4" />
                                            Ajouter un email
                                        </Button>
                                    </div>
                                )}

                                {(contact.linkedin || isEditingContact) && (
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                            <Linkedin className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-400 uppercase tracking-wider">LinkedIn</p>
                                            {isEditingContact ? (
                                                <input
                                                    type="text"
                                                    value={editContactData.linkedin || ""}
                                                    onChange={(e) => setEditContactData({ ...editContactData, linkedin: e.target.value })}
                                                    placeholder="URL LinkedIn"
                                                    className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded-md"
                                                />
                                            ) : (
                                                <a
                                                    href={contact.linkedin!.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-medium text-blue-600 hover:underline truncate block"
                                                >
                                                    Voir le profil
                                                </a>
                                            )}
                                        </div>
                                        {!isEditingContact && contact.linkedin && (
                                            <a
                                                href={contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                )}

                                {!isEditingContact && !contact.phone && !contact.email && !contact.linkedin &&
                                    !(contact.additionalPhones && contact.additionalPhones.filter(Boolean).length > 0) &&
                                    !(contact.additionalEmails && contact.additionalEmails.filter(Boolean).length > 0) && (
                                    <div className="text-center py-6 text-slate-400">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Aucune information de contact</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Company Tab Content */}
                    {(activeTab === "company" || !contact) && company && (
                        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/60 p-5 space-y-4">
                            {/* When no contact (company-only row): allow adding a contact */}
                            {!contact && (
                                <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                                            <User className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">Aucun contact pour cette société</p>
                                            <p className="text-sm text-slate-500">Ajoutez un contact pour enregistrer des actions et suivre les échanges.</p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={() => setShowAddContact(true)}
                                        className="gap-2 shrink-0"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Ajouter un contact
                                    </Button>
                                </div>
                            )}

                            {/* Company Header */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center shadow-sm shrink-0">
                                        <Building2 className="w-7 h-7 text-violet-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {isEditingCompany ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={editCompanyData.name || ""}
                                                    onChange={(e) => setEditCompanyData({ ...editCompanyData, name: e.target.value })}
                                                    placeholder="Nom de la société"
                                                    className="w-full px-2 py-1 text-sm font-semibold border border-slate-300 rounded-md"
                                                />
                                                <input
                                                    type="text"
                                                    value={editCompanyData.industry || ""}
                                                    onChange={(e) => setEditCompanyData({ ...editCompanyData, industry: e.target.value })}
                                                    placeholder="Secteur d'activité"
                                                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <h3 className="text-lg font-semibold text-slate-900">{company.name}</h3>
                                                {company.industry && (
                                                    <p className="text-sm text-slate-500 mt-0.5">{company.industry}</p>
                                                )}
                                                <div className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-2",
                                                    STATUS_CONFIG[company.status].bg,
                                                    STATUS_CONFIG[company.status].color
                                                )}>
                                                    {(() => {
                                                        const StatusIcon = STATUS_CONFIG[company.status].icon;
                                                        return <StatusIcon className="w-3 h-3" />;
                                                    })()}
                                                    {STATUS_CONFIG[company.status].label}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {isEditingCompany ? (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setIsEditingCompany(false)}
                                                disabled={savingCompany}
                                                className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={handleSaveCompany}
                                                isLoading={savingCompany}
                                                className="h-8 w-8 p-0 bg-violet-600 hover:bg-violet-700"
                                            >
                                                <Save className="w-4 h-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                setEditCompanyData({
                                                    name: company.name,
                                                    industry: company.industry,
                                                    country: company.country,
                                                    website: company.website,
                                                    size: company.size,
                                                    phone: company.phone
                                                });
                                                setIsEditingCompany(true);
                                            }}
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Company Details */}
                            <div className="grid gap-3 pt-2">
                                {(company.phone || isEditingCompany) && (
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                            <Phone className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-400 uppercase tracking-wider">Téléphone</p>
                                            {isEditingCompany ? (
                                                <input
                                                    type="text"
                                                    value={editCompanyData.phone || ""}
                                                    onChange={(e) => setEditCompanyData({ ...editCompanyData, phone: e.target.value })}
                                                    placeholder="Numéro de téléphone"
                                                    className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded-md"
                                                />
                                            ) : (
                                                <a href={`tel:${company.phone}`} className="text-sm font-medium text-emerald-600 hover:underline">
                                                    {company.phone}
                                                </a>
                                            )}
                                        </div>
                                        {!isEditingCompany && company.phone && (
                                            <button
                                                onClick={() => copyToClipboard(company.phone!, "Téléphone")}
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {(company.website || isEditingCompany) && (
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                            <Globe className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-400 uppercase tracking-wider">Site web</p>
                                            {isEditingCompany ? (
                                                <input
                                                    type="text"
                                                    value={editCompanyData.website || ""}
                                                    onChange={(e) => setEditCompanyData({ ...editCompanyData, website: e.target.value })}
                                                    placeholder="Site web (ex: exemple.com)"
                                                    className="w-full mt-1 px-2 py-1 text-sm border border-slate-300 rounded-md"
                                                />
                                            ) : (
                                                <a
                                                    href={company.website!.startsWith("http") ? company.website : `https://${company.website}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-medium text-indigo-600 hover:underline truncate block"
                                                >
                                                    {company.website}
                                                </a>
                                            )}
                                        </div>
                                        {!isEditingCompany && company.website && (
                                            <a
                                                href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-100">
                                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                        <div className="w-full">
                                            <p className="text-xs text-slate-400">Pays</p>
                                            {isEditingCompany ? (
                                                <input
                                                    type="text"
                                                    value={editCompanyData.country || ""}
                                                    onChange={(e) => setEditCompanyData({ ...editCompanyData, country: e.target.value })}
                                                    placeholder="Pays"
                                                    className="w-full mt-1 px-2 py-0.5 text-sm border border-slate-300 rounded-md"
                                                />
                                            ) : (
                                                <p className="text-sm font-medium text-slate-700">{company.country || "-"}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-100">
                                        <Users className="w-4 h-4 text-slate-400 shrink-0" />
                                        <div className="w-full">
                                            <p className="text-xs text-slate-400">Taille</p>
                                            {isEditingCompany ? (
                                                <input
                                                    type="text"
                                                    value={editCompanyData.size || ""}
                                                    onChange={(e) => setEditCompanyData({ ...editCompanyData, size: e.target.value })}
                                                    placeholder="Taille d'effectif"
                                                    className="w-full mt-1 px-2 py-0.5 text-sm border border-slate-300 rounded-md"
                                                />
                                            ) : (
                                                <p className="text-sm font-medium text-slate-700">{company.size || "-"}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Other Contacts in Company */}
                                {company.contacts && company.contacts.length > 0 && (
                                    <div className="pt-2">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5" />
                                            Autres contacts ({company.contacts.length})
                                        </p>
                                        <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                            {company.contacts.slice(0, 5).map((c) => (
                                                <div
                                                    key={c.id}
                                                    className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-100"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                                                        {(c.firstName?.[0] || c.lastName?.[0] || "?").toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-700 truncate">
                                                            {c.firstName || ""} {c.lastName || ""}
                                                        </p>
                                                        {c.title && (
                                                            <p className="text-xs text-slate-400 truncate">{c.title}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {c.phone && (
                                                            <a href={`tel:${c.phone}`} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg">
                                                                <Phone className="w-3.5 h-3.5" />
                                                            </a>
                                                        )}
                                                        {c.email && (
                                                            <a href={`mailto:${c.email}`} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg">
                                                                <Mail className="w-3.5 h-3.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions Section */}
                    <div className="bg-gradient-to-br from-indigo-50/50 to-white rounded-2xl border border-indigo-100/60 p-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4 text-indigo-600" />
                            </div>
                            <h4 className="text-sm font-semibold text-slate-900">Enregistrer une action</h4>
                        </div>

                        {campaignsLoading ? (
                            <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Chargement...
                            </div>
                        ) : campaigns.length === 0 ? (
                            <p className="text-sm text-slate-500 py-4">Aucune campagne disponible pour cette mission.</p>
                        ) : (
                            <div className="space-y-4">
                                {/* Result Select */}
                                <Select
                                    placeholder="Sélectionner un résultat..."
                                    options={Object.entries(ACTION_RESULT_LABELS).map(([value, label]) => ({ value, label }))}
                                    value={newActionResult}
                                    onChange={(value) => {
                                        setNewActionResult(value);
                                        if (value === "ENVOIE_MAIL") {
                                            onOpenEmailModal?.();
                                        }
                                    }}
                                />

                                {/* Callback Date */}
                                {newActionResult === "CALLBACK_REQUESTED" && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock className="w-4 h-4 text-amber-600" />
                                            <label className="text-sm font-medium text-slate-900">Date de rappel</label>
                                        </div>
                                        <input
                                            type="datetime-local"
                                            value={newCallbackDateValue}
                                            onChange={(e) => setNewCallbackDateValue(e.target.value)}
                                            min={new Date().toISOString().slice(0, 16)}
                                            className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-300"
                                        />
                                    </div>
                                )}

                                {/* Note */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Note
                                        {["INTERESTED", "CALLBACK_REQUESTED"].includes(newActionResult) && (
                                            <span className="text-red-500 ml-1">*</span>
                                        )}
                                    </label>
                                    <textarea
                                        value={newActionNote}
                                        onChange={(e) => setNewActionNote(e.target.value)}
                                        placeholder="Ajouter une note..."
                                        rows={3}
                                        maxLength={500}
                                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                    />
                                    <div className="flex items-center justify-between mt-1 gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleImproveNote}
                                            disabled={!newActionNote.trim() || isImprovingNote}
                                            className="gap-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200/60 h-7 text-xs"
                                        >
                                            {isImprovingNote ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-3 h-3" />
                                            )}
                                            {isImprovingNote ? "En cours..." : "Améliorer avec l'IA"}
                                        </Button>
                                        <p className="text-xs text-slate-400">{newActionNote.length}/500</p>
                                    </div>
                                </div>

                                {/* MEETING_BOOKED: show calendar button when client has booking URL */}
                                {newActionResult === "MEETING_BOOKED" && clientBookingUrl && contactId && contact && (
                                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 space-y-2">
                                        <p className="text-sm text-slate-700">
                                            Ouvrez le calendrier du client pour planifier un rendez-vous. Le RDV sera enregistré automatiquement.
                                        </p>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setShowBookingModal(true)}
                                            className="gap-2 w-full"
                                        >
                                            <Calendar className="w-4 h-4" />
                                            Planifier un RDV
                                        </Button>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={handleAddAction}
                                    disabled={
                                        newActionSaving ||
                                        !newActionResult ||
                                        (["INTERESTED", "CALLBACK_REQUESTED"].includes(newActionResult) && !newActionNote.trim())
                                    }
                                    isLoading={newActionSaving}
                                    className="w-full gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Enregistrer l'action
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* History Section */}
                    <div className="bg-slate-50/50 rounded-2xl border border-slate-200/60 p-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                <History className="w-4 h-4 text-slate-600" />
                            </div>
                            <h4 className="text-sm font-semibold text-slate-900">Historique des actions</h4>
                            {actions.length > 0 && (
                                <Badge className="ml-auto bg-slate-200 text-slate-600">{actions.length}</Badge>
                            )}
                        </div>

                        {actionsLoading ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                            </div>
                        ) : actions.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Aucune action enregistrée</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[250px] overflow-y-auto">
                                {actions.map((a) => (
                                    <div
                                        key={a.id}
                                        className="p-3 rounded-xl bg-white border border-slate-100 text-sm"
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="font-medium text-slate-700">
                                                {ACTION_RESULT_LABELS[a.result as keyof typeof ACTION_RESULT_LABELS] ?? a.result}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {new Date(a.createdAt).toLocaleDateString("fr-FR", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                        {a.campaign?.name && (
                                            <p className="text-xs text-slate-500 mb-1">{a.campaign.name}</p>
                                        )}
                                        {a.note && (
                                            <p className="text-slate-600 mt-1 whitespace-pre-wrap text-sm">{a.note}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add contact (when drawer opened with company only) */}
            {company && (
                <ContactDrawer
                    isOpen={showAddContact}
                    onClose={() => setShowAddContact(false)}
                    contact={null}
                    isCreating={true}
                    companies={[{ id: company.id, name: company.name }]}
                    isManager={true}
                    onCreate={async (newContact) => {
                        setShowAddContact(false);
                        setContact(newContact as Contact);
                        setActiveTab("contact");
                        onActionRecorded?.();
                        try {
                            const res = await fetch(`/api/companies/${companyId}`);
                            const json = await res.json();
                            if (json.success && json.data) {
                                setCompany(json.data);
                            }
                        } catch {
                            // keep current company state
                        }
                    }}
                />
            )}

            {/* Booking modal (MEETING_BOOKED) */}
            {contactId && contact && clientBookingUrl && (
                <BookingModal
                    isOpen={showBookingModal}
                    onClose={() => setShowBookingModal(false)}
                    bookingUrl={clientBookingUrl}
                    contactId={contactId}
                    contactName={`${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Contact"}
                    onBookingSuccess={() => {
                        setShowBookingModal(false);
                        setNewActionResult("");
                        setNewActionNote("");
                        onActionRecorded?.();
                        setActionsLoading(true);
                        fetch(`/api/actions?contactId=${contactId}&limit=10`)
                            .then((res) => res.json())
                            .then((json) => {
                                if (json.success && Array.isArray(json.data)) {
                                    setActions(json.data);
                                }
                            })
                            .catch(() => {})
                            .finally(() => setActionsLoading(false));
                    }}
                />
            )}
        </Drawer>
    );
}

export default UnifiedActionDrawer;
