"use client";

import { useSession } from "next-auth/react";
import { CommsInbox } from "@/components/comms/CommsInbox";
import { MessageSquare } from "lucide-react";

export default function ClientContactPage() {
    const { data: session } = useSession();

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[480px]">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                    </span>
                    Contact
                </h1>
                <p className="text-slate-500 mt-2 max-w-xl">
                    Échangez avec les SDR et l’équipe dédiée à vos missions. Vous pouvez lancer une discussion sur une mission ou envoyer un message direct à un SDR.
                </p>
            </div>

            {/* Inbox: only missions and direct messages for client */}
            <div className="flex-1 min-h-0 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                <CommsInbox
                    className="h-full"
                    restrictToChannelTypes={["MISSION", "DIRECT"]}
                />
            </div>
        </div>
    );
}
