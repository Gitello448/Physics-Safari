export function attachInput(canvas, camera, handlers) {
  const state = { hoverTile: null, isPlacementValid: handlers.isPlacementValid };

  let dragging = false;
  let dragButton = null;
  let lastX = 0, lastY = 0;
  let paintedThisDrag = new Set();
  let movedSinceDown = false;

  function tileAt(e) {
    const rect = canvas.getBoundingClientRect();
    return camera.screenToTile(e.clientX - rect.left, e.clientY - rect.top);
  }

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    dragButton = e.button;
    lastX = e.clientX; lastY = e.clientY;
    movedSinceDown = false;
    paintedThisDrag = new Set();
    if (e.button === 0) {
      // Always fire once on click, even in the pan tool — onAction itself
      // no-ops for pan on plain tiles, but this is what lets clicking a
      // building (e.g. the Expedition HQ) work while pan/select is active,
      // which is the tool players spend most of their time in.
      const t = tileAt(e);
      const key = `${t.x},${t.y}`;
      paintedThisDrag.add(key);
      handlers.onAction(t.x, t.y);
    }
  });

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    state.hoverTile = camera.screenToTile(sx, sy);
    handlers.onHover?.(state.hoverTile);

    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) movedSinceDown = true;

    if (dragButton === 2 || (dragButton === 0 && handlers.getTool() === 'pan')) {
      camera.pan(dx, dy);
    } else if (dragButton === 0 && movedSinceDown) {
      // sample along the drag path so a fast mouse move doesn't skip tiles
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
      for (let i = 1; i <= steps; i++) {
        const ix = lastX + (dx * i) / steps;
        const iy = lastY + (dy * i) / steps;
        const rect = canvas.getBoundingClientRect();
        const t = camera.screenToTile(ix - rect.left, iy - rect.top);
        const key = `${t.x},${t.y}`;
        if (!paintedThisDrag.has(key)) {
          paintedThisDrag.add(key);
          handlers.onAction(t.x, t.y);
        }
      }
    }
    lastX = e.clientX; lastY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    dragging = false;
    dragButton = null;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    camera.zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
  }, { passive: false });

  const keys = new Set();
  window.addEventListener('keydown', (e) => keys.add(e.key));
  window.addEventListener('keyup', (e) => keys.delete(e.key));
  function panFromKeys(dt) {
    const speed = 0.5 * dt;
    let dx = 0, dy = 0;
    if (keys.has('ArrowLeft') || keys.has('a')) dx += speed;
    if (keys.has('ArrowRight') || keys.has('d')) dx -= speed;
    if (keys.has('ArrowUp') || keys.has('w')) dy += speed;
    if (keys.has('ArrowDown') || keys.has('s')) dy -= speed;
    if (dx || dy) camera.pan(dx, dy);
  }

  return { state, panFromKeys };
}
