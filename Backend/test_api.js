async function testAll() {
  // Test trending
  const t = await fetch('http://localhost:3001/api/music/trending');
  const tData = await t.json();
  console.log('=== TRENDING (first 2) ===');
  tData.data.slice(0, 2).forEach(item => console.log({ id: item.id, title: item.title, artwork: item.artwork, audioUrl: item.audioUrl?.slice(0, 60) }));

  // Test new releases
  const n = await fetch('http://localhost:3001/api/music/new-releases');
  const nData = await n.json();
  console.log('\n=== NEW RELEASES (first 3) ===');
  nData.data.slice(0, 3).forEach(item => console.log({ id: item.id, title: item.title, artwork: item.artwork, artist: item.artist?.name, tracks: item.tracks?.length }));

  // Test albums
  const a = await fetch('http://localhost:3001/api/music/albums?page=1');
  const aData = await a.json();
  console.log('\n=== ALBUMS (first 3) ===');
  aData.data.results.slice(0, 3).forEach(item => console.log({ id: item.id, title: item.title, artwork: item.artwork, type: item.type }));

  // Test categories
  const c = await fetch('http://localhost:3001/api/music/categories');
  const cData = await c.json();
  console.log('\n=== CATEGORIES ===');
  cData.data.forEach(item => console.log({ id: item.id, name: item.name, cover: item.cover?.slice(0, 60) }));

  // Test recommended
  const r = await fetch('http://localhost:3001/api/music/recommended');
  const rData = await r.json();
  console.log('\n=== RECOMMENDED (first 2) ===');
  rData.data.slice(0, 2).forEach(item => console.log({ id: item.id, title: item.title, artwork: item.artwork }));
}
testAll();
