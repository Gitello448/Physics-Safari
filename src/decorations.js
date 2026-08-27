// Purchasable park decorations — deliberately built and placed by the
// player, distinct from naturally-generated scenery (world.js's `scenery`
// grid, which blocks construction until cleared). Larger and more detailed
// than the small naturally-generated trees/bushes, hence the bigger
// footprint. Cosmetic only for now: no beauty ratings or landscaping
// bonuses, just placement + economy.
export const DECORATION_DEFS = {
  acacia: { name: 'Acacia Tree', cost: 90, icon: '🌳', footprint: { w: 2, h: 2 } },
  baobab: { name: 'Baobab Tree', cost: 160, icon: '🌴', footprint: { w: 2, h: 2 } },
  cactus: { name: 'Cactus', cost: 45, icon: '🌵', footprint: { w: 2, h: 2 } },
  'cherry-blossom': { name: 'Cherry Blossom Tree', cost: 110, icon: '🌸', footprint: { w: 2, h: 2 } },
};
