"use client";

import { useState, useEffect } from "react";
import { Card, Badge, Button } from "@/components/ui";
import {
    Calendar,
    Clock,
    User,
    Building2,
    Video,
    MapPin,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface Meeting {
    id: string;
    createdAt: string;
    note?: string;
    description?: string; // If we had a description field
    contact: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        title: string | null;
        email: string | null;
        company: {
            name: string;
        };
    };
    mission: {
        id: string;
        name: string;
        client: {
            name: string;
        };
    };
}

// ============================================
// SDR MEETINGS PAGE
// ============================================

export default function SDRMeetingsPage() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMeetings = async () => {
            try {
                const res = await fetch("/api/sdr/meetings");
                const json = await res.json();
                if (json.success) {
                    setMeetings(json.data);
                }
            } catch (err) {
                console.error("Failed to fetch meetings:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMeetings();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">Chargement des rendez-vous...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Mes Rendez-vous</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Historique et planning de vos rendez-vous pris
                    </p>
                </div>
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">
                    {meetings.length} RDV pris
                </div>
            </div>

            {/* List */}
            {meetings.length === 0 ? (
                <Card className="text-center py-12">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-700">Aucun rendez-vous pris</h3>
                    <p className="text-slate-500 mt-1">
                        Vos rendez-vous validés apparaîtront ici.
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {meetings.map((meeting) => (
                        <Card key={meeting.id} className="!p-0 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="flex">
                                {/* Date Strip */}
                                <div className="w-24 bg-indigo-50 flex flex-col items-center justify-center p-4 text-center border-r border-indigo-100">
                                    <span className="text-xs font-semibold text-indigo-400 uppercase">
                                        {new Date(meeting.createdAt).toLocaleDateString('fr-FR', { month: 'short' })}
                                    </span>
                                    <span className="text-2xl font-bold text-indigo-600">
                                        {new Date(meeting.createdAt).getDate()}
                                    </span>
                                    <span className="text-xs text-indigo-400">
                                        {new Date(meeting.createdAt).getFullYear()}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                                {meeting.contact.firstName} {meeting.contact.lastName}
                                                <Badge variant="outline" className="text-xs font-normal text-slate-500">
                                                    {meeting.contact.title}
                                                </Badge>
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                                                <Building2 className="w-4 h-4 text-slate-400" />
                                                {meeting.contact.company.name}
                                            </div>
                                        </div>
                                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                                            {meeting.mission.name}
                                        </Badge>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px bg-slate-100 my-3" />

                                    <div className="flex items-center gap-6 text-sm">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Video className="w-4 h-4 text-slate-400" />
                                            <span>Visio Conférence</span>
                                        </div>
                                        {meeting.note && (
                                            <div className="flex items-center gap-2 text-slate-600 max-w-md truncate">
                                                <span className="text-slate-400">Note:</span>
                                                <span className="italic">"{meeting.note}"</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
