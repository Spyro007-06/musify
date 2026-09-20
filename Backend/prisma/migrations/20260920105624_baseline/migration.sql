-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ARTIST', 'ADMIN', 'SUPERADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Playlist" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistTrack" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "spotifyTrackId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaylistTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LikedTrack" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spotifyTrackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LikedTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LikedAlbum" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LikedAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DislikedSong" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spotifyTrackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DislikedSong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "device" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "SessionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "spotifyTrackId" TEXT NOT NULL,
    "albumId" TEXT,
    "artistId" TEXT,
    "genre" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device" TEXT,
    "sessionDuration" INTEGER,
    "listenPercentage" DOUBLE PRECISION,
    "completedSong" BOOLEAN NOT NULL DEFAULT false,
    "numberOfReplays" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ListeningHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkippedSongs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spotifyTrackId" TEXT NOT NULL,
    "skipTime" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkippedSongs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "isImplicit" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoodHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "favouriteLanguages" TEXT[],
    "favouriteAlbums" TEXT[],
    "favouriteArtists" TEXT[],
    "favouriteGenres" TEXT[],
    "favouriteMoods" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenreAffinity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenreAffinity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistAffinity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spotifyArtistId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isFollowed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistAffinity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationScores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spotifyTrackId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationScores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "cachedData" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Playlist_ownerId_idx" ON "Playlist"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistTrack_playlistId_spotifyTrackId_key" ON "PlaylistTrack"("playlistId", "spotifyTrackId");

-- CreateIndex
CREATE UNIQUE INDEX "LikedTrack_userId_spotifyTrackId_key" ON "LikedTrack"("userId", "spotifyTrackId");

-- CreateIndex
CREATE INDEX "LikedAlbum_userId_idx" ON "LikedAlbum"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LikedAlbum_userId_albumId_key" ON "LikedAlbum"("userId", "albumId");

-- CreateIndex
CREATE INDEX "DislikedSong_userId_idx" ON "DislikedSong"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DislikedSong_userId_spotifyTrackId_key" ON "DislikedSong"("userId", "spotifyTrackId");

-- CreateIndex
CREATE INDEX "SessionHistory_userId_startTime_idx" ON "SessionHistory"("userId", "startTime");

-- CreateIndex
CREATE INDEX "ListeningHistory_userId_timestamp_idx" ON "ListeningHistory"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "ListeningHistory_spotifyTrackId_idx" ON "ListeningHistory"("spotifyTrackId");

-- CreateIndex
CREATE INDEX "ListeningHistory_sessionId_idx" ON "ListeningHistory"("sessionId");

-- CreateIndex
CREATE INDEX "SkippedSongs_userId_timestamp_idx" ON "SkippedSongs"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "MoodHistory_userId_timestamp_idx" ON "MoodHistory"("userId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "GenreAffinity_userId_score_idx" ON "GenreAffinity"("userId", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "GenreAffinity_userId_genre_key" ON "GenreAffinity"("userId", "genre");

-- CreateIndex
CREATE INDEX "ArtistAffinity_userId_score_idx" ON "ArtistAffinity"("userId", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistAffinity_userId_spotifyArtistId_key" ON "ArtistAffinity"("userId", "spotifyArtistId");

-- CreateIndex
CREATE INDEX "RecommendationScores_userId_idx" ON "RecommendationScores"("userId");

-- CreateIndex
CREATE INDEX "RecommendationScores_score_idx" ON "RecommendationScores"("score");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationScores_userId_spotifyTrackId_key" ON "RecommendationScores"("userId", "spotifyTrackId");

-- CreateIndex
CREATE INDEX "RecommendationCache_userId_sectionType_idx" ON "RecommendationCache"("userId", "sectionType");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationCache_userId_sectionType_key" ON "RecommendationCache"("userId", "sectionType");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_createdAt_idx" ON "SearchHistory"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistTrack" ADD CONSTRAINT "PlaylistTrack_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikedTrack" ADD CONSTRAINT "LikedTrack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikedAlbum" ADD CONSTRAINT "LikedAlbum_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DislikedSong" ADD CONSTRAINT "DislikedSong_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionHistory" ADD CONSTRAINT "SessionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningHistory" ADD CONSTRAINT "ListeningHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningHistory" ADD CONSTRAINT "ListeningHistory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkippedSongs" ADD CONSTRAINT "SkippedSongs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodHistory" ADD CONSTRAINT "MoodHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenreAffinity" ADD CONSTRAINT "GenreAffinity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistAffinity" ADD CONSTRAINT "ArtistAffinity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationScores" ADD CONSTRAINT "RecommendationScores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationCache" ADD CONSTRAINT "RecommendationCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

