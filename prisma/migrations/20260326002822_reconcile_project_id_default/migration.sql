-- Reconcile drift: DB has a default on Project.id, but the initial migration did not.
-- This aligns Prisma migration history with the live database without resetting data.

ALTER TABLE "Project" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
