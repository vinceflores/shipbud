-- Create separate SDLC doc tables
CREATE TABLE IF NOT EXISTS "ProjectDesignDoc" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "markdown" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectDesignDoc_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectRtmDoc" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "markdown" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectRtmDoc_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectTestsDoc" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL,
  "markdown" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTestsDoc_pkey" PRIMARY KEY ("id")
);

-- Uniques per project
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectDesignDoc_projectId_key" ON "ProjectDesignDoc"("projectId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectRtmDoc_projectId_key" ON "ProjectRtmDoc"("projectId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectTestsDoc_projectId_key" ON "ProjectTestsDoc"("projectId");

-- Add columns to ProjectSdlcState
ALTER TABLE "ProjectSdlcState" ADD COLUMN IF NOT EXISTS "designDocId" UUID;
ALTER TABLE "ProjectSdlcState" ADD COLUMN IF NOT EXISTS "rtmDocId" UUID;
ALTER TABLE "ProjectSdlcState" ADD COLUMN IF NOT EXISTS "testsDocId" UUID;

-- Add unique indexes for the optional FK columns
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectSdlcState_designDocId_key" ON "ProjectSdlcState"("designDocId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectSdlcState_rtmDocId_key" ON "ProjectSdlcState"("rtmDocId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectSdlcState_testsDocId_key" ON "ProjectSdlcState"("testsDocId");

-- Foreign keys and cascading behavior
ALTER TABLE "ProjectDesignDoc"
  ADD CONSTRAINT "ProjectDesignDoc_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectRtmDoc"
  ADD CONSTRAINT "ProjectRtmDoc_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectTestsDoc"
  ADD CONSTRAINT "ProjectTestsDoc_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectSdlcState"
  ADD CONSTRAINT "ProjectSdlcState_designDocId_fkey"
  FOREIGN KEY ("designDocId") REFERENCES "ProjectDesignDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectSdlcState"
  ADD CONSTRAINT "ProjectSdlcState_rtmDocId_fkey"
  FOREIGN KEY ("rtmDocId") REFERENCES "ProjectRtmDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectSdlcState"
  ADD CONSTRAINT "ProjectSdlcState_testsDocId_fkey"
  FOREIGN KEY ("testsDocId") REFERENCES "ProjectTestsDoc"("id") ON DELETE SET NULL ON UPDATE CASCADE;
