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
  ch2: [
    {
      id: 'displacement', equation: 'Δx = x_f − x₀',
      variables: [
        { symbol: 'Δx', meaning: 'displacement', unit: 'm' },
        { symbol: 'x₀, x_f', meaning: 'initial and final position', unit: 'm' },
      ],
    },
    {
      id: 'avg-velocity', equation: 'v_avg = Δx / t',
      variables: [
        { symbol: 'v_avg', meaning: 'average velocity', unit: 'm/s' },
        { symbol: 'Δx', meaning: 'displacement', unit: 'm' },
        { symbol: 't', meaning: 'elapsed time', unit: 's' },
      ],
    },
    {
      id: 'avg-acceleration', equation: 'a = (v_f − v₀) / t',
      variables: [
        { symbol: 'a', meaning: 'average acceleration', unit: 'm/s²' },
        { symbol: 'v₀, v_f', meaning: 'initial and final velocity', unit: 'm/s' },
        { symbol: 't', meaning: 'elapsed time', unit: 's' },
      ],
    },
    {
      id: 'kinematic-1', equation: 'v_f = v₀ + at',
      variables: [
        { symbol: 'v_f', meaning: 'final velocity', unit: 'm/s' },
        { symbol: 'v₀', meaning: 'initial velocity', unit: 'm/s' },
        { symbol: 'a', meaning: 'constant acceleration', unit: 'm/s²' },
        { symbol: 't', meaning: 'elapsed time', unit: 's' },
      ],
    },
    {
      id: 'kinematic-2', equation: 'Δx = v₀t + ½at²',
      variables: [
        { symbol: 'Δx', meaning: 'displacement', unit: 'm' },
        { symbol: 'v₀', meaning: 'initial velocity', unit: 'm/s' },
        { symbol: 'a', meaning: 'constant acceleration', unit: 'm/s²' },
        { symbol: 't', meaning: 'elapsed time', unit: 's' },
      ],
    },
    {
      id: 'kinematic-3', equation: 'v_f² = v₀² + 2aΔx',
      variables: [
        { symbol: 'v_f, v₀', meaning: 'final and initial velocity', unit: 'm/s' },
        { symbol: 'a', meaning: 'constant acceleration', unit: 'm/s²' },
        { symbol: 'Δx', meaning: 'displacement', unit: 'm' },
      ],
    },
    {
      id: 'kinematic-4', equation: 'Δx = ½(v₀ + v_f)t',
      variables: [
        { symbol: 'Δx', meaning: 'displacement', unit: 'm' },
        { symbol: 'v₀, v_f', meaning: 'initial and final velocity', unit: 'm/s' },
        { symbol: 't', meaning: 'elapsed time', unit: 's' },
      ],
    },
    {
      id: 'free-fall-g', equation: 'g = 9.8 m/s² (downward), used in place of a in the kinematic equations',
      variables: [
        { symbol: 'g', meaning: 'acceleration due to gravity near Earth\'s surface', unit: 'm/s²' },
      ],
    },
  ],
  // Chapters 3+ will populate here as their archetypes are built.
};

export function equationsForChapter(chapterId) {
  return EQUATIONS_BY_CHAPTER[chapterId] || [];
}
