ALTER TYPE "ContentType" ADD VALUE 'concert';
ALTER TYPE "ContentType" ADD VALUE 'podcast';
ALTER TYPE "ContentType" ADD VALUE 'lecture';
ALTER TYPE "ContentType" ADD VALUE 'custom';
CREATE TYPE "ReviewVisibility" AS ENUM ('private', 'friends');
ALTER TABLE "User" ADD COLUMN "plansVisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "passwordResetRequestedAt" TIMESTAMP(3);
CREATE TABLE "CustomCategory" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "name" VARCHAR(60) NOT NULL,
  "normalizedName" VARCHAR(60) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CustomCategory_userId_normalizedName_key" ON "CustomCategory"("userId", "normalizedName");
CREATE TABLE "CategorySetting" (
  "userId" TEXT NOT NULL, "categoryKey" VARCHAR(100) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "reviewVisibility" "ReviewVisibility" NOT NULL DEFAULT 'private',
  CONSTRAINT "CategorySetting_pkey" PRIMARY KEY ("userId", "categoryKey"),
  CONSTRAINT "CategorySetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE "Entry" ADD COLUMN "customCategoryId" TEXT;
ALTER TABLE "Entry" ADD COLUMN "reviewVisibility" "ReviewVisibility";
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_customCategoryId_fkey" FOREIGN KEY ("customCategoryId") REFERENCES "CustomCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Entry_customCategoryId_idx" ON "Entry"("customCategoryId");
CREATE TABLE "PasswordReset" (
  "tokenHash" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("tokenHash"),
  CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");
CREATE INDEX "PasswordReset_expiresAt_idx" ON "PasswordReset"("expiresAt");
