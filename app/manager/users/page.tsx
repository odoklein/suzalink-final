"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Users,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Shield,
    Ban,
    Check,
    Pencil,
    Trash2,
    Key,
    X,
    ChevronDown,
    UserCheck,
    UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal, ModalFooter, ConfirmModal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

// ============================================
// TYPES
// ============================================

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    client?: { id: string; name: string } | null;
    _count: {
        assignedMissions: number;
        actions: number;
    };
}

interface Permission {
    id: string;
    code: string;
    name: string;
    description: string | null;
    category: string;
}

// ============================================
// ROLE COLORS
// ============================================

const ROLE_COLORS: Record<string, string> = {
    MANAGER: "bg-indigo-100 text-indigo-700",
    SDR: "bg-blue-100 text-blue-700",
    BUSINESS_DEVELOPER: "bg-emerald-100 text-emerald-700",
    DEVELOPER: "bg-purple-100 text-purple-700",
    CLIENT: "bg-slate-100 text-slate-700",
};

const ROLE_LABELS: Record<string, string> = {
    MANAGER: "Manager",
    SDR: "SDR",
    BUSINESS_DEVELOPER: "Business Dev",
    DEVELOPER: "Développeur",
    CLIENT: "Client",
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function UsersPage() {
    // State
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    
    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    
    // Selected user
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    
    // Form state
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "SDR",
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formLoading, setFormLoading] = useState(false);

    // Permissions state
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
    const [permissionsLoading, setPermissionsLoading] = useState(false);

    // ============================================
    // FETCH USERS
    // ============================================

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (roleFilter) params.set("role", roleFilter);
            if (statusFilter !== "all") params.set("status", statusFilter);

            const res = await fetch(`/api/users?${params}`);
            const json = await res.json();
            
            if (json.success) {
                setUsers(json.data.users || json.data);
            }
        } catch (err) {
            console.error("Error fetching users:", err);
        } finally {
            setLoading(false);
        }
    }, [search, roleFilter, statusFilter]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // ============================================
    // FETCH PERMISSIONS
    // ============================================

    const fetchAllPermissions = async () => {
        try {
            const res = await fetch("/api/permissions");
            const json = await res.json();
            if (json.success) {
                setAllPermissions(json.data.permissions);
            }
        } catch (err) {
            console.error("Error fetching permissions:", err);
        }
    };

    const fetchUserPermissions = async (userId: string) => {
        try {
            setPermissionsLoading(true);
            const res = await fetch(`/api/users/${userId}/permissions`);
            const json = await res.json();
            if (json.success) {
                setUserPermissions(new Set(json.data));
            }
        } catch (err) {
            console.error("Error fetching user permissions:", err);
        } finally {
            setPermissionsLoading(false);
        }
    };

    // ============================================
    // CREATE USER
    // ============================================

    const handleCreate = async () => {
        setFormErrors({});
        
        if (!formData.name.trim()) {
            setFormErrors({ name: "Nom requis" });
            return;
        }
        if (!formData.email.trim()) {
            setFormErrors({ email: "Email requis" });
            return;
        }

        try {
            setFormLoading(true);
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const json = await res.json();

            if (!json.success) {
                setFormErrors({ general: json.error });
                return;
            }

            setShowCreateModal(false);
            resetForm();
            fetchUsers();
        } catch (err) {
            setFormErrors({ general: "Erreur lors de la création" });
        } finally {
            setFormLoading(false);
        }
    };

    // ============================================
    // UPDATE USER
    // ============================================

    const handleUpdate = async () => {
        if (!selectedUser) return;
        setFormErrors({});

        try {
            setFormLoading(true);
            const updateData: any = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
            };
            if (formData.password) {
                updateData.password = formData.password;
            }

            const res = await fetch(`/api/users/${selectedUser.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData),
            });
            const json = await res.json();

            if (!json.success) {
                setFormErrors({ general: json.error });
                return;
            }

            setShowEditModal(false);
            resetForm();
            fetchUsers();
        } catch (err) {
            setFormErrors({ general: "Erreur lors de la mise à jour" });
        } finally {
            setFormLoading(false);
        }
    };

    // ============================================
    // DELETE USER
    // ============================================

    const handleDelete = async () => {
        if (!selectedUser) return;

        try {
            setFormLoading(true);
            const res = await fetch(`/api/users/${selectedUser.id}`, {
                method: "DELETE",
            });
            const json = await res.json();

            if (!json.success) {
                alert(json.error);
                return;
            }

            setShowDeleteConfirm(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (err) {
            alert("Erreur lors de la suppression");
        } finally {
            setFormLoading(false);
        }
    };

    // ============================================
    // TOGGLE STATUS
    // ============================================

    const handleToggleStatus = async () => {
        if (!selectedUser) return;

        try {
            setFormLoading(true);
            const res = await fetch(`/api/users/${selectedUser.id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !selectedUser.isActive }),
            });
            const json = await res.json();

            if (!json.success) {
                alert(json.error);
                return;
            }

            setShowStatusConfirm(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (err) {
            alert("Erreur lors du changement de statut");
        } finally {
            setFormLoading(false);
        }
    };

    // ============================================
    // UPDATE PERMISSIONS
    // ============================================

    const handlePermissionToggle = async (code: string) => {
        if (!selectedUser) return;

        const newPermissions = new Set(userPermissions);
        const granted = !newPermissions.has(code);
        
        if (granted) {
            newPermissions.add(code);
        } else {
            newPermissions.delete(code);
        }
        
        setUserPermissions(newPermissions);

        // Save to server
        try {
            await fetch(`/api/users/${selectedUser.id}/permissions`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    permissions: [{ code, granted }],
                }),
            });
        } catch (err) {
            console.error("Error updating permission:", err);
            // Revert on error
            if (granted) {
                newPermissions.delete(code);
            } else {
                newPermissions.add(code);
            }
            setUserPermissions(newPermissions);
        }
    };

    // ============================================
    // HELPERS
    // ============================================

    const resetForm = () => {
        setFormData({ name: "", email: "", password: "", role: "SDR" });
        setFormErrors({});
        setSelectedUser(null);
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: "",
            role: user.role,
        });
        setShowEditModal(true);
    };

    const openPermissionsModal = async (user: User) => {
        setSelectedUser(user);
        setShowPermissionsModal(true);
        await Promise.all([
            fetchAllPermissions(),
            fetchUserPermissions(user.id),
        ]);
    };

    // Group permissions by category
    const groupedPermissions = allPermissions.reduce((acc, perm) => {
        if (!acc[perm.category]) acc[perm.category] = [];
        acc[perm.category].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    const categoryLabels: Record<string, string> = {
        pages: "Pages",
        features: "Fonctionnalités",
        actions: "Actions",
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestion des Utilisateurs"
                subtitle="Gérez les utilisateurs, leurs rôles et permissions"
                action={
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Nouvel utilisateur
                    </button>
                }
            />

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                {/* Role filter */}
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">Tous les rôles</option>
                    <option value="MANAGER">Manager</option>
                    <option value="SDR">SDR</option>
                    <option value="BUSINESS_DEVELOPER">Business Dev</option>
                    <option value="DEVELOPER">Développeur</option>
                    <option value="CLIENT">Client</option>
                </select>

                {/* Status filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="all">Tous les statuts</option>
                    <option value="active">Actifs</option>
                    <option value="inactive">Inactifs</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Utilisateur
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Rôle
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Statut
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Missions
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Actions (total)
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-slate-500">Chargement...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500">Aucun utilisateur trouvé</p>
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-semibold">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{user.name}</p>
                                                    <p className="text-sm text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex px-2.5 py-1 rounded-full text-xs font-medium",
                                                ROLE_COLORS[user.role] || "bg-slate-100 text-slate-700"
                                            )}>
                                                {ROLE_LABELS[user.role] || user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.isActive ? (
                                                <span className="inline-flex items-center gap-1.5 text-emerald-600">
                                                    <UserCheck className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Actif</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-red-600">
                                                    <UserX className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Inactif</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-900 font-medium">
                                                {user._count.assignedMissions}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-900 font-medium">
                                                {user._count.actions}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openPermissionsModal(user)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Gérer les permissions"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Modifier"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowStatusConfirm(true);
                                                    }}
                                                    className={cn(
                                                        "p-2 rounded-lg transition-colors",
                                                        user.isActive
                                                            ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                    )}
                                                    title={user.isActive ? "Désactiver" : "Activer"}
                                                >
                                                    {user.isActive ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowDeleteConfirm(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    resetForm();
                }}
                title="Nouvel utilisateur"
                size="md"
            >
                <div className="space-y-4">
                    {formErrors.general && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {formErrors.general}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Jean Dupont"
                        />
                        {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="jean@example.com"
                        />
                        {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Mot de passe <span className="text-slate-400">(optionnel)</span>
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Laissez vide pour générer automatiquement"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="SDR">SDR</option>
                            <option value="BUSINESS_DEVELOPER">Business Developer</option>
                            <option value="MANAGER">Manager</option>
                            <option value="DEVELOPER">Développeur</option>
                            <option value="CLIENT">Client</option>
                        </select>
                    </div>

                    <ModalFooter>
                        <button
                            onClick={() => {
                                setShowCreateModal(false);
                                resetForm();
                            }}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={formLoading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {formLoading ? "Création..." : "Créer"}
                        </button>
                    </ModalFooter>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    resetForm();
                }}
                title="Modifier l'utilisateur"
                size="md"
            >
                <div className="space-y-4">
                    {formErrors.general && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {formErrors.general}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nouveau mot de passe <span className="text-slate-400">(laisser vide pour conserver)</span>
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="SDR">SDR</option>
                            <option value="BUSINESS_DEVELOPER">Business Developer</option>
                            <option value="MANAGER">Manager</option>
                            <option value="DEVELOPER">Développeur</option>
                            <option value="CLIENT">Client</option>
                        </select>
                    </div>

                    <ModalFooter>
                        <button
                            onClick={() => {
                                setShowEditModal(false);
                                resetForm();
                            }}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={formLoading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {formLoading ? "Enregistrement..." : "Enregistrer"}
                        </button>
                    </ModalFooter>
                </div>
            </Modal>

            {/* Permissions Modal */}
            <Modal
                isOpen={showPermissionsModal}
                onClose={() => {
                    setShowPermissionsModal(false);
                    setSelectedUser(null);
                }}
                title={`Permissions - ${selectedUser?.name}`}
                size="lg"
            >
                {permissionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                        <p className="text-sm text-slate-500">
                            Activez ou désactivez les permissions pour cet utilisateur. 
                            Les modifications sont enregistrées automatiquement.
                        </p>

                        {Object.entries(groupedPermissions).map(([category, perms]) => (
                            <div key={category}>
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                                    {categoryLabels[category] || category}
                                </h3>
                                <div className="space-y-2">
                                    {perms.map((perm) => {
                                        const isEnabled = userPermissions.has(perm.code);
                                        return (
                                            <div
                                                key={perm.id}
                                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-900">{perm.name}</p>
                                                    {perm.description && (
                                                        <p className="text-sm text-slate-500">{perm.description}</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handlePermissionToggle(perm.code)}
                                                    className={cn(
                                                        "relative w-11 h-6 rounded-full transition-colors",
                                                        isEnabled ? "bg-indigo-600" : "bg-slate-300"
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                                                            isEnabled && "translate-x-5"
                                                        )}
                                                    />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <ModalFooter>
                    <button
                        onClick={() => {
                            setShowPermissionsModal(false);
                            setSelectedUser(null);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Fermer
                    </button>
                </ModalFooter>
            </Modal>

            {/* Delete Confirm */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setSelectedUser(null);
                }}
                onConfirm={handleDelete}
                title="Supprimer l'utilisateur"
                message={`Êtes-vous sûr de vouloir supprimer "${selectedUser?.name}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                variant="danger"
                isLoading={formLoading}
            />

            {/* Status Confirm */}
            <ConfirmModal
                isOpen={showStatusConfirm}
                onClose={() => {
                    setShowStatusConfirm(false);
                    setSelectedUser(null);
                }}
                onConfirm={handleToggleStatus}
                title={selectedUser?.isActive ? "Désactiver l'utilisateur" : "Activer l'utilisateur"}
                message={
                    selectedUser?.isActive
                        ? `Êtes-vous sûr de vouloir désactiver "${selectedUser?.name}" ? L'utilisateur ne pourra plus se connecter.`
                        : `Êtes-vous sûr de vouloir réactiver "${selectedUser?.name}" ?`
                }
                confirmText={selectedUser?.isActive ? "Désactiver" : "Activer"}
                variant={selectedUser?.isActive ? "warning" : "default"}
                isLoading={formLoading}
            />
        </div>
    );
}
