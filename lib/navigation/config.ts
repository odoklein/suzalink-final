import {
    LayoutDashboard,
    Building2,
    Target,
    FileText,
    List,
    BarChart3,
    Users,
    FolderKanban,
    Calendar,
    Phone,
    Briefcase,
    Settings,
    UserPlus,
    Mail,
    Inbox,
    Send,
    Zap,
    MessageSquare,
    Receipt,
    LucideIcon,
} from "lucide-react";
import { UserRole } from "@prisma/client";

// ============================================
// NAVIGATION ITEM TYPES
// ============================================

export interface NavItem {
    href: string;
    icon: LucideIcon;
    label: string;
    permission?: string;        // Permission code required to view this item
    roles?: UserRole[];         // Restrict to specific roles (if no permission set)
    badge?: string;             // Optional badge text
    children?: NavItem[];       // Sub-items for nested navigation
}

export interface NavSection {
    title?: string;             // Section title (optional)
    items: NavItem[];
}

// ============================================
// MANAGER NAVIGATION
// ============================================

// ============================================
// MANAGER NAVIGATION — Simplified (9 items max)
// No section titles, no jargon, simple French
// ============================================

export const MANAGER_NAV: NavSection[] = [
    {
        // No title - flat navigation for clarity
        items: [
            {
                href: "/manager/dashboard",
                icon: LayoutDashboard,
                label: "Accueil",
                permission: "pages.dashboard"
            },
            {
                href: "/manager/clients",
                icon: Building2,
                label: "Clients",
                permission: "pages.clients"
            },
            {
                href: "/manager/missions",
                icon: Target,
                label: "Missions",
                permission: "pages.missions"
            },
            {
                href: "/manager/team",
                icon: Users,
                label: "Équipe",
                permission: "pages.sdrs"
            },
            {
                href: "/manager/email",
                icon: Mail,
                label: "Emails",
                permission: "pages.email"
            },
            {
                href: "/manager/planning",
                icon: Calendar,
                label: "Planning",
                permission: "pages.planning"
            },
            {
                href: "/manager/files",
                icon: FileText,
                label: "Fichiers",
                permission: "pages.files"
            },
            {
                href: "/manager/prospects",
                icon: Users,
                label: "Prospects",
                permission: "pages.prospects"
            },
            {
                href: "/manager/billing",
                icon: Receipt,
                label: "Facturation",
                permission: "pages.billing"
            },
            {
                href: "/manager/analytics",
                icon: BarChart3,
                label: "Résultats",
                permission: "pages.analytics"
            },
            {
                href: "/manager/users",
                icon: Settings,
                label: "Réglages",
                permission: "pages.users"
            },
        ],
    },
];

// ============================================
// SDR NAVIGATION — Simplified (7 items max)
// Focus on daily actions, simple French words
// ============================================

export const SDR_NAV: NavSection[] = [
    {
        items: [
            {
                href: "/sdr",
                icon: LayoutDashboard,
                label: "Accueil",
                permission: "pages.dashboard"
            },
            {
                href: "/sdr/action",
                icon: Phone,
                label: "Appeler",
                permission: "pages.action"
            },
            {
                href: "/sdr/email",
                icon: Mail,
                label: "Mes emails",
                permission: "pages.email"
            },
            {
                href: "/sdr/callbacks",
                icon: Calendar,
                label: "Rappels",
                permission: "pages.action"
            },
            {
                href: "/sdr/meetings",
                icon: Calendar,
                label: "Mes RDV",
                permission: "pages.opportunities"
            },
            {
                href: "/sdr/comms",
                icon: MessageSquare,
                label: "Messages",
                permission: "pages.comms"
            },
            {
                href: "/sdr/settings",
                icon: Users,
                label: "Mon profil",
                permission: "pages.settings"
            },
        ],
    },
];

// ============================================
// BUSINESS DEVELOPER NAVIGATION — Simplified
// No section titles, flat structure
// ============================================

export const BD_NAV: NavSection[] = [
    {
        items: [
            {
                href: "/bd/dashboard",
                icon: LayoutDashboard,
                label: "Accueil",
                permission: "pages.dashboard"
            },
            {
                href: "/bd/clients",
                icon: Building2,
                label: "Mes clients",
                permission: "pages.portfolio"
            },
            {
                href: "/bd/missions",
                icon: Target,
                label: "Missions",
                permission: "pages.missions"
            },
            {
                href: "/sdr/action",
                icon: Phone,
                label: "Appeler",
                permission: "pages.action"
            },
            {
                href: "/sdr/callbacks",
                icon: Calendar,
                label: "Rappels",
                permission: "pages.action"
            },
            {
                href: "/sdr/opportunities",
                icon: Briefcase,
                label: "Opportunités",
                permission: "pages.opportunities"
            },
            {
                href: "/bd/clients/new",
                icon: UserPlus,
                label: "Nouveau client",
                permission: "pages.onboarding"
            },
            {
                href: "/bd/comms",
                icon: MessageSquare,
                label: "Messages",
                permission: "pages.comms"
            },
            {
                href: "/bd/settings",
                icon: Settings,
                label: "Mon profil",
                permission: "pages.settings"
            },
        ],
    },
];

// ============================================
// DEVELOPER NAVIGATION
// ============================================

export const DEVELOPER_NAV: NavSection[] = [
    {
        items: [
            {
                href: "/developer/dashboard",
                icon: LayoutDashboard,
                label: "Dashboard",
                permission: "pages.dashboard"
            },
            {
                href: "/developer/projects",
                icon: FolderKanban,
                label: "Projets",
                permission: "pages.projects"
            },
            {
                href: "/developer/tasks",
                icon: List,
                label: "Tâches",
                permission: "pages.projects"
            },
            {
                href: "/developer/integrations",
                icon: Settings,
                label: "Intégrations",
                permission: "pages.settings"
            },
            {
                href: "/developer/settings",
                icon: Settings,
                label: "Paramètres",
                permission: "pages.settings"
            },
        ],
    },
];

// ============================================
// CLIENT NAVIGATION — Reassurance Mode
// Simple, 3 items max, no internal complexity
// ============================================

export const CLIENT_NAV: NavSection[] = [
    {
        items: [
            {
                href: "/client/portal",
                icon: LayoutDashboard,
                label: "Accueil",
                permission: "pages.dashboard"
            },
            {
                href: "/client/results",
                icon: BarChart3,
                label: "Résultats",
                permission: "pages.dashboard"
            },
            {
                href: "/client/contact",
                icon: MessageSquare,
                label: "Contacter",
                permission: "pages.dashboard"
            },
        ],
    },
];

// ============================================
// GET NAVIGATION BY ROLE
// ============================================

export function getNavByRole(role: UserRole): NavSection[] {
    switch (role) {
        case "MANAGER":
            return MANAGER_NAV;
        case "SDR":
            return SDR_NAV;
        case "BUSINESS_DEVELOPER":
            return BD_NAV;
        case "DEVELOPER":
            return DEVELOPER_NAV;
        case "CLIENT":
            return CLIENT_NAV;
        default:
            return [];
    }
}

// ============================================
// ROLE DISPLAY CONFIG
// ============================================

export interface RoleConfig {
    label: string;
    color: string;          // Tailwind color name (e.g., "indigo", "emerald")
    gradient: string;       // Full gradient class
    defaultPath: string;
}

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
    MANAGER: {
        label: "Manager",
        color: "indigo",
        gradient: "from-indigo-500 to-indigo-600",
        defaultPath: "/manager/dashboard",
    },
    SDR: {
        label: "Sales",
        color: "indigo",
        gradient: "from-indigo-500 to-indigo-600",
        defaultPath: "/sdr/action",
    },
    BUSINESS_DEVELOPER: {
        label: "BD",
        color: "emerald",
        gradient: "from-emerald-500 to-emerald-600",
        defaultPath: "/bd/dashboard",
    },
    DEVELOPER: {
        label: "Dev",
        color: "blue",
        gradient: "from-blue-500 to-blue-600",
        defaultPath: "/developer/dashboard",
    },
    CLIENT: {
        label: "Client",
        color: "slate",
        gradient: "from-slate-500 to-slate-600",
        defaultPath: "/client/portal",
    },
};
