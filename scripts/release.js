// Publishes a new version to the public releases repository, which the Android app and the
// Windows launcher check every time they start.
//
//   node scripts/release.js              new game build only (most updates: apps pick it up by themselves)
//   node scripts/release.js --android    also a new APK (when the native Android app itself changed)
//   node scripts/release.js --windows    also a new launcher .exe (when desktop/launcher changed)
//   add --push to commit and push the releases repository
//
// The releases repository is expected next to this one (../multiverse-mayhem-releases),
// or wherever MM_RELEASES points.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const rel = path.resolve(process.env.MM_RELEASES || path.join(root, '..', 'multiverse-mayhem-releases'));
const args = new Set(process.argv.slice(2));
const run = (cmd, argv, cwd, env) => execFileSync(cmd, argv, { cwd: cwd || root, stdio: 'inherit', env: Object.assign({}, process.env, env || {}) });
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
if (!fs.existsSync(rel)) throw new Error('Releases repository not found at ' + rel);

// 1. Bump the version numbers.
const verFile = path.join(root, 'version.json');
const ver = JSON.parse(fs.readFileSync(verFile, 'utf8'));
ver.build++;
if (args.has('--android')) ver.android++;
if (args.has('--windows')) ver.windows++;
fs.writeFileSync(verFile, JSON.stringify(ver, null, 2) + '\n');
console.log('Releasing game build', ver.build);

// 2. The game files, each with its SHA-256.
run('node', ['scripts/build-www.js']);
const www = path.join(root, 'www');
const gameRel = 'game/' + ver.build + '/';
fs.rmSync(path.join(rel, gameRel), { recursive: true, force: true });
fs.cpSync(www, path.join(rel, gameRel), { recursive: true });
const files = [];
(function walk(dir, prefix) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = prefix + e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), p + '/');
    else { const b = fs.readFileSync(path.join(dir, e.name)); files.push({ p, h: sha(b), s: b.length }); }
  }
})(www, '');

// play/ always holds the newest build, for playing in a browser (and in VR headsets) if the
// releases repository is served with GitHub Pages.
fs.rmSync(path.join(rel, 'play'), { recursive: true, force: true });
fs.cpSync(www, path.join(rel, 'play'), { recursive: true });

const latestFile = path.join(rel, 'latest.json');
const prev = fs.existsSync(latestFile) ? JSON.parse(fs.readFileSync(latestFile, 'utf8')) : {};
const latest = { build: ver.build, date: new Date().toISOString(), game: { base: gameRel, files }, android: prev.android, windows: prev.windows };

// 3. A new APK, signed with the project key so it installs over the old one.
if (args.has('--android')) {
  run('npx', ['cap', 'sync', 'android']);
  run('./gradlew', ['assembleRelease', '-q'], path.join(root, 'android'));
  const apk = fs.readFileSync(path.join(root, 'android/app/build/outputs/apk/release/app-release.apk'));
  fs.mkdirSync(path.join(rel, 'android'), { recursive: true });
  fs.writeFileSync(path.join(rel, 'android/MultiverseMayhem.apk'), apk);
  latest.android = { versionCode: ver.android, apk: 'android/MultiverseMayhem.apk', sha256: sha(apk), size: apk.length };
}

// 4. A new Windows launcher, with this game build inside it for offline play.
if (args.has('--windows')) {
  const lw = path.join(root, 'desktop/launcher/www');
  fs.rmSync(lw, { recursive: true, force: true });
  fs.cpSync(www, lw, { recursive: true });
  const out = path.join(rel, 'windows/MultiverseMayhem.exe');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  run('go', ['build', '-trimpath', '-ldflags', '-H windowsgui -s -w -X main.launcherVersion=' + ver.windows, '-o', out, '.'], path.join(root, 'desktop/launcher'), { GOOS: 'windows', GOARCH: 'amd64', CGO_ENABLED: '0' });
  const exe = fs.readFileSync(out);
  latest.windows = { version: ver.windows, exe: 'windows/MultiverseMayhem.exe', sha256: sha(exe), size: exe.length };
}

fs.writeFileSync(latestFile, JSON.stringify(latest, null, 1) + '\n');

// 5. Keep the last three game builds (players mid-download can still finish).
const gameDir = path.join(rel, 'game');
const builds = fs.readdirSync(gameDir).map(Number).filter(n => n > 0).sort((a, b) => b - a);
for (const b of builds.slice(3)) fs.rmSync(path.join(gameDir, String(b)), { recursive: true, force: true });

console.log('Wrote', path.relative(root, latestFile), '- build', ver.build, '- android', latest.android && latest.android.versionCode, '- windows', latest.windows && latest.windows.version);
if (args.has('--push')) {
  run('git', ['add', '-A'], rel);
  run('git', ['commit', '-q', '-m', 'Release build ' + ver.build], rel);
  run('git', ['push', '-q', 'origin', 'HEAD'], rel);
}
