/**
 * Script to seed GLOBAL mission status definitions
 * Run with: npx ts-node scripts/seed-global-statuses.ts
 * Or: node --loader ts-node/esm scripts/seed-global-statuses.ts
 */

import { PrismaClient } from "@prisma/client";
import type { ActionPriorityLabel } from "@prisma/client";

const prisma = new PrismaClient();

// Status definitions matching the SQL script
const GLOBAL_STATUS_DEFINITIONS = [
    // Basic refusal statuses
    { code: "REFUS", label: "Refus", color: "#FF6B6B", sortOrder: 1, requiresNote: false, priorityLabel: "SKIP" as ActionPriorityLabel, priorityOrder: 999, triggersOpportunity: false, triggersCallback: false },
    { code: "REFUS_ARGU", label: "Refus argu", color: "#FF8787", sortOrder: 2, requiresNote: true, priorityLabel: "SKIP" as ActionPriorityLabel, priorityOrder: 999, triggersOpportunity: false, triggersCallback: false },
    { code: "REFUS_CATEGORIQUE", label: "Refus catégorique", color: "#FA5252", sortOrder: 3, requiresNote: false, priorityLabel: "SKIP" as ActionPriorityLabel, priorityOrder: 999, triggersOpportunity: false, triggersCallback: false },
    
    // Follow-up & callback statuses
    { code: "RELANCE", label: "Relance", color: "#339AF0", sortOrder: 4, requiresNote: true, priorityLabel: "FOLLOW_UP" as ActionPriorityLabel, priorityOrder: 2, triggersOpportunity: false, triggersCallback: false },
    { code: "RAPPEL", label: "Rappel", color: "#7950F2", sortOrder: 5, requiresNote: true, priorityLabel: "CALLBACK" as ActionPriorityLabel, priorityOrder: 1, triggersOpportunity: false, triggersCallback: true },
    
    // Management & contact statuses
    { code: "GERE_PAR_SIEGE", label: "Géré par le siège", color: "#40C057", sortOrder: 6, requiresNote: true, priorityLabel: "SKIP" as ActionPriorityLabel, priorityOrder: 999, triggersOpportunity: false, triggersCallback: false },
    { code: "FAUX_NUMERO", label: "Faux numéro", color: "#868E96", sortOrder: 7, requiresNote: false, priorityLabel: "SKIP" as ActionPriorityLabel, priorityOrder: 999, triggersOpportunity: false, triggersCallback: false },
    { code: "MAUVAIS_INTERLOCUTEUR", label: "Mauvais interlocuteur", color: "#ADB5BD", sortOrder: 8, requiresNote: false, priorityLabel: "SKIP" as ActionPriorityLabel, priorityOrder: 999, triggersOpportunity: false, triggersCallback: false },
    { code: "BARRAGE_SECRETAIRE", label: "Barrage secrétaire", color: "#FFC078", sortOrder: 9, requiresNote: true, priorityLabel: "RETRY" as ActionPriorityLabel, priorityOrder: 4, triggersOpportunity: false, triggersCallback: false },
    
    // Project & targeting statuses
    { code: "PROJET_A_SUIVRE", label: "Projet à suivre", color: "#69DB7C", sortOrder: 10, requiresNote: true, priorityLabel: "FOLLOW_UP" as ActionPriorityLabel, priorityOrder: 2, triggersOpportunity: true, triggersCallback: false },
    { code: "HORS_CIBLE", label: "Hors cible", color: "#FF922B", sortOrder: 11, requiresNote: false, priorityLabel: "SKIP" as ActionPriorityLabel, priorityOrder: 999, triggersOpportunity: false, triggersCallback: false },
    
    // Email statuses
    { code: "MAIL_UNIQUEMENT", label: "Mail uniquement", color: "#74C0FC", sortOrder: 12, requiresNote: false, priorityLabel: "SKIP" as ActionPriorityLabel, priorityOrder: 999, triggersOpportunity: false, triggersCallback: false },
    { code: "MAIL_DOC", label: "Mail doc", color: "#4DABF7", sortOrder: 13, requiresNote: true, priorityLabel: "SKIP" as ActionPriorityLabel, priorityOrder: 999, triggersOpportunity: false, triggersCallback: false },
];

async function seedGlobalStatuses() {
    console.log("🌱 Seeding GLOBAL mission status definitions...\n");
    
    for (const def of GLOBAL_STATUS_DEFINITIONS) {
        const status = await prisma.actionStatusDefinition.upsert({
            where: {
                scopeType_scopeId_code: {
                    scopeType: "GLOBAL",
                    scopeId: "",
                    code: def.code,
                },
            },
            update: {
                label: def.label,
                color: def.color,
                sortOrder: def.sortOrder,
                requiresNote: def.requiresNote,
                priorityLabel: def.priorityLabel,
                priorityOrder: def.priorityOrder,
                triggersOpportunity: def.triggersOpportunity,
                triggersCallback: def.triggersCallback,
                isActive: true,
            },
            create: {
                scopeType: "GLOBAL",
                scopeId: "",
                code: def.code,
                label: def.label,
                color: def.color,
                sortOrder: def.sortOrder,
                requiresNote: def.requiresNote,
                priorityLabel: def.priorityLabel,
                priorityOrder: def.priorityOrder,
                triggersOpportunity: def.triggersOpportunity,
                triggersCallback: def.triggersCallback,
                isActive: true,
            },
        });
        console.log(`  ✅ ${status.code}: ${status.label}`);
    }
    
    console.log(`\n🎉 Successfully added ${GLOBAL_STATUS_DEFINITIONS.length} global statuses!`);
}

seedGlobalStatuses()
    .catch((e) => {
        console.error("❌ Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
