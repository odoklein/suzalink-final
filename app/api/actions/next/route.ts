import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    successResponse,
    requireRole,
    withErrorHandler,
} from '@/lib/api-utils';

// ============================================
// OPTIMIZED QUEUE QUERY - PHASE 2.5
// ============================================
// Single SQL query using CTEs for performance
// Now supports missionId and listId filters
// ============================================

export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await requireRole(['SDR', 'BUSINESS_DEVELOPER']);
    const { searchParams } = new URL(request.url);
    const missionId = searchParams.get('missionId');
    const listId = searchParams.get('listId');

    // Cooldown configuration (should move to env/config)
    const COOLDOWN_HOURS = 24;
    const cooldownDate = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);
    const sdrId = session.user.id;

    // Build dynamic where clauses
    const missionFilter = missionId
        ? `AND m.id = '${missionId}'`
        : '';
    const listFilter = listId
        ? `AND l.id = '${listId}'`
        : '';

    // ============================================
    // OPTIMIZED QUERY: Single CTE-based query
    // ============================================
    const result = await prisma.$queryRawUnsafe<Array<{
        contact_id: string;
        company_id: string;
        company_name: string;
        company_industry: string | null;
        company_website: string | null;
        company_country: string | null;
        contact_first_name: string | null;
        contact_last_name: string | null;
        contact_title: string | null;
        contact_email: string | null;
        contact_phone: string | null;
        contact_linkedin: string | null;
        contact_status: string;
        campaign_id: string;
        campaign_script: string | null;
        mission_name: string;
        mission_channel: string;
        client_id: string;
        last_action_result: string | null;
        last_action_note: string | null;
        last_action_created: Date | null;
        priority: number;
        priority_label: string;
    }>>(`
        WITH sdr_contacts AS (
            -- Get all contacts for SDR's active missions
            SELECT DISTINCT
                c.id as contact_id,
                co.id as company_id,
                co.name as company_name,
                co.industry as company_industry,
                co.website as company_website,
                co.country as company_country,
                c."firstName" as contact_first_name,
                c."lastName" as contact_last_name,
                c.title as contact_title,
                c.email as contact_email,
                c.phone as contact_phone,
                c.linkedin as contact_linkedin,
                c.status as contact_status,
                camp.id as campaign_id,
                camp.script as campaign_script,
                m.name as mission_name,
                m.channel as mission_channel,
                cl.id as client_id
            FROM "Contact" c
            INNER JOIN "Company" co ON c."companyId" = co.id
            INNER JOIN "List" l ON co."listId" = l.id
            INNER JOIN "Mission" m ON l."missionId" = m.id
            INNER JOIN "Client" cl ON m."clientId" = cl.id
            INNER JOIN "Campaign" camp ON camp."missionId" = m.id
            INNER JOIN "SDRAssignment" sa ON sa."missionId" = m.id
            WHERE sa."sdrId" = $1
              AND m."isActive" = true
              AND camp."isActive" = true
              -- Relaxed status check: Ensure contact has the required channel info
              AND (
                  (m.channel = 'CALL' AND c.phone IS NOT NULL AND c.phone != '') OR
                  (m.channel = 'EMAIL' AND c.email IS NOT NULL AND c.email != '') OR
                  (m.channel = 'LINKEDIN' AND c.linkedin IS NOT NULL AND c.linkedin != '')
              )
              ${missionFilter}
              ${listFilter}
        ),
        last_actions AS (
            -- Get last action per contact
            SELECT DISTINCT ON (a."contactId")
                a."contactId",
                a.result,
                a.note,
                a."createdAt"
            FROM "Action" a
            WHERE a."contactId" IN (SELECT contact_id FROM sdr_contacts)
            ORDER BY a."contactId", a."createdAt" DESC
        ),
        prioritized_contacts AS (
            SELECT
                sc.*,
                la.result as last_action_result,
                la.note as last_action_note,
                la."createdAt" as last_action_created,
                CASE
                    -- Priority 0: Explicit SKIP for recent actions (within cooldown)
                    WHEN la."createdAt" >= $2 THEN 999
                    
                    -- Priority 1: Callbacks (oldest first)
                    WHEN la.result = 'CALLBACK_REQUESTED' THEN 1
                    
                    -- Priority 2: Interested (follow-up)
                    WHEN la.result = 'INTERESTED' THEN 2
                    
                    -- Priority 3: New contacts (never contacted)
                    WHEN la.result IS NULL THEN 3
                    
                    -- Priority 4: No response (retry)
                    WHEN la.result = 'NO_RESPONSE' THEN 4
                    
                    -- Skip: Recently contacted or completed
                    ELSE 999
                END as priority,
                CASE
                    WHEN la.result = 'CALLBACK_REQUESTED' THEN 'CALLBACK'
                    WHEN la.result = 'INTERESTED' THEN 'FOLLOW_UP'
                    WHEN la.result IS NULL THEN 'NEW'
                    WHEN la.result = 'NO_RESPONSE' THEN 'RETRY'
                    ELSE 'SKIP'
                END as priority_label
            FROM sdr_contacts sc
            LEFT JOIN last_actions la ON sc.contact_id = la."contactId"
        )
        SELECT *
        FROM prioritized_contacts
        WHERE priority < 999
        ORDER BY 
            priority ASC,
            -- Secondary sort: ACTIONABLE contacts first
            CASE WHEN contact_status = 'ACTIONABLE' THEN 0 ELSE 1 END,
            -- Tertiary sort: oldest first
            COALESCE(last_action_created, '1970-01-01'::timestamp) ASC
        LIMIT 1
    `, sdrId, cooldownDate);

    // ============================================
    // HANDLE RESULT
    // ============================================

    if (result.length === 0) {
        return successResponse({
            hasNext: false,
            message: listId
                ? 'Queue vide pour cette liste - aucun contact disponible ou tous en cooldown'
                : missionId
                    ? 'Queue vide pour cette mission - aucun contact disponible ou tous en cooldown'
                    : 'Queue vide - aucun contact disponible ou tous en cooldown',
        });
    }

    const next = result[0];

    // Fetch client bookingUrl separately (handles case where column doesn't exist yet)
    let clientBookingUrl: string | undefined = undefined;
    try {
        const client = await prisma.client.findUnique({
            where: { id: next.client_id },
            select: { bookingUrl: true },
        });
        clientBookingUrl = client?.bookingUrl || undefined;
    } catch (err) {
        // Column might not exist yet, ignore
        console.warn('Could not fetch client bookingUrl:', err);
    }

    return successResponse({
        hasNext: true,
        priority: next.priority_label,
        missionName: next.mission_name,
        contact: {
            id: next.contact_id,
            firstName: next.contact_first_name,
            lastName: next.contact_last_name,
            title: next.contact_title,
            email: next.contact_email,
            phone: next.contact_phone,
            linkedin: next.contact_linkedin,
            status: next.contact_status,
        },
        company: {
            id: next.company_id,
            name: next.company_name,
            industry: next.company_industry,
            website: next.company_website,
            country: next.company_country,
        },
        campaignId: next.campaign_id,
        channel: next.mission_channel,
        script: next.campaign_script,
        clientBookingUrl,
        lastAction: next.last_action_result ? {
            result: next.last_action_result,
            note: next.last_action_note,
            createdAt: next.last_action_created?.toISOString(),
        } : null,
    });
});
