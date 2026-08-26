import { VISITORS } from './economy.js';

let nextId = 1;

const SPEED = 1.6; // tiles per second
const VIEW_PAUSE_MS = [1800, 4200]; // min/max time spent "observing" at a stop

function randRange([lo, hi]) { return lo + Math.random() * (hi - lo); }

export class Visitor {
  constructor(spawnTile) {
    this.id = nextId++;
    this.x = spawnTile.x + 0.5;
    this.y = spawnTile.y + 0.5;
    this.state = 'walking'; // walking | paused | leaving | gone
    this.path = null;
    this.pathIndex = 0;
    this.facing = 1;
    this.animT = Math.random() * 1000;
    this.pauseTimer = 0;
    this.stopsRemaining = 3 + Math.floor(Math.random() * 4);
    this.colorIndex = Math.floor(Math.random() * 6);
  }

  get tileX() { return Math.floor(this.x); }
  get tileY() { return Math.floor(this.y); }

  update(dt, world, destinationPicker) {
    this.animT += dt;
    if (this.state === 'gone') return;

    // Recovery: if we're not actually standing on a valid path tile anymore
    // (the player deleted it out from under us), or the path ahead has been
    // broken, drop what we're doing and try to recover gracefully.
    if (!world.isPathTile(this.tileX, this.tileY)) {
      this.state = 'gone';
      return;
    }
    if (this.path && !this.path.every((t) => world.isPathTile(t.x, t.y))) {
      // Drop the invalidated route but keep whatever state we were in
      // ('walking' or 'leaving') — headToNextDestination branches on that
      // to decide whether to pick a new stop or keep heading for the exit.
      this.path = null;
    }

    if (this.state === 'paused') {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) this.headToNextDestination(world, destinationPicker);
      return;
    }

    if (!this.path) {
      this.headToNextDestination(world, destinationPicker);
      if (!this.path) return; // couldn't find anywhere to go — will retry next tick, or is stuck at a dead end and will time out via pauseTimer below
      return;
    }

    const target = this.path[this.pathIndex];
    if (!target) { this.arrivedAtDestination(); return; }
    const tx = target.x + 0.5, ty = target.y + 0.5;
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const step = SPEED * (dt / 1000);
    if (dist < step) {
      this.x = tx; this.y = ty;
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) this.arrivedAtDestination();
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      if (Math.abs(dx) > 0.01) this.facing = dx > 0 ? 1 : -1;
    }
  }

  arrivedAtDestination() {
    this.path = null;
    if (this.state === 'leaving') { this.state = 'gone'; return; }
    this.state = 'paused';
    this.pauseTimer = randRange(VIEW_PAUSE_MS);
  }

  headToNextDestination(world, destinationPicker) {
    if (this.state === 'leaving') {
      if (!world.spawnTile) { this.state = 'gone'; return; }
      const route = world.findPathRoute(this.tileX, this.tileY, world.spawnTile.x, world.spawnTile.y);
      if (!route || route.length < 2) { this.state = 'gone'; return; }
      this.path = route;
      this.pathIndex = 1;
      return;
    }

    if (this.stopsRemaining <= 0) {
      this.state = 'leaving';
      this.headToNextDestination(world, destinationPicker);
      return;
    }

    const dest = destinationPicker(this, world);
    if (!dest) {
      // nowhere reachable right now — wait a moment and try again rather than getting stuck forever
      this.state = 'paused';
      this.pauseTimer = 1000;
      return;
    }
    const route = world.findPathRoute(this.tileX, this.tileY, dest.x, dest.y);
    if (!route || route.length < 2) {
      this.state = 'paused';
      this.pauseTimer = 1000;
      return;
    }
    this.path = route;
    this.pathIndex = 1;
    this.state = 'walking';
    this.stopsRemaining--;
  }
}

// Picks a destination for a visitor: mostly biased toward habitat viewing spots
// (so visitors gather near animals), occasionally a random path tile so they
// don't all cluster in the same place.
export function pickDestination(visitor, world) {
  const viewingSpots = [];
  for (const habitat of world.habitats.values()) {
    if (habitat.enclosed && habitat.viewingSpots.length) viewingSpots.push(...habitat.viewingSpots);
  }

  const wantsViewingSpot = viewingSpots.length > 0 && Math.random() < 0.7;
  const pool = wantsViewingSpot ? viewingSpots : Array.from(world.pathTiles);
  if (pool.length === 0) return null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const key = pool[Math.floor(Math.random() * pool.length)];
    const [x, y] = key.split(',').map(Number);
    if (x === visitor.tileX && y === visitor.tileY) continue;
    return { x, y };
  }
  return null;
}

// A simple, transparent "how appealing is this park right now" score. More
// developed park -> higher score -> more visitors. Deliberately not fancy yet.
export function computeAttractionScore(world, animals) {
  const speciesCount = new Set(animals.map((a) => a.species)).size;
  const completedHabitats = new Set();
  for (const a of animals) {
    const h = world.habitatAt(a.tileX, a.tileY);
    if (h && h.enclosed) completedHabitats.add(h.id);
  }
  return (
    animals.length * VISITORS.perAnimal +
    speciesCount * VISITORS.perSpeciesVariety +
    completedHabitats.size * VISITORS.perHabitat +
    world.pathTiles.size * VISITORS.perPathTile
  );
}

export function targetVisitorCount(score) {
  const target = Math.round(VISITORS.baselineTarget + score);
  return Math.max(0, Math.min(VISITORS.maxVisitors, target));
}
