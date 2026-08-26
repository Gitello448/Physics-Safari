import { TILE, STRUCTURE } from './world.js';
import { drawGrassTile, drawTree, drawRock, drawBush, drawWater, drawPath, drawFence, drawAnimal, drawVisitor } from './sprites.js';

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
        else drawFence(ctx, s.x, s.y, size, st.mask, st.kind === STRUCTURE.GATE);
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

  drawHQ(ctx, world, camera, size);
  drawEntrance(ctx, world, camera, size);

  for (const v of visitors) {
    const s = camera.worldToScreen(v.x * TILE, v.y * TILE);
    drawVisitor(ctx, s.x - size / 2, s.y - size / 2, size, v.facing, v.animT, v.colorIndex);
  }

  for (const a of animals) {
    const s = camera.worldToScreen(a.x * TILE, a.y * TILE);
    drawAnimal(ctx, s.x - size / 2, s.y - size / 2, size, a.species, a.facing, a.animT);
    if (a.state === 'stuck') {
      ctx.font = `${Math.max(10, size * 0.4)}px sans-serif`;
      ctx.fillText('⚠️', s.x - size * 0.15, s.y - size * 0.4);
    }
  }

  drawCursor(ctx, world, camera, input, size);
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
function drawEntrance(ctx, world, camera, size) {
  const ent = world.entranceTile;
  const topLeft = camera.worldToScreen((ent.x - 2) * TILE, (ent.y - 1) * TILE);
  const w = size * 5, h = size * 3;

  // plaza / welcome walkway
  ctx.fillStyle = '#c9915a';
  ctx.fillRect(topLeft.x, topLeft.y + h * 0.55, w, h * 0.5);

  // pillars
  ctx.fillStyle = '#6b4a28';
  ctx.fillRect(topLeft.x + w * 0.08, topLeft.y + h * 0.15, size * 0.55, h * 0.7);
  ctx.fillRect(topLeft.x + w * 0.92 - size * 0.55, topLeft.y + h * 0.15, size * 0.55, h * 0.7);

  // archway beam
  ctx.fillStyle = '#8a5a2a';
  ctx.fillRect(topLeft.x + w * 0.04, topLeft.y + h * 0.08, w * 0.92, size * 0.32);

  // hanging sign
  ctx.fillStyle = '#3f7a3a';
  ctx.fillRect(topLeft.x + w * 0.18, topLeft.y - size * 0.3, w * 0.64, size * 0.5);
  ctx.strokeStyle = '#0f1509';
  ctx.lineWidth = 2;
  ctx.strokeRect(topLeft.x + w * 0.18, topLeft.y - size * 0.3, w * 0.64, size * 0.5);
  ctx.fillStyle = '#ffe066';
  ctx.font = `bold ${Math.max(8, size * 0.2)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('SAFARI PARK ENTRANCE', topLeft.x + w / 2, topLeft.y - size * 0.03);
  ctx.textAlign = 'left';

  // low boundary rails flanking the gate
  ctx.strokeStyle = '#5c3d1e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(topLeft.x - size * 1.5, topLeft.y + h * 0.75);
  ctx.lineTo(topLeft.x, topLeft.y + h * 0.75);
  ctx.moveTo(topLeft.x + w, topLeft.y + h * 0.75);
  ctx.lineTo(topLeft.x + w + size * 1.5, topLeft.y + h * 0.75);
  ctx.stroke();
}

function drawCursor(ctx, world, camera, input, size) {
  if (!input.hoverTile) return;
  const { x, y } = input.hoverTile;
  if (!world.inBounds(x, y)) return;
  const s = camera.worldToScreen(x * TILE, y * TILE);
  const valid = input.isPlacementValid ? input.isPlacementValid(x, y) : true;
  ctx.strokeStyle = valid ? 'rgba(255,224,102,0.9)' : 'rgba(255,80,80,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(s.x + 1, s.y + 1, size - 2, size - 2);
}
