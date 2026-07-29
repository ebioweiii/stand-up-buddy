'use strict';

// Renders the procedural Buddy character (src/trayIcon.js) to build/icon.png,
// the single source electron-builder uses to auto-generate .icns / .ico.
// Run with: npm run generate-icon

const fs = require('fs');
const path = require('path');
const { app, nativeImage } = require('electron');
const { createAppIconBuffer } = require('../src/trayIcon');

app.whenReady().then(() => {
  const { buffer, size } = createAppIconBuffer(58); // 18 * 58 = 1044px, square
  const image = nativeImage.createFromBuffer(buffer, { width: size, height: size });
  const outDir = path.join(__dirname, '..', 'build');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'icon.png'), image.toPNG());
  console.log(`Wrote build/icon.png (${size}x${size})`);
  app.quit();
});
