import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ============================================
// GET /api/actions/stats
// Returns action statistics per user for team dashboard
// ============================================

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: "Non autorisé" },
                { status: 401 }
            );
        }

        // Parse query params
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const userId = searchParams.get("userId");

        // Build date filter
        const dateFilter: any = {};
        if (startDate) {
            dateFilter.gte = new Date(startDate);
        }
        if (endDate) {
            dateFilter.lte = new Date(endDate);
        }

        // Get all SDRs and BDs
        const users = await prisma.user.findMany({
            where: {
                role: { in: ["SDR", "BUSINESS_DEVELOPER"] },
                isActive: true,
                ...(userId && { id: userId }),
            },
            select: {
                id: true,
                name: true,
            },
        });

        // Get action counts per user
        const userStats: Record<string, any> = {};

        for (const user of users) {
            // Get actions for this user
            const actions = await prisma.action.groupBy({
                by: ["result"],
                where: {
                    sdrId: user.id,
                    ...(Object.keys(dateFilter).length > 0 && {
                        createdAt: dateFilter,
                    }),
                },
                _count: true,
            });

            // Calculate totals
            const totalActions = actions.reduce((sum, a) => sum + a._count, 0);
            const meetingsBooked = actions.find(a => a.result === "MEETING_BOOKED")?._count || 0;
            const interested = actions.find(a => a.result === "INTERESTED")?._count || 0;
            const callbacks = actions.find(a => a.result === "CALLBACK_REQUESTED")?._count || 0;

            // Get weekly breakdown
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
            startOfWeek.setHours(0, 0, 0, 0);

            const weeklyActions = await prisma.action.count({
                where: {
                    sdrId: user.id,
                    createdAt: { gte: startOfWeek },
                },
            });

            const weeklyMeetings = await prisma.action.count({
                where: {
                    sdrId: user.id,
                    result: "MEETING_BOOKED",
                    createdAt: { gte: startOfWeek },
                },
            });

            // Get today's stats
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const todayActions = await prisma.action.count({
                where: {
                    sdrId: user.id,
                    createdAt: { gte: startOfDay },
                },
            });

            // Get today's actions breakdown by result
            const todayActionsByResult = await prisma.action.groupBy({
                by: ["result"],
                where: {
                    sdrId: user.id,
                    createdAt: { gte: startOfDay },
                },
                _count: true,
            });

            const todayMeetings = await prisma.action.count({
                where: {
                    sdrId: user.id,
                    result: "MEETING_BOOKED",
                    createdAt: { gte: startOfDay },
                },
            });

            // Get monthly stats
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const monthlyActions = await prisma.action.count({
                where: {
                    sdrId: user.id,
                    createdAt: { gte: startOfMonth },
                },
            });

            const monthlyMeetings = await prisma.action.count({
                where: {
                    sdrId: user.id,
                    result: "MEETING_BOOKED",
                    createdAt: { gte: startOfMonth },
                },
            });

            // Calculate conversion rate
            const conversionRate = totalActions > 0
                ? ((meetingsBooked / totalActions) * 100).toFixed(1)
                : 0;

            // Per-mission breakdown (for team [id] Performance tab)
            const actionsByMission = await prisma.action.findMany({
                where: {
                    sdrId: user.id,
                    ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
                },
                select: {
                    result: true,
                    campaign: {
                        select: {
                            missionId: true,
                            mission: { select: { name: true } },
                        },
                    },
                },
            });

            const missionMap = new Map<string, { missionId: string; missionName: string; calls: number; meetings: number }>();
            for (const a of actionsByMission) {
                const missionId = a.campaign?.missionId ?? "";
                const missionName = a.campaign?.mission?.name ?? "Mission";
                if (!missionId) continue;
                const existing = missionMap.get(missionId);
                if (existing) {
                    existing.calls += 1;
                    if (a.result === "MEETING_BOOKED") existing.meetings += 1;
                } else {
                    missionMap.set(missionId, {
                        missionId,
                        missionName,
                        calls: 1,
                        meetings: a.result === "MEETING_BOOKED" ? 1 : 0,
                    });
                }
            }
            const byMission = Array.from(missionMap.values());

            userStats[user.id] = {
                userId: user.id,
                userName: user.name,
                totalActions,
                meetingsBooked,
                interested,
                callbacks,
                conversionRate: Number(conversionRate),
                // Weekly
                callsThisWeek: weeklyActions,
                meetingsThisWeek: weeklyMeetings,
                // Today
                callsToday: todayActions,
                meetingsToday: todayMeetings,
                resultBreakdownToday: todayActionsByResult.map(a => ({
                    result: a.result,
                    count: a._count,
                })),
                // Monthly
                callsThisMonth: monthlyActions,
                meetingsThisMonth: monthlyMeetings,
                byMission,
            };
        }

        // Calculate team totals
        const teamStats = {
            totalCalls: Object.values(userStats).reduce((sum: number, u: any) => sum + u.totalActions, 0),
            totalMeetings: Object.values(userStats).reduce((sum: number, u: any) => sum + u.meetingsBooked, 0),
            weeklyTotal: Object.values(userStats).reduce((sum: number, u: any) => sum + u.callsThisWeek, 0),
            weeklyMeetings: Object.values(userStats).reduce((sum: number, u: any) => sum + u.meetingsThisWeek, 0),
        };

        return NextResponse.json({
            success: true,
            data: userStats,
            teamStats,
        });

    } catch (error) {
        console.error("[GET /api/actions/stats] Error:", error);
        return NextResponse.json(
            { success: false, error: "Erreur serveur" },
            { status: 500 }
        );
    }
}
