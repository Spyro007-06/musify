-- Playlist track order: existing tracks keep the order they were added in.
ALTER TABLE "PlaylistTrack" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

UPDATE "PlaylistTrack" AS pt
SET "position" = ordered.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "playlistId" ORDER BY "addedAt", "id") - 1 AS rn
  FROM "PlaylistTrack"
) AS ordered
WHERE pt."id" = ordered."id";

CREATE INDEX "PlaylistTrack_playlistId_position_idx" ON "PlaylistTrack"("playlistId", "position");

-- SessionHistory was never written to; drop it and the column pointing at it.
ALTER TABLE "ListeningHistory" DROP CONSTRAINT "ListeningHistory_sessionId_fkey";
DROP INDEX "ListeningHistory_sessionId_idx";
ALTER TABLE "ListeningHistory" DROP COLUMN "sessionId";

ALTER TABLE "SessionHistory" DROP CONSTRAINT "SessionHistory_userId_fkey";
DROP TABLE "SessionHistory";
