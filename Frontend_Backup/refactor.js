const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const dirsToCreate = [
  'features/auth/store',
  'features/player/components',
  'features/player/services',
  'features/player/store',
  'features/profile/store',
  'features/recommendation/components',
  'shared/components',
  'shared/services',
  'shared/store',
  'shared/utils'
].map(d => path.join(srcDir, d));

dirsToCreate.forEach(d => fs.mkdirSync(d, { recursive: true }));

const moves = [
  // Shared
  { from: 'components/ui', to: 'shared/components/ui' },
  { from: 'components/common', to: 'shared/components/common' },
  { from: 'components/cards', to: 'shared/components/cards' },
  { from: 'components/navbar', to: 'shared/components/navbar' },
  { from: 'components/sidebar', to: 'shared/components/sidebar' },
  { from: 'lib/api-client.ts', to: 'shared/services/api-client.ts' },
  { from: 'lib/utils.ts', to: 'shared/utils/utils.ts' },
  { from: 'store/ui-store.ts', to: 'shared/store/ui-store.ts' },
  
  // Auth
  { from: 'store/auth-store.ts', to: 'features/auth/store/auth-store.ts' },

  // Player
  { from: 'components/player', to: 'features/player/components' },
  { from: 'lib/audio.ts', to: 'features/player/services/audio.ts' },
  { from: 'store/player-store.ts', to: 'features/player/store/player-store.ts' },
  { from: 'store/downloads-store.ts', to: 'features/player/store/downloads-store.ts' },

  // Recommendation
  { from: 'components/dashboard', to: 'features/recommendation/components' },

  // Profile
  { from: 'store/preferences-store.ts', to: 'features/profile/store/preferences-store.ts' },
];

moves.forEach(({ from, to }) => {
  const src = path.join(srcDir, from);
  const dest = path.join(srcDir, to);
  if (fs.existsSync(src)) {
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
      fs.rmSync(src, { recursive: true, force: true });
    } else {
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
    }
  }
});

const importReplacements = [
  { from: /@\/components\/ui/g, to: '@/shared/components/ui' },
  { from: /@\/components\/common/g, to: '@/shared/components/common' },
  { from: /@\/components\/cards/g, to: '@/shared/components/cards' },
  { from: /@\/components\/navbar/g, to: '@/shared/components/navbar' },
  { from: /@\/components\/sidebar/g, to: '@/shared/components/sidebar' },
  { from: /@\/components\/player/g, to: '@/features/player/components' },
  { from: /@\/components\/dashboard/g, to: '@/features/recommendation/components' },
  { from: /@\/lib\/api-client/g, to: '@/shared/services/api-client' },
  { from: /@\/lib\/utils/g, to: '@/shared/utils/utils' },
  { from: /@\/lib\/audio/g, to: '@/features/player/services/audio' },
  { from: /@\/store\/ui-store/g, to: '@/shared/store/ui-store' },
  { from: /@\/store\/auth-store/g, to: '@/features/auth/store/auth-store' },
  { from: /@\/store\/player-store/g, to: '@/features/player/store/player-store' },
  { from: /@\/store\/downloads-store/g, to: '@/features/player/store/downloads-store' },
  { from: /@\/store\/preferences-store/g, to: '@/features/profile/store/preferences-store' },
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(srcDir, (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    importReplacements.forEach(({ from, to }) => {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    });
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});

// Cleanup empty directories
const cleanDir = (dir) => {
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
    }
}
cleanDir(path.join(srcDir, 'components'));
cleanDir(path.join(srcDir, 'lib'));
cleanDir(path.join(srcDir, 'store'));

console.log("Refactoring complete.");
