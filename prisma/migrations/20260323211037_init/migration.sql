-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PhaseType" AS ENUM ('PLANNING', 'DESIGN', 'DEV', 'TESTING', 'DEPLOY');

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('LOCKED', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "ItemSource" AS ENUM ('AI', 'USER');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('OBSTACLE', 'WIN', 'DECISION');

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('MANUAL', 'AUTO_DRAFT');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('COMMIT', 'JOURNAL_ENTRY');

-- CreateEnum
CREATE TYPE "DriftStatus" AS ENUM ('WATCHING', 'DRIFTED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ContentSource" AS ENUM ('PHASE', 'FULL_PROJECT', 'OBSTACLE');

-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('TWITTER_POST', 'README', 'BUILD_STORY', 'OBSTACLE_POST');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('DRAFT', 'EDITED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'PRO');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3),
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repo" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "githubRepoUrl" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Repo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "PhaseType" NOT NULL,
    "status" "PhaseStatus" NOT NULL DEFAULT 'LOCKED',
    "position" INTEGER NOT NULL,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'TODO',
    "source" "ItemSource" NOT NULL DEFAULT 'AI',
    "position" INTEGER NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'TODO',
    "source" "ItemSource" NOT NULL DEFAULT 'AI',
    "position" INTEGER NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phaseId" TEXT,
    "milestoneId" TEXT,
    "type" "EntryType" NOT NULL,
    "source" "EntrySource" NOT NULL DEFAULT 'MANUAL',
    "status" "EntryStatus" NOT NULL DEFAULT 'CONFIRMED',
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "lastActivityType" "ActivityType" NOT NULL,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "activityLogId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriftMonitor" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "thresholdHours" INTEGER NOT NULL DEFAULT 24,
    "status" "DriftStatus" NOT NULL DEFAULT 'WATCHING',
    "lastCheckedAt" TIMESTAMP(3),

    CONSTRAINT "DriftMonitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriftNotification" (
    "id" TEXT NOT NULL,
    "driftMonitorId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "currentPhase" "PhaseType" NOT NULL,
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'SENT',

    CONSTRAINT "DriftNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "source" "ContentSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "formats" "ContentFormat"[],
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDraft" (
    "id" TEXT NOT NULL,
    "contentRequestId" TEXT NOT NULL,
    "format" "ContentFormat" NOT NULL,
    "body" TEXT NOT NULL,
    "editedBody" TEXT,
    "status" "DraftStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "ContentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubId" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL DEFAULT 'FREE',
    "status" TEXT NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Repo_projectId_key" ON "Repo"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLog_projectId_key" ON "ActivityLog"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DriftMonitor_projectId_key" ON "DriftMonitor"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_ownerId_key" ON "Subscription"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubId_key" ON "Subscription"("stripeSubId");

-- AddForeignKey
ALTER TABLE "Repo" ADD CONSTRAINT "Repo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phase" ADD CONSTRAINT "Phase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_activityLogId_fkey" FOREIGN KEY ("activityLogId") REFERENCES "ActivityLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriftMonitor" ADD CONSTRAINT "DriftMonitor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriftNotification" ADD CONSTRAINT "DriftNotification_driftMonitorId_fkey" FOREIGN KEY ("driftMonitorId") REFERENCES "DriftMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRequest" ADD CONSTRAINT "ContentRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_contentRequestId_fkey" FOREIGN KEY ("contentRequestId") REFERENCES "ContentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
