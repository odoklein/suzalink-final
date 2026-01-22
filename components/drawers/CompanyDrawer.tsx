"use client";

import { useState, useEffect } from "react";
import { Drawer, DrawerSection, DrawerField, Button, Input, Badge, useToast } from "@/components/ui";
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

    // Reset form when company changes or when creating
    useEffect(() => {
        if (isCreating) {
            setFormData({
                name: "",
                industry: "",
                country: "",
                website: "",
                size: "",
            });
            setIsEditing(true);
        } else if (company) {
            setFormData({
                name: company.name || "",
                industry: company.industry || "",
                country: company.country || "",
                website: company.website || "",
                size: company.size || "",
            });
            setIsEditing(false);
        }
    }, [company, isCreating]);

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
            // Update existing company
            if (!company || !listId) return;

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
                                    disabled={isSaving || !formData.name.trim()}
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
            </div>
        </Drawer>
    );
}

export default CompanyDrawer;
