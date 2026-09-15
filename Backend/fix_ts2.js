const fs = require('fs');
let file = 'd:/MUSIFY/Backend/src/services/recommendation.service.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/some\(lang =>/g, 'some((lang: any) =>');
content = content.replace(/some\(g =>/g, 'some((g: any) =>');
fs.writeFileSync(file, content);
