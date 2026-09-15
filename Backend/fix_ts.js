const fs = require('fs');

function replaceFile(path, regex, replacement) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(regex, replacement);
    fs.writeFileSync(path, content);
  }
}

// playlist.service.ts
replaceFile('d:/MUSIFY/Backend/src/services/playlist.service.ts', /\.map\(t => t\.spotifyTrackId\)/g, '.map((t: any) => t.spotifyTrackId)');

// recommendation.service.ts
replaceFile('d:/MUSIFY/Backend/src/services/recommendation.service.ts', /prisma\.followedArtist\.findMany\(/g, 'prisma.artistAffinity.findMany(');
replaceFile('d:/MUSIFY/Backend/src/services/recommendation.service.ts', /\.map\(f => /g, '.map((f: any) => ');
replaceFile('d:/MUSIFY/Backend/src/services/recommendation.service.ts', /for\s*\(const\s+lang\s+of/g, 'for (const lang of <any[]>');
replaceFile('d:/MUSIFY/Backend/src/services/recommendation.service.ts', /\.filter\(t =>/g, '.filter((t: any) =>');
replaceFile('d:/MUSIFY/Backend/src/services/recommendation.service.ts', /\.map\(lang =>/g, '.map((lang: any) =>');
replaceFile('d:/MUSIFY/Backend/src/services/recommendation.service.ts', /\.map\(g => /g, '.map((g: any) => ');
replaceFile('d:/MUSIFY/Backend/src/services/recommendation.service.ts', /\.map\(a => /g, '.map((a: any) => ');
replaceFile('d:/MUSIFY/Backend/src/services/recommendation.service.ts', /h =>/g, '(h: any) =>');
replaceFile('d:/MUSIFY/Backend/src/services/recommendation.service.ts', /fav =>/g, '(fav: any) =>');
replaceFile('d:/MUSIFY/Backend/src/services/recommendation.service.ts', /r =>/g, '(r: any) =>');
replaceFile('d:/MUSIFY/Backend/src/services/recommendation.service.ts', /art =>/g, '(art: any) =>');

// ai.controller.ts return fixes
let aiCtrl = fs.readFileSync('d:/MUSIFY/Backend/src/controllers/ai.controller.ts', 'utf8');
aiCtrl = aiCtrl.replace(/res\.status\(200\)\.json\(/g, 'return res.status(200).json(');
aiCtrl = aiCtrl.replace(/res\.status\(500\)\.json\(/g, 'return res.status(500).json(');
fs.writeFileSync('d:/MUSIFY/Backend/src/controllers/ai.controller.ts', aiCtrl);

console.log('Fixed typings');
