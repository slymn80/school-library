const { rcedit } = require('rcedit');
const path = require('path');
const fs = require('fs');

const exePath = path.join(__dirname, '..', 'build-output', 'win-unpacked', 'School Library.exe');
const icoPath = path.join(__dirname, '..', 'public', 'icon.ico');

if (!fs.existsSync(exePath)) {
  console.error('EXE not found:', exePath);
  process.exit(1);
}

if (!fs.existsSync(icoPath)) {
  console.error('ICO not found:', icoPath);
  process.exit(1);
}

console.log('Patching icon...');
rcedit(exePath, { icon: icoPath })
  .then(() => console.log('Icon patched successfully'))
  .catch(err => { console.error('Failed to patch icon:', err); process.exit(1); });
