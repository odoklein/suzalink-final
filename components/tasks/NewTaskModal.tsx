"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    dueDate: string | null;
    project: { id: string; name: string };
    assignee: { id: string; name: string; email: string } | null;
    createdBy: { id: string; name: string };
    _count: { comments: number };
    createdAt: string;
}

interface NewTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (task: Task) => void;
    defaultProjectId?: string;
    lockProject?: boolean;
}

export function NewTaskModal({
    isOpen,
    onClose,
    onSuccess,
    defaultProjectId = "",
    lockProject = false,
}: NewTaskModalProps) {
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        projectId: defaultProjectId,
        priority: "MEDIUM",
        dueDate: "",
        tags: [] as string[],
    });

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({ ...prev, projectId: defaultProjectId || prev.projectId }));

            // Load projects for selection if not locked or if we need the name
            fetch("/api/projects")
                .then((res) => res.json())
                .then((json) => {
                    if (json.success) setProjects(json.data);
                })
                .catch(console.error);
        }
    }, [isOpen, defaultProjectId]);

    const handleSubmit = async () => {
        if (!formData.title || !formData.projectId) return;

        setIsLoading(true);
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const json = await res.json();
            if (json.success) {
                onSuccess(json.data);
                // Reset form
                setFormData({
                    title: "",
                    description: "",
                    projectId: defaultProjectId || "",
                    priority: "MEDIUM",
                    dueDate: "",
                    tags: [],
                });
            }
        } catch (error) {
            console.error("Failed to create task:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Nouvelle tâche</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Titre *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-violet-500"
                            placeholder="Titre de la tâche"
                            autoFocus
                        />
                    </div>

                    {!lockProject && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Projet *
                            </label>
                            <select
                                value={formData.projectId}
                                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-violet-500 bg-white"
                            >
                                <option value="">Sélectionner un projet</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Priorité
                        </label>
                        <div className="flex gap-2">
                            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setFormData({ ...formData, priority: p })}
                                    className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${formData.priority === p
                                        ? "bg-violet-50 border-violet-200 text-violet-700"
                                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Échéance
                        </label>
                        <input
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-violet-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-violet-500 resize-none"
                            placeholder="Description détaillée..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!formData.title || !formData.projectId || isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-md disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Créer
                    </button>
                </div>
            </div>
        </div>
    );
}
