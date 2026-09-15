const fs = require('fs');
const path = require('path');

const file = path.join('d:', 'MUSIFY', 'Backend', 'src', 'services', 'artist.service.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/await prisma\.followedArtist\.findUnique\(\{\s*where:\s*\{\s*userId_spotifyArtistId:\s*\{\s*userId,\s*spotifyArtistId\s*\}\s*\}\s*\}\);/g,
"await prisma.artistAffinity.findUnique({ where: { userId_spotifyArtistId: { userId, spotifyArtistId } } });");

content = content.replace(/await prisma\.followedArtist\.create\(\{\s*data:\s*\{\s*userId,\s*spotifyArtistId\s*\}\s*\}\);/g,
"await prisma.artistAffinity.upsert({ where: { userId_spotifyArtistId: { userId, spotifyArtistId } }, update: { isFollowed: true }, create: { userId, spotifyArtistId, isFollowed: true } });");

content = content.replace(/await prisma\.followedArtist\.delete\(\{\s*where:\s*\{\s*userId_spotifyArtistId:\s*\{\s*userId,\s*spotifyArtistId\s*\}\s*\}\s*\}\);/g,
"await prisma.artistAffinity.update({ where: { userId_spotifyArtistId: { userId, spotifyArtistId } }, data: { isFollowed: false } });");

// fix the boolean check for findUnique (it should check if follow && follow.isFollowed)
content = content.replace(/return !!follow;/g, "return !!follow && follow.isFollowed;");

fs.writeFileSync(file, content);
console.log('Fixed artist.service.ts');
