// Character Lab: a developer-only tool for prototyping hand-pixeled
// characters/animals/decorations in-browser, matching the same canvas sizes
// and animation frames documented for the Procreate workflow. Prototypes
// save as drafts to the developer's own account (character_prototypes,
// RLS-locked to the developer role) — nothing here is visible to any other
// player, and nothing "publishes" itself; that stays a manual step later.

import { createPixelEditor, frameToCanvas, findFloorRow, encodeFrameCompact } from './pixelEditor.js';
import { fetchPrototypes, savePrototype, deletePrototype } from './auth.js';

const ANIMATED_FRAMES = ['idle_1', 'idle_2', 'walk_1', 'walk_2', 'walk_3', 'walk_4'];
const STATIC_FRAMES = ['static'];

const FRAME_LABELS = {
  idle_1: 'Idle — Pose 1', idle_2: 'Idle — Pose 2',
  walk_1: 'Walk — Frame 1', walk_2: 'Walk — Frame 2', walk_3: 'Walk — Frame 3', walk_4: 'Walk — Frame 4',
  static: 'Static Art',
};

export const CHARACTER_TEMPLATES = {
  visitor: { label: 'Human Visitor', desc: '1×1 tile · park guest', frame: { w: 64, h: 96 }, frames: ANIMATED_FRAMES },
  staff: { label: 'Staff / Ranger', desc: '1×1 tile · not wired into the game yet', frame: { w: 64, h: 96 }, frames: ANIMATED_FRAMES },
  smallAnimal: { label: 'Small Animal', desc: '1×1 tile · meerkat/tortoise scale', frame: { w: 64, h: 64 }, frames: ANIMATED_FRAMES },
  mediumAnimal: { label: 'Medium Animal', desc: '1×1 tile · zebra scale', frame: { w: 64, h: 96 }, frames: ANIMATED_FRAMES },
  largeAnimal: { label: 'Large Animal', desc: '1×1 tile (movement) · tall art · giraffe/rhino scale', frame: { w: 64, h: 128 }, frames: ANIMATED_FRAMES },
  decoration: { label: 'Decoration', desc: '2×2 tiles · static, no animation', frame: { w: 128, h: 160 }, frames: STATIC_FRAMES },
  building: { label: 'Building', desc: 'provisional sizing · static, no animation', frame: { w: 192, h: 224 }, frames: STATIC_FRAMES },
  // Open-ended frame count instead of a fixed list — for things like a
  // roller coaster where you don't know up front how many frames you'll
  // want. Starts at 1 frame; "Add Frame" appends more as you go.
  attraction: { label: 'Attraction', desc: 'provisional sizing · animated, add frames as you go', frame: { w: 192, h: 224 }, variableFrames: true },
};

export function createCharacterLab({ root, getUserId, getIsDeveloper }) {
  let prototypes = [];
  let editing = null; // { id, name, template, frames: {key: {w,h,pixels}} }
  let frameIndex = 0;
  let pixelEditor = null;
  let lastBrushSize = 1; // carried across frame navigation so it doesn't reset every frame
  let previewTimer = null;

  function render(html) {
    stopPreview();
    // Every screen transition — including navigating between frames of the
    // same prototype, which calls render() again via showFrameEditor() —
    // discards whatever pixelEditor instance was showing. Tear its window-
    // level listeners (mousemove/mouseup/keydown for undo) down first, or
    // they'd pile up one stale set per frame visited all session.
    if (pixelEditor) { pixelEditor.destroy(); pixelEditor = null; }
    root.innerHTML = html;
  }

  async function open() {
    // Refuses to open for anyone but the developer role, independent of
    // whether the caller remembered to check first (e.g. a hidden toolbar
    // button revealed via devtools) — nothing here ever depends solely on
    // UI visibility, matching how Dev Mode itself is gated.
    if (!getIsDeveloper || !getIsDeveloper()) return;
    root.classList.remove('hidden');
    document.getElementById('charLabBackdrop').classList.remove('hidden');
    await showList();
  }
  function close() {
    stopPreview();
    if (pixelEditor) { pixelEditor.destroy(); pixelEditor = null; }
    root.classList.add('hidden');
    document.getElementById('charLabBackdrop').classList.add('hidden');
  }

  function stopPreview() {
    if (previewTimer) { clearInterval(previewTimer); previewTimer = null; }
  }

  // Ordered list of frame keys for the prototype currently being edited —
  // a fixed list for animal/visitor templates, or the growable list built
  // up via Add Frame for a variableFrames template (e.g. Attraction).
  function currentFrameKeys() {
    const tpl = CHARACTER_TEMPLATES[editing.template];
    if (!tpl.variableFrames) return tpl.frames;
    if (!editing.frameOrder || editing.frameOrder.length === 0) editing.frameOrder = ['frame_1'];
    return editing.frameOrder;
  }

  function frameOrderFromSavedFrames(frames) {
    const order = Object.keys(frames || {}).filter((k) => k.startsWith('frame_'));
    order.sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]));
    return order.length > 0 ? order : ['frame_1'];
  }

  function labelForFrameKey(key) {
    if (FRAME_LABELS[key]) return FRAME_LABELS[key];
    const n = key.startsWith('frame_') ? key.split('_')[1] : null;
    return n ? `Frame ${n}` : key;
  }

  function frameCountFor(p) {
    const tpl = CHARACTER_TEMPLATES[p.template];
    const done = Object.values(p.frames || {}).filter((f) => f && f.pixels && f.pixels.some((px) => px)).length;
    if (tpl?.variableFrames) return `${done} frame${done === 1 ? '' : 's'}`;
    return `${done}/${tpl?.frames.length || 0} frames`;
  }

  // ---- List screen --------------------------------------------------------
  async function showList() {
    render(`<div class="cl-header">🎨 CHARACTER LAB<span class="cl-sub">draft prototypes — visible only to this account</span></div>
      <div class="cl-loading">Loading your prototypes…</div>`);
    try {
      prototypes = await fetchPrototypes(getUserId());
    } catch (e) {
      render(`<div class="cl-header">🎨 CHARACTER LAB</div><p class="cl-error">Couldn't load your saved prototypes: ${escapeHtml(e.message || String(e))}</p>
        <div class="cl-actions">
          <button class="big-btn" id="clNewBtn">+ New Character</button>
          <button class="small-btn" id="clCloseBtn">Close</button>
        </div>`);
      document.getElementById('clNewBtn').addEventListener('click', showTemplatePicker);
      document.getElementById('clCloseBtn').addEventListener('click', close);
      prototypes = [];
      return;
    }
    render(`
      <div class="cl-header">🎨 CHARACTER LAB<span class="cl-sub">draft prototypes — visible only to this account</span></div>
      <div class="cl-list">
        ${prototypes.length === 0 ? '<div class="cl-empty">No prototypes yet.</div>' : prototypes.map((p) => `
          <div class="cl-row">
            <div class="cl-row-info">
              <span class="cl-row-name">${escapeHtml(p.name)}</span>
              <span class="cl-row-meta">${escapeHtml(CHARACTER_TEMPLATES[p.template]?.label || p.template)} · ${frameCountFor(p)} · ${escapeHtml(p.status)}</span>
            </div>
            <div class="cl-row-actions">
              <button class="small-btn" data-edit="${p.id}">Edit</button>
              <button class="small-btn" data-preview="${p.id}">Preview</button>
              <button class="small-btn" data-export="${p.id}">Export</button>
              <button class="small-btn" data-delete="${p.id}">Delete</button>
            </div>
          </div>`).join('')}
      </div>
      <div class="cl-actions">
        <button class="big-btn" id="clNewBtn">+ New Character</button>
        <button class="small-btn" id="clCloseBtn">Close</button>
      </div>
    `);
    document.getElementById('clNewBtn').addEventListener('click', showTemplatePicker);
    document.getElementById('clCloseBtn').addEventListener('click', close);
    root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editPrototype(b.dataset.edit)));
    root.querySelectorAll('[data-preview]').forEach((b) => b.addEventListener('click', () => previewPrototype(b.dataset.preview)));
    root.querySelectorAll('[data-export]').forEach((b) => b.addEventListener('click', () => showExport(b.dataset.export)));
    root.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', () => removePrototype(b.dataset.delete)));
  }

  // Gets the pixel data out of the browser as pasteable text, so it can be
  // handed over in chat and baked into the real game as published content
  // — there's no other way to get a developer-only, RLS-locked prototype's
  // data out safely (nothing should ever fetch it on the player's behalf).
  function showExport(id) {
    const p = prototypes.find((x) => x.id === id);
    if (!p) return;
    const compactFrames = {};
    for (const [key, frame] of Object.entries(p.frames || {})) {
      if (frame && frame.pixels) compactFrames[key] = encodeFrameCompact(frame);
    }
    const payload = JSON.stringify({ name: p.name, template: p.template, frames: compactFrames });
    render(`
      <div class="cl-header">🎨 EXPORT — ${escapeHtml(p.name)}<span class="cl-sub">paste this to Claude in chat to publish it</span></div>
      <textarea id="clExportText" class="cl-export-text" readonly></textarea>
      <div class="cl-actions">
        <button class="small-btn" id="clCopyExport">Copy to Clipboard</button>
        <button class="small-btn" id="clBackBtn">← Back</button>
      </div>
    `);
    const textarea = document.getElementById('clExportText');
    textarea.value = payload;
    textarea.focus();
    textarea.select();
    document.getElementById('clCopyExport').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(payload);
        const btn = document.getElementById('clCopyExport');
        btn.textContent = 'Copied ✓';
        setTimeout(() => { if (btn) btn.textContent = 'Copy to Clipboard'; }, 1200);
      } catch (e) {
        textarea.select();
        window.alert('Could not copy automatically — the text is already selected, so Cmd/Ctrl+C should work.');
      }
    });
    document.getElementById('clBackBtn').addEventListener('click', showList);
  }

  function editPrototype(id) {
    const p = prototypes.find((x) => x.id === id);
    if (!p) return;
    editing = { id: p.id, name: p.name, template: p.template, frames: p.frames || {} };
    if (CHARACTER_TEMPLATES[p.template]?.variableFrames) {
      editing.frameOrder = frameOrderFromSavedFrames(editing.frames);
    }
    frameIndex = 0;
    showFrameEditor();
  }

  async function removePrototype(id) {
    const p = prototypes.find((x) => x.id === id);
    // A hard delete from the database with no trash/recovery — the one
    // action here undo can't reach after the fact, so it gets a confirm
    // instead (matching Clear Frame, Remove This Frame, and Copy Frame 1 →
    // All, which all guard their own irreversible moves the same way).
    if (!window.confirm(`Delete "${p ? p.name : 'this prototype'}"? This cannot be undone.`)) return;
    try {
      await deletePrototype(id);
    } catch (e) { /* fall through to refresh either way */ }
    showList();
  }

  // ---- Template picker ----------------------------------------------------
  function showTemplatePicker() {
    render(`
      <div class="cl-header">🎨 NEW CHARACTER<span class="cl-sub">pick a template</span></div>
      <div class="cl-templates">
        ${Object.entries(CHARACTER_TEMPLATES).map(([key, t]) => `
          <button class="cl-template-card" data-template="${key}">
            <span class="cl-template-name">${escapeHtml(t.label)}</span>
            <span class="cl-template-desc">${escapeHtml(t.desc)}</span>
            <span class="cl-template-size">${t.frame.w}×${t.frame.h}px</span>
          </button>`).join('')}
      </div>
      <div class="cl-actions"><button class="small-btn" id="clBackBtn">← Back</button></div>
    `);
    document.getElementById('clBackBtn').addEventListener('click', showList);
    root.querySelectorAll('[data-template]').forEach((b) => b.addEventListener('click', () => showNameScreen(b.dataset.template)));
  }

  function showNameScreen(templateKey) {
    const tpl = CHARACTER_TEMPLATES[templateKey];
    render(`
      <div class="cl-header">🎨 NEW ${escapeHtml(tpl.label.toUpperCase())}<span class="cl-sub">${tpl.frame.w}×${tpl.frame.h}px &middot; give it a name</span></div>
      <input id="clNameInput" type="text" class="numeric-input auth-input" placeholder="e.g. Savanna Zebra" maxlength="40" />
      <div class="cl-actions">
        <button class="big-btn" id="clNameContinue">Continue →</button>
        <button class="small-btn" id="clBackBtn">← Back</button>
      </div>
    `);
    const input = document.getElementById('clNameInput');
    input.focus();
    const submit = () => {
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      editing = { id: null, name, template: templateKey, frames: {} };
      frameIndex = 0;
      showFrameEditor();
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    document.getElementById('clNameContinue').addEventListener('click', submit);
    document.getElementById('clBackBtn').addEventListener('click', showTemplatePicker);
  }

  // ---- Frame editor ---------------------------------------------------------
  function showFrameEditor() {
    const tpl = CHARACTER_TEMPLATES[editing.template];
    const frames = currentFrameKeys();
    const key = frames[frameIndex];
    const isStatic = frames.length === 1 && !tpl.variableFrames;

    render(`
      <div class="cl-header">🎨 ${escapeHtml(editing.name)}<span class="cl-sub">${escapeHtml(tpl.label)} · ${tpl.frame.w}×${tpl.frame.h}px</span></div>
      ${isStatic ? '' : `<div class="cl-frame-stepper">
        <button class="small-btn" id="clPrevFrame" ${frameIndex === 0 ? 'disabled' : ''}>‹ Prev</button>
        <span class="cl-frame-label">Frame ${frameIndex + 1} of ${frames.length} — ${labelForFrameKey(key)}</span>
        <button class="small-btn" id="clNextFrame" ${frameIndex === frames.length - 1 ? 'disabled' : ''}>Next ›</button>
      </div>`}
      <div id="clEditorHost"></div>
      <div class="cl-actions">
        ${frameIndex > 0 ? '<button class="small-btn" id="clCopyPrev">Copy previous frame</button>' : ''}
        ${!isStatic && !tpl.variableFrames ? '<button class="small-btn" id="clCopyFirstToAll">Copy frame 1 → all frames</button>' : ''}
        ${tpl.variableFrames ? '<button class="small-btn" id="clAddFrame">+ Add Frame</button>' : ''}
        ${tpl.variableFrames && frames.length > 1 ? '<button class="small-btn" id="clRemoveFrame">Remove this frame</button>' : ''}
        <button class="big-btn" id="clSaveBtn">Save Draft</button>
        <button class="small-btn" id="clDoneBtn">Done — Back to List</button>
      </div>
    `);

    const host = document.getElementById('clEditorHost');
    const existing = editing.frames[key];
    const onionKey = frameIndex > 0 ? frames[frameIndex - 1] : null;
    const onionPixels = onionKey ? editing.frames[onionKey]?.pixels : null;
    pixelEditor = createPixelEditor(host, { w: tpl.frame.w, h: tpl.frame.h, initialPixels: existing?.pixels, onionPixels, initialBrushSize: lastBrushSize });

    if (!isStatic) {
      document.getElementById('clPrevFrame')?.addEventListener('click', () => { commitCurrentFrame(); frameIndex--; showFrameEditor(); });
      document.getElementById('clNextFrame')?.addEventListener('click', () => { commitCurrentFrame(); frameIndex++; showFrameEditor(); });
    }
    document.getElementById('clCopyPrev')?.addEventListener('click', () => {
      const prevKey = frames[frameIndex - 1];
      const prev = editing.frames[prevKey];
      if (prev) pixelEditor.setPixels(prev.pixels);
    });
    document.getElementById('clCopyFirstToAll')?.addEventListener('click', () => {
      commitCurrentFrame();
      const first = editing.frames[frames[0]];
      if (!first) { window.alert('Draw frame 1 first — then this can copy it into the rest.'); return; }
      if (!window.confirm(`Copy frame 1's design into all other frames? This overwrites whatever is currently on frames 2–${frames.length}.`)) return;
      for (let idx = 1; idx < frames.length; idx++) {
        editing.frames[frames[idx]] = { w: first.w, h: first.h, pixels: first.pixels.slice() };
      }
      showFrameEditor();
    });
    document.getElementById('clAddFrame')?.addEventListener('click', () => {
      commitCurrentFrame();
      const order = currentFrameKeys();
      const nextNum = order.length + 1;
      order.push(`frame_${nextNum}`);
      frameIndex = order.length - 1;
      showFrameEditor();
    });
    document.getElementById('clRemoveFrame')?.addEventListener('click', () => {
      if (!window.confirm('Remove this frame? This cannot be undone.')) return;
      const order = currentFrameKeys();
      if (order.length <= 1) return;
      delete editing.frames[order[frameIndex]];
      order.splice(frameIndex, 1);
      frameIndex = Math.min(frameIndex, order.length - 1);
      showFrameEditor();
    });
    document.getElementById('clSaveBtn').addEventListener('click', saveDraft);
    document.getElementById('clDoneBtn').addEventListener('click', async () => { commitCurrentFrame(); await saveDraft(); showList(); });
  }

  function commitCurrentFrame() {
    if (!pixelEditor || !editing) return;
    const tpl = CHARACTER_TEMPLATES[editing.template];
    const key = currentFrameKeys()[frameIndex];
    editing.frames[key] = { w: tpl.frame.w, h: tpl.frame.h, pixels: pixelEditor.getPixels() };
    lastBrushSize = pixelEditor.getBrushSize();
  }

  async function saveDraft() {
    commitCurrentFrame();
    const saveBtn = document.getElementById('clSaveBtn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }
    try {
      const saved = await savePrototype(getUserId(), {
        id: editing.id, name: editing.name, template: editing.template, frames: editing.frames, status: 'draft',
      });
      editing.id = saved.id;
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Saved ✓'; setTimeout(() => { if (saveBtn) saveBtn.textContent = 'Save Draft'; }, 1200); }
    } catch (e) {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Draft'; }
      window.alert('Could not save: ' + (e.message || e));
    }
  }

  // ---- Animated preview -----------------------------------------------------
  function previewPrototype(id) {
    const p = prototypes.find((x) => x.id === id);
    if (!p) return;
    const tpl = CHARACTER_TEMPLATES[p.template];
    const isStatic = !tpl.variableFrames && tpl.frames.length === 1;
    const canMirror = !tpl.variableFrames; // mirroring is a left/right-facing-character thing, not meaningful for a fixed structure like an attraction
    render(`
      <div class="cl-header">🎨 PREVIEW — ${escapeHtml(p.name)}<span class="cl-sub">${escapeHtml(tpl.label)}</span></div>
      <div class="cl-preview-stage">
        <canvas id="clPreviewCanvas" width="240" height="240"></canvas>
      </div>
      ${isStatic ? '' : `<div class="cl-preview-hint">${canMirror ? 'Cycling idle → walk, mirrored on alternate loops (same as in-game left/right).' : 'Cycling through all frames in order.'}</div>`}
      <div class="cl-actions"><button class="small-btn" id="clBackBtn">← Back</button></div>
    `);
    document.getElementById('clBackBtn').addEventListener('click', showList);

    const canvas = document.getElementById('clPreviewCanvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const frameKeys = tpl.variableFrames
      ? frameOrderFromSavedFrames(p.frames)
      : (isStatic ? ['static'] : ['idle_1', 'idle_2', 'idle_1', 'idle_2', 'walk_1', 'walk_2', 'walk_3', 'walk_4']);
    const framesData = frameKeys.map((k) => p.frames[k]).filter(Boolean);
    if (framesData.length === 0) return;
    const canvases = framesData.map((f) => frameToCanvas(f));
    // Ground the artist's actual bottommost painted pixel, not the raw
    // canvas edge — a drawing that doesn't reach the bottom row would
    // otherwise look like it's floating above the ground line.
    const floorRows = framesData.map((f) => findFloorRow(f));

    let i = 0, mirror = false, loops = 0;
    function drawFrame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const idx = i % canvases.length;
      const img = canvases[idx];
      const scale = Math.min(200 / img.width, 200 / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      const floorY = (floorRows[idx] + 1) * scale;
      const dx = (canvas.width - dw) / 2, dy = canvas.height - 20 - floorY;
      ctx.save();
      if (mirror) { ctx.translate(dx + dw, dy); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, dw, dh); }
      else { ctx.drawImage(img, dx, dy, dw, dh); }
      ctx.restore();
      // ground line at the anchor row, for a quick sanity check of the anchor point
      ctx.strokeStyle = 'rgba(232,177,58,0.5)';
      ctx.beginPath(); ctx.moveTo(20, canvas.height - 20); ctx.lineTo(canvas.width - 20, canvas.height - 20); ctx.stroke();
      i++;
      if (i % canvases.length === 0) { loops++; if (canMirror && loops % 2 === 0) mirror = !mirror; }
    }
    drawFrame();
    previewTimer = setInterval(drawFrame, isStatic ? 1000 : 220);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return { open, close };
}
