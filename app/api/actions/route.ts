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
    contactId: z.string().min(1, 'Contact requis').optional(),
    companyId: z.string().min(1, 'Company requis').optional(),
    campaignId: z.string().min(1, 'Campagne requise'),
    channel: z.enum(['CALL', 'EMAIL', 'LINKEDIN']),
    result: z.enum([
        'NO_RESPONSE',
        'BAD_CONTACT',
        'INTERESTED',
        'CALLBACK_REQUESTED',
        'MEETING_BOOKED',
        'DISQUALIFIED',
        'ENVOIE_MAIL',
    ]),
    note: z.string().max(500, 'Note trop longue (max 500 caractères)').optional(),
    callbackDate: z.union([z.string(), z.date()]).optional().transform((s) => (s ? (typeof s === 'string' ? new Date(s) : s) : undefined)),
    duration: z.number().positive().max(7200, 'Durée invalide').optional(),
}).refine(data => data.contactId || data.companyId, {
    message: 'Contact ou Company requis',
    path: ['contactId'],
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

    const missionId = searchParams.get('missionId');
    const result = searchParams.get('result');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const contactId = searchParams.get('contactId');
    const companyId = searchParams.get('companyId');

    if (missionId) filters.missionId = missionId;

    // SDR and BD: own actions only, unless they are team lead for this mission (then show all team actions)
    if (session.user.role === 'SDR' || session.user.role === 'BUSINESS_DEVELOPER') {
        const isTeamLeadForMission = missionId
            ? await actionService.isTeamLeadForMission(session.user.id, missionId)
            : false;
        if (!isTeamLeadForMission) {
            filters.sdrId = session.user.id;
        }
    } else {
        const sdrId = searchParams.get('sdrId');
        if (sdrId) filters.sdrId = sdrId;
    }
    if (result) filters.result = result;
    if (from) filters.from = new Date(from);
    if (to) filters.to = new Date(to);
    if (contactId) filters.contactId = contactId;
    if (companyId) filters.companyId = companyId;

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
    if ((data.result === 'INTERESTED' || data.result === 'CALLBACK_REQUESTED' || data.result === 'ENVOIE_MAIL') && !data.note?.trim()) {
        return errorResponse('Une note est requise pour ce type de résultat', 400);
    }

    // Use service layer with transaction
    try {
        const action = await actionService.createAction({
            contactId: data.contactId,
            companyId: data.companyId,
            sdrId: session.user.id,
            campaignId: data.campaignId,
            channel: data.channel,
            result: data.result,
            note: data.note,
            callbackDate: data.callbackDate,
            duration: data.duration,
        });
        return successResponse(action, 201);
    } catch (err) {
        if (err instanceof Error && err.message === 'DUPLICATE_CALLBACK') {
            return errorResponse('Un rappel est déjà en attente pour ce contact/campagne. Traitez-le ou reprogrammez-le avant d\'en créer un nouveau.', 409);
        }
        throw err;
    }
});
