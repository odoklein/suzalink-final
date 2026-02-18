"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
    Card,
    Badge,
    PageHeader,
    EmptyState,
    useToast,
    Select,
    DatePicker,
} from "@/components/ui";
import { Phone, Building2, User, Calendar, Target } from "lucide-react";
import { ACTION_RESULT_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

type FilterValue = "all" | "companies" | "contacts";

interface RecentCall {
    id: string;
    createdAt: string;
    result: string;
    note?: string;
    contact?: {
        id: string;
        firstName?: string | null;
        lastName?: string | null;
        company: { id: string; name: string };
    };
    company?: { id: string; name: string };
    campaign: { id: string; name: string; mission: { id: string; name: string } };
    mission: { id: string; name: string };
}

interface RecentCallsResponse {
    calls: RecentCall[];
    total: number;
}

// Badge labels for client portal (e.g. "RDV pris" instead of "Meeting booké")
const RESULT_BADGE_LABELS: Record<string, string> = {
    ...ACTION_RESULT_LABELS,
    MEETING_BOOKED: "RDV pris",
    MEETING_CANCELLED: "RDV annulé",
};

const RESULT_BADGE_CLASSES: Record<string, string> = {
    NO_RESPONSE: "bg-slate-100 text-slate-700 border-slate-200",
    BAD_CONTACT: "bg-red-50 text-red-700 border-red-200",
    INTERESTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CALLBACK_REQUESTED: "bg-amber-50 text-amber-700 border-amber-200",
    MEETING_BOOKED: "bg-indigo-50 text-indigo-700 border-indigo-200",
    MEETING_CANCELLED: "bg-red-50 text-red-600 border-red-200",
    DISQUALIFIED: "bg-slate-100 text-slate-600 border-slate-200",
    ENVOIE_MAIL: "bg-blue-50 text-blue-700 border-blue-200",
};

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
    { value: "all", label: "Tous les appels" },
    { value: "companies", label: "Entreprises uniquement" },
    { value: "contacts", label: "Contacts uniquement" },
];

function getDefaultDateFrom(): string {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
}

function getDefaultDateTo(): string {
    return new Date().toISOString().slice(0, 10);
}

// ============================================
// MAIN PAGE
// ============================================

export default function ClientPortalCallsPage() {
    const { data: session } = useSession();
    const toast = useToast();
    const [calls, setCalls] = useState<RecentCall[]>([]);
    const [total, setTotal] = useState(0);
    const [filter, setFilter] = useState<FilterValue>("all");
    const [dateFrom, setDateFrom] = useState<string>(() => getDefaultDateFrom());
    const [dateTo, setDateTo] = useState<string>(() => getDefaultDateTo());
    const [isLoading, setIsLoading] = useState(true);

    const clientId = (session?.user as { clientId?: string })?.clientId;

    const fetchCalls = useCallback(async () => {
        if (!clientId) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                filter,
                limit: "100",
            });
            if (dateFrom) params.set("dateFrom", dateFrom);
            if (dateTo) params.set("dateTo", dateTo);
            const res = await fetch(
                `/api/clients/${clientId}/recent-calls?${params.toString()}`
            );
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json?.error ?? "Erreur de chargement");
            }
            if (json.success && json.data) {
                const data = json.data as RecentCallsResponse;
                setCalls(data.calls ?? []);
                setTotal(data.total ?? 0);
            }
        } catch (e) {
            console.error(e);
            toast.error("Erreur", "Impossible de charger les appels récents");
            setCalls([]);
            setTotal(0);
        } finally {
            setIsLoading(false);
        }
    }, [clientId, filter, dateFrom, dateTo, toast]);

    useEffect(() => {
        fetchCalls();
    }, [fetchCalls]);

    const formatDateTime = (dateString: string) =>
        new Date(dateString).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    const displayName = (call: RecentCall) => {
        if (call.contact) {
            const name = [call.contact.firstName, call.contact.lastName]
                .filter(Boolean)
                .join(" ")
                .trim();
            const company = call.contact.company?.name;
            return name ? `${name}${company ? ` · ${company}` : ""}` : company ?? "—";
        }
        return call.company?.name ?? "—";
    };

    if (!clientId) {
        return (
            <div className="space-y-6">
                <PageHeader
                    variant="default"
                    title="Appels récents"
                    subtitle="Les appels effectués sur vos missions — résultat et note"
                />
                <EmptyState
                    icon={Phone}
                    title="Accès non autorisé"
                    description="Vous devez être connecté en tant que client pour voir cette page."
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                variant="default"
                title="Appels récents"
                subtitle="Les appels effectués sur vos missions — résultat et note"
            />

            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <label htmlFor="filter-calls" className="text-sm font-medium text-slate-700">
                        Type
                    </label>
                    <Select
                        id="filter-calls"
                        value={filter}
                        onChange={(value) => setFilter(value as FilterValue)}
                        options={FILTER_OPTIONS}
                        className="min-w-[220px]"
                    />
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <DatePicker
                        label="Du"
                        value={dateFrom}
                        onChange={setDateFrom}
                        maxDate={dateTo || getDefaultDateTo()}
                        placeholder="Date de début"
                        className="w-[180px]"
                    />
                    <DatePicker
                        label="Au"
                        value={dateTo}
                        onChange={setDateTo}
                        minDate={dateFrom || undefined}
                        maxDate={getDefaultDateTo()}
                        placeholder="Date de fin"
                        className="w-[180px]"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="p-6 animate-pulse">
                            <div className="h-5 w-3/4 rounded bg-slate-200 mb-3" />
                            <div className="h-4 w-1/2 rounded bg-slate-100 mb-2" />
                            <div className="h-4 w-1/3 rounded bg-slate-100" />
                        </Card>
                    ))}
                </div>
            ) : calls.length === 0 ? (
                <EmptyState
                    icon={Phone}
                    title="Aucun appel récent"
                    description={
                        filter === "all"
                            ? "Les appels effectués sur vos missions apparaîtront ici."
                            : filter === "companies"
                              ? "Aucun appel au niveau entreprise pour le moment."
                              : "Aucun appel au niveau contact pour le moment."
                    }
                />
            ) : (
                <>
                    <p className="text-sm text-slate-500">
                        {total} appel{total !== 1 ? "s" : ""} affiché{total !== 1 ? "s" : ""}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                        {calls.map((call) => (
                            <Card
                                key={call.id}
                                className="border-slate-200 bg-white overflow-hidden"
                                role="article"
                            >
                                <div className="flex items-start gap-3 p-5">
                                    <div
                                        className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                            call.contact
                                                ? "bg-violet-100 text-violet-600"
                                                : "bg-slate-100 text-slate-600"
                                        )}
                                    >
                                        {call.contact ? (
                                            <User className="w-5 h-5" />
                                        ) : (
                                            <Building2 className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 truncate">
                                            {displayName(call)}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    "border text-xs font-medium",
                                                    RESULT_BADGE_CLASSES[call.result] ??
                                                        "bg-slate-100 text-slate-600 border-slate-200"
                                                )}
                                            >
                                                {RESULT_BADGE_LABELS[call.result] ?? call.result}
                                            </Badge>
                                            <span className="flex items-center gap-1 text-xs text-slate-500">
                                                <Target className="w-3.5 h-3.5" />
                                                {call.mission?.name ?? call.campaign?.name ?? "—"}
                                            </span>
                                        </div>
                                        {call.note && (
                                            <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                                                {call.note}
                                            </p>
                                        )}
                                        <p className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatDateTime(call.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
