import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ACTION_RESULT_LABELS } from "@/lib/types";
import type { ActionResult, Channel } from "@/lib/types";

// ============================================
// GET /api/sdr/actions
// Returns the current SDR/BD's actions (calls and other actions) for "my activity" view.
// Query: period=today|all, limit (default 50)
// ============================================

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Non autorisé" },
                { status: 401 }
            );
        }

        const role = session.user.role as string;
        if (role !== "SDR" && role !== "BUSINESS_DEVELOPER") {
            return NextResponse.json(
                { success: false, error: "Réservé aux SDR/BD" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get("period") || "today"; // today | all
        const limit = Math.min(parseInt(searchParams.get("limit") || "50") || 50, 200);

        const sdrId = session.user.id;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const where: { sdrId: string; createdAt?: { gte?: Date } } = { sdrId };
        if (period === "today") {
            where.createdAt = { gte: today };
        }

        const actions = await prisma.action.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        title: true,
                        company: { select: { id: true, name: true } },
                    },
                },
                company: {
                    select: { id: true, name: true },
                },
                campaign: {
                    select: { name: true },
                },
            },
        });

        const items = actions.map((a) => {
            const contactName = a.contact
                ? `${(a.contact.firstName || "").trim()} ${(a.contact.lastName || "").trim()}`.trim() || a.contact.company?.name
                : null;
            const companyName = a.contact?.company?.name ?? a.company?.name ?? null;
            const label = ACTION_RESULT_LABELS[(a.result as ActionResult)] ?? a.result;

            return {
                id: a.id,
                contactId: a.contactId,
                companyId: a.companyId,
                result: a.result,
                resultLabel: label,
                channel: a.channel as Channel,
                campaignName: a.campaign?.name,
                contactName: contactName || undefined,
                companyName: companyName || undefined,
                note: a.note ?? undefined,
                createdAt: a.createdAt.toISOString(),
            };
        });

        return NextResponse.json({
            success: true,
            data: items,
        });
    } catch (error) {
        console.error("[GET /api/sdr/actions] Error:", error);
        return NextResponse.json(
            { success: false, error: "Erreur serveur" },
            { status: 500 }
        );
    }
}
