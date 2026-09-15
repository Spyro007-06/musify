const { DiscoverService, AlbumService } = require('jiosaavn-sdk');

async function test() {
  const discover = new DiscoverService();
  const album = new AlbumService();

  const newReleases = await discover.getNewReleases();
  console.log('=== RAW NEW RELEASE #1 ===');
  console.log(JSON.stringify(newReleases[0], null, 2));

  // Try fetching the first album by ID to get full details
  if (newReleases[0]?.id) {
    console.log('\n=== ALBUM BY ID ===');
    const detail = await album.getAlbumById(newReleases[0].id);
    console.log(JSON.stringify({ id: detail?.id, name: detail?.name, image: detail?.image }, null, 2));
  }
}
test();
