"use client";

import { Card } from "@/components/ui";
import { CreateMissionInput } from "@/app/actions/mission-wizard";
import { CheckCircle2, Target, Building, Calendar } from "lucide-react";

interface ReviewLaunchProps {
    data: CreateMissionInput;
    clientName?: string;
}

export function ReviewLaunch({ data, clientName }: ReviewLaunchProps) {
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Prêt à lancer la mission</h2>
                <p className="text-slate-500">Vérifiez les informations ci-dessous avant de valider.</p>
            </div>

            <Card className="p-6">
                <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    Détails de la mission
                </h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 text-sm">
                    <div>
                        <dt className="text-slate-500 mb-1">Nom</dt>
                        <dd className="font-medium text-slate-900">{data.name}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-500 mb-1">Client</dt>
                        <dd className="font-medium text-slate-900">{clientName || "Non sélectionné"}</dd>
                    </div>
                    <div className="col-span-2">
                        <dt className="text-slate-500 mb-1">Objectif</dt>
                        <dd className="font-medium text-slate-900">{data.objective || "-"}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-500 mb-1">Canal</dt>
                        <dd className="font-medium text-slate-900 bg-slate-100 px-2 py-1 rounded inline-block">
                            {data.channel}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-slate-500 mb-1">Dates</dt>
                        <dd className="font-medium text-slate-900 flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {data.startDate} → {data.endDate}
                        </dd>
                    </div>
                </dl>
            </Card>
        </div>
    );
}
