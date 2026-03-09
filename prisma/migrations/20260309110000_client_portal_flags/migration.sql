-- Add client portal visibility flags used in the application
-- These columns back the Prisma fields:
--   Client.portalShowCallHistory  Boolean @default(false)
--   Client.portalShowDatabase     Boolean @default(false)

ALTER TABLE "Client"
ADD COLUMN IF NOT EXISTS "portalShowCallHistory" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "portalShowDatabase"    BOOLEAN NOT NULL DEFAULT FALSE;

