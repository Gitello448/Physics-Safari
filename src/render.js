import { TILE, STRUCTURE } from './world.js';
import { drawGrassTile, drawTree, drawRock, drawBush, drawWater, drawPath, drawFence, drawAnimal, drawVisitor, drawDecoration, drawBloodSpot } from './sprites.js';
import { ANIMAL_DEFS } from './animals.js';
import { PUBLISHED_VISITORS } from './publishedCharacters.js';

export function render(ctx, canvas, world, camera, animals, visitors, input, t) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#1a1f14';
  ctx.fillRect(0, 0, camera.viewW, camera.viewH);

  const range = camera.visibleTileRange();
  const size = TILE * camera.zoom;

  // terrain + scenery + structures, row by row so scenery/animals can layer naturally
  for (let y = range.minY; y <= range.maxY; y++) {
    for (let x = range.minX; x <= range.maxX; x++) {
      const s = camera.worldToScreen(x * TILE, y * TILE);
      drawGrassTile(ctx, s.x, s.y, size, x, y);

      const st = world.structures[y][x];
      if (st) {
        if (st.kind === STRUCTURE.PATH) drawPath(ctx, s.x, s.y, size, st.mask);
        else drawFence(ctx, s.x, s.y, size, st.mask);
      }

      const habitat = world.habitatAt(x, y);
      if (habitat && !st) {
        ctx.fillStyle = habitat.enclosed ? 'rgba(120,180,255,0.06)' : 'rgba(255,80,80,0.10)';
        ctx.fillRect(s.x, s.y, size, size);
      }
    }
  }

  for (let y = range.minY; y <= range.maxY; y++) {
    for (let x = range.minX; x <= range.maxX; x++) {
      const sc = world.scenery[y][x];
      if (!sc) continue;
      const s = camera.worldToScreen(x * TILE, y * TILE);
      if (sc.type === 'tree') drawTree(ctx, s.x, s.y, size);
      else if (sc.type === 'rock') drawRock(ctx, s.x, s.y, size);
      else if (sc.type === 'bush') drawBush(ctx, s.x, s.y, size);
      else if (sc.type === 'water') drawWater(ctx, s.x, s.y, size, t);
    }
  }

  for (let y = range.minY; y <= range.maxY; y++) {
    for (let x = range.minX; x <= range.maxX; x++) {
      const dec = world.decorations[y][x];
      if (!dec || dec.anchorX !== x || dec.anchorY !== y) continue; // draw once, at the anchor tile
      const s = camera.worldToScreen(x * TILE, y * TILE);
      drawDecoration(ctx, s.x, s.y, size, dec.type, dec.w, dec.h);
    }
  }

  // Rare enough (almost always zero) that iterating all of them each frame
  // and letting the canvas clip anything offscreen is simpler than culling.
  for (const spot of world.bloodSpots.values()) {
    const s = camera.worldToScreen(spot.x * TILE, spot.y * TILE);
    drawBloodSpot(ctx, s.x, s.y, size);
  }

  drawHQ(ctx, world, camera, size);
  drawEntrance(ctx, world, camera, size, t);

  for (const v of visitors) {
    const s = camera.worldToScreen(v.x * TILE, v.y * TILE);
    const variantDef = v.variant ? PUBLISHED_VISITORS[v.variant] : null;
    const visitorState = v.state === 'walking' || v.state === 'leaving' ? 'walking' : 'idle';
    drawVisitor(ctx, s.x - size / 2, s.y - size / 2, size, v.facing, v.animT, v.colorIndex, v.variant, variantDef && variantDef.frames, visitorState);
  }

  for (const a of animals) {
    const s = camera.worldToScreen(a.x * TILE, a.y * TILE);
    const def = ANIMAL_DEFS[a.species];
    drawAnimal(ctx, s.x - size / 2, s.y - size / 2, size, a.species, a.facing, a.animT, def && def.frames, a.state);
    if (a.escaped) {
      // A loose animal is a real hazard, not just a stray sprite — keep a
      // marker over it so it reads clearly against the ordinary herd.
      ctx.font = `${Math.max(10, size * 0.4)}px sans-serif`;
      ctx.fillText('🚨', s.x - size * 0.15, s.y - size * 0.4);
    }
  }

  // The entrance sign hangs above the walkway — draw it after visitors/animals
  // so anyone passing underneath it reads as walking UNDER the sign, not on
  // top of it.
  drawEntranceSign(ctx, world, camera, size);

  drawRemovalSelection(ctx, world, camera, input, size);
  drawCursor(ctx, world, camera, input, size);
}

// Highlights every tile currently selected for sale (Remove tool), drawn on
// top of everything so a selected item is unambiguous even under animals.
function drawRemovalSelection(ctx, world, camera, input, size) {
  const selection = input.getRemovalSelection ? input.getRemovalSelection() : null;
  if (!selection || selection.size === 0) return;
  for (const item of selection.values()) {
    let w = 1, h = 1;
    if (item.target === 'decoration') {
      const dec = world.decorations[item.y] && world.decorations[item.y][item.x];
      if (dec) { w = dec.w; h = dec.h; }
    }
    const s = camera.worldToScreen(item.x * TILE, item.y * TILE);
    ctx.fillStyle = 'rgba(217,79,79,0.28)';
    ctx.fillRect(s.x, s.y, size * w, size * h);
    ctx.strokeStyle = '#d94f4f';
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x + 1, s.y + 1, size * w - 2, size * h - 2);
  }
}

function drawHQ(ctx, world, camera, size) {
  const hq = world.hqTile;
  const topLeft = camera.worldToScreen((hq.x - 2) * TILE, (hq.y - 1) * TILE);
  const w = size * 5, h = size * 3;

  ctx.fillStyle = '#6b5230';
  ctx.fillRect(topLeft.x + size * 0.3, topLeft.y + size * 0.6, w - size * 0.6, h - size * 0.7);
  ctx.fillStyle = '#3f7a3a';
  ctx.beginPath();
  ctx.moveTo(topLeft.x, topLeft.y + size * 0.6);
  ctx.lineTo(topLeft.x + w / 2, topLeft.y - size * 0.15);
  ctx.lineTo(topLeft.x + w, topLeft.y + size * 0.6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#e8e0b8';
  ctx.font = `bold ${Math.max(9, size * 0.28)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('SAFARI EXPEDITION HQ', topLeft.x + w / 2, topLeft.y + h * 0.72);
  ctx.textAlign = 'left';

  // flagpole
  ctx.strokeStyle = '#5c3d1e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(topLeft.x + w * 0.85, topLeft.y - size * 0.15);
  ctx.lineTo(topLeft.x + w * 0.85, topLeft.y - size * 0.85);
  ctx.stroke();
  ctx.fillStyle = '#d9a441';
  ctx.fillRect(topLeft.x + w * 0.85, topLeft.y - size * 0.85, size * 0.5, size * 0.3);
}

// A simple wooden-gateway entrance: two pillars, an archway beam, a hanging
// sign, and short flanking rails suggesting the park boundary starts here.
// This is a first pass for "clearly a recognizable entrance" — the fuller
// pixel-art treatment (flags, torches, animation) comes in a later visual
// pass, not this step.
function drawEntrance(ctx, world, camera, size, t) {
  const ent = world.entranceTile;
  const topLeft = camera.worldToScreen((ent.x - 3) * TILE, (ent.y - 2) * TILE);
  const w = size * 7, h = size * 4;
  const pillarW = size * 0.9;
  const pillarX0 = topLeft.x + w * 0.06;
  const pillarX1 = topLeft.x + w * 0.94 - pillarW;
  const pillarTop = topLeft.y + h * 0.12;
  const pillarH = h * 0.72;

  // plaza / welcome walkway
  const plazaGrad = ctx.createLinearGradient(0, topLeft.y + h * 0.5, 0, topLeft.y + h);
  plazaGrad.addColorStop(0, '#d9a366');
  plazaGrad.addColorStop(1, '#b97b45');
  ctx.fillStyle = plazaGrad;
  ctx.fillRect(topLeft.x, topLeft.y + h * 0.5, w, h * 0.5);
  ctx.strokeStyle = 'rgba(90,55,20,0.35)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const lx = topLeft.x + (w * i) / 6;
    ctx.beginPath();
    ctx.moveTo(lx, topLeft.y + h * 0.5);
    ctx.lineTo(lx, topLeft.y + h);
    ctx.stroke();
  }

  // stone pillars, shaded for depth (dark left face, mid front, light right highlight)
  for (const px of [pillarX0, pillarX1]) {
    ctx.fillStyle = '#6e6a63';
    ctx.fillRect(px, pillarTop, pillarW, pillarH);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(px, pillarTop, pillarW * 0.28, pillarH);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(px + pillarW * 0.78, pillarTop, pillarW * 0.22, pillarH);
    // stone block seams
    ctx.strokeStyle = 'rgba(20,18,15,0.35)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const ly = pillarTop + (pillarH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(px, ly);
      ctx.lineTo(px + pillarW, ly);
      ctx.stroke();
    }
    // wider stone base/footing
    ctx.fillStyle = '#565349';
    ctx.fillRect(px - pillarW * 0.12, pillarTop + pillarH - size * 0.18, pillarW * 1.24, size * 0.24);
  }

  // wooden crossbeam with grain shading
  const beamY = topLeft.y + h * 0.02;
  const beamH = size * 0.4;
  ctx.fillStyle = '#8a5a2a';
  ctx.fillRect(topLeft.x + w * 0.03, beamY, w * 0.94, beamH);
  ctx.fillStyle = 'rgba(255,210,140,0.25)';
  ctx.fillRect(topLeft.x + w * 0.03, beamY, w * 0.94, beamH * 0.3);
  ctx.fillStyle = 'rgba(60,30,10,0.3)';
  ctx.fillRect(topLeft.x + w * 0.03, beamY + beamH * 0.75, w * 0.94, beamH * 0.25);

  // torches on each pillar, with a flickering animated flame
  for (const px of [pillarX0, pillarX1]) {
    drawTorch(ctx, px + pillarW / 2, pillarTop - size * 0.05, size, t);
  }

  // low boundary rails flanking the gate
  ctx.strokeStyle = '#5c3d1e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(topLeft.x - size * 1.5, topLeft.y + h * 0.78);
  ctx.lineTo(topLeft.x, topLeft.y + h * 0.78);
  ctx.moveTo(topLeft.x + w, topLeft.y + h * 0.78);
  ctx.lineTo(topLeft.x + w + size * 1.5, topLeft.y + h * 0.78);
  ctx.stroke();
}

// Drawn separately from drawEntrance() and painted AFTER visitors/animals —
// it hangs above the walkway, so anyone standing under it should be hidden
// behind it, not drawn on top of it.
function drawEntranceSign(ctx, world, camera, size) {
  const ent = world.entranceTile;
  const topLeft = camera.worldToScreen((ent.x - 3) * TILE, (ent.y - 2) * TILE);
  const w = size * 7;

  const signW = w * 0.66, signH = size * 0.62;
  const signX = topLeft.x + (w - signW) / 2;
  const signY = topLeft.y - size * 0.4;
  ctx.fillStyle = '#2f5a2a';
  ctx.fillRect(signX, signY, signW, signH);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(signX, signY, signW, signH * 0.35);
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 2;
  ctx.strokeRect(signX + 3, signY + 3, signW - 6, signH - 6);
  ctx.strokeStyle = '#0f1509';
  ctx.lineWidth = 2;
  ctx.strokeRect(signX, signY, signW, signH);
  ctx.fillStyle = '#ffe066';
  ctx.font = `bold ${Math.max(9, size * 0.22)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('SAFARI PARK ENTRANCE', topLeft.x + w / 2, signY + signH * 0.65);
  ctx.textAlign = 'left';
}

function drawTorch(ctx, cx, baseY, size, t) {
  const flicker = Math.sin((t || 0) / 90 + cx) * 0.15 + Math.sin((t || 0) / 47 + cx * 1.7) * 0.08;
  const poleH = size * 0.55;
  const poleTop = baseY - poleH;

  // pole + bracket
  ctx.fillStyle = '#3a2a18';
  ctx.fillRect(cx - size * 0.05, poleTop, size * 0.1, poleH);
  ctx.fillStyle = '#221a10';
  ctx.beginPath();
  ctx.ellipse(cx, poleTop, size * 0.13, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // soft glow
  const glowR = size * (0.5 + flicker * 0.3);
  const glow = ctx.createRadialGradient(cx, poleTop - size * 0.12, 1, cx, poleTop - size * 0.12, glowR);
  glow.addColorStop(0, 'rgba(255,180,60,0.35)');
  glow.addColorStop(1, 'rgba(255,180,60,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, poleTop - size * 0.12, glowR, 0, Math.PI * 2);
  ctx.fill();

  // layered flame
  const flameH = size * (0.36 + flicker);
  ctx.fillStyle = '#d94f1e';
  ctx.beginPath();
  ctx.ellipse(cx, poleTop - flameH * 0.35, size * 0.16, flameH * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2932e';
  ctx.beginPath();
  ctx.ellipse(cx, poleTop - flameH * 0.42, size * 0.11, flameH * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.ellipse(cx, poleTop - flameH * 0.5, size * 0.06, flameH * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCursor(ctx, world, camera, input, size) {
  if (!input.hoverTile) return;
  const { x, y } = input.hoverTile;
  if (!world.inBounds(x, y)) return;
  const s = camera.worldToScreen(x * TILE, y * TILE);
  const valid = input.isPlacementValid ? input.isPlacementValid(x, y) : true;
  const footprint = input.getFootprint ? input.getFootprint() : { w: 1, h: 1 };
  ctx.strokeStyle = valid ? 'rgba(255,224,102,0.9)' : 'rgba(255,80,80,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(s.x + 1, s.y + 1, size * footprint.w - 2, size * footprint.h - 2);
}
