"use server";

import { prisma } from "@/lib/prisma";
import { searchExploriumCompanies, getExploriumStats, ExploriumSearchFilters } from "@/lib/explorium";
import { enrichmentQueue } from "@/lib/bullmq";
import { Channel } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ============================================
// TYPES
// ============================================

export interface CreateMissionInput {
    name: string;
    objective: string;
    channel: Channel;
    clientId: string;
    startDate: string;
    endDate: string;
}

// ============================================
// EXPORTS
// ============================================

/**
 * Server Action to get market size stats via Explorium
 */
export async function getMarketStats(filters: ExploriumSearchFilters) {
    try {
        const stats = await getExploriumStats(filters);
        return { success: true, data: stats };
    } catch (error) {
        console.error("Stats failed:", error);
        return { success: false, error: "Failed to get market stats" };
    }
}

/**
 * Server Action to search companies via Explorium
 */
export async function searchCompanies(filters: ExploriumSearchFilters) {
    try {
        const results = await searchExploriumCompanies(filters);
        return { success: true, data: results };
    } catch (error) {
        console.error("Search failed:", error);
        return { success: false, error: "Failed to search companies" };
    }
}

/**
 * Server Action to create mission and start enrichment
 */
export async function createMissionAndEnrich(
    missionData: CreateMissionInput,
    audienceFilters: ExploriumSearchFilters
) {
    try {
        console.log("Creating mission...", missionData);

        // 1. Create Mission
        const mission = await prisma.mission.create({
            data: {
                name: missionData.name,
                objective: missionData.objective,
                channel: missionData.channel,
                clientId: missionData.clientId,
                startDate: new Date(missionData.startDate),
                endDate: new Date(missionData.endDate),
                isActive: true,
            },
        });

        console.log("Mission created:", mission.id);

        // 2. Dispatch Background Job to fetch companies and create list
        await enrichmentQueue.add("enrich-mission", {
            missionId: mission.id,
            filters: audienceFilters,
        });

        console.log("Enrichment job dispatched - list will be created in background");

        // 3. Revalidate
        revalidatePath("/manager/missions");
        revalidatePath(`/manager/missions/${mission.id}`);

        return { 
            success: true, 
            missionId: mission.id,
            message: "Mission créée. La liste est en cours de création en arrière-plan avec les données Explorium."
        };
    } catch (error) {
        console.error("Failed to create mission:", error);
        return { success: false, error: "Failed to create mission" };
    }
}
