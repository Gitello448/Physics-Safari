import { frameToCanvas, findFloorRow } from './pixelEditor.js';

// Small deterministic hash -> [0,1) for per-tile organic variance without storing extra state.
export function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) ^ (x << 13);
  h = (h ^ (h >> 7)) * 2654435761;
  h = (h ^ (h >> 13)) >>> 0;
  return (h % 1000) / 1000;
}

export function drawGrassTile(ctx, px, py, size, tx, ty) {
  const base = ['#8a9b3f', '#8fa346', '#849638'];
  const h = hash2(tx, ty);
  ctx.fillStyle = base[Math.floor(h * base.length)];
  ctx.fillRect(px, py, size, size);
  // speckles for texture
  const specks = 3 + Math.floor(hash2(tx + 91, ty + 7) * 3);
  ctx.fillStyle = 'rgba(70,90,30,0.35)';
  for (let i = 0; i < specks; i++) {
    const sx = px + hash2(tx * 3 + i, ty) * size;
    const sy = py + hash2(tx, ty * 3 + i) * size;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.fillStyle = 'rgba(200,220,120,0.15)';
  for (let i = 0; i < specks; i++) {
    const sx = px + hash2(tx * 5 + i + 2, ty + 11) * size;
    const sy = py + hash2(tx + 4, ty * 5 + i + 3) * size;
    ctx.fillRect(sx, sy, 1, 1);
  }
}

export function drawTree(ctx, px, py, size) {
  const cx = px + size / 2;
  ctx.fillStyle = '#5b3a1e';
  ctx.fillRect(cx - 3, py + size * 0.5, 6, size * 0.45);
  ctx.fillStyle = '#3f7a2e';
  ctx.beginPath();
  ctx.ellipse(cx, py + size * 0.35, size * 0.42, size * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4f9438';
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.12, py + size * 0.28, size * 0.24, size * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawRock(ctx, px, py, size) {
  ctx.fillStyle = '#6b6b6b';
  ctx.beginPath();
  ctx.moveTo(px + size * 0.2, py + size * 0.75);
  ctx.lineTo(px + size * 0.15, py + size * 0.45);
  ctx.lineTo(px + size * 0.45, py + size * 0.25);
  ctx.lineTo(px + size * 0.8, py + size * 0.4);
  ctx.lineTo(px + size * 0.85, py + size * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a8a8a';
  ctx.beginPath();
  ctx.moveTo(px + size * 0.45, py + size * 0.25);
  ctx.lineTo(px + size * 0.8, py + size * 0.4);
  ctx.lineTo(px + size * 0.6, py + size * 0.5);
  ctx.closePath();
  ctx.fill();
}

export function drawBush(ctx, px, py, size) {
  ctx.fillStyle = '#4a7a2a';
  for (const [dx, dy, r] of [[0.35, 0.55, 0.22], [0.6, 0.5, 0.2], [0.5, 0.65, 0.24]]) {
    ctx.beginPath();
    ctx.arc(px + size * dx, py + size * dy, size * r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawWater(ctx, px, py, size, t) {
  ctx.fillStyle = '#3a6fa0';
  ctx.beginPath();
  ctx.ellipse(px + size / 2, py + size / 2, size * 0.46, size * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  const wave = Math.sin(t / 400 + px * 0.05) * 2;
  ctx.beginPath();
  ctx.moveTo(px + size * 0.25, py + size * 0.5 + wave);
  ctx.lineTo(px + size * 0.75, py + size * 0.5 - wave);
  ctx.stroke();
}

export function drawPath(ctx, px, py, size, mask) {
  ctx.fillStyle = '#8a9b3f';
  ctx.fillRect(px, py, size, size);
  ctx.fillStyle = '#b98d54';
  const pad = size * 0.14;
  ctx.fillRect(px + pad, py + pad, size - pad * 2, size - pad * 2);
  ctx.fillStyle = '#a67a45';
  const w = size * 0.34;
  if (mask & 1) ctx.fillRect(px + size / 2 - w / 2, py, w, size / 2); // N
  if (mask & 2) ctx.fillRect(px + size / 2, py + size / 2 - w / 2, size / 2, w); // E
  if (mask & 4) ctx.fillRect(px + size / 2 - w / 2, py + size / 2, w, size / 2); // S
  if (mask & 8) ctx.fillRect(px, py + size / 2 - w / 2, size / 2, w); // W
  if (mask === 0) {
    ctx.fillStyle = '#a67a45';
    ctx.beginPath();
    ctx.arc(px + size / 2, py + size / 2, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Purchasable decorations — distinct silhouettes from the natural drawTree/
// drawBush above, and deliberately bigger and more detailed (they occupy a
// multi-tile footprint, spanW/spanH below), so a placed decoration always
// reads as a grander, deliberate centerpiece rather than wild scenery.
export function drawAcacia(ctx, px, py, spanW, spanH) {
  const cx = px + spanW / 2;
  const baseY = py + spanH * 0.94;
  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY, spanW * 0.32, spanH * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // trunk with a bark-shade split and a couple of low branches
  ctx.fillStyle = '#4a3520';
  ctx.fillRect(cx - spanW * 0.035, py + spanH * 0.42, spanW * 0.07, spanH * 0.52);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(cx - spanW * 0.035, py + spanH * 0.42, spanW * 0.02, spanH * 0.52);
  ctx.strokeStyle = '#4a3520';
  ctx.lineWidth = Math.max(2, spanW * 0.03);
  ctx.beginPath();
  ctx.moveTo(cx, py + spanH * 0.46);
  ctx.lineTo(cx - spanW * 0.24, py + spanH * 0.3);
  ctx.moveTo(cx, py + spanH * 0.44);
  ctx.lineTo(cx + spanW * 0.22, py + spanH * 0.26);
  ctx.stroke();
  // the flat, wide "umbrella" canopy acacias are famous for — three layered
  // tiers so it reads as full and grand rather than a single flat disc
  ctx.fillStyle = '#446b2c';
  ctx.beginPath();
  ctx.ellipse(cx, py + spanH * 0.22, spanW * 0.5, spanH * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a8a3a';
  ctx.beginPath();
  ctx.ellipse(cx, py + spanH * 0.16, spanW * 0.42, spanH * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6fa048';
  ctx.beginPath();
  ctx.ellipse(cx - spanW * 0.08, py + spanH * 0.11, spanW * 0.26, spanH * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.ellipse(cx + spanW * 0.12, py + spanH * 0.09, spanW * 0.14, spanH * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBaobab(ctx, px, py, spanW, spanH) {
  const cx = px + spanW / 2;
  const baseY = py + spanH * 0.94;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY, spanW * 0.3, spanH * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // flared, gnarled base
  ctx.fillStyle = '#7a5c38';
  ctx.beginPath();
  ctx.ellipse(cx, py + spanH * 0.86, spanW * 0.24, spanH * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  // the massive, bulbous trunk baobabs are known for
  ctx.fillStyle = '#8a6a42';
  ctx.beginPath();
  ctx.ellipse(cx, py + spanH * 0.58, spanW * 0.3, spanH * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.ellipse(cx - spanW * 0.1, py + spanH * 0.58, spanW * 0.11, spanH * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.ellipse(cx + spanW * 0.12, py + spanH * 0.5, spanW * 0.07, spanH * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  // sparse, gnarled crown of small branches with little leaf tufts at the
  // tips — no big leafy canopy, that's the whole point of a baobab
  ctx.strokeStyle = '#6b4e30';
  ctx.lineWidth = Math.max(2, spanW * 0.035);
  const branches = [[-0.2, -0.32], [0, -0.38], [0.2, -0.32], [-0.09, -0.4], [0.1, -0.4], [-0.28, -0.2], [0.28, -0.2]];
  for (const [dx, dy] of branches) {
    ctx.beginPath();
    ctx.moveTo(cx, py + spanH * 0.24);
    ctx.lineTo(cx + spanW * dx, py + spanH * (0.24 + dy));
    ctx.stroke();
  }
  ctx.fillStyle = '#5a8a3a';
  for (const [dx, dy] of branches) {
    ctx.beginPath();
    ctx.arc(cx + spanW * dx, py + spanH * (0.24 + dy), spanW * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawCactus(ctx, px, py, spanW, spanH) {
  const cx = px + spanW / 2;
  const baseY = py + spanH * 0.94;
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY, spanW * 0.26, spanH * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
  // a small grounding rock, since this is meant to read as a deliberate
  // desert-garden centerpiece rather than a single lone plant
  ctx.fillStyle = '#8a8578';
  ctx.beginPath();
  ctx.ellipse(cx + spanW * 0.22, py + spanH * 0.88, spanW * 0.09, spanH * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyW = spanW * 0.16;
  const bodyTop = py + spanH * 0.18;
  const bodyBottom = py + spanH * 0.9;
  ctx.fillStyle = '#3f8a4a';
  ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, bodyBottom - bodyTop);
  ctx.beginPath();
  ctx.ellipse(cx, bodyTop, bodyW / 2, bodyW / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#57a05f';
  ctx.fillRect(cx - bodyW * 0.1, bodyTop, bodyW * 0.25, bodyBottom - bodyTop);

  // two rounded arms, one higher than the other for a natural silhouette
  const armW = spanW * 0.13;
  ctx.fillStyle = '#3f8a4a';
  ctx.fillRect(cx - spanW * 0.34, py + spanH * 0.42, armW, spanH * 0.34);
  ctx.beginPath();
  ctx.ellipse(cx - spanW * 0.34 + armW / 2, py + spanH * 0.42, armW / 2, armW / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx + spanW * 0.21, py + spanH * 0.3, armW, spanH * 0.42);
  ctx.beginPath();
  ctx.ellipse(cx + spanW * 0.21 + armW / 2, py + spanH * 0.3, armW / 2, armW / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // a small bloom on top — a nice grand-garden touch real saguaros get
  ctx.fillStyle = '#e88fb0';
  ctx.beginPath();
  ctx.arc(cx, bodyTop - spanW * 0.03, spanW * 0.045, 0, Math.PI * 2);
  ctx.fill();

  // spine highlights along the trunk and both arms
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(cx - bodyW / 2 + 1, bodyTop + spanH * 0.06 + i * spanH * 0.12, 2, 2);
    ctx.fillRect(cx + bodyW / 2 - 3, bodyTop + spanH * 0.06 + i * spanH * 0.12, 2, 2);
  }
}

export function drawCherryBlossom(ctx, px, py, spanW, spanH) {
  const cx = px + spanW / 2;
  const baseY = py + spanH * 0.94;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY, spanW * 0.3, spanH * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // trunk with a fork, for a fuller mature-tree silhouette
  ctx.fillStyle = '#5b3a1e';
  ctx.fillRect(cx - spanW * 0.03, py + spanH * 0.5, spanW * 0.06, spanH * 0.44);
  ctx.strokeStyle = '#5b3a1e';
  ctx.lineWidth = Math.max(2, spanW * 0.035);
  ctx.beginPath();
  ctx.moveTo(cx, py + spanH * 0.52);
  ctx.lineTo(cx - spanW * 0.14, py + spanH * 0.36);
  ctx.moveTo(cx, py + spanH * 0.5);
  ctx.lineTo(cx + spanW * 0.12, py + spanH * 0.34);
  ctx.stroke();
  // full, layered pink blossom canopy instead of green leaves
  ctx.fillStyle = '#d9749c';
  ctx.beginPath();
  ctx.ellipse(cx, py + spanH * 0.3, spanW * 0.44, spanH * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e88fb0';
  ctx.beginPath();
  ctx.ellipse(cx - spanW * 0.16, py + spanH * 0.22, spanW * 0.26, spanH * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + spanW * 0.18, py + spanH * 0.24, spanW * 0.22, spanH * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4b8cf';
  ctx.beginPath();
  ctx.ellipse(cx - spanW * 0.02, py + spanH * 0.16, spanW * 0.2, spanH * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  // small bright blossom flecks scattered through the canopy and drifting
  // down past the base, for a "grand and detailed" flourish
  ctx.fillStyle = '#fff0f5';
  const flecks = [[-0.22, 0.3], [0.08, 0.14], [0.24, 0.32], [-0.04, 0.4], [0.3, 0.2], [-0.32, 0.22]];
  for (const [dx, dy] of flecks) {
    ctx.beginPath();
    ctx.arc(cx + spanW * dx, py + spanH * dy, spanW * 0.018, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,240,245,0.7)';
  for (const [dx, dy] of [[-0.3, 0.7], [0.26, 0.78], [0.05, 0.86]]) {
    ctx.beginPath();
    ctx.arc(cx + spanW * dx, py + spanH * dy, spanW * 0.014, 0, Math.PI * 2);
    ctx.fill();
  }
}

const DECORATION_DRAWERS = {
  acacia: drawAcacia,
  baobab: drawBaobab,
  cactus: drawCactus,
  'cherry-blossom': drawCherryBlossom,
};

export function drawDecoration(ctx, px, py, size, type, w = 1, h = 1) {
  const drawer = DECORATION_DRAWERS[type];
  if (drawer) drawer(ctx, px, py, size * w, size * h);
}

export function drawFence(ctx, px, py, size, mask) {
  const cx = px + size / 2, cy = py + size / 2;
  ctx.strokeStyle = '#5c3d1e';
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.lineCap = 'round';
  const half = size / 2;
  const dirs = [
    [1, 0, -half, 0], // N
    [2, half, 0, 0],  // E
    [4, 0, half, 0],  // S
    [8, -half, 0, 0], // W
  ];
  for (const [bit, ox, oy] of dirs) {
    if (mask & bit) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + ox, cy + oy);
      ctx.stroke();
    }
  }
  // post
  ctx.fillStyle = '#7a5230';
  const postSize = size * 0.16;
  ctx.fillRect(cx - postSize / 2, cy - postSize / 2, postSize, postSize);
  if (mask === 0) {
    // isolated post, draw a small stub in all 4 dirs so it reads as fence not a random dot
    ctx.strokeStyle = '#5c3d1e';
    for (const [, ox, oy] of dirs) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + ox * 0.4, cy + oy * 0.4);
      ctx.stroke();
    }
  }
}

const VISITOR_SHIRTS = ['#d94f4f', '#4f7fd9', '#4fbf6b', '#d9a13f', '#8a4fd9', '#d94f9c'];

export function drawVisitor(ctx, px, py, size, facing, animT, colorIndex) {
  const bob = Math.abs(Math.sin(animT / 180)) * size * 0.05;
  const cx = px + size / 2;
  const cy = py + size / 2 - bob;
  const shirt = VISITOR_SHIRTS[colorIndex % VISITOR_SHIRTS.length];

  ctx.save();
  ctx.translate(cx, cy);

  // legs (alternate slightly for a walk cycle)
  const legOffset = Math.sin(animT / 130) * size * 0.06;
  ctx.fillStyle = '#33302b';
  ctx.fillRect(-size * 0.09, size * 0.1, size * 0.08, size * 0.16 + legOffset);
  ctx.fillRect(size * 0.01, size * 0.1, size * 0.08, size * 0.16 - legOffset);

  // body
  ctx.fillStyle = shirt;
  ctx.fillRect(-size * 0.13, -size * 0.06, size * 0.26, size * 0.2);

  // head
  ctx.fillStyle = '#e8b988';
  ctx.beginPath();
  ctx.arc(0, -size * 0.16, size * 0.11, 0, Math.PI * 2);
  ctx.fill();

  // a little direction hint (nose bump) so facing reads clearly
  ctx.fillStyle = '#e8b988';
  ctx.fillRect(facing >= 0 ? size * 0.06 : -size * 0.06 - size * 0.05, -size * 0.18, size * 0.05, size * 0.05);

  ctx.restore();
}

const ANIMAL_COLORS = {
  zebra: { body: '#f2f2f2', accent: '#1a1a1a' },
  giraffe: { body: '#e8c877', accent: '#a5651e' },
  rhino: { body: '#8f9a8a', accent: '#5f6a5a' },
};

// Cache of built {canvas, floorRow} per species+frame-key, for hand-drawn
// (Character Lab-published) animals — built once on first use, since the
// underlying pixel data never changes at runtime.
const spriteFrameCache = new Map();
function getSpriteFrame(species, frameKey, frame) {
  const cacheKey = `${species}:${frameKey}`;
  let entry = spriteFrameCache.get(cacheKey);
  if (!entry) {
    entry = { canvas: frameToCanvas(frame), floorRow: findFloorRow(frame) };
    spriteFrameCache.set(cacheKey, entry);
  }
  return entry;
}

const IDLE_FRAME_MS = 600;
const WALK_FRAME_MS = 150;

// Hand-drawn animal (published from Character Lab): picks an idle/walk
// frame from animT, then grounds the artist's actual bottommost painted
// pixel (not the raw canvas edge) at the bottom of the (px,py,size) box, so
// a drawing that doesn't reach the bottom row still stands on the tile
// instead of floating above it.
function drawSpriteAnimal(ctx, px, py, size, species, facing, animT, frames, state) {
  const walkKeys = ['walk_1', 'walk_2', 'walk_3', 'walk_4'].filter((k) => frames[k]);
  const idleKeys = ['idle_1', 'idle_2'].filter((k) => frames[k]);
  let frameKey;
  if (state === 'walking' && walkKeys.length > 0) {
    frameKey = walkKeys[Math.floor(animT / WALK_FRAME_MS) % walkKeys.length];
  } else if (idleKeys.length > 0) {
    frameKey = idleKeys[Math.floor(animT / IDLE_FRAME_MS) % idleKeys.length];
  } else {
    frameKey = walkKeys[0] || Object.keys(frames)[0];
  }
  const frame = frames[frameKey];
  if (!frame) return;
  const { canvas, floorRow } = getSpriteFrame(species, frameKey, frame);

  const scale = size / frame.w;
  const dw = size, dh = frame.h * scale;
  const floorFrac = (floorRow + 1) / frame.h;
  const dx = px, dy = (py + size) - dh * floorFrac;

  ctx.save();
  if (facing < 0) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, 0, 0, dw, dh);
  } else {
    ctx.drawImage(canvas, dx, dy, dw, dh);
  }
  ctx.restore();
}

export function drawAnimal(ctx, px, py, size, species, facing, animT, spriteFrames, state) {
  if (spriteFrames) {
    drawSpriteAnimal(ctx, px, py, size, species, facing, animT, spriteFrames, state);
    return;
  }
  const colors = ANIMAL_COLORS[species] || ANIMAL_COLORS.zebra;
  const bob = Math.sin(animT / 220) * size * 0.03;
  const cx = px + size / 2;
  const cy = py + size / 2 + bob;
  const dir = facing >= 0 ? 1 : -1;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(dir, 1);

  if (species === 'giraffe') {
    ctx.fillStyle = colors.body;
    ctx.fillRect(-size * 0.16, -size * 0.02, size * 0.32, size * 0.22); // body
    ctx.fillRect(size * 0.02, -size * 0.5, size * 0.12, size * 0.5); // neck
    ctx.fillRect(size * 0.0, -size * 0.58, size * 0.18, size * 0.14); // head
    ctx.fillStyle = colors.accent;
    ctx.fillRect(-size * 0.12, size * 0.02, size * 0.06, size * 0.14);
    ctx.fillRect(size * 0.08, size * 0.02, size * 0.06, size * 0.14);
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-size * 0.1 + i * size * 0.07, -size * 0.02 + (i % 2) * 4, 4, 4);
    }
  } else if (species === 'rhino') {
    ctx.fillStyle = colors.body;
    ctx.fillRect(-size * 0.28, -size * 0.16, size * 0.5, size * 0.28); // body
    ctx.fillRect(size * 0.18, -size * 0.14, size * 0.16, size * 0.2); // head
    ctx.fillStyle = colors.accent;
    ctx.fillRect(size * 0.32, -size * 0.1, size * 0.08, size * 0.05); // horn
    ctx.fillRect(-size * 0.24, size * 0.1, size * 0.08, size * 0.12);
    ctx.fillRect(size * 0.08, size * 0.1, size * 0.08, size * 0.12);
  } else {
    // zebra
    ctx.fillStyle = colors.body;
    ctx.fillRect(-size * 0.22, -size * 0.1, size * 0.4, size * 0.24); // body
    ctx.fillRect(size * 0.14, -size * 0.18, size * 0.14, size * 0.18); // head
    ctx.fillStyle = colors.accent;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-size * 0.2 + i * size * 0.1, -size * 0.1, 3, size * 0.24);
    }
    ctx.fillRect(-size * 0.16, size * 0.12, size * 0.06, size * 0.12);
    ctx.fillRect(size * 0.06, size * 0.12, size * 0.06, size * 0.12);
  }

  ctx.restore();
}
