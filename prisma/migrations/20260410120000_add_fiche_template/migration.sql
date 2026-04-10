-- FicheTemplate: dynamic, scope-resolvable RDV briefing form
-- Resolution order at read time: (clientId=X, missionId=Y) -> (clientId=X, missionId NULL) -> (clientId NULL, missionId NULL = system default)

CREATE TABLE IF NOT EXISTS "FicheTemplate" (
    "id"        TEXT PRIMARY KEY,
    "clientId"  TEXT,
    "missionId" TEXT,
    "name"      TEXT NOT NULL DEFAULT 'Fiche RDV',
    "fields"    JSONB NOT NULL DEFAULT '[]'::jsonb,
    "isActive"  BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "FicheTemplate_clientId_idx"  ON "FicheTemplate"("clientId");
CREATE INDEX IF NOT EXISTS "FicheTemplate_missionId_idx" ON "FicheTemplate"("missionId");

-- Seed system default template (clientId NULL, missionId NULL) with the legacy 5 fields
INSERT INTO "FicheTemplate" ("id", "clientId", "missionId", "name", "fields", "isActive", "updatedAt")
SELECT
    'fichetpl_default',
    NULL,
    NULL,
    'Fiche RDV (par défaut)',
    '[
      {"key":"contexte","label":"Contexte","type":"textarea","required":false,"order":1,"active":true},
      {"key":"besoinsProblemes","label":"Besoins / Problèmes identifiés","type":"textarea","required":false,"order":2,"active":true},
      {"key":"solutionsEnPlace","label":"Solutions en place","type":"textarea","required":false,"order":3,"active":true},
      {"key":"objectionsFreins","label":"Objections / Freins","type":"textarea","required":false,"order":4,"active":true},
      {"key":"notesImportantes","label":"Notes importantes","type":"textarea","required":false,"order":5,"active":true}
    ]'::jsonb,
    TRUE,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "FicheTemplate" WHERE "clientId" IS NULL AND "missionId" IS NULL
);
