-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "companions" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "socialKey" TEXT,
ADD COLUMN     "sourceEntryKey" TEXT,
ADD COLUMN     "sourceKind" VARCHAR(20),
ADD COLUMN     "sourceUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "handle" VARCHAR(50);
UPDATE "User" SET "handle" = 'user-' || replace("id", '-', '');
ALTER TABLE "User" ALTER COLUMN "handle" SET NOT NULL;

-- CreateTable
CREATE TABLE "Friendship" (
    "lowId" TEXT NOT NULL,
    "highId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("lowId","highId")
);

-- CreateTable
CREATE TABLE "Follow" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "entryId" TEXT,
    "sourceKey" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Friendship_highId_idx" ON "Friendship"("highId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE INDEX "Recommendation_recipientId_handledAt_createdAt_idx" ON "Recommendation"("recipientId", "handledAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_senderId_recipientId_sourceKey_key" ON "Recommendation"("senderId", "recipientId", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_userId_socialKey_key" ON "Entry"("userId", "socialKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_lowId_fkey" FOREIGN KEY ("lowId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_highId_fkey" FOREIGN KEY ("highId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_pair_check" CHECK ("lowId" < "highId" AND "requestedById" IN ("lowId", "highId"));
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_self_check" CHECK ("followerId" <> "followingId");
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_self_check" CHECK ("senderId" <> "recipientId");
