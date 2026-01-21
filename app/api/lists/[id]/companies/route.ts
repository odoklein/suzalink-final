import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    successResponse,
    errorResponse,
    requireRole,
    withErrorHandler,
} from '@/lib/api-utils';

// ============================================
// GET /api/lists/[id]/companies - Get list companies with contacts
// ============================================

export const GET = withErrorHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    await requireRole(['MANAGER', 'SDR']);
    const { id } = await params;

    const companies = await prisma.company.findMany({
        where: { listId: id },
        include: {
            contacts: true,
            _count: {
                select: { contacts: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    return successResponse(companies);
});
