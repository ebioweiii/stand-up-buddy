'use strict';

// Procedurally draws the "Buddy" pixel character as a raw RGBA bitmap,
// used for the tray icon. No external image assets required.

const { nativeImage } = require('electron');

const GRID = 18;
const CX = 8.5;
const CY = 8.8;
const RX = 6.4;
const RY = 7.1;

const PALETTE = {
  active: { outline: [34, 34, 59, 255], body: [82, 183, 136, 255], blush: [255, 143, 163, 255] },
  paused: { outline: [90, 90, 100, 255], body: [176, 176, 184, 255], blush: [210, 170, 178, 255] },
};

function buildMask() {
  const mask = Array.from({ length: GRID }, () => new Array(GRID).fill(false));
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const dx = (x - CX) / RX;
      const dy = (y - CY) / RY;
      if (dx * dx + dy * dy <= 1) mask[y][x] = true;
    }
  }
  return mask;
}

function maskToGrid(mask) {
  const grid = Array.from({ length: GRID }, () => new Array(GRID).fill(null));
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!mask[y][x]) continue;
      const n = (yy, xx) => yy >= 0 && yy < GRID && xx >= 0 && xx < GRID && mask[yy][xx];
      const isEdge = !n(y - 1, x) || !n(y + 1, x) || !n(y, x - 1) || !n(y, x + 1);
      grid[y][x] = isEdge ? 'outline' : 'body';
    }
  }
  const eyeL = [Math.round(CY - 1), Math.round(CX - 2.2)];
  const eyeR = [Math.round(CY - 1), Math.round(CX + 2.2)];
  const blushL = [Math.round(CY + 0.8), Math.round(CX - 4.2)];
  const blushR = [Math.round(CY + 0.8), Math.round(CX + 4.2)];
  for (const [y, x] of [eyeL, eyeR]) if (grid[y]?.[x] === 'body') grid[y][x] = 'outline';
  for (const [y, x] of [blushL, blushR]) if (grid[y]?.[x] === 'body') grid[y][x] = 'blush';
  return grid;
}

// Renders the grid into an RGBA buffer, scaling each grid cell up to `scale` device pixels.
function gridToBuffer(grid, palette, scale) {
  const size = GRID * scale;
  const buffer = Buffer.alloc(size * size * 4);
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const cell = grid[gy][gx];
      if (!cell) continue;
      const [r, g, b, a] = palette[cell];
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const px = gx * scale + sx;
          const py = gy * scale + sy;
          const offset = (py * size + px) * 4;
          // nativeImage.createFromBuffer expects BGRA, not RGBA.
          buffer[offset] = b;
          buffer[offset + 1] = g;
          buffer[offset + 2] = r;
          buffer[offset + 3] = a;
        }
      }
    }
  }
  return { buffer, size };
}

function createTrayIcon({ paused = false } = {}) {
  const grid = maskToGrid(buildMask());
  const palette = paused ? PALETTE.paused : PALETTE.active;
  const { buffer, size } = gridToBuffer(grid, palette, 2);
  const image = nativeImage.createFromBuffer(buffer, { width: size, height: size });
  image.setTemplateImage(false);
  return image.resize({ width: 22, height: 22, quality: 'good' });
}

// Larger version for use as the packaged app's window/dock icon assets.
function createAppIconBuffer(scale = 16) {
  const grid = maskToGrid(buildMask());
  return gridToBuffer(grid, PALETTE.active, scale);
}

module.exports = { createTrayIcon, createAppIconBuffer };
