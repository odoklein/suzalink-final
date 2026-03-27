-- ============================================
-- GLOBAL MISSION STATUS DEFINITIONS
-- Add custom French status codes for missions
-- ============================================

-- Delete existing global statuses first (optional - remove if you want to keep existing)
-- DELETE FROM "ActionStatusDefinition" WHERE "scopeType" = 'GLOBAL';

-- Insert new GLOBAL status definitions
INSERT INTO "ActionStatusDefinition" (
    "id",
    "scopeType",
    "scopeId",
    "code",
    "label",
    "color",
    "sortOrder",
    "requiresNote",
    "priorityLabel",
    "priorityOrder",
    "triggersOpportunity",
    "triggersCallback",
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES
-- Basic refusal statuses
(gen_random_uuid(), 'GLOBAL', '', 'REFUS', 'Refus', '#FF6B6B', 1, false, 'SKIP', 999, false, false, true, NOW(), NOW()),
(gen_random_uuid(), 'GLOBAL', '', 'REFUS_ARGU', 'Refus argu', '#FF8787', 2, true, 'SKIP', 999, false, false, true, NOW(), NOW()),
(gen_random_uuid(), 'GLOBAL', '', 'REFUS_CATEGORIQUE', 'Refus catégorique', '#FA5252', 3, false, 'SKIP', 999, false, false, true, NOW(), NOW()),

-- Follow-up & callback statuses
(gen_random_uuid(), 'GLOBAL', '', 'RELANCE', 'Relance', '#339AF0', 4, true, 'FOLLOW_UP', 2, false, false, true, NOW(), NOW()),
(gen_random_uuid(), 'GLOBAL', '', 'RAPPEL', 'Rappel', '#7950F2', 5, true, 'CALLBACK', 1, false, true, true, NOW(), NOW()),

-- Management & contact statuses
(gen_random_uuid(), 'GLOBAL', '', 'GERE_PAR_SIEGE', 'Géré par le siège', '#40C057', 6, true, 'SKIP', 999, false, false, true, NOW(), NOW()),
(gen_random_uuid(), 'GLOBAL', '', 'FAUX_NUMERO', 'Faux numéro', '#868E96', 7, false, 'SKIP', 999, false, false, true, NOW(), NOW()),
(gen_random_uuid(), 'GLOBAL', '', 'MAUVAIS_INTERLOCUTEUR', 'Mauvais interlocuteur', '#ADB5BD', 8, false, 'SKIP', 999, false, false, true, NOW(), NOW()),
(gen_random_uuid(), 'GLOBAL', '', 'BARRAGE_SECRETAIRE', 'Barrage secrétaire', '#FFC078', 9, true, 'RETRY', 4, false, false, true, NOW(), NOW()),

-- Project & targeting statuses
(gen_random_uuid(), 'GLOBAL', '', 'PROJET_A_SUIVRE', 'Projet à suivre', '#69DB7C', 10, true, 'FOLLOW_UP', 2, true, false, true, NOW(), NOW()),
(gen_random_uuid(), 'GLOBAL', '', 'HORS_CIBLE', 'Hors cible', '#FF922B', 11, false, 'SKIP', 999, false, false, true, NOW(), NOW()),

-- Email statuses
(gen_random_uuid(), 'GLOBAL', '', 'MAIL_UNIQUEMENT', 'Mail uniquement', '#74C0FC', 12, false, 'SKIP', 999, false, false, true, NOW(), NOW()),
(gen_random_uuid(), 'GLOBAL', '', 'MAIL_DOC', 'Mail doc', '#4DABF7', 13, true, 'SKIP', 999, false, false, true, NOW(), NOW())

ON CONFLICT ("scopeType", "scopeId", "code") DO UPDATE SET
    "label" = EXCLUDED."label",
    "color" = EXCLUDED."color",
    "sortOrder" = EXCLUDED."sortOrder",
    "requiresNote" = EXCLUDED."requiresNote",
    "priorityLabel" = EXCLUDED."priorityLabel",
    "priorityOrder" = EXCLUDED."priorityOrder",
    "triggersOpportunity" = EXCLUDED."triggersOpportunity",
    "triggersCallback" = EXCLUDED."triggersCallback",
    "isActive" = true,
    "updatedAt" = NOW();
