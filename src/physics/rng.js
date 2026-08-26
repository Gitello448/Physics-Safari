// Deterministic seeded RNG so a generated problem can be reproduced exactly
// from its stored seed (see generator.js) without needing to persist every
// intermediate value. mulberry32 is small, fast, and has no dependencies.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newSeed() {
  return (Math.random() * 0xffffffff) >>> 0;
}

export function randInt(rng, min, max) {
  // inclusive of both ends
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function randFloat(rng, min, max, decimals = 2) {
  const v = rng() * (max - min) + min;
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

export function choice(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function shuffleInPlace(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// true/false with given probability of true
export function chance(rng, p = 0.5) {
  return rng() < p;
}
