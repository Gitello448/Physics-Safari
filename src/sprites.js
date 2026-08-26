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

export function drawFence(ctx, px, py, size, mask, isGate) {
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
  if (isGate) {
    ctx.strokeStyle = '#8a5a2a';
  }
  for (const [bit, ox, oy] of dirs) {
    if (mask & bit) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + ox, cy + oy);
      ctx.stroke();
    }
  }
  // post
  ctx.fillStyle = isGate ? '#c99a4a' : '#7a5230';
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

export function drawAnimal(ctx, px, py, size, species, facing, animT) {
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
