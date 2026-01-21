"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, Badge, Button, DataTable, useToast, Modal } from "@/components/ui";
import type { Column } from "@/components/ui/DataTable";
import {
    ArrowLeft,
    List as ListIcon,
    Building2,
    Users,
    Mail,
    Phone,
    Linkedin,
    CheckCircle,
    AlertCircle,
    Clock,
    RefreshCw,
    PenLine
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui";

// ============================================
// TYPES
// ============================================

interface ListDetail {
    id: string;
    name: string;
    type: string;
    source: string;
    mission: {
        id: string;
        name: string;
        client: {
            name: string;
        };
    };
    _count: {
        companies: number;
    };
}

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

interface Company {
    id: string;
    name: string;
    industry: string | null;
    country: string | null;
    website: string | null;
    size: string | null;
    status: "INCOMPLETE" | "PARTIAL" | "ACTIONABLE";
    _count: {
        contacts: number;
    };
    contacts: Contact[];
}

const STATUS_CONFIG = {
    INCOMPLETE: { label: "Incomplet", color: "text-red-500", bg: "bg-red-50", icon: AlertCircle },
    PARTIAL: { label: "Partiel", color: "text-amber-500", bg: "bg-amber-50", icon: Clock },
    ACTIONABLE: { label: "Actionnable", color: "text-emerald-500", bg: "bg-emerald-50", icon: CheckCircle },
};

// ============================================
// SDR LIST DETAIL PAGE
// ============================================

export default function SDRListDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { data: session } = useSession();
    const router = useRouter();
    const { success, error: showError } = useToast();

    const [listId, setListId] = useState<string>("");
    const [list, setList] = useState<ListDetail | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<"companies" | "contacts">("contacts"); // Default to contacts for SDR

    // Edit Modal State
    const [editContact, setEditContact] = useState<Contact | null>(null);
    const [editCompany, setEditCompany] = useState<Company | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Editing Form Data
    const [contactForm, setContactForm] = useState<Partial<Contact>>({});
    const [companyForm, setCompanyForm] = useState<Partial<Company>>({});

    // Resolve params
    useEffect(() => {
        params.then((p) => setListId(p.id));
    }, [params]);

    // ============================================
    // FETCH LIST
    // ============================================

    const fetchList = async () => {
        if (!listId) return;

        setIsLoading(true);
        try {
            // Note: Reuse manager API if permissions allow, or existing SDR specific endpoints
            // Assuming permissions valid for READ
            const [listRes, companiesRes] = await Promise.all([
                fetch(`/api/lists/${listId}`),
                fetch(`/api/lists/${listId}/companies`),
            ]);

            const listJson = await listRes.json();
            const companiesJson = await companiesRes.json();

            if (listJson.success) {
                setList(listJson.data);
            } else {
                showError("Erreur", listJson.error || "Liste non trouvée");
                router.push("/sdr/lists"); // Redirect to SDR lists if failing
            }

            if (companiesJson.success) {
                setCompanies(companiesJson.data);
            }
        } catch (err) {
            console.error("Failed to fetch list:", err);
            showError("Erreur", "Impossible de charger la liste");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (listId) {
            fetchList();
        }
    }, [listId]);

    // ============================================
    // EDIT HANDLERS
    // ============================================

    const handleEditContact = (contact: Contact) => {
        setEditContact(contact);
        setContactForm({
            firstName: contact.firstName || "",
            lastName: contact.lastName || "",
            email: contact.email || "",
            phone: contact.phone || "",
            title: contact.title || "",
            linkedin: contact.linkedin || "",
        });
    };

    const handleEditCompany = (company: Company) => {
        setEditCompany(company);
        setCompanyForm({
            name: company.name,
            industry: company.industry || "",
            country: company.country || "",
            website: company.website || "",
        });
    }

    const saveContact = async () => {
        if (!editContact) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/contacts/${editContact.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(contactForm),
            });
            const json = await res.json();
            if (json.success) {
                success("Succès", "Contact mis à jour");
                setEditContact(null);
                fetchList(); // Refresh data
            } else {
                showError("Erreur", json.error);
            }
        } catch (e) {
            showError("Erreur", "Sauvegarde échouée");
        } finally {
            setIsSaving(false);
        }
    };

    const saveCompany = async () => {
        if (!editCompany) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/companies/${editCompany.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(companyForm),
            });
            const json = await res.json();
            if (json.success) {
                success("Succès", "Société mise à jour");
                setEditCompany(null);
                fetchList();
            } else {
                showError("Erreur", json.error);
            }
        } catch (e) {
            showError("Erreur", "Sauvegarde échouée");
        } finally {
            setIsSaving(false);
        }
    }


    // ============================================
    // COLUMNS
    // ============================================

    const companyColumns: Column<Company>[] = [
        {
            key: "name",
            header: "Société",
            sortable: true,
            render: (_, company) => (
                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => handleEditCompany(company)}>
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{company.name}</p>
                            <PenLine className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {company.website && (
                            <span className="text-xs text-slate-500">{company.website}</span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: "industry",
            header: "Industrie",
            sortable: true,
            render: (value) => <span className="text-slate-600">{value || "—"}</span>,
        },
        {
            key: "country",
            header: "Pays",
            sortable: true,
            render: (value) => <span className="text-slate-600">{value || "—"}</span>,
        },
        {
            key: "contacts",
            header: "Contacts",
            render: (_, company) => (
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{company._count.contacts}</span>
                </div>
            ),
        },
    ];

    const allContacts = companies.flatMap((company) =>
        company.contacts.map((contact) => ({
            ...contact,
            companyId: company.id,
            companyName: company.name,
        }))
    );

    const contactColumns: Column<Contact & { companyName: string }>[] = [
        {
            key: "firstName",
            header: "Contact",
            sortable: true,
            render: (_, contact) => (
                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => handleEditContact(contact)}>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                        <Users className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 group-hover:text-emerald-600 transition-colors">
                                {contact.firstName || ""} {contact.lastName || ""}
                            </p>
                            <PenLine className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-slate-500">{contact.title || "—"}</p>
                    </div>
                </div>
            ),
        },
        {
            key: "companyName",
            header: "Société",
            sortable: true,
            render: (value) => <span className="text-slate-700 font-medium">{value}</span>,
        },
        {
            key: "email",
            header: "Email",
            render: (value, contact) => (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleEditContact(contact)}>
                    {value ? (
                        <span className="text-sm text-slate-600">{value}</span>
                    ) : (
                        <span className="text-xs text-slate-400 italic">Ajouter email...</span>
                    )}
                </div>
            )
        },
        {
            key: "phone",
            header: "Téléphone",
            render: (value, contact) => (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleEditContact(contact)}>
                    {value ? (
                        <span className="text-sm text-slate-600">{value}</span>
                    ) : (
                        <span className="text-xs text-slate-400 italic">Ajouter tél...</span>
                    )}
                </div>
            )
        },
    ];

    // ============================================
    // RENDER
    // ============================================

    if (isLoading || !list) {
        return (
            <div className="p-6 space-y-6">
                <div className="animate-pulse h-10 w-48 bg-slate-200 rounded"></div>
                <div className="animate-pulse h-96 w-full bg-slate-200 rounded"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Back button logic can be handled or removed depending on nav structure */}
                    <Link href="/sdr/action">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{list.name}</h1>
                        <p className="text-slate-500">{list.mission.client.name} - {list.mission.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
                    <button
                        onClick={() => setView("contacts")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === "contacts" ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-600 hover:bg-slate-50"
                            }`}
                    >
                        Vue Contacts
                    </button>
                    <button
                        onClick={() => setView("companies")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === "companies" ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-600 hover:bg-slate-50"
                            }`}
                    >
                        Vue Sociétés
                    </button>
                    <Button variant="ghost" size="sm" onClick={fetchList}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <DataTable
                    data={view === 'companies' ? companies : allContacts as any}
                    columns={view === 'companies' ? companyColumns : contactColumns as any}
                    keyField="id"
                    searchable
                    searchPlaceholder={`Rechercher ${view === 'companies' ? 'une société' : 'un contact'}...`}
                    searchFields={view === 'companies' ? ['name', 'industry'] : ['firstName', 'lastName', 'email', 'companyName']}
                    pagination
                    pageSize={20}
                />
            </Card>

            {/* Edit Contact Modal */}
            <Modal
                isOpen={!!editContact}
                onClose={() => setEditContact(null)}
                title="Modifier le contact"
            >
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
                            <Input
                                value={contactForm.firstName || ""}
                                onChange={(e) => setContactForm(prev => ({ ...prev, firstName: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                            <Input
                                value={contactForm.lastName || ""}
                                onChange={(e) => setContactForm(prev => ({ ...prev, lastName: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <Input
                            value={contactForm.email || ""}
                            onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                            <Input
                                value={contactForm.phone || ""}
                                onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Poste (Title)</label>
                            <Input
                                value={contactForm.title || ""}
                                onChange={(e) => setContactForm(prev => ({ ...prev, title: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn URL</label>
                        <Input
                            value={contactForm.linkedin || ""}
                            onChange={(e) => setContactForm(prev => ({ ...prev, linkedin: e.target.value }))}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="ghost" onClick={() => setEditContact(null)}>Annuler</Button>
                    <Button variant="primary" onClick={saveContact} isLoading={isSaving}>Enregistrer</Button>
                </div>
            </Modal>

            {/* Edit Company Modal */}
            <Modal
                isOpen={!!editCompany}
                onClose={() => setEditCompany(null)}
                title="Modifier la société"
            >
                <div className="space-y-4 py-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nom de la société</label>
                        <Input
                            value={companyForm.name || ""}
                            onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Industrie</label>
                            <Input
                                value={companyForm.industry || ""}
                                onChange={(e) => setCompanyForm(prev => ({ ...prev, industry: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Pays</label>
                            <Input
                                value={companyForm.country || ""}
                                onChange={(e) => setCompanyForm(prev => ({ ...prev, country: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Site Web</label>
                        <Input
                            value={companyForm.website || ""}
                            onChange={(e) => setCompanyForm(prev => ({ ...prev, website: e.target.value }))}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="ghost" onClick={() => setEditCompany(null)}>Annuler</Button>
                    <Button variant="primary" onClick={saveCompany} isLoading={isSaving}>Enregistrer</Button>
                </div>
            </Modal>
        </div>
    );
}
