-- Add MEETING_BOOKED_FORM to ActionResult enum (RDV planifié avec fiche de renseignement)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ActionResult' AND e.enumlabel = 'MEETING_BOOKED_FORM'
  ) THEN
    ALTER TYPE "ActionResult" ADD VALUE 'MEETING_BOOKED_FORM';
  END IF;
END
$$;

-- Formulaire: prospection fiche de renseignement captured during a booked meeting flow.
CREATE TABLE IF NOT EXISTS "Formulaire" (
    "id"          TEXT PRIMARY KEY,
    "missionId"   TEXT NOT NULL,
    "clientId"    TEXT NOT NULL,
    "contactId"   TEXT,
    "companyId"   TEXT,
    "actionId"    TEXT,
    "createdById" TEXT NOT NULL,
    "title"       TEXT NOT NULL DEFAULT 'Fiche de renseignement',
    "content"     TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "Formulaire_missionId_idx" ON "Formulaire"("missionId");
CREATE INDEX IF NOT EXISTS "Formulaire_clientId_idx"  ON "Formulaire"("clientId");
CREATE INDEX IF NOT EXISTS "Formulaire_contactId_idx" ON "Formulaire"("contactId");
CREATE INDEX IF NOT EXISTS "Formulaire_companyId_idx" ON "Formulaire"("companyId");
CREATE INDEX IF NOT EXISTS "Formulaire_actionId_idx"  ON "Formulaire"("actionId");

ALTER TABLE "Formulaire"
    ADD CONSTRAINT "Formulaire_missionId_fkey"
    FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Formulaire"
    ADD CONSTRAINT "Formulaire_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Formulaire"
    ADD CONSTRAINT "Formulaire_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Formulaire"
    ADD CONSTRAINT "Formulaire_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Formulaire"
    ADD CONSTRAINT "Formulaire_actionId_fkey"
    FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Formulaire"
    ADD CONSTRAINT "Formulaire_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
