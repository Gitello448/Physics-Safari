// A small, dependency-free pixel-art editor: a paintable grid canvas plus an
// HSV color wheel and a light&ndash;dark shade slider. Used by characterLab.js
// to draw individual animation frames. Deliberately simple (paint + erase +
// clear, no flood-fill/undo) — this is a quick prototyping tool, not a full
// art package.

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// Creates a pixel editor inside `container`. `w`/`h` are the true pixel grid
// dimensions (e.g. 64x96). `initialPixels` is a flat array (length w*h) of
// hex strings or null (transparent); omit for a blank frame. `onionPixels`
// (optional, same shape) renders as a faint reference layer behind the
// editable pixels — typically the previous frame, so new frames line up.
// Returns { getPixels(), setPixels(arr), destroy() }.
export function createPixelEditor(container, { w, h, initialPixels, onionPixels, initialBrushSize } = {}) {
  const pixels = (initialPixels && initialPixels.length === w * h) ? initialPixels.slice() : new Array(w * h).fill(null);
  const onion = (onionPixels && onionPixels.length === w * h) ? onionPixels : null;
  let onionOn = !!onion;

  const MAX_GRID_PX = 380;
  const zoom = Math.max(3, Math.min(9, Math.floor(MAX_GRID_PX / Math.max(w, h))));
  const gridCanvas = document.createElement('canvas');
  gridCanvas.width = w * zoom;
  gridCanvas.height = h * zoom;
  gridCanvas.className = 'pe-grid';
  const gctx = gridCanvas.getContext('2d');

  let hue = 120, sat = 0.6, val = 0.6; // shade slider drives `val` (light<->dark)
  let currentColor = rgbToHex(...hsvToRgb(hue, sat, val));
  let tool = 'paint'; // paint | erase
  let brushSize = initialBrushSize || 1;

  function drawGrid() {
    gctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const px = pixels[i];
        if (px) {
          gctx.fillStyle = px;
          gctx.fillRect(x * zoom, y * zoom, zoom, zoom);
        } else {
          gctx.fillStyle = ((x + y) % 2 === 0) ? '#3a3f30' : '#32362a';
          gctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          const onionPx = onionOn && onion && onion[i];
          if (onionPx) {
            gctx.globalAlpha = 0.4;
            gctx.fillStyle = onionPx;
            gctx.fillRect(x * zoom, y * zoom, zoom, zoom);
            gctx.globalAlpha = 1;
          }
        }
      }
    }
    gctx.strokeStyle = 'rgba(0,0,0,0.15)';
    gctx.lineWidth = 1;
    for (let x = 0; x <= w; x++) {
      gctx.beginPath(); gctx.moveTo(x * zoom + 0.5, 0); gctx.lineTo(x * zoom + 0.5, h * zoom); gctx.stroke();
    }
    for (let y = 0; y <= h; y++) {
      gctx.beginPath(); gctx.moveTo(0, y * zoom + 0.5); gctx.lineTo(w * zoom, y * zoom + 0.5); gctx.stroke();
    }
    // anchor marker: bottom-center pixel, per the Pixel Kit anchor convention
    const ax = Math.floor(w / 2) * zoom, ay = (h - 1) * zoom;
    gctx.strokeStyle = '#e8b13a';
    gctx.lineWidth = 2;
    gctx.strokeRect(ax + 1, ay + 1, zoom - 2, zoom - 2);
  }

  function paintAt(clientX, clientY) {
    const rect = gridCanvas.getBoundingClientRect();
    const cx = Math.floor((clientX - rect.left) / (rect.width / w));
    const cy = Math.floor((clientY - rect.top) / (rect.height / h));
    const half = Math.floor((brushSize - 1) / 2);
    for (let dy = 0; dy < brushSize; dy++) {
      for (let dx = 0; dx < brushSize; dx++) {
        const x = cx - half + dx, y = cy - half + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        pixels[y * w + x] = tool === 'erase' ? null : currentColor;
      }
    }
    drawGrid();
  }

  let painting = false;
  const onDown = (e) => { painting = true; paintAt(e.clientX, e.clientY); };
  const onMove = (e) => { if (painting) paintAt(e.clientX, e.clientY); };
  const onUp = () => { painting = false; };
  gridCanvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  gridCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---- color wheel (hue = angle, saturation = radius) ----
  const WHEEL_SIZE = 140;
  const wheelCanvas = document.createElement('canvas');
  wheelCanvas.width = WHEEL_SIZE;
  wheelCanvas.height = WHEEL_SIZE;
  wheelCanvas.className = 'pe-wheel';
  const wctx = wheelCanvas.getContext('2d');

  function drawWheel() {
    const cx = WHEEL_SIZE / 2, cy = WHEEL_SIZE / 2, r = WHEEL_SIZE / 2 - 2;
    const img = wctx.createImageData(WHEEL_SIZE, WHEEL_SIZE);
    for (let py = 0; py < WHEEL_SIZE; py++) {
      for (let px = 0; px < WHEEL_SIZE; px++) {
        const dx = px - cx, dy = py - cy;
        const dist = Math.hypot(dx, dy);
        const idx = (py * WHEEL_SIZE + px) * 4;
        if (dist > r) { img.data[idx + 3] = 0; continue; }
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        const s = Math.min(1, dist / r);
        const [rr, gg, bb] = hsvToRgb(angle, s, val);
        img.data[idx] = rr; img.data[idx + 1] = gg; img.data[idx + 2] = bb; img.data[idx + 3] = 255;
      }
    }
    wctx.putImageData(img, 0, 0);
    // selection ring
    const rad = (hue * Math.PI) / 180;
    const sx = cx + Math.cos(rad) * sat * r, sy = cy + Math.sin(rad) * sat * r;
    wctx.strokeStyle = '#fff';
    wctx.lineWidth = 2;
    wctx.beginPath(); wctx.arc(sx, sy, 5, 0, Math.PI * 2); wctx.stroke();
    wctx.strokeStyle = 'rgba(0,0,0,0.6)';
    wctx.lineWidth = 1;
    wctx.beginPath(); wctx.arc(sx, sy, 5, 0, Math.PI * 2); wctx.stroke();
  }

  function pickWheel(clientX, clientY) {
    const rect = wheelCanvas.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2, r = rect.width / 2 - 2;
    const dx = (clientX - rect.left) - cx, dy = (clientY - rect.top) - cy;
    const dist = Math.hypot(dx, dy);
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    hue = angle;
    sat = Math.min(1, dist / r);
    updateColor();
  }
  let pickingWheel = false;
  wheelCanvas.addEventListener('mousedown', (e) => { pickingWheel = true; pickWheel(e.clientX, e.clientY); });
  window.addEventListener('mousemove', (e) => { if (pickingWheel) pickWheel(e.clientX, e.clientY); });
  window.addEventListener('mouseup', () => { pickingWheel = false; });

  // ---- light <-> dark shade slider (drives HSV value) ----
  const shadeInput = document.createElement('input');
  shadeInput.type = 'range';
  shadeInput.min = '0';
  shadeInput.max = '100';
  shadeInput.value = String(Math.round(val * 100));
  shadeInput.className = 'pe-shade';
  shadeInput.addEventListener('input', () => {
    val = Number(shadeInput.value) / 100;
    updateColor();
  });

  const swatch = document.createElement('div');
  swatch.className = 'pe-swatch';

  function updateColor() {
    currentColor = rgbToHex(...hsvToRgb(hue, sat, val));
    swatch.style.background = currentColor;
    drawWheel();
  }

  // ---- tool buttons ----
  const toolsRow = document.createElement('div');
  toolsRow.className = 'pe-tools';
  const paintBtn = document.createElement('button');
  paintBtn.type = 'button'; paintBtn.className = 'pe-tool-btn active'; paintBtn.textContent = '🖌 Paint';
  const eraseBtn = document.createElement('button');
  eraseBtn.type = 'button'; eraseBtn.className = 'pe-tool-btn'; eraseBtn.textContent = '🧹 Erase';
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button'; clearBtn.className = 'pe-tool-btn'; clearBtn.textContent = '🗑 Clear frame';
  paintBtn.addEventListener('click', () => { tool = 'paint'; paintBtn.classList.add('active'); eraseBtn.classList.remove('active'); });
  eraseBtn.addEventListener('click', () => { tool = 'erase'; eraseBtn.classList.add('active'); paintBtn.classList.remove('active'); });
  clearBtn.addEventListener('click', () => { pixels.fill(null); drawGrid(); });
  toolsRow.appendChild(paintBtn); toolsRow.appendChild(eraseBtn); toolsRow.appendChild(clearBtn);

  // ---- brush size ----
  const brushRow = document.createElement('div');
  brushRow.className = 'pe-brush-row';
  const brushLabelEl = document.createElement('span');
  brushLabelEl.className = 'pe-brush-label';
  brushLabelEl.textContent = `Brush: ${brushSize}px`;
  const brushInput = document.createElement('input');
  brushInput.type = 'range';
  brushInput.min = '1';
  brushInput.max = '6';
  brushInput.value = String(brushSize);
  brushInput.className = 'pe-brush';
  brushInput.addEventListener('input', () => {
    brushSize = Number(brushInput.value);
    brushLabelEl.textContent = `Brush: ${brushSize}px`;
  });
  brushRow.appendChild(brushLabelEl);
  brushRow.appendChild(brushInput);

  // ---- onion skin toggle (only shown when a reference frame is available) ----
  let onionToggle = null;
  if (onion) {
    const onionRow = document.createElement('label');
    onionRow.className = 'pe-onion-row';
    onionToggle = document.createElement('input');
    onionToggle.type = 'checkbox';
    onionToggle.checked = true;
    onionToggle.addEventListener('change', () => { onionOn = onionToggle.checked; drawGrid(); });
    onionRow.appendChild(onionToggle);
    onionRow.appendChild(document.createTextNode(' Onion skin (previous frame)'));
    brushRow.appendChild(onionRow);
  }

  const colorRow = document.createElement('div');
  colorRow.className = 'pe-color-row';
  colorRow.appendChild(wheelCanvas);
  const shadeCol = document.createElement('div');
  shadeCol.className = 'pe-shade-col';
  const shadeLabel = document.createElement('div');
  shadeLabel.className = 'pe-shade-label';
  shadeLabel.textContent = 'Light ↔ Dark';
  shadeCol.appendChild(shadeLabel);
  shadeCol.appendChild(shadeInput);
  shadeCol.appendChild(swatch);
  colorRow.appendChild(shadeCol);

  container.innerHTML = '';
  container.className = 'pixel-editor';
  const gridWrap = document.createElement('div');
  gridWrap.className = 'pe-grid-wrap';
  gridWrap.appendChild(gridCanvas);
  container.appendChild(gridWrap);
  container.appendChild(toolsRow);
  container.appendChild(brushRow);
  container.appendChild(colorRow);

  drawGrid();
  updateColor();

  return {
    getPixels: () => pixels.slice(),
    getBrushSize: () => brushSize,
    setPixels: (arr) => {
      if (arr && arr.length === w * h) {
        for (let i = 0; i < arr.length; i++) pixels[i] = arr[i];
      } else {
        pixels.fill(null);
      }
      drawGrid();
    },
    destroy: () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    },
  };
}

// The row (0-based from the top) of the lowest painted pixel in a frame —
// the artist's actual "floor", which may sit above the canvas's bottom edge
// if they didn't draw all the way down. Anything that positions this frame
// in the world should ground THIS row, not the raw canvas bottom, so a
// small/short drawing doesn't appear to float above the tile it's standing
// on. Falls back to the last row for a fully empty frame (nothing to ground).
export function findFloorRow(frame) {
  for (let y = frame.h - 1; y >= 0; y--) {
    const rowStart = y * frame.w;
    for (let x = 0; x < frame.w; x++) {
      if (frame.pixels[rowStart + x]) return y;
    }
  }
  return frame.h - 1;
}

// Compact export encoding: a palette (up to 36 colors, indexed 0-9a-z) plus
// a single w*h-length string ('.' = transparent). This is only for getting
// a prototype's pixel data out of the browser as pasteable chat text — the
// verbose {w,h,pixels:[hex|null,...]} shape used everywhere else at runtime
// is much larger as JSON (a null/hex string per cell) than real pixel art
// needs, since most frames use only a handful of distinct colors.
const PALETTE_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';

export function encodeFrameCompact(frame) {
  const paletteMap = new Map();
  const palette = [];
  let data = '';
  for (const hex of frame.pixels) {
    if (!hex) { data += '.'; continue; }
    let idx = paletteMap.get(hex);
    if (idx === undefined) {
      if (palette.length >= PALETTE_CHARS.length) { data += '.'; continue; } // >36 colors: drop silently, extremely unlikely for pixel art
      idx = palette.length;
      palette.push(hex);
      paletteMap.set(hex, idx);
    }
    data += PALETTE_CHARS[idx];
  }
  return { w: frame.w, h: frame.h, palette, data };
}

// Builds an offscreen canvas from a stored {w,h,pixels} frame, for use as a
// drawImage source (previewing/animating a prototype).
export function frameToCanvas(frame) {
  const c = document.createElement('canvas');
  c.width = frame.w;
  c.height = frame.h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(frame.w, frame.h);
  for (let i = 0; i < frame.pixels.length; i++) {
    const hex = frame.pixels[i];
    const idx = i * 4;
    if (!hex) { img.data[idx + 3] = 0; continue; }
    img.data[idx] = parseInt(hex.slice(1, 3), 16);
    img.data[idx + 1] = parseInt(hex.slice(3, 5), 16);
    img.data[idx + 2] = parseInt(hex.slice(5, 7), 16);
    img.data[idx + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
