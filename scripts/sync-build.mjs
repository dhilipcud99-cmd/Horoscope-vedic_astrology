import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const docsDir = path.join(rootDir, 'docs');
const assetsDir = path.join(rootDir, 'assets');

if (!fs.existsSync(distDir)) {
  console.error('dist directory does not exist. Run vite build first.');
  process.exit(1);
}

// Ensure docs and assets directories exist
fs.mkdirSync(docsDir, { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });

const docsAssetsDir = path.join(docsDir, 'assets');
if (fs.existsSync(docsAssetsDir)) {
  const oldDocsAssets = fs.readdirSync(docsAssetsDir);
  for (const file of oldDocsAssets) {
    if (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.svg') || file.endsWith('.jpg') || file.endsWith('.png')) {
      try {
        fs.unlinkSync(path.join(docsAssetsDir, file));
      } catch (e) {}
    }
  }
}

// Copy dist to docs
fs.cpSync(distDir, docsDir, { recursive: true });

// Copy dist/index.html to root
fs.copyFileSync(path.join(distDir, 'index.html'), path.join(rootDir, 'index.html'));

// Clean and copy assets to root/assets
if (fs.existsSync(path.join(distDir, 'assets'))) {
  // Remove old js and css hashed files in root/assets
  const oldAssets = fs.readdirSync(assetsDir);
  for (const file of oldAssets) {
    if (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.svg') || file.endsWith('.jpg') || file.endsWith('.png')) {
      try {
        fs.unlinkSync(path.join(assetsDir, file));
      } catch (e) {}
    }
  }
  
  // Copy new assets
  fs.cpSync(path.join(distDir, 'assets'), assetsDir, { recursive: true });
}

console.log('✓ Successfully synced dist build to docs/ and root for GitHub Pages.');
