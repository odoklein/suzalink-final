"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
    Plus,
    FolderKanban,
    Users,
    CheckSquare,
    Search,
    Loader2,
    Sparkles,
    ArrowRight,
    X,
    RefreshCw,
} from "lucide-react";

interface Project {
    id: string;
    name: string;
    description: string | null;
    status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
    owner: { id: string; name: string; email: string };
    client: { id: string; name: string } | null;
    members: Array<{ id: string; userId: string; role: string; user: { id: string; name: string; email: string } }>;
    _count: { tasks: number };
    createdAt: string;
    updatedAt: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; gradient: string }> = {
    ACTIVE: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Actif", gradient: "from-emerald-400 to-emerald-500" },
    COMPLETED: { bg: "bg-blue-50", text: "text-blue-700", label: "Terminé", gradient: "from-blue-400 to-blue-500" },
    ARCHIVED: { bg: "bg-gray-100", text: "text-gray-600", label: "Archivé", gradient: "from-gray-400 to-gray-500" },
};

export default function ManagerProjectsPage() {
    const { data: session } = useSession();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showNewModal, setShowNewModal] = useState(false);
    const [newProject, setNewProject] = useState({ name: "", description: "" });
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/projects");
            const json = await res.json();
            if (json.success) {
                setProjects(json.data);
            }
        } catch (error) {
            console.error("Failed to load projects:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateProject = async () => {
        if (!newProject.name.trim()) return;

        setIsCreating(true);
        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newProject),
            });
            const json = await res.json();
            if (json.success) {
                setProjects([json.data, ...projects]);
                setShowNewModal(false);
                setNewProject({ name: "", description: "" });
            }
        } catch (error) {
            console.error("Failed to create project:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const filteredProjects = projects.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        total: projects.length,
        active: projects.filter((p) => p.status === "ACTIVE").length,
        completed: projects.filter((p) => p.status === "COMPLETED").length,
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm text-slate-500">Chargement des projets...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Premium Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Projets</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Gérez vos projets et suivez leur avancement
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadProjects}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="mgr-btn-primary flex items-center gap-2 h-10 px-5 text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau projet
                    </button>
                </div>
            </div>

            {/* Premium Stats */}
            <div className="grid grid-cols-3 gap-5">
                <div className="mgr-stat-card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <FolderKanban className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                            <p className="text-sm text-slate-500">Total projets</p>
                        </div>
                    </div>
                </div>
                <div className="mgr-stat-card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
                            <p className="text-sm text-slate-500">Actifs</p>
                        </div>
                    </div>
                </div>
                <div className="mgr-stat-card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <CheckSquare className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
                            <p className="text-sm text-slate-500">Terminés</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Search */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Rechercher un projet..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="mgr-search-input w-full h-11 pl-12 pr-10 text-sm text-slate-900"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                        <FolderKanban className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {search ? "Aucun projet trouvé" : "Aucun projet"}
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">
                        {search ? "Essayez une autre recherche" : "Créez votre premier projet pour commencer"}
                    </p>
                    {!search && (
                        <button
                            onClick={() => setShowNewModal(true)}
                            className="mgr-btn-primary inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Créer un projet
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredProjects.map((project, index) => {
                        const statusStyle = STATUS_STYLES[project.status];
                        return (
                            <Link
                                key={project.id}
                                href={`/manager/projects/${project.id}`}
                                className="mgr-client-card group block"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <FolderKanban className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${statusStyle.bg} ${statusStyle.text}`}>
                                                {statusStyle.label}
                                            </span>
                                            <ArrowRight className="w-5 h-5 text-slate-300 -rotate-45 group-hover:rotate-0 group-hover:text-indigo-500 transition-all duration-300" />
                                        </div>
                                    </div>

                                    <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                                        {project.name}
                                    </h3>
                                    {project.description && (
                                        <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                                            {project.description}
                                        </p>
                                    )}
                                </div>

                                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                            <CheckSquare className="w-3.5 h-3.5" />
                                            {project._count?.tasks || 0} tâches
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5" />
                                            {project.members.length}
                                        </span>
                                    </div>
                                    {project.client && (
                                        <span className="text-xs text-slate-400 font-medium">{project.client.name}</span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Premium Create Modal */}
            {showNewModal && (
                <div className="fixed inset-0 dev-modal-overlay z-50 flex items-center justify-center p-4">
                    <div className="dev-modal w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Nouveau projet</h2>
                                <p className="text-sm text-slate-500">Créez un nouveau projet</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Nom du projet *
                                </label>
                                <input
                                    type="text"
                                    value={newProject.name}
                                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    placeholder="Ex: Refonte landing page"
                                    className="dev-input"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={newProject.description}
                                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                    placeholder="Description du projet..."
                                    rows={3}
                                    className="dev-input resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                            <button
                                onClick={() => setShowNewModal(false)}
                                className="h-10 px-5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleCreateProject}
                                disabled={!newProject.name.trim() || isCreating}
                                className="mgr-btn-primary h-10 px-5 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Création...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Créer le projet
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
