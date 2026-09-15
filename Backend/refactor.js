const fs = require('fs');
const path = require('path');

const file1 = path.join('d:', 'MUSIFY', 'Backend', 'src', 'services', 'recommendation.service.ts');
let content1 = fs.readFileSync(file1, 'utf8');

// Replace userHistory
content1 = content1.replace(/prisma\.userHistory/g, 'prisma.listeningHistory');

// Replace userPreferences calls to use a custom function or inline the fetches
content1 = content1.replace(
  /const prefs = await prisma\.userPreferences\.findUnique\(\{\s*where:\s*\{\s*userId\s*\}\s*\}\);/g,
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
    const userGenres = await prisma.genreAffinity.findMany({ where: { userId }, orderBy: { score: 'desc' }});
    const userArtists = await prisma.artistAffinity.findMany({ where: { userId }, orderBy: { score: 'desc' }});
    if (prefs) {
      prefs.favouriteGenres = userGenres.map(g => g.genre);
      prefs.favouriteArtists = userArtists.map(a => a.spotifyArtistId);
    }
);

fs.writeFileSync(file1, content1);

const file2 = path.join('d:', 'MUSIFY', 'Backend', 'src', 'services', 'ai.service.ts');
if (fs.existsSync(file2)) {
  let content2 = fs.readFileSync(file2, 'utf8');
  content2 = content2.replace(/prisma\.userHistory/g, 'prisma.listeningHistory');
  fs.writeFileSync(file2, content2);
}

console.log('Done refactoring');
