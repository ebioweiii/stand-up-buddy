'use strict';

// Procedurally builds the "Buddy" pixel character as a CSS box-shadow pixel-art
// sprite (same silhouette math as src/trayIcon.js, kept in sync by hand since
// the renderer runs isolated from Node). No image assets required.

(function () {
  const GRID = 18;
  const CX = 8.5;
  const CY = 8.8;
  const RX = 6.4;
  const RY = 7.1;
  const PIXEL_SIZE = 6;

  const PALETTE = {
    outline: '#22223b',
    body: '#52b788',
    blush: '#ff8fa3',
  };

  function buildMask(frame) {
    const mask = Array.from({ length: GRID }, () => new Array(GRID).fill(false));
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const dx = (x - CX) / RX;
        const dy = (y - CY) / RY;
        if (dx * dx + dy * dy <= 1) mask[y][x] = true;
      }
    }
    const addArm = (side) => {
      const dir = side === 'right' ? 1 : -1;
      const x0 = Math.round(CX + dir * RX * 0.92);
      const y0 = Math.round(CY - RY * 0.5);
      for (let i = 0; i < 4; i++) {
        const px = x0 + dir * i;
        const py = y0 - i;
        if (px >= 0 && px < GRID && py >= 0 && py < GRID) {
          mask[py][px] = true;
          if (py + 1 < GRID) mask[py + 1][px] = true;
        }
      }
    };
    if (frame === 'wave' || frame === 'cheer') addArm('right');
    if (frame === 'cheer') addArm('left');
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

  function gridToBoxShadow(grid) {
    const shadows = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const cell = grid[y][x];
        if (!cell) continue;
        shadows.push(`${x * PIXEL_SIZE}px ${y * PIXEL_SIZE}px 0 0 ${PALETTE[cell]}`);
      }
    }
    return shadows.join(',');
  }

  const frameCache = {};
  function boxShadowForFrame(frame) {
    if (!frameCache[frame]) {
      frameCache[frame] = gridToBoxShadow(maskToGrid(buildMask(frame)));
    }
    return frameCache[frame];
  }

  window.BuddySprite = {
    pixelSize: PIXEL_SIZE,
    gridSize: GRID,
    boxShadowForFrame,
  };
})();
