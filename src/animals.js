import { TILE } from './world.js';
import { PUBLISHED_ANIMALS } from './publishedCharacters.js';

export const ANIMAL_DEFS = {
  zebra: { name: 'Zebra', cost: 500, speed: 1.4, icon: '🦓' },
  giraffe: { name: 'Giraffe', cost: 800, speed: 1.1, icon: '🦒' },
  rhino: { name: 'Rhino', cost: 1200, speed: 0.9, icon: '🦏' },
  ...PUBLISHED_ANIMALS,
};

let nextId = 1;

function bfsPath(world, habitat, from, to) {
  if (from.x === to.x && from.y === to.y) return [from];
  const key = (x, y) => `${x},${y}`;
  const visited = new Set([key(from.x, from.y)]);
  const prev = new Map();
  const queue = [from];
  let qi = 0;
  while (qi < queue.length) {
    const cur = queue[qi++];
    if (cur.x === to.x && cur.y === to.y) break;
    const neighbors = [
      { x: cur.x + 1, y: cur.y }, { x: cur.x - 1, y: cur.y },
      { x: cur.x, y: cur.y + 1 }, { x: cur.x, y: cur.y - 1 },
    ];
    for (const n of neighbors) {
      const k = key(n.x, n.y);
      if (visited.has(k)) continue;
      if (!habitat.tiles.has(k)) continue;
      visited.add(k);
      prev.set(k, cur);
      queue.push(n);
    }
  }
  const k = key(to.x, to.y);
  if (!prev.has(k) && !(from.x === to.x && from.y === to.y)) return null;
  const path = [to];
  let curKey = k;
  let cur = to;
  while (prev.has(curKey)) {
    cur = prev.get(curKey);
    path.push(cur);
    curKey = key(cur.x, cur.y);
  }
  path.reverse();
  return path;
}

export class Animal {
  constructor(species, tileX, tileY) {
    this.id = nextId++;
    this.species = species;
    this.x = tileX + 0.5; // world tile-space position (float, center of tile = .5)
    this.y = tileY + 0.5;
    this.state = 'idle'; // idle | walking — animation/movement state, independent of `escaped`
    // Set once its enclosure gets breached (a fence tile sold out from under
    // it) — never reset by save/load: it's re-derived fresh from the
    // habitat check below every tick, same as the habitat lookup itself.
    this.escaped = false;
    this.eatCooldown = 0; // ms remaining before an escaped animal can catch another guest
    this.idleTimer = 1000 + Math.random() * 2000;
    this.path = null;
    this.pathIndex = 0;
    this.facing = 1;
    this.animT = Math.random() * 1000;
  }

  get tileX() { return Math.floor(this.x); }
  get tileY() { return Math.floor(this.y); }

  update(dt, world) {
    this.animT += dt;
    if (this.eatCooldown > 0) this.eatCooldown = Math.max(0, this.eatCooldown - dt);

    if (!this.escaped) {
      // Look up the habitat fresh from the animal's current tile rather than trusting
      // a cached id: habitat ids are reassigned on every recompute (any fence changing
      // anywhere on the map), so a stored id goes stale immediately. Spatial containment
      // ("what encloses me right now") is the only thing that stays meaningful.
      const habitat = world.habitatAt(this.tileX, this.tileY);
      if (!habitat || !habitat.enclosed) {
        // The enclosure around this animal just broke (its fence was sold) —
        // it's loose in the park now, not merely frozen. Give it a short
        // beat before it starts moving so the break reads clearly.
        this.escaped = true;
        this.state = 'idle';
        this.path = null;
        this.pathIndex = 0;
        this.idleTimer = 300 + Math.random() * 500;
        return;
      }
      if (this.state === 'idle') {
        this.idleTimer -= dt;
        if (this.idleTimer <= 0) this.pickDestination(world, habitat);
        return;
      }
      if (this.state === 'walking' && this.path) this.stepAlongPath(dt);
      return;
    }

    // Escaped: no habitat to respect anymore, just wander any walkable tile.
    if (this.state === 'idle') {
      this.idleTimer -= dt;
      if (this.idleTimer <= 0) this.pickWanderStep(world);
      return;
    }
    if (this.state === 'walking' && this.path) this.stepAlongPath(dt);
  }

  stepAlongPath(dt) {
    const speed = (ANIMAL_DEFS[this.species]?.speed || 1) * (dt / 1000);
    const target = this.path[this.pathIndex];
    if (!target) { this.state = 'idle'; this.idleTimer = this.restTime(); this.path = null; return; }
    const tx = target.x + 0.5, ty = target.y + 0.5;
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < speed) {
      this.x = tx; this.y = ty;
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) {
        this.state = 'idle';
        this.idleTimer = this.restTime();
        this.path = null;
      }
    } else {
      this.x += (dx / dist) * speed;
      this.y += (dy / dist) * speed;
      if (Math.abs(dx) > 0.01) this.facing = dx > 0 ? 1 : -1;
    }
  }

  restTime() {
    return this.escaped ? 800 + Math.random() * 1200 : 1500 + Math.random() * 3000;
  }

  pickDestination(world, habitat) {
    const tiles = Array.from(habitat.tiles);
    if (tiles.length < 2) { this.idleTimer = 2000; return; }
    for (let attempt = 0; attempt < 6; attempt++) {
      const pick = tiles[Math.floor(Math.random() * tiles.length)];
      const [tx, ty] = pick.split(',').map(Number);
      const path = bfsPath(world, habitat, { x: this.tileX, y: this.tileY }, { x: tx, y: ty });
      if (path && path.length > 1) {
        this.path = path;
        this.pathIndex = 1;
        this.state = 'walking';
        return;
      }
    }
    this.idleTimer = 1500;
  }

  // Escaped animals aren't confined to a habitat's tile set, so there's no
  // fixed pool to BFS toward — just take one random walkable step at a time
  // across the whole map. Cheap, and reads as "prowling" rather than
  // beelining somewhere specific, which fits loose-in-the-park better anyway.
  pickWanderStep(world) {
    const cx = this.tileX, cy = this.tileY;
    const candidates = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]
      .map(([x, y]) => ({ x, y }))
      .filter((t) => world.isWalkable(t.x, t.y));
    if (candidates.length === 0) { this.idleTimer = 1000; return; }
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    this.path = [{ x: cx, y: cy }, target];
    this.pathIndex = 1;
    this.state = 'walking';
  }
}
