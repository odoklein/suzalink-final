"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    Button,
    Select,
    ConfirmModal,
    ContextMenu,
    useContextMenu,
    useToast,
} from "@/components/ui";
import {
    List,
    Building2,
    Users,
    Plus,
    Upload,
    Search,
    MoreVertical,
    Eye,
    Trash2,
    Edit,
    RefreshCw,
    Download,
} from "lucide-react";
import Link from "next/link";

// ============================================
// TYPES
// ============================================

interface ListData {
    id: string;
    name: string;
    type: "SUZALI" | "CLIENT" | "MIXED";
    source?: string;
    createdAt: string;
    mission?: {
        id: string;
        name: string;
    };
    _count: {
        companies: number;
    };
    stats?: {
        companyCount: number;
        contactCount: number;
        completeness: {
            INCOMPLETE: number;
            PARTIAL: number;
            ACTIONABLE: number;
        };
    };
}

const TYPE_STYLES: Record<string, { label: string; color: string }> = {
    SUZALI: { label: "Suzali", color: "bg-indigo-50 text-indigo-600" },
    CLIENT: { label: "Client", color: "bg-amber-50 text-amber-600" },
    MIXED: { label: "Mixte", color: "bg-cyan-50 text-cyan-600" },
};

// ============================================
// LISTING LISTS TAB
// ============================================

export function ListingListsTab() {
    const router = useRouter();
    const { success, error: showError } = useToast();
    const [lists, setLists] = useState<ListData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingList, setDeletingList] = useState<ListData | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { position, contextData, handleContextMenu, close: closeMenu } = useContextMenu();

    // ============================================
    // FETCH LISTS
    // ============================================

    const fetchLists = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/lists");
            const json = await res.json();
            if (json.success) {
                setLists(json.data);
            } else {
                showError("Erreur", json.error || "Impossible de charger les listes");
            }
        } catch (err) {
            console.error("Failed to fetch lists:", err);
            showError("Erreur", "Impossible de charger les listes");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLists();
    }, []);

    // ============================================
    // DELETE LIST
    // ============================================

    const handleDeleteList = async () => {
        if (!deletingList) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/lists/${deletingList.id}`, { method: "DELETE" });
            const json = await res.json();
            if (json.success) {
                success("Liste supprimee", `${deletingList.name} a ete supprimee`);
                fetchLists();
            } else {
                showError("Erreur", json.error || "Impossible de supprimer");
            }
        } catch {
            showError("Erreur", "Impossible de supprimer la liste");
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setDeletingList(null);
        }
    };

    // ============================================
    // CONTEXT MENU
    // ============================================

    const getContextMenuItems = (list: ListData) => [
        {
            label: "Voir les details",
            icon: <Eye className="w-4 h-4" />,
            onClick: () => router.push(`/manager/lists/${list.id}`),
        },
        {
            label: "Modifier",
            icon: <Edit className="w-4 h-4" />,
            onClick: () => router.push(`/manager/lists/${list.id}/edit`),
        },
        {
            label: "Exporter CSV",
            icon: <Download className="w-4 h-4" />,
            onClick: () => window.open(`/api/lists/${list.id}/export`, "_blank"),
        },
        {
            label: "Supprimer",
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => {
                setDeletingList(list);
                setShowDeleteModal(true);
            },
            variant: "danger" as const,
            divider: true,
        },
    ];

    // ============================================
    // FILTER
    // ============================================

    const filteredLists = lists.filter(list => {
        const matchesSearch = !searchQuery ||
            list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            list.mission?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === "all" || list.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const stats = {
        total: lists.length,
        companies: lists.reduce((acc, l) => acc + (l._count?.companies || 0), 0),
        contacts: lists.reduce((acc, l) => acc + (l.stats?.contactCount || 0), 0),
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-5">
            {/* Header with actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-6 text-sm">
                        <span className="text-slate-500">
                            <span className="font-semibold text-slate-900">{stats.total}</span> listes
                        </span>
                        <span className="text-slate-500">
                            <span className="font-semibold text-slate-900">{stats.companies}</span> societes
                        </span>
                        <span className="text-slate-500">
                            <span className="font-semibold text-slate-900">{stats.contacts}</span> contacts
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={fetchLists}>
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                    <Link href="/manager/lists/import">
                        <Button variant="secondary" size="sm" className="gap-2">
                            <Upload className="w-4 h-4" />
                            Importer CSV
                        </Button>
                    </Link>
                    <Link href="/manager/lists/new">
                        <Button variant="primary" size="sm" className="gap-2">
                            <Plus className="w-4 h-4" />
                            Nouvelle liste
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Rechercher une liste..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
                <Select
                    options={[
                        { value: "all", label: "Tous les types" },
                        { value: "SUZALI", label: "Suzali" },
                        { value: "CLIENT", label: "Client" },
                        { value: "MIXED", label: "Mixte" },
                    ]}
                    value={typeFilter}
                    onChange={setTypeFilter}
                    className="w-36"
                />
            </div>

            {/* Lists */}
            {isLoading && lists.length === 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Card key={i} className="p-4">
                            <div className="animate-pulse space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-slate-200 rounded-lg" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-4 bg-slate-200 rounded w-3/4" />
                                        <div className="h-3 bg-slate-200 rounded w-1/2" />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : filteredLists.length === 0 ? (
                <Card className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mx-auto mb-4">
                        <List className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        {searchQuery || typeFilter !== "all" ? "Aucune liste trouvee" : "Aucune liste"}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                        {searchQuery || typeFilter !== "all"
                            ? "Essayez d'autres filtres"
                            : "Importez un CSV ou creez votre premiere liste"}
                    </p>
                    {!searchQuery && typeFilter === "all" && (
                        <div className="flex items-center justify-center gap-3">
                            <Link href="/manager/lists/import">
                                <Button variant="primary" size="sm" className="gap-2">
                                    <Upload className="w-4 h-4" />
                                    Importer CSV
                                </Button>
                            </Link>
                            <Link href="/manager/lists/new">
                                <Button variant="secondary" size="sm" className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Nouvelle liste
                                </Button>
                            </Link>
                        </div>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLists.map((list) => (
                        <Card
                            key={list.id}
                            className="hover:border-slate-300 transition-all cursor-pointer hover:shadow-md p-4"
                            onClick={() => router.push(`/manager/lists/${list.id}`)}
                            onContextMenu={(e) => handleContextMenu(e, list)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                        <List className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-slate-900 text-sm truncate">{list.name}</h3>
                                        <p className="text-xs text-slate-500 truncate">{list.mission?.name || "Sans mission"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${TYPE_STYLES[list.type]?.color || "bg-slate-50 text-slate-500"}`}>
                                        {TYPE_STYLES[list.type]?.label || list.type}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleContextMenu(e, list);
                                        }}
                                        className="p-0.5 hover:bg-slate-100 rounded transition-colors"
                                    >
                                        <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Compact stats */}
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-slate-400" />
                                    {list._count?.companies || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3 text-slate-400" />
                                    {list.stats?.contactCount || 0}
                                </span>
                                <span className="ml-auto text-slate-400">
                                    {list.source || "CSV"}
                                </span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Context Menu */}
            <ContextMenu
                items={contextData ? getContextMenuItems(contextData) : []}
                position={position}
                onClose={closeMenu}
            />

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setDeletingList(null);
                }}
                onConfirm={handleDeleteList}
                title="Supprimer la liste ?"
                message={`Supprimer "${deletingList?.name}" ? Toutes les societes et contacts associes seront supprimes.`}
                confirmText="Supprimer"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
}
