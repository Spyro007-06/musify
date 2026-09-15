import { prisma } from './src/config/database';

async function fixOrphansInTable(tableName: string, modelClient: any) {
  try {
    console.log(`Checking ${tableName} for orphaned records...`);
    const records = await modelClient.findMany({
      select: { id: true, userId: true }
    });
    
    const users = await prisma.user.findMany({
      select: { id: true }
    });
    const userIds = new Set(users.map(u => u.id));
    
    const orphans = records.filter((r: any) => !userIds.has(r.userId));
    console.log(`Found ${orphans.length} orphans in ${tableName}`);
    
    if (orphans.length > 0) {
      const orphanIds = orphans.map((o: any) => o.id);
      const res = await modelClient.deleteMany({
        where: { id: { in: orphanIds } }
      });
      console.log(`Deleted ${res.count} orphaned records from ${tableName}`);
    }
  } catch (err: any) {
    if (err.code === 'P2021') {
      console.log(`Table ${tableName} does not exist yet. Skipping.`);
    } else {
      console.error(`Error checking ${tableName}:`, err.message);
    }
  }
}

async function test() {
  try {
    const clients = [
      { name: 'UserPreferences', client: prisma.userPreferences },
      { name: 'RecommendationCache', client: prisma.recommendationCache },
      { name: 'RecommendationScores', client: prisma.recommendationScores },
      { name: 'LikedTrack', client: prisma.likedTrack },
      { name: 'LikedAlbum', client: prisma.likedAlbum },
      { name: 'DislikedSong', client: prisma.dislikedSong },
      { name: 'SearchHistory', client: prisma.searchHistory },
      { name: 'SessionHistory', client: prisma.sessionHistory },
    ];

    for (const item of clients) {
      await fixOrphansInTable(item.name, item.client);
    }
    
    // Playlist has ownerId instead of userId
    try {
      console.log('Checking Playlist for orphaned records...');
      const playlists = await prisma.playlist.findMany({ select: { id: true, ownerId: true } });
      const users = await prisma.user.findMany({ select: { id: true } });
      const userIds = new Set(users.map(u => u.id));
      const orphans = playlists.filter(p => !userIds.has(p.ownerId));
      console.log(`Found ${orphans.length} orphans in Playlist`);
      if (orphans.length > 0) {
        const res = await prisma.playlist.deleteMany({ where: { id: { in: orphans.map(o => o.id) } } });
        console.log(`Deleted ${res.count} orphaned Playlists`);
      }
    } catch (err: any) {
      console.error('Error checking Playlist:', err.message);
    }
    
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
