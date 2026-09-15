const fs = require('fs');
const path = require('path');

const file = path.join('d:', 'MUSIFY', 'Backend', 'src', 'services', 'artist.service.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/if\s*\(\s*existingFollow\s*\)\s*\{\s*return;/g, "if (existingFollow && existingFollow.isFollowed) { return; }");
content = content.replace(/if\s*\(\s*!existingFollow\s*\)\s*\{\s*return;/g, "if (!existingFollow || !existingFollow.isFollowed) { return; }");

fs.writeFileSync(file, content);
