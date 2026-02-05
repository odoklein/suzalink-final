"use client";

import { CommsPageHeader } from "@/components/comms/CommsPageHeader";
import { CommsInbox } from "@/components/comms/CommsInbox";

export default function ClientContactPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] min-h-0">
            <CommsPageHeader
                title="Messages"
                subtitle="Communiquez avec votre équipe et suivez vos missions"
                slimTitle="Messages — Communiquez avec votre équipe"
                collapsible={true}
                className="mb-4 shrink-0"
            />
            <div className="flex-1 min-h-0">
                <CommsInbox />
            </div>
        </div>
    );
}
