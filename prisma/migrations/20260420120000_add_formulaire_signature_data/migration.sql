-- AlterTable: add optional signature drawing (base64 PNG) field
ALTER TABLE "Formulaire"
ADD COLUMN IF NOT EXISTS "signatureData" TEXT;
