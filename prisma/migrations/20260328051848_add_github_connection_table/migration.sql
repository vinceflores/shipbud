-- AlterTable
ALTER TABLE "ProjectDesignDoc" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectRequirementsDoc" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectRtmDoc" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectTestsDoc" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "GitHubConnection" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'bearer',
    "expiresAt" TIMESTAMP(3),
    "login" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubConnection_userId_key" ON "GitHubConnection"("userId");

-- CreateIndex
CREATE INDEX "GitHubConnection_userId_idx" ON "GitHubConnection"("userId");
