CREATE TYPE "EntryStatus" AS ENUM ('done', 'plan');
ALTER TABLE "Entry"
  ADD COLUMN "status" "EntryStatus" NOT NULL DEFAULT 'done',
  ADD COLUMN "plannedDate" VARCHAR(10),
  ALTER COLUMN "rating" DROP NOT NULL,
  ALTER COLUMN "month" DROP NOT NULL;
CREATE INDEX "Entry_status_idx" ON "Entry"("status");
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_status_fields_check" CHECK (
  ("status" = 'done' AND "rating" IS NOT NULL AND "rating" BETWEEN 1 AND 10 AND "month" IS NOT NULL)
  OR
  ("status" = 'plan' AND "rating" IS NULL AND "month" IS NULL AND "date" IS NULL AND "dateStart" IS NULL)
);
