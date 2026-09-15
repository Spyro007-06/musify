import { prisma } from './src/config/database';
import { PlaylistService } from './src/services/playlist.service';
import { MusicService } from './src/services/music.service';

async function test() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No user found in DB');
      return;
    }
    console.log(`Testing for user: ${user.username} (${user.id})`);

    console.log('Calling PlaylistService.getPlaylists...');
    const playlists = await PlaylistService.getPlaylists(user.id);
    console.log(`Success! Playlists count: ${playlists.length}`);

    console.log('Calling MusicService.getLikedSongs...');
    const liked = await MusicService.getLikedSongs(user.id, 1, 50);
    console.log(`Success! Liked count: ${liked.length}`);

    console.log('Calling MusicService.getRecentlyPlayed...');
    const recent = await MusicService.getRecentlyPlayed(user.id, 1, 20);
    console.log(`Success! Recently played count: ${recent.length}`);
  } catch (err) {
    console.error('Error during library test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
