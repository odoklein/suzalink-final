"use client";

import { useState, useEffect } from "react";
import { Drawer, DrawerSection, DrawerField, Button, Input, Select, useToast } from "@/components/ui";
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

    // Reset form when contact changes or when creating
    useEffect(() => {
        if (isCreating) {
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
    }, [contact, isCreating, companies]);

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
            </div>
        </Drawer>
    );
}

export default ContactDrawer;
