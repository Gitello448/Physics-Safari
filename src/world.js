export const TILE = 32;
export const MAP_W = 50;
export const MAP_H = 50;

export const SCENERY = {
  TREE: 'tree',
  ROCK: 'rock',
  BUSH: 'bush',
  WATER: 'water',
};

export const STRUCTURE = {
  PATH: 'path',
  FENCE: 'fence',
};

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// Fixed starting layout: the HQ sits near the map's center, and the Park
// Entrance sits a bit further toward one edge (south), directly below it, so
// a fresh park reads as "walk in from the entrance, up toward the research
// station". Shared as a plain function (not tied to a World instance) so
// Camera can use the same numbers to frame both landmarks by default.
export function defaultLandmarks(mapW, mapH) {
  const hqTile = { x: Math.floor(mapW / 2), y: Math.floor(mapH / 2) + 3 };
  const entranceTile = { x: hqTile.x, y: hqTile.y + 10 };
  return { hqTile, entranceTile };
}

export class World {
  constructor() {
    this.w = MAP_W;
    this.h = MAP_H;
    this.scenery = this.emptyGrid(null);
    this.structures = this.emptyGrid(null);
    // Purchased decorations (acacia/baobab/cactus/cherry-blossom, etc.) —
    // deliberately kept separate from `scenery` (naturally-generated, requires
    // the Clear tool) and from `structures` (paths/fences, which drive
    // path-network/enclosure connectivity). A decoration just occupies and
    // blocks its tile, like blocking scenery does.
    this.decorations = this.emptyGrid(null);
    this.habitatId = this.emptyGrid(-1);
    this.habitats = new Map(); // id -> {tiles:Set<"x,y">, enclosed:bool}
    this._nextHabitatId = 1;
    this.pathTiles = new Set();
    this.spawnTile = null;
    const { hqTile, entranceTile } = defaultLandmarks(this.w, this.h);
    this.hqTile = hqTile;
    this.entranceTile = entranceTile;
    this.generateScenery();
  }

  emptyGrid(fill) {
    const g = new Array(this.h);
    for (let y = 0; y < this.h; y++) {
      g[y] = new Array(this.w).fill(fill);
    }
    return g;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  generateScenery() {
    const rand = seededRandom(1337);
    const hq = this.hqTile;
    const entrance = this.entranceTile;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        // keep a clear ring around the HQ, and another around the entrance —
        // with the same radius and the two landmarks 10 tiles apart, the
        // rings meet in the middle and form one continuous clear corridor
        // connecting them, giving a new park an obvious starting build zone.
        const dx = x - hq.x, dy = y - hq.y;
        if (Math.abs(dx) < 6 && Math.abs(dy) < 5) continue;
        const edx = x - entrance.x, edy = y - entrance.y;
        if (Math.abs(edx) < 6 && Math.abs(edy) < 5) continue;
        const r = rand();
        if (r < 0.05) this.scenery[y][x] = { type: SCENERY.TREE, blocking: true };
        else if (r < 0.065) this.scenery[y][x] = { type: SCENERY.ROCK, blocking: true };
        else if (r < 0.09) this.scenery[y][x] = { type: SCENERY.BUSH, blocking: false };
        else if (r < 0.098) this.scenery[y][x] = { type: SCENERY.WATER, blocking: true };
      }
    }
  }

  isBuildable(x, y) {
    if (!this.inBounds(x, y)) return false;
    if (this.isHQTile(x, y) || this.isEntranceTile(x, y)) return false;
    const sc = this.scenery[y][x];
    if (sc && sc.blocking) return false;
    if (this.decorations[y][x]) return false;
    return true;
  }

  isHQTile(x, y) {
    const hq = this.hqTile;
    return x >= hq.x - 2 && x <= hq.x + 2 && y >= hq.y - 1 && y <= hq.y + 1;
  }

  isEntranceTile(x, y) {
    const ent = this.entranceTile;
    return x >= ent.x - 3 && x <= ent.x + 3 && y >= ent.y - 2 && y <= ent.y + 1;
  }

  isWalkable(x, y) {
    // walkable for animals/flood-fill purposes: not fence, not blocking scenery, not HQ
    if (!this.inBounds(x, y)) return false;
    if (this.isHQTile(x, y) || this.isEntranceTile(x, y)) return false;
    const st = this.structures[y][x];
    if (st && (st.kind === STRUCTURE.FENCE)) return false;
    const sc = this.scenery[y][x];
    if (sc && sc.blocking) return false;
    if (this.decorations[y][x]) return false;
    return true;
  }

  isBlockingStructure(x, y) {
    const st = this.structures[y][x];
    return !!(st && st.kind === STRUCTURE.FENCE);
  }

  placeStructure(x, y, kind) {
    if (!this.isBuildable(x, y)) return false;
    this.structures[y][x] = { kind };
    this.recomputeNetworks();
    return true;
  }

  removeStructure(x, y) {
    if (!this.inBounds(x, y)) return false;
    const had = this.structures[y][x];
    if (!had) return false;
    this.structures[y][x] = null;
    this.recomputeNetworks();
    return true;
  }

  // Clears a naturally-occurring scenery tile (tree/rock/bush/water). Unlike
  // removeStructure/removeDecoration this represents paid labor rather than
  // a refund — the scenery was generated, never purchased. Recomputing
  // networks afterward matters because clearing blocking scenery can make a
  // previously-unbuildable tile buildable and can change habitat enclosure.
  removeScenery(x, y) {
    if (!this.inBounds(x, y)) return false;
    const had = this.scenery[y][x];
    if (!had) return false;
    this.scenery[y][x] = null;
    this.recomputeNetworks();
    return true;
  }

  // Recomputes everything derived from the structures grid. The map is small
  // enough (2,500 tiles) that recomputing all of it on every edit is cheap and
  // avoids subtle bugs from selectively recomputing only "what should have changed".
  recomputeNetworks() {
    this.recomputeConnections();
    this.recomputePathNetwork();
    this.recomputeHabitats();
  }

  sameKindNeighbor(x, y, kinds) {
    const check = (nx, ny) => {
      if (!this.inBounds(nx, ny)) return false;
      const st = this.structures[ny][nx];
      return !!(st && kinds.includes(st.kind));
    };
    return {
      N: check(x, y - 1),
      E: check(x + 1, y),
      S: check(x, y + 1),
      W: check(x - 1, y),
    };
  }

  recomputeConnections() {
    // store a bitmask (N=1,E=2,S=4,W=8) on each structure for rendering
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const st = this.structures[y][x];
        if (!st) continue;
        const kinds = st.kind === STRUCTURE.PATH ? [STRUCTURE.PATH] : [STRUCTURE.FENCE];
        const n = this.sameKindNeighbor(x, y, kinds);
        st.mask = (n.N ? 1 : 0) | (n.E ? 2 : 0) | (n.S ? 4 : 0) | (n.W ? 8 : 0);
      }
    }
  }

  isPathTile(x, y) {
    if (!this.inBounds(x, y)) return false;
    const st = this.structures[y][x];
    return !!(st && st.kind === STRUCTURE.PATH);
  }

  pathNeighborsOf(x, y) {
    const out = [];
    const candidates = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of candidates) if (this.isPathTile(nx, ny)) out.push({ x: nx, y: ny });
    return out;
  }

  // Builds the set of walkable path tiles and finds the spawn point visitors
  // enter/leave from: the path tile closest to the Park Entrance. No path
  // touching the entrance means no spawn point yet, so no visitors can enter —
  // guests only ever come from the entrance, never from an arbitrary path.
  recomputePathNetwork() {
    this.pathTiles = new Set();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.isPathTile(x, y)) this.pathTiles.add(`${x},${y}`);
      }
    }

    const ent = this.entranceTile;
    let best = null, bestDist = Infinity;
    for (let y = ent.y - 3; y <= ent.y + 3; y++) {
      for (let x = ent.x - 4; x <= ent.x + 4; x++) {
        if (!this.isPathTile(x, y)) continue;
        const dist = Math.abs(x - ent.x) + Math.abs(y - ent.y);
        if (dist < bestDist) { bestDist = dist; best = { x, y }; }
      }
    }
    this.spawnTile = best;
  }

  // BFS shortest route between two path tiles, walking only the path network.
  findPathRoute(fromX, fromY, toX, toY) {
    if (!this.isPathTile(fromX, fromY) || !this.isPathTile(toX, toY)) return null;
    if (fromX === toX && fromY === toY) return [{ x: fromX, y: fromY }];
    const key = (x, y) => `${x},${y}`;
    const visited = new Set([key(fromX, fromY)]);
    const prev = new Map();
    const queue = [{ x: fromX, y: fromY }];
    let qi = 0;
    while (qi < queue.length) {
      const cur = queue[qi++];
      if (cur.x === toX && cur.y === toY) break;
      for (const n of this.pathNeighborsOf(cur.x, cur.y)) {
        const k = key(n.x, n.y);
        if (visited.has(k)) continue;
        visited.add(k);
        prev.set(k, cur);
        queue.push(n);
      }
    }
    const targetKey = key(toX, toY);
    if (!visited.has(targetKey)) return null;
    const path = [{ x: toX, y: toY }];
    let curKey = targetKey;
    while (prev.has(curKey)) {
      const cur = prev.get(curKey);
      path.push(cur);
      curKey = key(cur.x, cur.y);
    }
    path.reverse();
    return path;
  }

  // Flood fill all walkable tiles into connected components.
  // A component that never touches the map border is an enclosed habitat.
  recomputeHabitats() {
    const visited = this.emptyGrid(false);
    this.habitats = new Map();
    this.habitatId = this.emptyGrid(-1);

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (visited[y][x]) continue;
        if (!this.isWalkable(x, y)) { visited[y][x] = true; continue; }

        // BFS component
        const tiles = [];
        const queue = [[x, y]];
        visited[y][x] = true;
        let touchesBorder = false;

        while (queue.length) {
          const [cx, cy] = queue.pop();
          tiles.push([cx, cy]);
          if (cx === 0 || cy === 0 || cx === this.w - 1 || cy === this.h - 1) touchesBorder = true;

          const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
          for (const [nx, ny] of neighbors) {
            if (!this.inBounds(nx, ny) || visited[ny][nx]) continue;
            if (!this.isWalkable(nx, ny)) { visited[ny][nx] = true; continue; }
            visited[ny][nx] = true;
            queue.push([nx, ny]);
          }
        }

        const MAX_HABITAT_SIZE = 1800;
        const enclosed = !touchesBorder && tiles.length > 0 && tiles.length < MAX_HABITAT_SIZE;
        if (tiles.length <= 1) continue; // ignore tiny slivers (e.g. single walkable tiles amid fence-only noise)

        const id = this._nextHabitatId++;
        const tileSet = new Set(tiles.map(([tx, ty]) => `${tx},${ty}`));
        const viewingSpots = enclosed ? this.findViewingSpots(tiles) : [];
        this.habitats.set(id, { id, tiles: tileSet, enclosed, size: tiles.length, viewingSpots });
        // Assign the habitat id to every tile in a plausibly-fenced-in component
        // (enclosed or currently leaking through a gap) so a broken enclosure can
        // still be looked up and rendered as broken. Skip this for the vast open
        // "wild" component so it doesn't get tinted as a giant broken habitat.
        if (tiles.length < MAX_HABITAT_SIZE) {
          for (const [tx, ty] of tiles) this.habitatId[ty][tx] = id;
        }
      }
    }
  }

  // Path tiles that touch a habitat's boundary — where a visitor can stand to "view" it.
  // A habitat's interior tiles are never themselves adjacent to a path tile (the fence
  // ring sits between them, by construction), so this has to step one tile further out:
  // for each interior tile, find its bordering FENCE tiles, then find path tiles next
  // to THOSE — i.e. "just outside the fence from here".
  findViewingSpots(habitatTiles) {
    const spots = new Set();
    for (const [tx, ty] of habitatTiles) {
      const neighbors = [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]];
      for (const [nx, ny] of neighbors) {
        if (!this.inBounds(nx, ny)) continue;
        const st = this.structures[ny][nx];
        if (!st || st.kind !== STRUCTURE.FENCE) continue;
        for (const p of this.pathNeighborsOf(nx, ny)) spots.add(`${p.x},${p.y}`);
      }
    }
    return Array.from(spots);
  }

  exportStructures() {
    const list = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const st = this.structures[y][x];
        if (st) list.push({ x, y, kind: st.kind });
      }
    }
    return list;
  }

  loadStructures(list) {
    for (const { x, y, kind } of list) {
      // Gates were removed (they broke enclosure detection — see
      // recomputeHabitats). Any gate from an older save becomes a fence, so
      // an existing enclosure keeps its wall intact instead of gaining a hole.
      const safeKind = kind === 'gate' ? STRUCTURE.FENCE : kind;
      if (this.inBounds(x, y)) this.structures[y][x] = { kind: safeKind };
    }
    this.recomputeNetworks();
  }

  // Wipes all player-built structures (paths/fences), e.g. when switching to
  // a different account's save. Natural scenery is untouched — it's the
  // same deterministic map for every account, not part of any save.
  clearStructures() {
    this.structures = this.emptyGrid(null);
    this.recomputeNetworks();
  }

  // (x,y) is the top-left anchor tile; footprint is {w,h} in tiles (both
  // default to 1 for anything that doesn't pass one). Every tile in the
  // footprint gets its own grid entry pointing back at the shared anchor,
  // so clicking ANY tile of a multi-tile decoration (e.g. for removal)
  // resolves to the same instance.
  decorationFootprintClear(x, y, footprint) {
    const w = (footprint && footprint.w) || 1, h = (footprint && footprint.h) || 1;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tx = x + dx, ty = y + dy;
        if (!this.inBounds(tx, ty)) return false;
        if (!this.isBuildable(tx, ty)) return false;
        if (this.structures[ty][tx]) return false;
      }
    }
    return true;
  }

  placeDecoration(x, y, type, footprint) {
    const w = (footprint && footprint.w) || 1, h = (footprint && footprint.h) || 1;
    if (!this.decorationFootprintClear(x, y, { w, h })) return false;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.decorations[y + dy][x + dx] = { type, w, h, anchorX: x, anchorY: y };
      }
    }
    this.recomputeNetworks(); // a decoration blocks its tiles, which can affect habitat flood-fill
    return true;
  }

  removeDecoration(x, y) {
    if (!this.inBounds(x, y)) return false;
    const d = this.decorations[y][x];
    if (!d) return false;
    for (let dy = 0; dy < d.h; dy++) {
      for (let dx = 0; dx < d.w; dx++) {
        const tx = d.anchorX + dx, ty = d.anchorY + dy;
        if (this.inBounds(tx, ty)) this.decorations[ty][tx] = null;
      }
    }
    this.recomputeNetworks();
    return true;
  }

  exportDecorations() {
    const list = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const d = this.decorations[y][x];
        if (d && d.anchorX === x && d.anchorY === y) list.push({ x, y, type: d.type, w: d.w, h: d.h });
      }
    }
    return list;
  }

  loadDecorations(list) {
    for (const { x, y, type, w, h } of list) {
      const ww = w || 1, hh = h || 1;
      for (let dy = 0; dy < hh; dy++) {
        for (let dx = 0; dx < ww; dx++) {
          const tx = x + dx, ty = y + dy;
          if (this.inBounds(tx, ty)) this.decorations[ty][tx] = { type, w: ww, h: hh, anchorX: x, anchorY: y };
        }
      }
    }
    this.recomputeNetworks();
  }

  clearDecorations() {
    this.decorations = this.emptyGrid(null);
    this.recomputeNetworks();
  }

  habitatAt(x, y) {
    if (!this.inBounds(x, y)) return null;
    const id = this.habitatId[y][x];
    if (id === -1) return null;
    return this.habitats.get(id) || null;
  }
}
