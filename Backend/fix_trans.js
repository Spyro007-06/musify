const fs = require('fs');

let file = 'd:/MUSIFY/Backend/src/services/recommendation.service.ts';
let content = fs.readFileSync(file, 'utf8');

// logPlayHistory
content = content.replace(/await prisma\.listeningHistory\.create\(\{\s*data:\s*\{[\s\S]*?\}\s*\}\);\s*if\s*\(artistId\s*&&\s*completedSong\)\s*\{\s*await prisma\.artistAffinity\.upsert\(\{\s*where:\s*\{[^}]*\}\s*\},[\s\S]*?create:\s*\{[^}]*\}\s*,\s*\}\);\s*\}\s*if\s*\(genre\s*&&\s*completedSong\)\s*\{\s*await prisma\.genreAffinity\.upsert\(\{\s*where:\s*\{[^}]*\}\s*\},[\s\S]*?create:\s*\{[^}]*\}\s*,\s*\}\);\s*\}\s*\/\/\s*Invalidate recommendation cache\s*await this\.invalidateCache\(userId\);/m, 
    const queries = [];
    queries.push(
      prisma.listeningHistory.create({
        data: {
          userId,
          spotifyTrackId,
          albumId,
          artistId,
          genre,
          device,
          sessionDuration,
          listenPercentage,
          completedSong: completedSong || false,
          numberOfReplays: numberOfReplays || 0,
        },
      })
    );

    if (artistId && completedSong) {
       queries.push(
         prisma.artistAffinity.upsert({
           where: { userId_spotifyArtistId: { userId, spotifyArtistId: artistId } },
           update: { score: { increment: 1.0 } },
           create: { userId, spotifyArtistId: artistId, score: 1.0 },
         })
       );
    }

    if (genre && completedSong) {
       queries.push(
         prisma.genreAffinity.upsert({
           where: { userId_genre: { userId, genre: genre.toLowerCase() } },
           update: { score: { increment: 1.0 } },
           create: { userId, genre: genre.toLowerCase(), score: 1.0 },
         })
       );
    }
    
    queries.push(
      prisma.recommendationCache.deleteMany({
        where: { userId },
      })
    );

    await prisma.(queries););

// logLike
content = content.replace(/public static async logLike\(userId: string, targetId: string, type: 'song' \| 'album' \| 'artist'\): Promise<void> \{[\s\S]*?await this\.invalidateCache\(userId\);\s*\}/m, 
  public static async logLike(userId: string, targetId: string, type: 'song' | 'album' | 'artist'): Promise<void> {
    const queries = [];
    if (type === 'song') {
      queries.push(prisma.likedTrack.upsert({
        where: { userId_spotifyTrackId: { userId, spotifyTrackId: targetId } },
        update: {},
        create: { userId, spotifyTrackId: targetId },
      }));
    } else if (type === 'album') {
      queries.push(prisma.likedAlbum.upsert({
        where: { userId_albumId: { userId, albumId: targetId } },
        update: {},
        create: { userId, albumId: targetId },
      }));
    } else if (type === 'artist') {
      queries.push(prisma.artistAffinity.upsert({
        where: { userId_spotifyArtistId: { userId, spotifyArtistId: targetId } },
        update: { score: { increment: 10.0 }, isFollowed: true },
        create: { userId, spotifyArtistId: targetId, score: 20.0, isFollowed: true },
      }));
    }
    queries.push(prisma.recommendationCache.deleteMany({ where: { userId } }));
    await prisma.(queries);
  });

// logSkip
content = content.replace(/public static async logSkip\(userId: string, spotifyTrackId: string, skipTime: number, duration: number\): Promise<void> \{\s*const listenPercentage = duration > 0 \? \(skipTime \/ duration\) \* 100 : 0;\s*await prisma\.listeningHistory\.create\(\{\s*data:\s*\{\s*userId,\s*spotifyTrackId,\s*listenPercentage,\s*completedSong: false,\s*\},\s*\}\);\s*await prisma\.skippedSongs\.create\(\{\s*data:\s*\{\s*userId,\s*spotifyTrackId,\s*skipTime\s*\}\s*\}\);\s*await this\.invalidateCache\(userId\);\s*\}/m, 
  public static async logSkip(userId: string, spotifyTrackId: string, skipTime: number, duration: number): Promise<void> {
    const listenPercentage = duration > 0 ? (skipTime / duration) * 100 : 0;
    const queries = [
      prisma.listeningHistory.create({
        data: { userId, spotifyTrackId, listenPercentage, completedSong: false },
      }),
      prisma.skippedSongs.create({
        data: { userId, spotifyTrackId, skipTime }
      }),
      prisma.recommendationCache.deleteMany({ where: { userId } })
    ];
    await prisma.(queries);
  });

fs.writeFileSync(file, content);
console.log('Fixed transactions in recommendation.service.ts');
