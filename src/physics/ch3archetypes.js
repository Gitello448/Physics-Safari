// Chapter 3 — 2D Kinematics / Projectile Motion: full archetype bank.
// Same contract and safety pattern as ch2archetypes.js: pure (rng, difficulty)
// -> "problem core" functions, with "solve for X" problems built by picking
// the unknown first and deriving the givens from it, so every generated
// problem is guaranteed physically consistent.

import { randInt, randFloat, choice, chance, shuffleInPlace } from './rng.js';
import { roundToSigFigs } from './sigfigsUtil.js';

const G = 9.8; // m/s^2
const round2 = (n) => Math.round(n * 100) / 100;
const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

function buildChoices(rng, correct, distractors) {
  const choices = shuffleInPlace(rng, [correct, ...distractors]);
  return { choices, answer: correct };
}

function subject(rng, kind) {
  const pools = {
    vehicle: {
      safari: ['the safari transport truck', "the ranger's jeep"],
      generic: ['a car', 'a delivery van'],
    },
    launcher: {
      safari: ['a supply crate slides off the back of a moving truck', 'a water canteen rolls off the observation deck', 'a coconut rolls off a cliffside ledge'],
      generic: ['a ball rolls off a table', 'a marble rolls off a countertop', 'a puck slides off a raised platform'],
    },
    thrower: {
      safari: ['a ranger launches a signal flare', 'a park worker kicks a ball for a demo'],
      generic: ['a player kicks a ball', 'someone launches a toy rocket'],
    },
  };
  const pool = pools[kind];
  return chance(rng, 0.5) ? choice(rng, pool.safari) : choice(rng, pool.generic);
}

// ---------------------------------------------------------------------
// ch3.vector-motion
// ---------------------------------------------------------------------

const avg2DVelocityMagnitude = {
  id: 'ch3.vector-motion.avg-velocity-magnitude', skillId: 'ch3.vector-motion', type: 'numerical',
  title: 'Magnitude of average 2D velocity',
  generate(rng) {
    const dx = randFloat(rng, 10, 80, 1);
    const dy = randFloat(rng, 10, 80, 1);
    const t = randFloat(rng, 3, 20, 1);
    const vx = dx / t, vy = dy / t;
    const answer = roundToSigFigs(Math.sqrt(vx * vx + vy * vy), 3);
    const who = subject(rng, 'vehicle');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)}'s position changes by ${dx} m east and ${dy} m north over ${t} s. Find the magnitude of its average velocity.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.03, 0.1),
      unit: 'm/s',
      hints: [
        'Treat east and north as the x- and y-components of the displacement, and handle each independently first.',
        'vx = Δx/t, vy = Δy/t, then combine with the Pythagorean theorem: v = √(vx² + vy²).',
        `vx = ${dx}/${t} = ${round2(vx)}, vy = ${dy}/${t} = ${round2(vy)}`,
      ],
      solution: {
        knowns: [`Δx = ${dx} m (east)`, `Δy = ${dy} m (north)`, `t = ${t} s`],
        unknown: 'magnitude of average velocity',
        principle: 'vx = Δx/t, vy = Δy/t, v = √(vx² + vy²)',
        substitution: `vx = ${dx}/${t}, vy = ${dy}/${t}`,
        algebra: `v = √(${round2(vx)}² + ${round2(vy)}²)`,
        result: `${answer} m/s`,
        interpretation: 'The x- and y-motions are handled completely separately, and only combined at the very end.',
      },
    };
  },
};

const velocityDirectionFromComponents = {
  id: 'ch3.vector-motion.velocity-direction', skillId: 'ch3.vector-motion', type: 'numerical',
  title: 'Direction from velocity components',
  generate(rng) {
    const vx = randFloat(rng, 4, 25, 1);
    const vy = (chance(rng, 0.5) ? 1 : -1) * randFloat(rng, 4, 25, 1);
    const angle = toDeg(Math.atan2(vy, vx));
    const answer = roundToSigFigs(angle, 3);
    return {
      type: 'numerical',
      prompt: `An object has velocity components vx = ${vx} m/s (east) and vy = ${vy} m/s (north is positive). Find the direction of its velocity as an angle from due east (positive = toward north, negative = toward south).`,
      answer,
      tolerance: 1.5,
      unit: '°',
      diagram: { type: 'vector-components', vx, vy },
      hints: [
        'The two components form the legs of a right triangle; the direction is the angle that the resultant vector makes with the x-axis (east).',
        'θ = tan⁻¹(vy / vx)',
        `θ = tan⁻¹(${vy} / ${vx})`,
      ],
      solution: {
        knowns: [`vx = ${vx} m/s`, `vy = ${vy} m/s`],
        unknown: 'direction angle from east',
        principle: 'θ = tan⁻¹(vy / vx), measured from the +x (east) axis',
        substitution: `θ = tan⁻¹(${vy} / ${vx})`,
        algebra: `= tan⁻¹(${round2(vy / vx)})`,
        result: `${answer}°`,
        interpretation: answer >= 0 ? 'A positive angle here means the velocity points north of east.' : 'A negative angle here means the velocity points south of east.',
      },
    };
  },
};

const independenceConceptual = {
  id: 'ch3.vector-motion.independence-conceptual', skillId: 'ch3.vector-motion', type: 'mc-concept',
  title: 'Independence of horizontal and vertical motion',
  generate(rng) {
    const speed = randInt(rng, 3, 12);
    const correct = 'They land at the same time';
    const distractors = ['The rolling ball lands first', 'The dropped ball lands first', 'Cannot be determined without knowing the horizontal speed'];
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: `A ball rolls horizontally off a table's edge at ${speed} m/s. At the exact same instant, an identical ball is simply dropped straight down from the same height. Ignoring air resistance, which ball reaches the ground first?`,
      choices, answer,
      hints: [
        'Horizontal and vertical motion are completely independent of each other in projectile motion.',
        'The horizontal velocity has no effect on how fast something falls — only gravity and the drop height determine fall time.',
        'Both balls start with vy = 0 and fall the same height under the same acceleration g, so they take exactly the same time.',
      ],
      solution: {
        knowns: ['both balls start at the same height', 'both have initial vertical velocity = 0', 'one also has horizontal velocity, one does not'],
        unknown: 'which ball lands first',
        principle: 'Horizontal velocity does not affect vertical motion — the two directions are independent.',
        substitution: '—',
        algebra: '—',
        result: correct,
        interpretation: 'This independence is the single most important idea in 2D projectile motion.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch3.projectile-horizontal (launched horizontally from height h)
// ---------------------------------------------------------------------

const horizRange = {
  id: 'ch3.projectile-horizontal.range', skillId: 'ch3.projectile-horizontal', type: 'numerical',
  title: 'Range of a horizontally launched projectile',
  generate(rng) {
    const h = randFloat(rng, 5, 60, 1);
    const v0x = randFloat(rng, 5, 30, 1);
    const t = Math.sqrt((2 * h) / G);
    const answer = roundToSigFigs(v0x * t, 3);
    const who = subject(rng, 'launcher');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} at ${v0x} m/s from a height of ${h} m. Find how far it travels horizontally before landing.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.03, 0.2),
      unit: 'm',
      hints: [
        'First find the time to fall, using only the vertical motion (v0y = 0 for a horizontal launch).',
        't = √(2h/g), then horizontal distance x = v0x·t',
        `t = √(2 × ${h} / 9.8) = ${round2(t)} s, so x = ${v0x} × ${round2(t)}`,
      ],
      solution: {
        knowns: [`h = ${h} m`, `v0x = ${v0x} m/s`, `v0y = 0`],
        unknown: 'horizontal range',
        principle: 'Fall time from vertical motion: t = √(2h/g). Range from horizontal motion: x = v0x·t.',
        substitution: `t = √(2 × ${h} / 9.8); x = ${v0x} × t`,
        algebra: `t = ${round2(t)} s; x = ${v0x} × ${round2(t)}`,
        result: `${answer} m`,
        interpretation: 'The vertical drop determines HOW LONG it falls; the horizontal speed determines how far it gets in that time.',
      },
    };
  },
};

const horizLandingSpeed = {
  id: 'ch3.projectile-horizontal.landing-speed', skillId: 'ch3.projectile-horizontal', type: 'numerical',
  title: 'Landing speed of a horizontally launched projectile',
  generate(rng) {
    const h = randFloat(rng, 5, 60, 1);
    const v0x = randFloat(rng, 5, 30, 1);
    const vy = Math.sqrt(2 * G * h);
    const answer = roundToSigFigs(Math.sqrt(v0x * v0x + vy * vy), 3);
    const who = subject(rng, 'launcher');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} at ${v0x} m/s from a height of ${h} m. Find its speed just before landing.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.03, 0.2),
      unit: 'm/s',
      hints: [
        'The horizontal component of velocity never changes; only the vertical component grows due to gravity.',
        'vy at landing: vy = √(2gh). Total speed: v = √(vx² + vy²).',
        `vy = √(2 × 9.8 × ${h}) = ${round2(vy)} m/s`,
      ],
      solution: {
        knowns: [`h = ${h} m`, `v0x = ${v0x} m/s (constant throughout)`],
        unknown: 'landing speed',
        principle: 'vy = √(2gh); v = √(vx² + vy²)',
        substitution: `vy = √(2 × 9.8 × ${h}); v = √(${v0x}² + vy²)`,
        algebra: `vy = ${round2(vy)}; v = √(${round2(v0x * v0x)} + ${round2(vy * vy)})`,
        result: `${answer} m/s`,
        interpretation: 'The landing speed combines a constant horizontal piece with a vertical piece that keeps growing throughout the fall.',
      },
    };
  },
};

const horizLandingAngle = {
  id: 'ch3.projectile-horizontal.landing-angle', skillId: 'ch3.projectile-horizontal', type: 'numerical',
  title: 'Landing angle of a horizontally launched projectile',
  generate(rng) {
    const h = randFloat(rng, 5, 60, 1);
    const v0x = randFloat(rng, 5, 30, 1);
    const vy = Math.sqrt(2 * G * h);
    const answer = roundToSigFigs(toDeg(Math.atan(vy / v0x)), 3);
    const who = subject(rng, 'launcher');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} at ${v0x} m/s from a height of ${h} m. Find the angle below the horizontal at which it strikes the ground.`,
      answer,
      tolerance: 1.5,
      unit: '°',
      hints: [
        'The landing angle comes from the ratio of the (final) vertical and horizontal velocity components.',
        'θ = tan⁻¹(vy / vx), where vy = √(2gh) and vx = v0x.',
        `vy = √(2 × 9.8 × ${h}) = ${round2(vy)} m/s, so θ = tan⁻¹(${round2(vy)} / ${v0x})`,
      ],
      solution: {
        knowns: [`h = ${h} m`, `v0x = ${v0x} m/s`],
        unknown: 'landing angle below horizontal',
        principle: 'θ = tan⁻¹(vy / vx)',
        substitution: `vy = √(2 × 9.8 × ${h}); θ = tan⁻¹(vy / ${v0x})`,
        algebra: `vy = ${round2(vy)}; θ = tan⁻¹(${round2(vy / v0x)})`,
        result: `${answer}° below horizontal`,
        interpretation: 'A faster horizontal launch speed makes for a shallower landing angle, even though the fall time is unaffected.',
      },
    };
  },
};

const horizFallTimeConceptual = {
  id: 'ch3.projectile-horizontal.fall-time-conceptual', skillId: 'ch3.projectile-horizontal', type: 'mc-concept',
  title: 'Fall time vs. launch speed',
  generate(rng) {
    const h = randInt(rng, 10, 50);
    const fast = randInt(rng, 15, 30);
    const slow = randInt(rng, 2, 10);
    const correct = 'exactly the same amount of time';
    const distractors = ['less time than the slower one', 'more time than the slower one', 'a time that depends on both launch speeds'];
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: `Two identical balls roll horizontally off the same ${h} m ledge — one at ${slow} m/s, the other at ${fast} m/s. How does the time for the faster ball to hit the ground compare to the slower one?`,
      choices, answer,
      hints: [
        'The horizontal launch speed only affects how FAR something travels, not how long it takes to fall.',
        'Fall time only depends on the drop height and g: t = √(2h/g).',
        `Both balls fall the same ${h} m under the same gravity, so t is identical regardless of horizontal speed.`,
      ],
      solution: {
        knowns: [`both launched from h = ${h} m`, `both have v0y = 0`, 'different horizontal speeds'],
        unknown: 'how fall times compare',
        principle: 't = √(2h/g) — horizontal speed does not appear in this equation at all.',
        substitution: '—',
        algebra: '—',
        result: correct,
        interpretation: 'This is the same independence idea, applied to two projectiles instead of a projectile vs. a dropped object.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch3.projectile-angled (launched from ground level at an angle, lands at
// the same height it was launched from)
// ---------------------------------------------------------------------

const resolveComponent = {
  id: 'ch3.projectile-angled.resolve-component', skillId: 'ch3.projectile-angled', type: 'numerical',
  title: 'Resolve launch velocity into components',
  generate(rng) {
    const v0 = randFloat(rng, 15, 40, 1);
    const theta = randInt(rng, 20, 70);
    const askX = chance(rng, 0.5);
    const answer = roundToSigFigs(askX ? v0 * Math.cos(toRad(theta)) : v0 * Math.sin(toRad(theta)), 3);
    return {
      type: 'numerical',
      prompt: `A projectile is launched at ${v0} m/s at ${theta}° above the horizontal. Find the ${askX ? 'horizontal' : 'vertical'} component of its initial velocity.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 0.1),
      unit: 'm/s',
      diagram: { type: 'vector-arrow', magnitude: v0, angleDeg: theta, label: 'v₀' },
      hints: [
        'Break the launch velocity into horizontal and vertical pieces using the launch angle.',
        askX ? 'v0x = v0·cos(θ)' : 'v0y = v0·sin(θ)',
        askX ? `v0x = ${v0}·cos(${theta}°)` : `v0y = ${v0}·sin(${theta}°)`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `θ = ${theta}°`],
        unknown: `${askX ? 'horizontal' : 'vertical'} component`,
        principle: askX ? 'v0x = v0 cos(θ)' : 'v0y = v0 sin(θ)',
        substitution: askX ? `${v0} × cos(${theta}°)` : `${v0} × sin(${theta}°)`,
        algebra: `= ${answer}`,
        result: `${answer} m/s`,
        interpretation: 'These two components are then treated with completely separate 1D kinematics for the rest of the problem.',
      },
    };
  },
};

const timeOfFlight = {
  id: 'ch3.projectile-angled.time-of-flight', skillId: 'ch3.projectile-angled', type: 'numerical',
  title: 'Time of flight (ground to ground)',
  generate(rng) {
    const v0 = randFloat(rng, 15, 40, 1);
    const theta = randInt(rng, 20, 70);
    const answer = roundToSigFigs((2 * v0 * Math.sin(toRad(theta))) / G, 3);
    const who = subject(rng, 'thrower');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} at ${v0} m/s at an angle of ${theta}° above the horizontal. Assuming it lands at the same height it was launched from, find its total time in the air.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.03, 0.1),
      unit: 's',
      hints: [
        'Only the vertical component of the launch matters for how long it stays up (the same up/down symmetry as a straight vertical throw).',
        't = 2v0sin(θ) / g',
        `t = 2(${v0})sin(${theta}°) / 9.8`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `θ = ${theta}°`, 'lands at launch height'],
        unknown: 'total time of flight',
        principle: 't = 2v0sin(θ)/g',
        substitution: `t = 2(${v0})sin(${theta}°) / 9.8`,
        algebra: `= ${round2(2 * v0 * Math.sin(toRad(theta)))} / 9.8`,
        result: `${answer} s`,
        interpretation: 'This is exactly the same "time aloft" formula from straight-up throws, just using v0sin(θ) as the effective vertical launch speed.',
      },
    };
  },
};

const maxHeightAngled = {
  id: 'ch3.projectile-angled.max-height', skillId: 'ch3.projectile-angled', type: 'numerical',
  title: 'Maximum height of an angled launch',
  generate(rng) {
    const v0 = randFloat(rng, 15, 40, 1);
    const theta = randInt(rng, 20, 70);
    const v0y = v0 * Math.sin(toRad(theta));
    const answer = roundToSigFigs((v0y * v0y) / (2 * G), 3);
    const who = subject(rng, 'thrower');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} at ${v0} m/s at an angle of ${theta}° above the horizontal. Find the maximum height it reaches.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.03, 0.1),
      unit: 'm',
      hints: [
        'Only the vertical component of the launch velocity determines the maximum height.',
        'h = (v0sin(θ))² / (2g)',
        `v0y = ${v0}sin(${theta}°) = ${round2(v0y)} m/s`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `θ = ${theta}°`],
        unknown: 'maximum height',
        principle: 'v0y = v0sin(θ); h = v0y² / (2g)',
        substitution: `v0y = ${v0}sin(${theta}°); h = (${round2(v0y)})² / (2 × 9.8)`,
        algebra: `= ${round2(v0y * v0y)} / ${round2(2 * G)}`,
        result: `${answer} m`,
        interpretation: 'The horizontal component never enters this calculation at all — height only depends on the vertical piece.',
      },
    };
  },
};

const peakVelocityConceptual = {
  id: 'ch3.projectile-angled.peak-conceptual', skillId: 'ch3.projectile-angled', type: 'mc-concept',
  title: 'Velocity at the peak of an angled trajectory',
  generate(rng) {
    const correct = 'vertical velocity is momentarily zero; horizontal velocity is unchanged and nonzero';
    const distractors = ['both velocity components are zero', 'horizontal velocity is zero; vertical velocity is nonzero', 'the velocity is zero, but the object still has acceleration'];
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: 'A ball is launched at an angle above the horizontal (not straight up). At the very top of its trajectory, which statement about its velocity is true?',
      choices, answer,
      hints: [
        'Unlike a straight-up throw, an angled projectile still has horizontal motion at every point in its flight — including the peak.',
        'The vertical velocity component is what becomes momentarily zero at the peak, exactly like a straight-up throw.',
        'The horizontal component (v0cosθ) never changes during the whole flight, including at the peak.',
      ],
      solution: {
        knowns: ['projectile launched at an angle (not vertically)'],
        unknown: 'velocity at the highest point',
        principle: 'The vertical velocity component is zero at the peak; the horizontal component is constant throughout the flight and is never zero (for a nonzero launch angle less than 90°).',
        substitution: '—',
        algebra: '—',
        result: correct,
        interpretation: 'This is why an angled projectile is still moving (horizontally) even at its highest point — a common point of confusion carried over from straight-up-throw problems.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch3.projectile-range
// ---------------------------------------------------------------------

const rangeBasic = {
  id: 'ch3.projectile-range.basic', skillId: 'ch3.projectile-range', type: 'numerical',
  title: 'Range equation',
  generate(rng) {
    const v0 = randFloat(rng, 15, 40, 1);
    const theta = randInt(rng, 15, 75);
    const answer = roundToSigFigs((v0 * v0 * Math.sin(toRad(2 * theta))) / G, 3);
    const who = subject(rng, 'thrower');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} at ${v0} m/s at ${theta}° above the horizontal, landing at the same height it launched from. Find its horizontal range.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.03, 0.2),
      unit: 'm',
      hints: [
        'For a projectile that lands at its launch height, there\'s a direct range formula (a shortcut for combining time-of-flight and horizontal distance).',
        'R = v0² sin(2θ) / g',
        `R = (${v0})² sin(2 × ${theta}°) / 9.8`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `θ = ${theta}°`, 'launch height = landing height'],
        unknown: 'horizontal range',
        principle: 'R = v0² sin(2θ) / g',
        substitution: `R = (${v0})² sin(2 × ${theta}°) / 9.8`,
        algebra: `= ${round2(v0 * v0)} × ${round2(Math.sin(toRad(2 * theta)))} / 9.8`,
        result: `${answer} m`,
        interpretation: 'This shortcut ONLY applies when launch and landing heights are equal — it\'s not a general-purpose formula.',
      },
    };
  },
};

const rangeFindLaunchSpeed = {
  id: 'ch3.projectile-range.find-speed', skillId: 'ch3.projectile-range', type: 'numerical',
  title: 'Find launch speed from range',
  generate(rng) {
    const v0Real = randFloat(rng, 15, 40, 1);
    const theta = randInt(rng, 15, 75);
    const range = (v0Real * v0Real * Math.sin(toRad(2 * theta))) / G;
    const answer = roundToSigFigs(v0Real, 3);
    return {
      type: 'numerical',
      prompt: `A projectile launched at ${theta}° above the horizontal lands ${round2(range)} m away, at the same height it was launched from. Find its launch speed.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.04, 0.2),
      unit: 'm/s',
      hints: [
        'Start from the same range equation, but solve it for v0 instead of R.',
        'R = v0² sin(2θ) / g  ⟹  v0 = √(Rg / sin(2θ))',
        `v0 = √(${round2(range)} × 9.8 / sin(2 × ${theta}°))`,
      ],
      solution: {
        knowns: [`R = ${round2(range)} m`, `θ = ${theta}°`],
        unknown: 'launch speed',
        principle: 'v0 = √(Rg / sin(2θ))',
        substitution: `v0 = √(${round2(range)} × 9.8 / sin(2 × ${theta}°))`,
        algebra: `= √(${round2(range * G)} / ${round2(Math.sin(toRad(2 * theta)))})`,
        result: `${answer} m/s`,
        interpretation: 'Rearranging the range equation ahead of time is much less error-prone than plugging in numbers first and rearranging after.',
      },
    };
  },
};

const maxRangeConceptual = {
  id: 'ch3.projectile-range.max-range-conceptual', skillId: 'ch3.projectile-range', type: 'mc-concept',
  title: 'Angle for maximum range',
  generate(rng) {
    const correct = '45°';
    const distractors = ['30°', '60°', '90°'];
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: 'For a fixed launch speed, which launch angle above the horizontal produces the maximum possible horizontal range (ignoring air resistance, launch height = landing height)?',
      choices, answer,
      hints: [
        'Range depends on sin(2θ) — think about what angle makes that factor as large as possible.',
        'sin(2θ) is maximized (equal to 1) when 2θ = 90°.',
        '2θ = 90° ⟹ θ = 45°',
      ],
      solution: {
        knowns: ['R = v0² sin(2θ)/g, fixed v0'],
        unknown: 'angle that maximizes R',
        principle: 'sin(2θ) reaches its maximum value of 1 when θ = 45°',
        substitution: '—',
        algebra: '—',
        result: correct,
        interpretation: 'This is why 45° shows up so often as "the" launch angle in idealized projectile problems.',
      },
    };
  },
};

const equalRangeConceptual = {
  id: 'ch3.projectile-range.complementary-angle', skillId: 'ch3.projectile-range', type: 'numerical',
  title: 'Complementary launch angles give equal range',
  generate(rng) {
    let theta = randInt(rng, 10, 80);
    while (theta === 45) theta = randInt(rng, 10, 80);
    const answer = 90 - theta;
    return {
      type: 'numerical',
      prompt: `A projectile launched at ${theta}° above the horizontal lands a certain distance away. At the SAME launch speed, what OTHER launch angle (in degrees, above the horizontal) would produce that exact same range?`,
      answer,
      tolerance: 0.5,
      unit: '°',
      hints: [
        'Range depends on sin(2θ), and sin(x) = sin(180° − x) for any angle x.',
        'sin(2θ) = sin(2(90° − θ)), so θ and its complement (90° − θ) always give the same range.',
        `90° − ${theta}° = ${answer}°`,
      ],
      solution: {
        knowns: [`θ₁ = ${theta}°`],
        unknown: 'complementary launch angle with equal range',
        principle: 'sin(2θ) = sin(2(90° − θ)), so θ and (90° − θ) are "complementary" launch angles that share the same range.',
        substitution: `90° − ${theta}°`,
        algebra: `= ${answer}°`,
        result: `${answer}°`,
        interpretation: 'A low, flat launch and a high, steep launch at complementary angles cover the same ground — one gets there fast and low, the other slow and high.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch3.projectile-velocity (velocity at some instant during the flight)
// ---------------------------------------------------------------------

const verticalVelocityAtTime = {
  id: 'ch3.projectile-velocity.vertical-at-time', skillId: 'ch3.projectile-velocity', type: 'numerical',
  title: 'Vertical velocity at a given time',
  generate(rng) {
    const v0 = randFloat(rng, 15, 40, 1);
    const theta = randInt(rng, 20, 70);
    const v0y = v0 * Math.sin(toRad(theta));
    const T = (2 * v0y) / G;
    const t = round2(randFloat(rng, 0.15, 0.85, 2) * T);
    const answer = roundToSigFigs(v0y - G * t, 3);
    return {
      type: 'numerical',
      prompt: `A projectile is launched at ${v0} m/s at ${theta}° above the horizontal. Find its vertical velocity component ${t} s after launch. (A negative answer means it is already past the peak and descending.)`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.04, 0.1),
      unit: 'm/s',
      hints: [
        'The vertical component behaves exactly like straight-up-and-down 1D motion with constant acceleration −g.',
        'vy(t) = v0sin(θ) − gt',
        `vy = ${v0}sin(${theta}°) − (9.8)(${t})`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `θ = ${theta}°`, `t = ${t} s`],
        unknown: 'vertical velocity at time t',
        principle: 'vy(t) = v0sin(θ) − gt',
        substitution: `vy = ${v0}sin(${theta}°) − (9.8)(${t})`,
        algebra: `= ${round2(v0y)} − ${round2(G * t)}`,
        result: `${answer} m/s`,
        interpretation: answer >= 0 ? 'A positive value means the projectile is still on its way up.' : 'A negative value means the projectile has already passed its peak and is falling.',
      },
    };
  },
};

const speedAtTime = {
  id: 'ch3.projectile-velocity.speed-at-time', skillId: 'ch3.projectile-velocity', type: 'numerical',
  title: 'Speed at a given time',
  generate(rng) {
    const v0 = randFloat(rng, 15, 40, 1);
    const theta = randInt(rng, 20, 70);
    const vx = v0 * Math.cos(toRad(theta));
    const v0y = v0 * Math.sin(toRad(theta));
    const T = (2 * v0y) / G;
    const t = round2(randFloat(rng, 0.15, 0.85, 2) * T);
    const vy = v0y - G * t;
    const answer = roundToSigFigs(Math.sqrt(vx * vx + vy * vy), 3);
    return {
      type: 'numerical',
      prompt: `A projectile is launched at ${v0} m/s at ${theta}° above the horizontal. Find its overall speed ${t} s after launch.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.04, 0.15),
      unit: 'm/s',
      hints: [
        'Find the horizontal and vertical components separately first, then combine them.',
        'vx = v0cos(θ) (constant); vy = v0sin(θ) − gt; speed = √(vx² + vy²)',
        `vx = ${round2(vx)} m/s, vy = ${v0}sin(${theta}°) − (9.8)(${t}) = ${round2(vy)} m/s`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `θ = ${theta}°`, `t = ${t} s`],
        unknown: 'speed at time t',
        principle: 'vx = v0cos(θ); vy = v0sin(θ) − gt; speed = √(vx² + vy²)',
        substitution: `vx = ${v0}cos(${theta}°); vy = ${v0}sin(${theta}°) − (9.8)(${t})`,
        algebra: `vx = ${round2(vx)}; vy = ${round2(vy)}; speed = √(${round2(vx * vx)} + ${round2(vy * vy)})`,
        result: `${answer} m/s`,
        interpretation: 'Even though each component is easy on its own, the actual speed always requires recombining them at the end.',
      },
    };
  },
};

const directionAtTime = {
  id: 'ch3.projectile-velocity.direction-at-time', skillId: 'ch3.projectile-velocity', type: 'numerical',
  title: 'Direction of velocity at a given time',
  generate(rng) {
    const v0 = randFloat(rng, 15, 40, 1);
    const theta = randInt(rng, 20, 70);
    const vx = v0 * Math.cos(toRad(theta));
    const v0y = v0 * Math.sin(toRad(theta));
    const T = (2 * v0y) / G;
    const t = round2(randFloat(rng, 0.15, 0.85, 2) * T);
    const vy = v0y - G * t;
    const answer = roundToSigFigs(toDeg(Math.atan(vy / vx)), 3);
    return {
      type: 'numerical',
      prompt: `A projectile is launched at ${v0} m/s at ${theta}° above the horizontal. Find the direction of its velocity, as an angle above (positive) or below (negative) the horizontal, ${t} s after launch.`,
      answer,
      tolerance: 1.5,
      unit: '°',
      hints: [
        'Find the two velocity components at this time first, then find the angle of the resulting vector.',
        'vx = v0cos(θ) (constant); vy = v0sin(θ) − gt; direction angle = tan⁻¹(vy / vx)',
        `vx = ${round2(vx)} m/s, vy = ${round2(vy)} m/s`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `θ = ${theta}°`, `t = ${t} s`],
        unknown: 'direction of velocity at time t',
        principle: 'angle = tan⁻¹(vy / vx)',
        substitution: `vx = ${round2(vx)}; vy = ${round2(vy)}; angle = tan⁻¹(${round2(vy)} / ${round2(vx)})`,
        algebra: `= tan⁻¹(${round2(vy / vx)})`,
        result: `${answer}° ${answer >= 0 ? 'above' : 'below'} horizontal`,
        interpretation: answer >= 0 ? 'A positive angle confirms the projectile is still rising at this instant.' : 'A negative angle confirms the projectile has already passed its peak and is descending.',
      },
    };
  },
};

const constantComponentConceptual = {
  id: 'ch3.projectile-velocity.constant-component', skillId: 'ch3.projectile-velocity', type: 'mc-concept',
  title: 'Which velocity component stays constant',
  generate(rng) {
    const correct = 'the horizontal component';
    const distractors = ['the vertical component', 'both components', 'neither component'];
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: 'For a projectile in flight (ignoring air resistance), which component of its velocity remains constant throughout the entire flight?',
      choices, answer,
      hints: [
        'Only gravity acts on the projectile, and gravity points straight down.',
        'A downward-only acceleration can only change the vertical component of velocity.',
        'Since there\'s no horizontal acceleration, vx = v0cos(θ) never changes, while vy is constantly changing due to g.',
      ],
      solution: {
        knowns: ['acceleration = g, directed straight down, throughout the flight'],
        unknown: 'which velocity component is constant',
        principle: 'Acceleration only affects the component of velocity along its own direction.',
        substitution: '—',
        algebra: '—',
        result: correct,
        interpretation: 'This is the same independence principle again, now viewed through the lens of acceleration rather than displacement.',
      },
    };
  },
};

export const CH3_ARCHETYPES = [
  avg2DVelocityMagnitude, velocityDirectionFromComponents, independenceConceptual,
  horizRange, horizLandingSpeed, horizLandingAngle, horizFallTimeConceptual,
  resolveComponent, timeOfFlight, maxHeightAngled, peakVelocityConceptual,
  rangeBasic, rangeFindLaunchSpeed, maxRangeConceptual, equalRangeConceptual,
  verticalVelocityAtTime, speedAtTime, directionAtTime, constantComponentConceptual,
];
