CREATE TYPE "ContentType" AS ENUM ('book', 'film', 'series', 'theatre', 'album', 'exhibition');

CREATE TYPE "TheatreGenre" AS ENUM ('theatre', 'opera', 'ballet', 'musical', 'other');

CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" VARCHAR(10000) NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "date" VARCHAR(10),
    "dateStart" VARCHAR(10),
    "photo" TEXT,
    "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "primaryPhotoIndex" INTEGER,
    "theatreGenre" "TheatreGenre",
    "venue" VARCHAR(200),
    "artist" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Entry_month_idx" ON "Entry"("month");

CREATE INDEX "Entry_type_idx" ON "Entry"("type");
