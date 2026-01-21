import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ============================================
// GET /api/sdr/stats
// Fetch SDR performance stats
// ============================================

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Non autorisé" },
                { status: 401 }
            );
        }

        const sdrId = session.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const lastWeekStart = new Date(weekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);

        // Actions today
        const actionsToday = await prisma.action.count({
            where: {
                sdrId,
                createdAt: {
                    gte: today,
                },
            },
        });

        // Meetings booked (all time for this SDR, showing recent bookings)
        const meetingsBooked = await prisma.action.count({
            where: {
                sdrId,
                result: "MEETING_BOOKED",
                createdAt: {
                    gte: weekStart,
                },
            },
        });

        // Callbacks pending (CALLBACK_REQUESTED that haven't been followed up)
        const callbacksPending = await prisma.action.count({
            where: {
                sdrId,
                result: "CALLBACK_REQUESTED",
                contact: {
                    actions: {
                        none: {
                            createdAt: {
                                gt: prisma.action.fields.createdAt,
                            },
                        },
                    },
                },
            },
        });

        // Simple callbacks count for now (last 7 days with CALLBACK_REQUESTED)
        const callbacksSimple = await prisma.action.count({
            where: {
                sdrId,
                result: "CALLBACK_REQUESTED",
                createdAt: {
                    gte: weekStart,
                },
            },
        });

        // Opportunities generated (INTERESTED results)
        const opportunitiesGenerated = await prisma.action.count({
            where: {
                sdrId,
                result: "INTERESTED",
                createdAt: {
                    gte: weekStart,
                },
            },
        });

        // Weekly progress comparison
        const thisWeekActions = await prisma.action.count({
            where: {
                sdrId,
                createdAt: {
                    gte: weekStart,
                },
            },
        });

        const lastWeekActions = await prisma.action.count({
            where: {
                sdrId,
                createdAt: {
                    gte: lastWeekStart,
                    lt: weekStart,
                },
            },
        });

        const weeklyProgress = lastWeekActions > 0
            ? Math.round(((thisWeekActions - lastWeekActions) / lastWeekActions) * 100)
            : thisWeekActions > 0 ? 100 : 0;

        return NextResponse.json({
            success: true,
            data: {
                actionsToday,
                meetingsBooked,
                callbacksPending: callbacksSimple, // Simplified for now
                opportunitiesGenerated,
                weeklyProgress: Math.max(0, weeklyProgress),
            },
        });
    } catch (error) {
        console.error("Error fetching SDR stats:", error);
        return NextResponse.json(
            { success: false, error: "Erreur serveur" },
            { status: 500 }
        );
    }
}
