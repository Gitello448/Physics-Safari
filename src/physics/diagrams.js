// Lightweight canvas diagrams for vector/geometry questions. Deliberately
// simple (no textures/animation) — this is a study aid, not the park's
// pixel-art rendering. Kept generic by `type` so future chapters (e.g.
// motion graphs in Ch2) can add new cases without touching the UI that
// calls drawDiagram().

const COLOR = {
  axis: 'rgba(232,224,184,0.35)',
  line: '#e8e0b8',
  accent: '#ffe066',
  fill: 'rgba(122,154,74,0.35)',
  text: '#e8e0b8',
};

function setupCanvas(canvas, cssW, cssH) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  return ctx;
}

function drawArrow(ctx, x0, y0, x1, y1, color = COLOR.line, width = 2.5) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  const angle = Math.atan2(y1 - y0, x1 - x0);
  const headLen = 9;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - headLen * Math.cos(angle - Math.PI / 7), y1 - headLen * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(x1 - headLen * Math.cos(angle + Math.PI / 7), y1 - headLen * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
}

function label(ctx, text, x, y, opts = {}) {
  ctx.font = opts.bold ? 'bold 13px monospace' : '12px monospace';
  ctx.fillStyle = opts.color || COLOR.text;
  ctx.textAlign = opts.align || 'left';
  ctx.fillText(text, x, y);
}

export function drawDiagram(canvas, spec) {
  const w = canvas.clientWidth || 320;
  const h = canvas.clientHeight || 180;
  const ctx = setupCanvas(canvas, w, h);

  if (spec.type === 'right-triangle') {
    drawRightTriangle(ctx, w, h, spec);
  } else if (spec.type === 'vector-arrow') {
    drawSingleVector(ctx, w, h, spec);
  } else if (spec.type === 'vector-components') {
    drawVectorComponents(ctx, w, h, spec);
  } else if (spec.type === 'vector-sum') {
    drawVectorSum(ctx, w, h, spec);
  }
}

function drawRightTriangle(ctx, w, h, spec) {
  const pad = 36;
  const baseX = pad, baseY = h - pad;
  const legW = w - pad * 2;
  const legH = h - pad * 2;

  ctx.strokeStyle = COLOR.line;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(baseX + legW, baseY);
  ctx.lineTo(baseX, baseY - legH);
  ctx.closePath();
  ctx.stroke();

  // right-angle marker
  ctx.strokeStyle = COLOR.axis;
  ctx.strokeRect(baseX, baseY - 12, 12, 12);

  const angleAtBase = spec.highlight === 'angle' && spec.opp != null
    ? Math.atan2(spec.opp, spec.adj)
    : spec.angleDeg != null ? (spec.angleDeg * Math.PI) / 180 : Math.atan2(legH, legW);

  // angle arc at bottom-left vertex
  ctx.strokeStyle = COLOR.accent;
  ctx.beginPath();
  ctx.arc(baseX, baseY, 24, -angleAtBase, 0);
  ctx.stroke();
  label(ctx, spec.angleDeg != null ? `${spec.angleDeg}°` : 'θ', baseX + 30, baseY - 8, { color: COLOR.accent });

  label(ctx, 'hyp', baseX + legW * 0.5 - 10, baseY - legH * 0.5 - 8, { color: COLOR.line });
  label(ctx, 'adj', baseX + legW * 0.5 - 12, baseY + 16, { color: COLOR.line });
  label(ctx, 'opp', baseX - 20, baseY - legH * 0.5, { color: COLOR.line });
}

function vecEndpoint(cx, cy, mag, angleDeg, scale) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + mag * scale * Math.cos(rad), y: cy - mag * scale * Math.sin(rad) };
}

function drawSingleVector(ctx, w, h, spec) {
  const cx = w * 0.18, cy = h * 0.85;
  const scale = Math.min((w * 0.7) / spec.magnitude, (h * 0.7) / spec.magnitude);
  const end = vecEndpoint(cx, cy, spec.magnitude, spec.angleDeg, scale);

  ctx.strokeStyle = COLOR.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy); ctx.lineTo(w - 10, cy);
  ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, 10);
  ctx.stroke();

  drawArrow(ctx, cx, cy, end.x, end.y, COLOR.accent);
  label(ctx, `${spec.label || 'V'} = ${spec.magnitude}`, end.x + 6, end.y - 6);
  label(ctx, `${spec.angleDeg}°`, cx + 26, cy - 10, { color: COLOR.accent });
}

function drawVectorComponents(ctx, w, h, spec) {
  const cx = w * 0.15, cy = h * 0.85;
  const maxComp = Math.max(Math.abs(spec.vx), Math.abs(spec.vy), 1);
  const scale = Math.min((w * 0.65) / maxComp, (h * 0.65) / maxComp);
  const endX = cx + spec.vx * scale;
  const endY = cy - spec.vy * scale;

  drawArrow(ctx, cx, cy, endX, cy, COLOR.line);
  label(ctx, `Vx = ${spec.vx}`, (cx + endX) / 2 - 20, cy + 18);
  drawArrow(ctx, endX, cy, endX, endY, COLOR.line);
  label(ctx, `Vy = ${spec.vy}`, endX + 6, (cy + endY) / 2);
  drawArrow(ctx, cx, cy, endX, endY, COLOR.accent, 3);
}

function drawVectorSum(ctx, w, h, spec) {
  const cx = w * 0.2, cy = h * 0.85;
  const maxMag = Math.max(spec.a.magnitude, spec.b.magnitude) * 1.6;
  const scale = Math.min((w * 0.7) / maxMag, (h * 0.7) / maxMag);

  const endA = vecEndpoint(cx, cy, spec.a.magnitude, spec.a.angleDeg, scale);
  drawArrow(ctx, cx, cy, endA.x, endA.y, '#8fc0e8');
  label(ctx, 'A', endA.x + 4, endA.y - 4, { color: '#8fc0e8' });

  const endB = vecEndpoint(endA.x, endA.y, spec.b.magnitude, spec.b.angleDeg, scale);
  drawArrow(ctx, endA.x, endA.y, endB.x, endB.y, '#e88f8f');
  label(ctx, 'B', endB.x + 4, endB.y - 4, { color: '#e88f8f' });

  drawArrow(ctx, cx, cy, endB.x, endB.y, COLOR.accent, 3);
  label(ctx, 'A+B', endB.x + 4, endB.y + 14, { color: COLOR.accent, bold: true });
}
