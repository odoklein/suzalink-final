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
                // Monthly
                callsThisMonth: monthlyActions,
                meetingsThisMonth: monthlyMeetings,
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
