import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, requireRole, withErrorHandler } from "@/lib/api-utils";

// ============================================
// GET /api/sdr/action-queue
// Returns a list of queue items (same pool as /api/actions/next) for table view.
// Query: missionId?, listId?, limit (default 100, max 200)
// ============================================

export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await requireRole(["SDR", "BUSINESS_DEVELOPER"]);
    const { searchParams } = new URL(request.url);
    const missionId = searchParams.get("missionId");
    const listId = searchParams.get("listId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, 200);

    const COOLDOWN_HOURS = 24;
    const cooldownDate = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);
    const sdrId = session.user.id;

    const missionFilter = missionId ? `AND m.id = '${missionId.replace(/'/g, "''")}'` : "";
    const listFilter = listId ? `AND l.id = '${listId.replace(/'/g, "''")}'` : "";

    const result = await prisma.$queryRawUnsafe<
        Array<{
            contact_id: string | null;
            company_id: string;
            company_name: string;
            company_industry: string | null;
            company_website: string | null;
            company_country: string | null;
            company_phone: string | null;
            contact_first_name: string | null;
            contact_last_name: string | null;
            contact_title: string | null;
            contact_email: string | null;
            contact_phone: string | null;
            contact_linkedin: string | null;
            contact_status: string;
            campaign_id: string;
            mission_name: string;
            mission_channel: string;
            last_action_result: string | null;
            last_action_note: string | null;
            last_action_created: Date | null;
            priority: number;
            priority_label: string;
        }>
    >(
        `
        WITH sdr_contacts AS (
            SELECT DISTINCT
                c.id as contact_id,
                co.id as company_id,
                co.name as company_name,
                co.industry as company_industry,
                co.website as company_website,
                co.country as company_country,
                co.phone as company_phone,
                c."firstName" as contact_first_name,
                c."lastName" as contact_last_name,
                c.title as contact_title,
                c.email as contact_email,
                c.phone as contact_phone,
                c.linkedin as contact_linkedin,
                c.status::text as contact_status,
                camp.id as campaign_id,
                m.name as mission_name,
                m.channel as mission_channel
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
              AND (
                  (m.channel = 'CALL' AND (c.phone IS NOT NULL AND c.phone != '' OR co.phone IS NOT NULL AND co.phone != '')) OR
                  (m.channel = 'EMAIL' AND c.email IS NOT NULL AND c.email != '') OR
                  (m.channel = 'LINKEDIN' AND c.linkedin IS NOT NULL AND c.linkedin != '')
              )
              ${missionFilter}
              ${listFilter}
        ),
        sdr_companies AS (
            SELECT DISTINCT
                NULL::text as contact_id,
                co.id as company_id,
                co.name as company_name,
                co.industry as company_industry,
                co.website as company_website,
                co.country as company_country,
                co.phone as company_phone,
                NULL::text as contact_first_name,
                NULL::text as contact_last_name,
                NULL::text as contact_title,
                NULL::text as contact_email,
                NULL::text as contact_phone,
                NULL::text as contact_linkedin,
                'INCOMPLETE'::text as contact_status,
                camp.id as campaign_id,
                m.name as mission_name,
                m.channel as mission_channel
            FROM "Company" co
            INNER JOIN "List" l ON co."listId" = l.id
            INNER JOIN "Mission" m ON l."missionId" = m.id
            INNER JOIN "Client" cl ON m."clientId" = cl.id
            INNER JOIN "Campaign" camp ON camp."missionId" = m.id
            INNER JOIN "SDRAssignment" sa ON sa."missionId" = m.id
            WHERE sa."sdrId" = $1
              AND m."isActive" = true
              AND camp."isActive" = true
              AND m.channel = 'CALL'
              AND co.phone IS NOT NULL
              AND co.phone != ''
              AND NOT EXISTS (
                  SELECT 1 FROM "Contact" c2
                  WHERE c2."companyId" = co.id
                  AND (
                      (m.channel = 'CALL' AND c2.phone IS NOT NULL AND c2.phone != '') OR
                      (m.channel = 'EMAIL' AND c2.email IS NOT NULL AND c2.email != '') OR
                      (m.channel = 'LINKEDIN' AND c2.linkedin IS NOT NULL AND c2.linkedin != '')
                  )
              )
              ${missionFilter}
              ${listFilter}
        ),
        all_targets AS (
            SELECT * FROM sdr_contacts
            UNION ALL
            SELECT * FROM sdr_companies
        ),
        last_actions_contacts AS (
            SELECT DISTINCT ON (a."contactId")
                a."contactId",
                a.result,
                a.note,
                a."createdAt"
            FROM "Action" a
            WHERE a."contactId" IN (SELECT contact_id FROM all_targets WHERE contact_id IS NOT NULL)
            ORDER BY a."contactId", a."createdAt" DESC
        ),
        last_actions_companies AS (
            SELECT DISTINCT ON (a."companyId")
                a."companyId",
                a.result,
                a.note,
                a."createdAt"
            FROM "Action" a
            WHERE a."companyId" IN (SELECT company_id FROM all_targets WHERE contact_id IS NULL)
              AND a."companyId" IS NOT NULL
            ORDER BY a."companyId", a."createdAt" DESC
        ),
        prioritized_targets AS (
            SELECT
                at.*,
                COALESCE(lac.result, lac2.result) as last_action_result,
                COALESCE(lac.note, lac2.note) as last_action_note,
                COALESCE(lac."createdAt", lac2."createdAt") as last_action_created,
                CASE
                    WHEN COALESCE(lac."createdAt", lac2."createdAt") >= $2 THEN 999
                    WHEN COALESCE(lac.result, lac2.result) = 'CALLBACK_REQUESTED' THEN 1
                    WHEN COALESCE(lac.result, lac2.result) = 'INTERESTED' THEN 2
                    WHEN COALESCE(lac.result, lac2.result) IS NULL THEN 3
                    WHEN COALESCE(lac.result, lac2.result) = 'NO_RESPONSE' THEN 4
                    ELSE 5
                END as priority,
                CASE
                    WHEN COALESCE(lac.result, lac2.result) = 'CALLBACK_REQUESTED' THEN 'CALLBACK'
                    WHEN COALESCE(lac.result, lac2.result) = 'INTERESTED' THEN 'FOLLOW_UP'
                    WHEN COALESCE(lac.result, lac2.result) IS NULL THEN 'NEW'
                    WHEN COALESCE(lac.result, lac2.result) = 'NO_RESPONSE' THEN 'RETRY'
                    WHEN COALESCE(lac.result, lac2.result) IN ('MEETING_BOOKED', 'ENVOIE_MAIL', 'DISQUALIFIED', 'BAD_CONTACT') THEN 'SKIP'
                    ELSE 'SKIP'
                END as priority_label
            FROM all_targets at
            LEFT JOIN last_actions_contacts lac ON at.contact_id = lac."contactId"
            LEFT JOIN last_actions_companies lac2 ON at.contact_id IS NULL AND at.company_id = lac2."companyId"
        )
        SELECT *
        FROM prioritized_targets
        ORDER BY
            priority ASC,
            CASE
                WHEN contact_status = 'ACTIONABLE' THEN 0
                WHEN contact_status = 'PARTIAL' THEN 1
                WHEN contact_status = 'INCOMPLETE' THEN 2
                ELSE 3
            END,
            COALESCE(last_action_created, '1970-01-01'::timestamp) ASC
        LIMIT ${limit}
    `,
        sdrId,
        cooldownDate
    );

    const items = result.map((row) => ({
        contactId: row.contact_id,
        companyId: row.company_id,
        contact: row.contact_id
            ? {
                id: row.contact_id,
                firstName: row.contact_first_name,
                lastName: row.contact_last_name,
                title: row.contact_title,
                email: row.contact_email,
                phone: row.contact_phone,
                linkedin: row.contact_linkedin,
                status: row.contact_status,
            }
            : null,
        company: {
            id: row.company_id,
            name: row.company_name,
            industry: row.company_industry,
            website: row.company_website,
            country: row.company_country,
            phone: row.company_phone || null,
        },
        campaignId: row.campaign_id,
        channel: row.mission_channel,
        missionName: row.mission_name,
        lastAction: row.last_action_result
            ? {
                result: row.last_action_result,
                note: row.last_action_note,
                createdAt: row.last_action_created?.toISOString(),
            }
            : null,
        priority: row.priority_label,
    }));

    return successResponse({ items });
});
