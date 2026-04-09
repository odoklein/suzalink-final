-- CreateEnum
CREATE TYPE "MeetingConfirmationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SessionTaskRole" AS ENUM ('SDR', 'MANAGER', 'DEV', 'ALWAYS');

-- CreateEnum
CREATE TYPE "SessionTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActionResult" ADD VALUE 'BARRAGE_STANDARD';
ALTER TYPE "ActionResult" ADD VALUE 'NUMERO_KO';
ALTER TYPE "ActionResult" ADD VALUE 'INVALIDE';
ALTER TYPE "ActionResult" ADD VALUE 'MAIL_ENVOYE';
ALTER TYPE "ActionResult" ADD VALUE 'REFUS';
ALTER TYPE "ActionResult" ADD VALUE 'REFUS_ARGU';
ALTER TYPE "ActionResult" ADD VALUE 'REFUS_CATEGORIQUE';
ALTER TYPE "ActionResult" ADD VALUE 'RELANCE';
ALTER TYPE "ActionResult" ADD VALUE 'RAPPEL';
ALTER TYPE "ActionResult" ADD VALUE 'GERE_PAR_SIEGE';
ALTER TYPE "ActionResult" ADD VALUE 'FAUX_NUMERO';
ALTER TYPE "ActionResult" ADD VALUE 'PROJET_A_SUIVRE';
ALTER TYPE "ActionResult" ADD VALUE 'MAUVAIS_INTERLOCUTEUR';
ALTER TYPE "ActionResult" ADD VALUE 'MAIL_UNIQUEMENT';
ALTER TYPE "ActionResult" ADD VALUE 'BARRAGE_SECRETAIRE';
ALTER TYPE "ActionResult" ADD VALUE 'MAIL_DOC';
ALTER TYPE "ActionResult" ADD VALUE 'HORS_CIBLE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'BOOKER';
ALTER TYPE "UserRole" ADD VALUE 'COMMERCIAL';

-- DropForeignKey
ALTER TABLE "Opportunity" DROP CONSTRAINT "Opportunity_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Opportunity" DROP CONSTRAINT "Opportunity_contactId_fkey";

-- AlterTable
ALTER TABLE "Action" 
ADD COLUMN     "callEnrichmentAt" TIMESTAMP(3),
ADD COLUMN     "callEnrichmentError" TEXT,
ADD COLUMN     "callRecordingUrl" TEXT,
ADD COLUMN     "callSummary" TEXT,
ADD COLUMN     "callTranscription" TEXT,
ADD COLUMN     "confirmationStatus" "MeetingConfirmationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "confirmationUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "interlocuteurId" TEXT,
ADD COLUMN     "meetingCategory" TEXT,
ADD COLUMN     "meetingJoinUrl" TEXT,
ADD COLUMN     "meetingPhone" TEXT,
ADD COLUMN     "rdvFiche" JSONB,
ADD COLUMN     "rdvFicheUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ActionStatusDefinition" ADD COLUMN     "resultCategoryCode" TEXT;

-- AlterTable
ALTER TABLE "ApiKey" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ApiKeyUsageLog" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "rdvEmailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ExternalEndpoint" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "List" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "commercialInterlocuteurId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "defaultInterlocuteurId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "interlocuteurId" TEXT,
ALTER COLUMN "lastSignInAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lastConnectedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ClientInterlocuteur" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "title" TEXT,
    "department" TEXT,
    "territory" TEXT,
    "emails" JSONB NOT NULL DEFAULT '[]',
    "phones" JSONB NOT NULL DEFAULT '[]',
    "bookingLinks" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientInterlocuteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SdrDailyFeedback" (
    "id" TEXT NOT NULL,
    "sdrId" TEXT NOT NULL,
    "missionId" TEXT,
    "score" INTEGER NOT NULL,
    "review" TEXT NOT NULL,
    "objections" TEXT,
    "missionComment" TEXT,
    "pagePath" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SdrDailyFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SdrDailyFeedbackMission" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SdrDailyFeedbackMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SystemEmailTemplate" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemEmailTemplate_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ClientSession" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "leexiId" TEXT,
    "recordingUrl" TEXT,
    "crMarkdown" TEXT,
    "summaryEmail" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionTask" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "assignee" TEXT,
    "assigneeRole" "SessionTaskRole" NOT NULL DEFAULT 'ALWAYS',
    "priority" "SessionTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientInterlocuteur_clientId_idx" ON "ClientInterlocuteur"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultCategory_code_key" ON "ResultCategory"("code");

-- CreateIndex
CREATE INDEX "SdrDailyFeedback_sdrId_idx" ON "SdrDailyFeedback"("sdrId");

-- CreateIndex
CREATE INDEX "SdrDailyFeedback_missionId_idx" ON "SdrDailyFeedback"("missionId");

-- CreateIndex
CREATE INDEX "SdrDailyFeedback_submittedAt_idx" ON "SdrDailyFeedback"("submittedAt");

-- CreateIndex
CREATE INDEX "SdrDailyFeedbackMission_missionId_idx" ON "SdrDailyFeedbackMission"("missionId");

-- CreateIndex
CREATE INDEX "SdrDailyFeedbackMission_feedbackId_idx" ON "SdrDailyFeedbackMission"("feedbackId");

-- CreateIndex
CREATE UNIQUE INDEX "SdrDailyFeedbackMission_feedbackId_missionId_key" ON "SdrDailyFeedbackMission"("feedbackId", "missionId");

-- CreateIndex
CREATE INDEX "ClientSession_clientId_idx" ON "ClientSession"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionTask_taskId_key" ON "SessionTask"("taskId");

-- CreateIndex
CREATE INDEX "SessionTask_sessionId_idx" ON "SessionTask"("sessionId");

-- CreateIndex
CREATE INDEX "SessionTask_assigneeRole_idx" ON "SessionTask"("assigneeRole");

-- CreateIndex
CREATE INDEX "SessionTask_doneAt_idx" ON "SessionTask"("doneAt");

-- CreateIndex
CREATE INDEX "SessionTask_taskId_idx" ON "SessionTask"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "User_interlocuteurId_key" ON "User"("interlocuteurId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_interlocuteurId_fkey" FOREIGN KEY ("interlocuteurId") REFERENCES "ClientInterlocuteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInterlocuteur" ADD CONSTRAINT "ClientInterlocuteur_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_defaultInterlocuteurId_fkey" FOREIGN KEY ("defaultInterlocuteurId") REFERENCES "ClientInterlocuteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_commercialInterlocuteurId_fkey" FOREIGN KEY ("commercialInterlocuteurId") REFERENCES "ClientInterlocuteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_interlocuteurId_fkey" FOREIGN KEY ("interlocuteurId") REFERENCES "ClientInterlocuteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SdrDailyFeedback" ADD CONSTRAINT "SdrDailyFeedback_sdrId_fkey" FOREIGN KEY ("sdrId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SdrDailyFeedback" ADD CONSTRAINT "SdrDailyFeedback_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SdrDailyFeedbackMission" ADD CONSTRAINT "SdrDailyFeedbackMission_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "SdrDailyFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SdrDailyFeedbackMission" ADD CONSTRAINT "SdrDailyFeedbackMission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSession" ADD CONSTRAINT "ClientSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTask" ADD CONSTRAINT "SessionTask_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClientSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTask" ADD CONSTRAINT "SessionTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;


