CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" VARCHAR(254) NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "Session" (
  "tokenHash" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
ALTER TABLE "Entry" ADD COLUMN "userId" TEXT REFERENCES "User"("id");
CREATE INDEX "Entry_userId_idx" ON "Entry"("userId");

-- Existing anonymous collection cleared at the owner’s explicit request.
DELETE FROM "Entry" WHERE "userId" IS NULL;
