import { TILE, MAP_W, MAP_H, defaultLandmarks } from './world.js';

export class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    // logical (CSS-pixel) viewport size — kept separate from canvas.width/height,
    // which may be scaled up by devicePixelRatio for crisp rendering on retina displays.
    this.viewW = canvas.width;
    this.viewH = canvas.height;
    // Default view frames the midpoint between the HQ and the Park Entrance,
    // so a fresh park shows both landmarks without the player needing to pan.
    const { hqTile, entranceTile } = defaultLandmarks(MAP_W, MAP_H);
    this.x = (MAP_W * TILE) / 2;
    this.y = ((hqTile.y + entranceTile.y) / 2) * TILE + TILE / 2;
    this.zoom = 1;
    this.minZoom = 0.5;
    this.maxZoom = 2.2;
  }

  worldToScreen(wx, wy) {
    const cx = this.viewW / 2;
    const cy = this.viewH / 2;
    return {
      x: cx + (wx - this.x) * this.zoom,
      y: cy + (wy - this.y) * this.zoom,
    };
  }

  screenToWorld(sx, sy) {
    const cx = this.viewW / 2;
    const cy = this.viewH / 2;
    return {
      x: this.x + (sx - cx) / this.zoom,
      y: this.y + (sy - cy) / this.zoom,
    };
  }

  screenToTile(sx, sy) {
    const w = this.screenToWorld(sx, sy);
    return { x: Math.floor(w.x / TILE), y: Math.floor(w.y / TILE) };
  }

  pan(dxScreen, dyScreen) {
    this.x -= dxScreen / this.zoom;
    this.y -= dyScreen / this.zoom;
    this.clamp();
  }

  zoomAt(sx, sy, factor) {
    const before = this.screenToWorld(sx, sy);
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    const after = this.screenToWorld(sx, sy);
    this.x -= (after.x - before.x);
    this.y -= (after.y - before.y);
    this.clamp();
  }

  clamp() {
    const margin = 200;
    const minX = -margin, maxX = MAP_W * TILE + margin;
    const minY = -margin, maxY = MAP_H * TILE + margin;
    this.x = Math.min(maxX, Math.max(minX, this.x));
    this.y = Math.min(maxY, Math.max(minY, this.y));
  }

  visibleTileRange() {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.viewW, this.viewH);
    return {
      minX: Math.max(0, Math.floor(topLeft.x / TILE) - 1),
      minY: Math.max(0, Math.floor(topLeft.y / TILE) - 1),
      maxX: Math.min(MAP_W - 1, Math.ceil(bottomRight.x / TILE) + 1),
      maxY: Math.min(MAP_H - 1, Math.ceil(bottomRight.y / TILE) + 1),
    };
  }
}
