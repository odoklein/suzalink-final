import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scheduleEmailSync } from '@/lib/email/queue';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        // Get all active mailboxes for the user
        const mailboxes = await prisma.mailbox.findMany({
            where: {
                ownerId: session.user.id,
                isActive: true,
            },
            select: { id: true }
        });

        if (mailboxes.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'Aucune boîte mail active trouvée',
                count: 0
            });
        }

        // Schedule sync for each mailbox
        let scheduledCount = 0;
        for (const mb of mailboxes) {
            try {
                await scheduleEmailSync({
                    mailboxId: mb.id,
                    userId: session.user.id,
                    fullSync: false // incremental sync
                });
                scheduledCount++;
            } catch (err) {
                console.error(`Failed to schedule sync for mailbox ${mb.id}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Synchronisation lancée',
            count: scheduledCount
        });
    } catch (error) {
        console.error('POST /api/email/sync error:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}
