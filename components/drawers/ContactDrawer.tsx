"use client";

import { useState, useEffect } from "react";
import { Drawer, DrawerSection, DrawerField, Button, Input, useToast } from "@/components/ui";
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
    isManager?: boolean;
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
    isManager = false,
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

    // Reset form when contact changes
    useEffect(() => {
        if (contact) {
            setFormData({
                firstName: contact.firstName || "",
                lastName: contact.lastName || "",
                email: contact.email || "",
                phone: contact.phone || "",
                title: contact.title || "",
                linkedin: contact.linkedin || "",
            });
            setIsEditing(false);
        }
    }, [contact]);

    // ============================================
    // SAVE HANDLER
    // ============================================

    const handleSave = async () => {
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
    };

    // ============================================
    // COPY TO CLIPBOARD
    // ============================================

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        success("Copié", `${label} copié dans le presse-papier`);
    };

    if (!contact) return null;

    const statusConfig = STATUS_CONFIG[contact.status];
    const StatusIcon = statusConfig.icon;
    const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Sans nom";

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? "Modifier le contact" : fullName}
            description={isEditing ? "Modifiez les informations du contact" : contact.companyName}
            size="lg"
            footer={
                isManager && (
                    <div className="flex items-center justify-end gap-3">
                        {isEditing ? (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setIsEditing(false);
                                    }}
                                    disabled={isSaving}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Annuler
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isSaving ? "Enregistrement..." : "Enregistrer"}
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
                {!isEditing && (
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-2xl font-bold text-emerald-600">
                            {(contact.firstName?.[0] || contact.lastName?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
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
                            {contact.title && (
                                <p className="text-sm text-slate-500 mt-1">{contact.title}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                {!isEditing && (contact.email || contact.phone) && (
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
                    {isEditing ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Prénom"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                />
                                <Input
                                    label="Nom"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                />
                            </div>
                            <Input
                                label="Fonction"
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
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                icon={<Phone className="w-4 h-4 text-slate-400" />}
                            />
                            <Input
                                label="LinkedIn"
                                value={formData.linkedin}
                                onChange={(e) => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
                                icon={<Linkedin className="w-4 h-4 text-slate-400" />}
                                placeholder="https://linkedin.com/in/..."
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {contact.companyName && (
                                <DrawerField
                                    label="Société"
                                    value={contact.companyName}
                                    icon={<Building2 className="w-5 h-5 text-indigo-500" />}
                                />
                            )}
                            <DrawerField
                                label="Fonction"
                                value={contact.title}
                                icon={<Briefcase className="w-5 h-5 text-indigo-500" />}
                            />
                            <DrawerField
                                label="Email"
                                value={
                                    contact.email && (
                                        <div className="flex items-center gap-2">
                                            {isManager ? (
                                                <a
                                                    href={`mailto:${contact.email}`}
                                                    className="text-indigo-600 hover:underline"
                                                >
                                                    {contact.email}
                                                </a>
                                            ) : (
                                                <span className="font-mono text-sm text-slate-500">
                                                    {contact.email.split("@")[0][0]}***@{contact.email.split("@")[1]}
                                                </span>
                                            )}
                                            {isManager && (
                                                <button
                                                    onClick={() => copyToClipboard(contact.email!, "Email")}
                                                    className="text-slate-400 hover:text-slate-600"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                            )}
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
                                            {isManager ? (
                                                <a
                                                    href={`tel:${contact.phone}`}
                                                    className="text-slate-900"
                                                >
                                                    {contact.phone}
                                                </a>
                                            ) : (
                                                <span className="font-mono text-sm text-slate-500">
                                                    {contact.phone.substring(0, 3)}*******
                                                </span>
                                            )}
                                            {isManager && (
                                                <button
                                                    onClick={() => copyToClipboard(contact.phone!, "Téléphone")}
                                                    className="text-slate-400 hover:text-slate-600"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                            )}
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
                                            {isManager ? (
                                                <>
                                                    <a
                                                        href={contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-600 hover:underline"
                                                    >
                                                        Voir le profil
                                                    </a>
                                                    <a
                                                        href={contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-slate-400 hover:text-slate-600"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </>
                                            ) : (
                                                <span className="text-slate-500 text-sm">Profil masqué</span>
                                            )}
                                        </div>
                                    )
                                }
                                icon={<Linkedin className="w-5 h-5 text-indigo-500" />}
                            />
                        </div>
                    )}
                </DrawerSection>
            </div>
        </Drawer>
    );
}

export default ContactDrawer;
