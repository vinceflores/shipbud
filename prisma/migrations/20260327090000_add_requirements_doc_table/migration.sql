-- Create Requirements doc table
CREATE TABLE IF NOT EXISTS "ProjectRequirementsDoc" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "markdown" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectRequirementsDoc_pkey" PRIMARY KEY ("id")
);

-- Unique per project
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectRequirementsDoc_projectId_key" ON "ProjectRequirementsDoc"("projectId");

-- Add requirements doc reference on SDLC state
ALTER TABLE "ProjectSdlcState" ADD COLUMN IF NOT EXISTS "requirementsDocId" UUID;
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectSdlcState_requirementsDocId_key" ON "ProjectSdlcState"("requirementsDocId");

-- Foreign keys
ALTER TABLE "ProjectRequirementsDoc"
  ADD CONSTRAINT "ProjectRequirementsDoc_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectSdlcState"
  ADD CONSTRAINT "ProjectSdlcState_requirementsDocId_fkey"
  FOREIGN KEY ("requirementsDocId") REFERENCES "ProjectRequirementsDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;
