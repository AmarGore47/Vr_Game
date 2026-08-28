/**
 * textures.js — Procedural High-Definition Texture Generator
 * Generates crisp, realistic textures for Wood, Stone, Ice, TNT, Grass, Roof, and Road
 * with zero external asset dependencies or CORS issues.
 */

export const TEXTURES = {
  wood:  createWoodTexture(),
  bark:  createBarkTexture(),
  stone: createStoneTexture(),
  ice:   createIceTexture(),
  tnt:   createTNTTexture(),
  grass: createGrassTexture(),
  roof:  createRoofTexture(),
  road:  createRoadTexture(),
  pig:   createPigTexture()
};

function createWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base wood amber tone
  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, 0, 512, 512);

  // Planks lines
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 6;
  for (let y = 0; y < 512; y += 128) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }

  // Wood grain noise
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 150; i++) {
    const y = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y + Math.sin(i) * 20, 340, y - Math.sin(i) * 20, 512, y);
    ctx.stroke();
  }

  // Knots & nails
  ctx.fillStyle = '#451a03';
  for (let x = 40; x < 512; x += 128) {
    for (let y = 30; y < 512; y += 128) {
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 50, y + 68, 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  return canvas.toDataURL();
}

function createBarkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#451a03';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#78350f';
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const w = Math.random() * 8 + 2;
    const h = Math.random() * 40 + 10;
    ctx.fillRect(x, y, w, h);
  }
  return canvas.toDataURL();
}

function createStoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 0, 512, 512);

  // Brick/Block grid lines
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 8;
  for (let y = 0; y < 512; y += 128) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }
  for (let y = 0; y < 512; y += 128) {
    const offsetX = (y / 128) % 2 === 0 ? 0 : 128;
    for (let x = offsetX; x < 512; x += 256) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 128); ctx.stroke();
    }
  }

  // Stone noise spots
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let i = 0; i < 400; i++) {
    ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 12 + 2, Math.random() * 12 + 2);
  }
  return canvas.toDataURL();
}

function createIceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 256, Math.random() * 256);
    ctx.lineTo(Math.random() * 256, Math.random() * 256);
    ctx.stroke();
  }
  return canvas.toDataURL();
}

function createTNTTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Red Crate Base
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 512, 512);

  // Border & Planks
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 500, 500);

  // Yellow Hazard Stripes Header
  ctx.fillStyle = '#facc15';
  ctx.fillRect(20, 20, 472, 100);

  ctx.fillStyle = '#0f172a';
  for (let x = -100; x < 600; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x + 40, 20);
    ctx.lineTo(x - 20, 120);
    ctx.lineTo(x - 60, 120);
    ctx.fill();
  }

  // Bold "TNT" Stencil Text
  ctx.fillStyle = '#facc15';
  ctx.font = '900 130px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TNT', 256, 300);

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 6;
  ctx.strokeText('TNT', 256, 300);

  return canvas.toDataURL();
}

function createGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#16a34a';
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = '#22c55e';
  for (let i = 0; i < 2000; i++) {
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, Math.random() * 12 + 4);
  }
  ctx.fillStyle = '#15803d';
  for (let i = 0; i < 1500; i++) {
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, Math.random() * 10 + 2);
  }
  return canvas.toDataURL();
}

function createRoofTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#b45309';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 4;
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
  }
  for (let y = 0; y < 256; y += 32) {
    const off = (y / 32) % 2 === 0 ? 0 : 32;
    for (let x = off; x < 256; x += 64) {
      ctx.beginPath(); ctx.arc(x + 32, y, 32, 0, Math.PI); ctx.stroke();
    }
  }
  return canvas.toDataURL();
}

function createRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < 500; i++) {
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  return canvas.toDataURL();
}

function createPigTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#22c55e';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#16a34a';
  for (let i = 0; i < 100; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 6 + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas.toDataURL();
}
