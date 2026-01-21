import { NextRequest } from 'next/server';
import {
    successResponse,
    errorResponse,
    paginatedResponse,
    requireRole,
    withErrorHandler,
    validateRequest,
    getPaginationParams,
} from '@/lib/api-utils';
import { actionService } from '@/lib/services/ActionService';
import { z } from 'zod';

// ============================================
// SCHEMAS
// ============================================

const createActionSchema = z.object({
    contactId: z.string().min(1, 'Contact requis'),
    campaignId: z.string().min(1, 'Campagne requise'),
    channel: z.enum(['CALL', 'EMAIL', 'LINKEDIN']),
    result: z.enum([
        'NO_RESPONSE',
        'BAD_CONTACT',
        'INTERESTED',
        'CALLBACK_REQUESTED',
        'MEETING_BOOKED',
        'DISQUALIFIED',
    ]),
    note: z.string().max(500, 'Note trop longue (max 500 caractères)').optional(),
    duration: z.number().positive().max(7200, 'Durée invalide').optional(),
});

// ============================================
// GET /api/actions - List actions
// ============================================

export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await requireRole(['MANAGER', 'SDR', 'BUSINESS_DEVELOPER']);
    const { searchParams } = new URL(request.url);
    const { page, limit } = getPaginationParams(searchParams);

    // Build filters
    const filters: any = { page, limit };

    // SDR and BD can only see their own actions
    if (session.user.role === 'SDR' || session.user.role === 'BUSINESS_DEVELOPER') {
        filters.sdrId = session.user.id;
    } else {
        const sdrId = searchParams.get('sdrId');
        if (sdrId) filters.sdrId = sdrId;
    }

    const missionId = searchParams.get('missionId');
    const result = searchParams.get('result');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (missionId) filters.missionId = missionId;
    if (result) filters.result = result;
    if (from) filters.from = new Date(from);
    if (to) filters.to = new Date(to);

    // Use service layer
    const { actions, total } = await actionService.getActions(filters);

    return paginatedResponse(actions, total, page, limit);
});

// ============================================
// POST /api/actions - Create new action
// ============================================

export const POST = withErrorHandler(async (request: NextRequest) => {
    const session = await requireRole(['SDR', 'MANAGER', 'BUSINESS_DEVELOPER']);
    const data = await validateRequest(request, createActionSchema);

    // Validate required note for certain results
    if ((data.result === 'INTERESTED' || data.result === 'CALLBACK_REQUESTED') && !data.note?.trim()) {
        return errorResponse('Une note est requise pour ce type de résultat', 400);
    }

    // Use service layer with transaction
    const action = await actionService.createAction({
        ...data,
        sdrId: session.user.id,
    });

    return successResponse(action, 201);
});
