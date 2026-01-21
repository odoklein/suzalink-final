// ============================================
// EMAIL SEND API ROUTE
// POST /api/email/send - Send an email
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailSendingService } from '@/lib/email/services/sending-service';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        // Parse form data (supports attachments)
        const formData = await req.formData();
        
        const mailboxId = formData.get('mailboxId') as string;
        const toJson = formData.get('to') as string;
        const ccJson = formData.get('cc') as string | null;
        const bccJson = formData.get('bcc') as string | null;
        const subject = formData.get('subject') as string;
        const bodyHtml = formData.get('bodyHtml') as string | null;
        const bodyText = formData.get('bodyText') as string | null;
        const threadId = formData.get('threadId') as string | null;

        if (!mailboxId) {
            return NextResponse.json(
                { success: false, error: 'Mailbox ID requis' },
                { status: 400 }
            );
        }

        // Parse recipients
        const to = toJson ? JSON.parse(toJson) : [];
        const cc = ccJson ? JSON.parse(ccJson) : [];
        const bcc = bccJson ? JSON.parse(bccJson) : [];

        if (to.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Au moins un destinataire requis' },
                { status: 400 }
            );
        }

        // Verify mailbox access
        const mailbox = await prisma.mailbox.findUnique({
            where: { id: mailboxId },
            include: {
                permissions: {
                    where: { userId: session.user.id },
                },
            },
        });

        if (!mailbox) {
            return NextResponse.json(
                { success: false, error: 'Boîte mail non trouvée' },
                { status: 404 }
            );
        }

        const isOwner = mailbox.ownerId === session.user.id;
        const canSend = mailbox.permissions.some(p => p.canSend);

        if (!isOwner && !canSend && session.user.role !== 'MANAGER') {
            return NextResponse.json(
                { success: false, error: 'Permission d\'envoi non autorisée' },
                { status: 403 }
            );
        }

        // Process attachments
        const attachments: { filename: string; content: Buffer; mimeType: string }[] = [];
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('attachment_') && value instanceof File) {
                const arrayBuffer = await value.arrayBuffer();
                attachments.push({
                    filename: value.name,
                    content: Buffer.from(arrayBuffer),
                    mimeType: value.type,
                });
            }
        }

        // Send email
        const result = await emailSendingService.sendEmail(mailboxId, {
            to,
            cc,
            bcc,
            subject,
            bodyHtml: bodyHtml || undefined,
            bodyText: bodyText || undefined,
            attachments: attachments.length > 0 ? attachments : undefined,
            threadId: threadId || undefined,
        });

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                messageId: result.messageId,
                threadId: result.threadId,
                emailId: result.emailId,
            },
        });
    } catch (error) {
        console.error('POST /api/email/send error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
