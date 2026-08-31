// Centralized, rebalance-friendly economy numbers. Nothing here should be
// duplicated as a magic number elsewhere — import from this file instead.

export const BUILD_COSTS = { path: 10, fence: 15 };

// Selling (via the Remove tool) refunds this fraction of an item's original
// purchase price. Applies to structures, animals, and decorations alike.
export const SELL_RATE = 0.75;

// Clearing naturally-occurring scenery (never purchased, so nothing to
// refund) costs credits instead — labor to haul it away. Water is priciest
// since draining/filling it also reshapes the terrain underneath.
export const CLEAR_COSTS = { tree: 40, rock: 60, bush: 15, water: 100 };

export const QUESTION_REWARDS = {
  easy: 100,
  medium: 200,
  hard: 350,
};

// Awarded once, the moment a concept flips from not-mastered to mastered.
export const CONCEPT_MASTERY_BONUS = 1000;

export const MASTERY = {
  minAttempts: 5,
  accuracyThreshold: 0.8, // 80%
};

// Passive park income must stay clearly secondary to academic income — see
// the master spec's "10 minutes of park ≈ 500 credits vs. one expedition ≈
// several thousand" guidance.
// Tuned so a modest developed park (~9 visitors, 2-3 animals) nets roughly
// 500 credits over 10 minutes, matching the master spec's example ratio
// against a single expedition (a few thousand). Rebalance here only.
export const PASSIVE_REVENUE = {
  tickMs: 10000,
  base: 2,
  perVisitor: 0.3,
  perAnimal: 0.5,
  perSpeciesVariety: 3,
  maxPerTick: 40,
};

export const VISITORS = {
  maxVisitors: 40,
  baselineTarget: 2, // a completely empty park still gets a couple of curious visitors
  perAnimal: 1.1,
  perSpeciesVariety: 2.5,
  perHabitat: 1.5,
  perPathTile: 0.06,
  populationCheckMs: 2500,
  spawnIntervalMs: 900,
};
