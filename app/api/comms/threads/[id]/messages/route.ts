// ============================================
// API: /api/comms/threads/[id]/messages
// Add, edit, and delete messages in a thread
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addMessage, editMessage, deleteMessage } from "@/lib/comms/service";
import type { CreateMessageRequest } from "@/lib/comms/types";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/comms/threads/[id]/messages - Add a message
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { id: threadId } = await params;
        const body = await request.json();

        if (!body.content || body.content.trim().length === 0) {
            return NextResponse.json(
                { error: "Le contenu du message est requis" },
                { status: 400 }
            );
        }

        const messageRequest: CreateMessageRequest = {
            threadId,
            content: body.content.trim(),
            mentionIds: body.mentionIds,
            attachmentIds: body.attachmentIds,
        };

        const messageId = await addMessage(messageRequest, session.user.id);

        return NextResponse.json({ id: messageId }, { status: 201 });
    } catch (error) {
        console.error("Error adding message:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur lors de l'envoi" },
            { status: 500 }
        );
    }
}

// PATCH /api/comms/threads/[id]/messages - Edit a message
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const body = await request.json();

        if (!body.messageId || !body.content) {
            return NextResponse.json(
                { error: "messageId et content sont requis" },
                { status: 400 }
            );
        }

        await editMessage(body.messageId, body.content.trim(), session.user.id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error editing message:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur lors de la modification" },
            { status: 500 }
        );
    }
}

// DELETE /api/comms/threads/[id]/messages - Delete a message
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const body = await request.json();

        if (!body.messageId) {
            return NextResponse.json(
                { error: "messageId est requis" },
                { status: 400 }
            );
        }

        const isManager = session.user.role === "MANAGER";
        await deleteMessage(body.messageId, session.user.id, isManager);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting message:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur lors de la suppression" },
            { status: 500 }
        );
    }
}
