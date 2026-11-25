import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const manifestPath = path.join(projectRoot, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const zipName = `${manifest.id}.zip`;
const outputPath = path.join(projectRoot, zipName);

console.log(`Packaging addon "${manifest.name}" (v${manifest.version}) into ${zipName}...`);

const distDir = path.join(projectRoot, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('Error: dist/ directory does not exist. Run "npm run build" first.');
  process.exit(1);
}

// Create write stream
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`\n🎉 Success! Add-on packaged successfully (${(archive.pointer() / 1024).toFixed(1)} KB)`);
  console.log(`File: ${outputPath}`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Append manifest.json
archive.file(manifestPath, { name: 'manifest.json' });

// Append all files from dist/ directory into dist/
archive.directory(distDir, 'dist');

archive.finalize();
