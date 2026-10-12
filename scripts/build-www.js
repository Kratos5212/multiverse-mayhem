// Copies the web game into www/, which Capacitor packages into the Android app.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
const include = ['index.html', 'js', 'shared', 'sim', 'vendor', 'fonts'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const item of include) fs.cpSync(path.join(root, item), path.join(out, item), { recursive: true });
// The game build number, which the apps compare with the newest release to decide whether to update.
const ver = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
fs.writeFileSync(path.join(out, 'version.json'), JSON.stringify({ build: ver.build }) + '\n');
console.log(`Copied ${include.join(', ')} to www/ (game build ${ver.build})`);
