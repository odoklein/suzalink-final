-- CreateEnum
CREATE TYPE "FormulaireStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED');

-- AlterTable
ALTER TABLE "Formulaire"
ADD COLUMN "status" "FormulaireStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "signToken" TEXT,
ADD COLUMN "sentToEmail" TEXT,
ADD COLUMN "sentAt" TIMESTAMP(3),
ADD COLUMN "signedAt" TIMESTAMP(3),
ADD COLUMN "signedBy" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Formulaire_signToken_key" ON "Formulaire"("signToken");

-- CreateIndex
CREATE INDEX "Formulaire_status_idx" ON "Formulaire"("status");
