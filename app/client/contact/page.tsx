"use client";

import { useSession } from "next-auth/react";
import { CommsInbox } from "@/components/comms/CommsInbox";
import { MessageSquare, Send } from "lucide-react";

export default function ClientContactPage() {
    const { data: session } = useSession();

    return (
        <div className="flex flex-col h-[calc(100vh-10rem)] min-h-[520px] animate-fade-in">
            {/* Premium Header */}
            <div className="mb-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center shadow-sm">
                        <MessageSquare className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Contact
                        </h1>
                        <p className="text-slate-500 mt-1.5 max-w-xl leading-relaxed">
                            Échangez avec les SDR et l&apos;équipe dédiée à vos missions. Lancez une discussion sur une mission ou envoyez un message direct à un SDR.
                        </p>
                        <div className="flex items-center gap-2 mt-3 text-sm text-slate-600">
                            <Send className="w-4 h-4 text-indigo-500" />
                            <span>Messages en temps réel</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inbox: missions and direct messages only for client */}
            <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 overflow-hidden">
                <CommsInbox
                    className="h-full"
                    restrictToChannelTypes={["MISSION", "DIRECT"]}
                />
            </div>
        </div>
    );
}
