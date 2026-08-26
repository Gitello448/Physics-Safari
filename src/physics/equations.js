// Equation sheet content, organized by chapter. The UI only shows a
// chapter's equations once the player has unlocked that chapter (see
// eduUI.js) — this file is just data, no gating logic lives here.

export const EQUATIONS_BY_CHAPTER = {
  ch1: [
    {
      id: 'trig-sin', equation: 'sin(θ) = opposite / hypotenuse',
      variables: [
        { symbol: 'θ', meaning: 'angle', unit: 'degrees or radians' },
        { symbol: 'opposite, hypotenuse', meaning: 'triangle side lengths', unit: 'm (any consistent length unit)' },
      ],
    },
    {
      id: 'trig-cos', equation: 'cos(θ) = adjacent / hypotenuse',
      variables: [
        { symbol: 'θ', meaning: 'angle', unit: 'degrees or radians' },
        { symbol: 'adjacent, hypotenuse', meaning: 'triangle side lengths', unit: 'm' },
      ],
    },
    {
      id: 'trig-tan', equation: 'tan(θ) = opposite / adjacent',
      variables: [
        { symbol: 'θ', meaning: 'angle', unit: 'degrees or radians' },
        { symbol: 'opposite, adjacent', meaning: 'triangle side lengths', unit: 'm' },
      ],
    },
    {
      id: 'pythagorean', equation: 'c² = a² + b²',
      variables: [
        { symbol: 'c', meaning: 'hypotenuse', unit: 'm' },
        { symbol: 'a, b', meaning: 'legs of a right triangle', unit: 'm' },
      ],
    },
    {
      id: 'vector-components', equation: 'Vx = V·cos(θ),  Vy = V·sin(θ)',
      variables: [
        { symbol: 'V', meaning: 'vector magnitude', unit: 'depends on quantity' },
        { symbol: 'θ', meaning: 'angle measured from +x axis', unit: 'degrees' },
        { symbol: 'Vx, Vy', meaning: 'x- and y-components of the vector', unit: 'same as V' },
      ],
    },
    {
      id: 'vector-magnitude', equation: 'V = √(Vx² + Vy²),  θ = tan⁻¹(Vy / Vx)',
      variables: [
        { symbol: 'Vx, Vy', meaning: 'x- and y-components', unit: 'same as V' },
        { symbol: 'V', meaning: 'magnitude of the vector', unit: 'same as components' },
        { symbol: 'θ', meaning: 'direction angle from +x axis', unit: 'degrees' },
      ],
    },
  ],
  // Chapters 2+ will populate here as their archetypes are built.
};

export function equationsForChapter(chapterId) {
  return EQUATIONS_BY_CHAPTER[chapterId] || [];
}
