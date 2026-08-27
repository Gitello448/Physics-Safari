// Chapter 2 — 1D Kinematics: full archetype bank.
// Same contract as ch1archetypes.js: each archetype is a pure (rng, difficulty)
// -> "problem core" function. See generator.js for how these get wrapped.
//
// Safety pattern used throughout for "solve for X" problems: generate the
// UNKNOWN value first (or all values from one consistent scenario), then
// derive the GIVEN values from it. This guarantees every generated problem
// is physically consistent and every square root argument is non-negative,
// by construction rather than by hoping the random draw works out.

import { randInt, randFloat, choice, chance, shuffleInPlace } from './rng.js';
import { roundToSigFigs } from './sigfigsUtil.js';

const G = 9.8; // m/s^2, matches the course's standard value
const round2 = (n) => Math.round(n * 100) / 100;

function buildChoices(rng, correct, distractors) {
  const choices = shuffleInPlace(rng, [correct, ...distractors]);
  return { choices, answer: correct };
}

// ~50/50 safari vs. generic-physics framing, per the game's context-variety rule.
function subject(rng, kind) {
  const pools = {
    vehicle: {
      safari: ['the safari transport truck', "the ranger's jeep", 'the supply aircraft'],
      generic: ['a car', 'a train', 'a delivery van'],
    },
    runner: {
      safari: ['a ranger on patrol', 'a fleeing zebra', 'a research assistant'],
      generic: ['a runner', 'a cyclist', 'a hiker'],
    },
    faller: {
      safari: ['a dropped water canteen', 'a supply crate pushed off a truck bed', 'a coconut falling from a tree'],
      generic: ['a dropped ball', 'a wrench falling from a ledge', 'a rock kicked off a cliff'],
    },
    thrown: {
      safari: ['a ranger tosses a signal flare straight up', 'a park worker throws a ball straight up for a photo'],
      generic: ['a ball is thrown straight up', 'a stone is tossed straight up'],
    },
  };
  const pool = pools[kind];
  return chance(rng, 0.5) ? choice(rng, pool.safari) : choice(rng, pool.generic);
}

// ---------------------------------------------------------------------
// ch2.position-displacement
// ---------------------------------------------------------------------

const posDispBasic = {
  id: 'ch2.position-displacement.basic', skillId: 'ch2.position-displacement', type: 'numerical',
  title: 'Displacement from start/end position',
  generate(rng) {
    const x0 = randInt(rng, -20, 15);
    let xf = randInt(rng, -30, 40);
    while (xf === x0) xf = randInt(rng, -30, 40);
    const answer = roundToSigFigs(xf - x0, 3);
    const who = subject(rng, 'runner');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} starts at position ${x0} m along a straight path and ends at position ${xf} m. Find the displacement.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 0.1),
      unit: 'm',
      hints: [
        'Displacement only depends on the start and end positions, not the path taken between them.',
        'Displacement = final position − initial position.',
        `Δx = (${xf}) − (${x0})`,
      ],
      solution: {
        knowns: [`x₀ = ${x0} m`, `x_f = ${xf} m`],
        unknown: 'displacement Δx',
        principle: 'Δx = x_f − x₀',
        substitution: `Δx = ${xf} − (${x0})`,
        algebra: `= ${answer}`,
        result: `${answer} m`,
        interpretation: answer >= 0 ? 'The positive sign means the net motion was in the +x direction.' : 'The negative sign means the net motion was in the −x direction.',
      },
    };
  },
};

const distanceVsDisplacement = {
  id: 'ch2.position-displacement.distance-vs-displacement', skillId: 'ch2.position-displacement', type: 'numerical',
  title: 'Distance traveled vs. displacement',
  generate(rng) {
    const dir1 = chance(rng, 0.5) ? 1 : -1;
    const mag1 = randFloat(rng, 4, 22, 1);
    const dir2 = -dir1; // force a reversal so distance and displacement always genuinely differ
    const mag2 = randFloat(rng, 4, 22, 1);
    const askDistance = chance(rng, 0.5);
    const displacement = dir1 * mag1 + dir2 * mag2;
    const distance = mag1 + mag2;
    const answer = roundToSigFigs(askDistance ? distance : displacement, 3);
    const w1 = dir1 > 0 ? 'forward' : 'backward';
    const w2 = dir2 > 0 ? 'forward' : 'backward';
    const who = subject(rng, 'runner');
    return {
      type: 'numerical',
      prompt: `Starting from a trailhead, ${who} walks ${mag1} m ${w1}, then ${mag2} m ${w2}. Find the total ${askDistance ? 'distance traveled' : 'displacement from the trailhead'}.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 0.1),
      unit: 'm',
      hints: [
        askDistance ? 'Distance traveled adds up every bit of ground covered, regardless of direction.' : 'Displacement only cares about the straight-line change from start to finish.',
        askDistance ? 'Distance = |leg 1| + |leg 2|' : 'Displacement = (signed leg 1) + (signed leg 2), with backward counted as negative.',
        askDistance ? `${mag1} + ${mag2}` : `(${dir1 * mag1}) + (${dir2 * mag2})`,
      ],
      solution: {
        knowns: [`leg 1 = ${mag1} m ${w1}`, `leg 2 = ${mag2} m ${w2}`],
        unknown: askDistance ? 'total distance' : 'displacement',
        principle: askDistance ? 'distance = sum of |each leg|' : 'displacement = sum of each SIGNED leg',
        substitution: askDistance ? `${mag1} + ${mag2}` : `(${dir1 * mag1}) + (${dir2 * mag2})`,
        algebra: `= ${answer}`,
        result: `${answer} m`,
        interpretation: 'Distance and displacement only agree when the motion never reverses direction.',
      },
    };
  },
};

const positionSignConceptual = {
  id: 'ch2.position-displacement.sign-conceptual', skillId: 'ch2.position-displacement', type: 'mc-concept',
  title: 'Direction from a position change',
  generate(rng) {
    const x0 = randInt(rng, -15, 15);
    let xf = randInt(rng, -25, 25);
    while (xf === x0) xf = randInt(rng, -25, 25);
    const positive = xf > x0;
    const correct = positive ? 'the +x direction' : 'the −x direction';
    const distractors = [positive ? 'the −x direction' : 'the +x direction', 'it did not move', 'cannot be determined from this information'];
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: `An object's position changes from ${x0} m to ${xf} m along an x-axis. Which direction did it move?`,
      choices, answer,
      hints: [
        'Compare the final position to the initial position.',
        'If position increases, motion was in +x; if it decreases, motion was in −x.',
        `${xf} ${positive ? '>' : '<'} ${x0}, so the object moved in ${positive ? 'the +x' : 'the −x'} direction.`,
      ],
      solution: {
        knowns: [`x₀ = ${x0} m`, `x_f = ${xf} m`],
        unknown: 'direction of motion',
        principle: 'The sign of Δx = x_f − x₀ tells you the direction of net motion.',
        substitution: `Δx = ${xf} − (${x0}) = ${xf - x0}`,
        algebra: `sign(Δx) is ${positive ? 'positive' : 'negative'}`,
        result: correct,
        interpretation: 'The sign convention is a choice, but once made, it must be applied consistently.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch2.speed-velocity
// ---------------------------------------------------------------------

const averageSpeed = {
  id: 'ch2.speed-velocity.average-speed', skillId: 'ch2.speed-velocity', type: 'numerical',
  title: 'Average speed over two legs',
  generate(rng) {
    const d1 = randFloat(rng, 20, 300, 1);
    const t1 = randFloat(rng, 5, 60, 1);
    const d2 = randFloat(rng, 20, 300, 1);
    const t2 = randFloat(rng, 5, 60, 1);
    const totalD = d1 + d2, totalT = t1 + t2;
    const answer = roundToSigFigs(totalD / totalT, 3);
    const who = subject(rng, 'vehicle');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} covers ${d1} m in ${t1} s, then ${d2} m in ${t2} s. Find its average speed for the whole trip.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 0.05),
      unit: 'm/s',
      hints: [
        'Average speed uses the TOTAL distance and TOTAL time, not an average of the two individual speeds.',
        'average speed = total distance / total time',
        `(${d1} + ${d2}) / (${t1} + ${t2})`,
      ],
      solution: {
        knowns: [`d₁ = ${d1} m, t₁ = ${t1} s`, `d₂ = ${d2} m, t₂ = ${t2} s`],
        unknown: 'average speed',
        principle: 'average speed = total distance / total time',
        substitution: `(${d1} + ${d2}) / (${t1} + ${t2})`,
        algebra: `${totalD.toFixed(1)} / ${totalT.toFixed(1)}`,
        result: `${answer} m/s`,
        interpretation: 'Averaging the two individual speeds directly would be wrong unless the two times happen to be equal.',
      },
    };
  },
};

const averageVelocity = {
  id: 'ch2.speed-velocity.average-velocity', skillId: 'ch2.speed-velocity', type: 'numerical',
  title: 'Average velocity (signed)',
  generate(rng) {
    const x0 = randInt(rng, -20, 10);
    let xf = randInt(rng, -30, 30);
    while (xf === x0) xf = randInt(rng, -30, 30);
    const t = randFloat(rng, 2, 20, 1);
    const answer = roundToSigFigs((xf - x0) / t, 3);
    return {
      type: 'numerical',
      prompt: `An object moves from x = ${x0} m to x = ${xf} m in ${t} s. Find its average velocity (include the correct sign).`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 0.05),
      unit: 'm/s',
      hints: [
        'Average velocity is displacement divided by time — it can be negative.',
        'v_avg = (x_f − x₀) / t',
        `(${xf} − (${x0})) / ${t}`,
      ],
      solution: {
        knowns: [`x₀ = ${x0} m`, `x_f = ${xf} m`, `t = ${t} s`],
        unknown: 'average velocity',
        principle: 'v_avg = Δx / t',
        substitution: `(${xf} − (${x0})) / ${t}`,
        algebra: `${xf - x0} / ${t}`,
        result: `${answer} m/s`,
        interpretation: answer < 0 ? 'The negative sign means the average velocity points in the −x direction.' : 'The positive sign means the average velocity points in the +x direction.',
      },
    };
  },
};

const speedVsVelocityConceptual = {
  id: 'ch2.speed-velocity.conceptual', skillId: 'ch2.speed-velocity', type: 'mc-concept',
  title: 'Speed vs. velocity (round trip)',
  generate(rng) {
    const T = randInt(rng, 20, 90);
    const correct = 'average velocity is zero, but average speed is not necessarily zero';
    const distractors = [
      'average velocity and average speed are both zero',
      'average velocity and average speed are equal and nonzero',
      'average speed is zero but average velocity is nonzero',
    ];
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: `A safari jeep drives all the way around a circular loop road and returns to its exact starting point after ${T} s. Which statement is true?`,
      choices, answer,
      hints: [
        'Displacement depends only on start and end position; distance traveled adds up the whole path.',
        'The jeep ended up exactly where it started — what does that make the displacement?',
        'Zero displacement means zero average velocity, even though the jeep clearly covered real distance (nonzero average speed).',
      ],
      solution: {
        knowns: [`start position = end position (a closed loop)`, `elapsed time = ${T} s`],
        unknown: 'relationship between average speed and average velocity',
        principle: 'average velocity = displacement/time; average speed = distance/time',
        substitution: 'displacement = 0 (same start/end point); distance traveled > 0',
        algebra: 'average velocity = 0 / t = 0; average speed = (distance)/t > 0',
        result: correct,
        interpretation: 'This is exactly why velocity and speed are NOT interchangeable — a round trip is the clearest example.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch2.acceleration
// ---------------------------------------------------------------------

const accelFromVelocities = {
  id: 'ch2.acceleration.from-velocities', skillId: 'ch2.acceleration', type: 'numerical',
  title: 'Acceleration from v₀, v_f, t',
  generate(rng, difficulty) {
    const v0 = randFloat(rng, 0, 25, 1);
    const vf = difficulty >= 4 ? randFloat(rng, -20, 30, 1) : randFloat(rng, 0, 35, 1);
    const t = randFloat(rng, 1, 12, 1);
    const answer = roundToSigFigs((vf - v0) / t, 3);
    const who = subject(rng, 'vehicle');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} changes velocity from ${v0} m/s to ${vf} m/s over ${t} s. Find its acceleration.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 0.05),
      unit: 'm/s²',
      hints: [
        'Acceleration is the rate of change of velocity.',
        'a = (v_f − v₀) / t',
        `(${vf} − ${v0}) / ${t}`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `v_f = ${vf} m/s`, `t = ${t} s`],
        unknown: 'acceleration',
        principle: 'a = (v_f − v₀) / t',
        substitution: `(${vf} − ${v0}) / ${t}`,
        algebra: `${round2(vf - v0)} / ${t}`,
        result: `${answer} m/s²`,
        interpretation: answer >= 0 ? 'A positive acceleration here means velocity is increasing in the +x direction.' : 'A negative acceleration here means velocity is decreasing (or becoming more negative).',
      },
    };
  },
};

const speedingUpSlowingDown = {
  id: 'ch2.acceleration.speeding-up-slowing-down', skillId: 'ch2.acceleration', type: 'mc-concept',
  title: 'Speeding up or slowing down from signs',
  generate(rng) {
    const v = chance(rng, 0.5) ? randFloat(rng, 2, 20, 1) : -randFloat(rng, 2, 20, 1);
    const a = chance(rng, 0.5) ? randFloat(rng, 1, 8, 1) : -randFloat(rng, 1, 8, 1);
    const sameSign = (v > 0 && a > 0) || (v < 0 && a < 0);
    const correct = sameSign ? 'speeding up' : 'slowing down';
    const distractors = [sameSign ? 'slowing down' : 'speeding up', 'moving at constant velocity', 'momentarily at rest'];
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: `An object has a velocity of ${v} m/s and an acceleration of ${a} m/s². Is it speeding up or slowing down?`,
      choices, answer,
      hints: [
        'Compare the SIGNS of the velocity and the acceleration, not just their sizes.',
        'If velocity and acceleration point the same way, speed increases; if they point opposite ways, speed decreases.',
        `v is ${v >= 0 ? 'positive' : 'negative'} and a is ${a >= 0 ? 'positive' : 'negative'} — ${sameSign ? 'same sign' : 'opposite signs'}.`,
      ],
      solution: {
        knowns: [`v = ${v} m/s`, `a = ${a} m/s²`],
        unknown: 'speeding up or slowing down?',
        principle: 'Speed increases when v and a share the same sign; speed decreases when they have opposite signs.',
        substitution: `sign(v) = ${v >= 0 ? '+' : '−'}, sign(a) = ${a >= 0 ? '+' : '−'}`,
        algebra: sameSign ? 'signs match' : 'signs are opposite',
        result: correct,
        interpretation: 'This is why a negative acceleration does not automatically mean "slowing down" — it depends on which way the object is already moving.',
      },
    };
  },
};

const compareAccelerations = {
  id: 'ch2.acceleration.compare', skillId: 'ch2.acceleration', type: 'mc-concept',
  title: 'Compare two accelerations',
  generate(rng) {
    const mkCase = () => {
      const v0 = randFloat(rng, 0, 15, 1);
      const vf = randFloat(rng, v0 + 3, v0 + 25, 1);
      const t = randFloat(rng, 2, 10, 1);
      return { v0, vf, t, a: (vf - v0) / t };
    };
    const A = mkCase();
    let B = mkCase();
    // occasionally force an exact tie so "equal" is a genuine possible answer
    if (chance(rng, 0.25)) {
      const tiedT = (B.vf - B.v0) / A.a;
      B = { ...B, t: tiedT, a: (B.vf - B.v0) / tiedT };
    }
    const diff = A.a - B.a;
    const correct = Math.abs(diff) < 0.05 ? 'They are equal' : diff > 0 ? 'Object A' : 'Object B';
    const distractors = ['Object A', 'Object B', 'They are equal'].filter((c) => c !== correct);
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: `Object A speeds up from ${A.v0.toFixed(1)} m/s to ${A.vf.toFixed(1)} m/s in ${A.t.toFixed(1)} s. Object B speeds up from ${B.v0.toFixed(1)} m/s to ${B.vf.toFixed(1)} m/s in ${B.t.toFixed(1)} s. Which object has the greater acceleration?`,
      choices, answer,
      hints: [
        'Compute each object\'s acceleration separately using a = (v_f − v₀)/t.',
        'Then compare the two results.',
        `a_A = (${A.vf.toFixed(1)} − ${A.v0.toFixed(1)})/${A.t.toFixed(1)}, a_B = (${B.vf.toFixed(1)} − ${B.v0.toFixed(1)})/${B.t.toFixed(1)}`,
      ],
      solution: {
        knowns: [`A: v₀=${A.v0.toFixed(1)}, v_f=${A.vf.toFixed(1)}, t=${A.t.toFixed(1)}`, `B: v₀=${B.v0.toFixed(1)}, v_f=${B.vf.toFixed(1)}, t=${B.t.toFixed(1)}`],
        unknown: 'which has greater acceleration',
        principle: 'a = (v_f − v₀)/t for each object, then compare.',
        substitution: `a_A = ${round2(A.a)} m/s², a_B = ${round2(B.a)} m/s²`,
        algebra: `compare ${round2(A.a)} vs ${round2(B.a)}`,
        result: correct,
        interpretation: 'A bigger velocity CHANGE doesn\'t automatically mean bigger acceleration — the time it takes matters just as much.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch2.kinematic-equations
// ---------------------------------------------------------------------

const displacementFromAccel = {
  id: 'ch2.kinematic-equations.displacement', skillId: 'ch2.kinematic-equations', type: 'numerical',
  title: 'Displacement from v₀, a, t',
  generate(rng, difficulty) {
    const v0 = randFloat(rng, 0, 20, 1);
    const a = (chance(rng, 0.5) ? 1 : -1) * randFloat(rng, 0.5, 6, 1);
    const t = randFloat(rng, 1, 8, 1);
    const answer = roundToSigFigs(v0 * t + 0.5 * a * t * t, 3);
    const who = subject(rng, 'vehicle');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} starts at ${v0} m/s and accelerates at ${a} m/s² for ${t} s. Find its displacement during that time.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.03, 0.2),
      unit: 'm',
      hints: [
        'You know v₀, a, and t, and need displacement — that points to one specific kinematic equation.',
        'Δx = v₀t + ½at²',
        `Δx = (${v0})(${t}) + ½(${a})(${t})²`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `a = ${a} m/s²`, `t = ${t} s`],
        unknown: 'displacement Δx',
        principle: 'Δx = v₀t + ½at²',
        substitution: `Δx = (${v0})(${t}) + ½(${a})(${t})²`,
        algebra: `= ${round2(v0 * t)} + ${round2(0.5 * a * t * t)}`,
        result: `${answer} m`,
        interpretation: 'The v₀t term is how far it would go at constant speed; the ½at² term is the extra (or reduced) distance from accelerating.',
      },
    };
  },
};

const finalVelocityFromDisplacement = {
  id: 'ch2.kinematic-equations.vf-from-displacement', skillId: 'ch2.kinematic-equations', type: 'numerical',
  title: 'Final velocity from v₀, a, Δx',
  generate(rng) {
    // Construct-then-derive: pick vf as the real target, derive Δx from it so
    // v0² + 2aΔx is guaranteed to equal vf² exactly (never negative under the root).
    const v0 = randFloat(rng, 2, 20, 1);
    const a = (chance(rng, 0.5) ? 1 : -1) * randFloat(rng, 0.5, 5, 1);
    const vf = a >= 0 ? randFloat(rng, v0, v0 + 25, 1) : randFloat(rng, Math.max(0, v0 - 15), v0, 1);
    const deltaX = (vf * vf - v0 * v0) / (2 * a);
    const answer = roundToSigFigs(vf, 3);
    return {
      type: 'numerical',
      prompt: `An object starts at ${v0} m/s and accelerates at ${round2(a)} m/s² over a displacement of ${round2(deltaX)} m. Find its final velocity. (Assume it keeps the same direction of travel throughout.)`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.03, 0.2),
      unit: 'm/s',
      hints: [
        'You know v₀, a, and Δx, but not t — that rules out the time-based equations.',
        'v_f² = v₀² + 2aΔx',
        `v_f² = (${v0})² + 2(${round2(a)})(${round2(deltaX)})`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `a = ${round2(a)} m/s²`, `Δx = ${round2(deltaX)} m`],
        unknown: 'final velocity',
        principle: 'v_f² = v₀² + 2aΔx',
        substitution: `v_f² = (${v0})² + 2(${round2(a)})(${round2(deltaX)})`,
        algebra: `v_f² = ${round2(v0 * v0 + 2 * a * deltaX)}, v_f = √(that)`,
        result: `${answer} m/s`,
        interpretation: 'This equation is the one to reach for whenever time isn\'t given (or isn\'t needed).',
      },
    };
  },
};

const stoppingDistance = {
  id: 'ch2.kinematic-equations.stopping-distance', skillId: 'ch2.kinematic-equations', type: 'numerical',
  title: 'Stopping distance',
  generate(rng) {
    const v0 = randFloat(rng, 8, 35, 1);
    const decel = randFloat(rng, 1.5, 8, 1);
    const answer = roundToSigFigs((v0 * v0) / (2 * decel), 3);
    const who = subject(rng, 'vehicle');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} traveling at ${v0} m/s brakes with a deceleration of ${decel} m/s². Find the distance it travels before stopping.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.03, 0.2),
      unit: 'm',
      hints: [
        'Stopping means the final velocity is zero — that\'s the key extra piece of information.',
        'v_f² = v₀² + 2aΔx, with v_f = 0 and a = −(deceleration).',
        `0 = (${v0})² − 2(${decel})Δx`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `v_f = 0 m/s (stopped)`, `a = −${decel} m/s²`],
        unknown: 'stopping distance',
        principle: '0 = v₀² − 2(decel)Δx  ⟹  Δx = v₀² / (2·decel)',
        substitution: `Δx = (${v0})² / (2 × ${decel})`,
        algebra: `= ${round2(v0 * v0)} / ${round2(2 * decel)}`,
        result: `${answer} m`,
        interpretation: 'Stopping distance grows with the SQUARE of speed — doubling your speed roughly quadruples it.',
      },
    };
  },
};

const stoppingTime = {
  id: 'ch2.kinematic-equations.stopping-time', skillId: 'ch2.kinematic-equations', type: 'numerical',
  title: 'Stopping time',
  generate(rng) {
    const v0 = randFloat(rng, 8, 35, 1);
    const decel = randFloat(rng, 1.5, 8, 1);
    const answer = roundToSigFigs(v0 / decel, 3);
    const who = subject(rng, 'vehicle');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} traveling at ${v0} m/s brakes with a deceleration of ${decel} m/s². Find how long it takes to stop.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.03, 0.1),
      unit: 's',
      hints: [
        'Stopping means the final velocity is zero.',
        'v_f = v₀ + at, with v_f = 0 and a = −(deceleration).',
        `0 = ${v0} − ${decel}t`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `v_f = 0 m/s`, `a = −${decel} m/s²`],
        unknown: 'time to stop',
        principle: '0 = v₀ − (decel)t  ⟹  t = v₀ / decel',
        substitution: `t = ${v0} / ${decel}`,
        algebra: `= ${answer}`,
        result: `${answer} s`,
        interpretation: 'Reaction time isn\'t included here — real stopping distances also include how far you travel before braking even begins.',
      },
    };
  },
};

const findInitialVelocity = {
  id: 'ch2.kinematic-equations.find-v0', skillId: 'ch2.kinematic-equations', type: 'numerical',
  title: 'Find v₀ from v_f, a, Δx',
  generate(rng) {
    const v0Real = randFloat(rng, 3, 20, 1);
    const a = (chance(rng, 0.5) ? 1 : -1) * randFloat(rng, 0.5, 5, 1);
    const t = randFloat(rng, 1, 6, 1);
    const vf = v0Real + a * t;
    const deltaX = v0Real * t + 0.5 * a * t * t;
    const answer = roundToSigFigs(v0Real, 3);
    return {
      type: 'numerical',
      prompt: `An object ends at a velocity of ${round2(vf)} m/s after accelerating at ${round2(a)} m/s² over a displacement of ${round2(deltaX)} m. Find its initial velocity.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.04, 0.2),
      unit: 'm/s',
      hints: [
        'You know v_f, a, and Δx, and need v₀ — the same equation as before, just solved for a different variable.',
        'v_f² = v₀² + 2aΔx  ⟹  v₀² = v_f² − 2aΔx',
        `v₀² = (${round2(vf)})² − 2(${round2(a)})(${round2(deltaX)})`,
      ],
      solution: {
        knowns: [`v_f = ${round2(vf)} m/s`, `a = ${round2(a)} m/s²`, `Δx = ${round2(deltaX)} m`],
        unknown: 'initial velocity',
        principle: 'v₀² = v_f² − 2aΔx',
        substitution: `v₀² = (${round2(vf)})² − 2(${round2(a)})(${round2(deltaX)})`,
        algebra: `v₀² = ${round2(vf * vf - 2 * a * deltaX)}, v₀ = √(that)`,
        result: `${answer} m/s`,
        interpretation: 'Solving for an EARLIER quantity from LATER information is common in kinematics — the equation doesn\'t care which direction in time you\'re solving.',
      },
    };
  },
};

const EQUATION_VARIANTS = [
  { known: 'v₀, a, t', find: 'v_f', correct: 'v_f = v₀ + at' },
  { known: 'v₀, a, t', find: 'Δx', correct: 'Δx = v₀t + ½at²' },
  { known: 'v₀, v_f, a', find: 'Δx', correct: 'v_f² = v₀² + 2aΔx' },
  { known: 'v₀, v_f, t', find: 'Δx', correct: 'Δx = ½(v₀ + v_f)t' },
];
const ALL_KINEMATIC_EQUATIONS = EQUATION_VARIANTS.map((v) => v.correct);

const equationSelectKinematics = {
  id: 'ch2.kinematic-equations.equation-select', skillId: 'ch2.kinematic-equations', type: 'equation-select',
  title: 'Choose the right kinematic equation',
  generate(rng) {
    const variant = choice(rng, EQUATION_VARIANTS);
    const distractors = ALL_KINEMATIC_EQUATIONS.filter((e) => e !== variant.correct);
    const { choices, answer } = buildChoices(rng, variant.correct, distractors);
    return {
      type: 'equation-select',
      prompt: `You know ${variant.known} for an object under constant acceleration, and need to find ${variant.find}. Which equation should you use?`,
      choices, answer,
      hints: [
        'List which of the five kinematic quantities (v₀, v_f, a, t, Δx) you have, and which one you need.',
        'Each of the four kinematic equations is missing exactly one of those five quantities — find the one missing the quantity you don\'t have and don\'t need.',
        `You have ${variant.known} and want ${variant.find} — pick the equation that connects exactly those.`,
      ],
      solution: {
        knowns: [`known quantities: ${variant.known}`, `target: ${variant.find}`],
        unknown: 'which equation to use',
        principle: 'Each kinematic equation relates 4 of the 5 kinematic quantities — choose the one that omits what you don\'t have.',
        substitution: '—',
        algebra: '—',
        result: variant.correct,
        interpretation: 'Picking the right equation BEFORE plugging in numbers is the single most useful kinematics habit to build.',
      },
    };
  },
};

const impossibleInfoConceptual = {
  id: 'ch2.kinematic-equations.consistency-check', skillId: 'ch2.kinematic-equations', type: 'mc-concept',
  title: 'Check a scenario for consistency',
  generate(rng) {
    const v0 = randFloat(rng, 0, 15, 1);
    const vf = randFloat(rng, v0 + 2, v0 + 30, 1);
    const t = randFloat(rng, 1, 10, 1);
    const trueA = (vf - v0) / t;
    const isConsistent = chance(rng, 0.5);
    const statedA = isConsistent ? roundToSigFigs(trueA, 3) : roundToSigFigs(trueA + (chance(rng, 0.5) ? 1 : -1) * Math.max(2, Math.abs(trueA) * 0.6), 3);
    const correct = isConsistent
      ? 'Consistent — the numbers all agree'
      : "Inconsistent — the stated acceleration doesn't match a = (v_f − v₀)/t";
    const distractors = [
      isConsistent ? "Inconsistent — the stated acceleration doesn't match a = (v_f − v₀)/t" : 'Consistent — the numbers all agree',
      'Inconsistent — the time given is negative',
      'Inconsistent — the velocities have impossible units',
    ];
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: `A report claims: an object starts at ${v0} m/s, ends at ${vf} m/s after ${t} s, with a constant acceleration of ${statedA} m/s². Is this scenario physically consistent?`,
      choices, answer,
      hints: [
        'The three motion values (v₀, v_f, t) determine the acceleration completely — there\'s no freedom left to also independently choose it.',
        'Compute a = (v_f − v₀)/t yourself and compare it to the stated value.',
        `(v_f − v₀)/t = (${vf} − ${v0})/${t} = ${round2(trueA)}, compare to the stated ${statedA}.`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `v_f = ${vf} m/s`, `t = ${t} s`, `stated a = ${statedA} m/s²`],
        unknown: 'is the scenario consistent?',
        principle: 'For constant acceleration, a = (v_f − v₀)/t is fully determined by the other three values.',
        substitution: `a = (${vf} − ${v0}) / ${t}`,
        algebra: `= ${round2(trueA)}, compare to stated ${statedA}`,
        result: correct,
        interpretation: 'Checking a stated answer against the equation is a fast way to catch a made-up or misreported result.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch2.motion-graphs
// ---------------------------------------------------------------------

const graphSlopeVelocityTime = {
  id: 'ch2.motion-graphs.slope', skillId: 'ch2.motion-graphs', type: 'numerical',
  title: 'Acceleration from a v-t graph',
  generate(rng) {
    const v0 = randFloat(rng, -10, 15, 1);
    const vf = randFloat(rng, -10, 25, 1);
    const T = randFloat(rng, 2, 12, 1);
    const answer = roundToSigFigs((vf - v0) / T, 3);
    return {
      type: 'numerical',
      prompt: `The graph shows an object's velocity vs. time. Find its acceleration.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.03, 0.05),
      unit: 'm/s²',
      diagram: { type: 'line-graph', points: [{ t: 0, y: v0 }, { t: T, y: vf }], xLabel: 'time (s)', yLabel: 'velocity (m/s)' },
      hints: [
        'On a velocity-vs-time graph, acceleration is the SLOPE of the line.',
        'slope = rise/run = Δv/Δt',
        `(${vf} − ${v0}) / ${T}`,
      ],
      solution: {
        knowns: [`v(0) = ${v0} m/s`, `v(${T}) = ${vf} m/s`],
        unknown: 'acceleration (slope)',
        principle: 'a = slope of v-t graph = Δv/Δt',
        substitution: `(${vf} − ${v0}) / ${T}`,
        algebra: `${round2(vf - v0)} / ${T}`,
        result: `${answer} m/s²`,
        interpretation: 'A steeper line means a larger-magnitude acceleration; a flat line means zero acceleration.',
      },
    };
  },
};

const graphAreaVelocityTime = {
  id: 'ch2.motion-graphs.area', skillId: 'ch2.motion-graphs', type: 'numerical',
  title: 'Displacement from a v-t graph (area)',
  generate(rng) {
    const v0 = randFloat(rng, 0, 15, 1);
    const vf = randFloat(rng, 0, 25, 1);
    const T = randFloat(rng, 2, 12, 1);
    const answer = roundToSigFigs(0.5 * (v0 + vf) * T, 3);
    return {
      type: 'numerical',
      prompt: `The graph shows an object's velocity vs. time. Find its total displacement over the time shown.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.03, 0.2),
      unit: 'm',
      diagram: { type: 'line-graph', points: [{ t: 0, y: v0 }, { t: T, y: vf }], xLabel: 'time (s)', yLabel: 'velocity (m/s)' },
      hints: [
        'On a velocity-vs-time graph, displacement is the AREA between the line and the time axis.',
        'This region is a trapezoid: area = ½(base 1 + base 2) × height, using the two velocities as the parallel sides.',
        `½(${v0} + ${vf}) × ${T}`,
      ],
      solution: {
        knowns: [`v(0) = ${v0} m/s`, `v(${T}) = ${vf} m/s`],
        unknown: 'displacement (area under the graph)',
        principle: 'displacement = area under a v-t graph = ½(v₀ + v_f)t (a trapezoid)',
        substitution: `½(${v0} + ${vf})(${T})`,
        algebra: `= ${round2(0.5 * (v0 + vf))} × ${T}`,
        result: `${answer} m`,
        interpretation: 'This trapezoid-area shortcut is really just the same Δx = ½(v₀+v_f)t equation, viewed graphically.',
      },
    };
  },
};

const graphIdentifyPhase = {
  id: 'ch2.motion-graphs.identify-phase', skillId: 'ch2.motion-graphs', type: 'mc-concept',
  title: 'Read a multi-segment position-time graph',
  generate(rng) {
    const t1 = randInt(rng, 2, 4);
    const t2 = t1 + randInt(rng, 2, 4);
    const t3 = t2 + randInt(rng, 2, 4);
    const y1 = randInt(rng, 8, 20);
    const y2 = randInt(rng, 0, y1 - 4);
    const points = [{ t: 0, y: 0 }, { t: t1, y: y1 }, { t: t2, y: y1 }, { t: t3, y: y2 }];
    const segmentLabels = [{ from: 0, to: t1, label: 'A' }, { from: t1, to: t2, label: 'B' }, { from: t2, to: t3, label: 'C' }];
    const questionKind = choice(rng, ['rest', 'positive', 'negative']);
    const correct = questionKind === 'rest' ? 'Segment B' : questionKind === 'positive' ? 'Segment A' : 'Segment C';
    const questionText = questionKind === 'rest' ? 'is at rest' : questionKind === 'positive' ? 'is moving in the positive direction' : 'is moving in the negative direction';
    const distractors = ['Segment A', 'Segment B', 'Segment C'].filter((c) => c !== correct);
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: `The graph shows an object's position vs. time in three segments (A, B, C). During which segment ${questionText}?`,
      choices, answer,
      diagram: { type: 'line-graph', points, xLabel: 'time (s)', yLabel: 'position (m)', segmentLabels },
      hints: [
        'On a position-vs-time graph, the SLOPE of each segment tells you the velocity during that segment.',
        'A flat (horizontal) segment means zero slope — zero velocity, i.e. at rest. A rising segment means positive velocity; a falling segment means negative velocity.',
        `Segment A rises, segment B is flat, segment C falls.`,
      ],
      solution: {
        knowns: ['segment A: rising', 'segment B: flat', 'segment C: falling'],
        unknown: `which segment ${questionText}`,
        principle: 'velocity = slope of a position-time graph',
        substitution: '—',
        algebra: '—',
        result: correct,
        interpretation: 'Reading slope-as-velocity directly off a graph is faster than computing numbers when you only need a qualitative answer.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch2.free-fall
// ---------------------------------------------------------------------

const freeFallTime = {
  id: 'ch2.free-fall.time', skillId: 'ch2.free-fall', type: 'numerical',
  title: 'Time to fall a given height',
  generate(rng) {
    const h = randFloat(rng, 4, 80, 1);
    const answer = roundToSigFigs(Math.sqrt((2 * h) / G), 3);
    const who = subject(rng, 'faller');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} is released from rest and falls ${h} m. Find how long it takes to land. (g = 9.8 m/s²)`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 0.05),
      unit: 's',
      hints: [
        'Starting from rest means v₀ = 0, so use the falling version of Δx = v₀t + ½at².',
        'h = ½gt²  ⟹  t = √(2h/g)',
        `t = √(2 × ${h} / 9.8)`,
      ],
      solution: {
        knowns: [`h = ${h} m`, `v₀ = 0`, `g = 9.8 m/s²`],
        unknown: 'fall time',
        principle: 'h = ½gt²  ⟹  t = √(2h/g)',
        substitution: `t = √(2 × ${h} / 9.8)`,
        algebra: `= √(${round2((2 * h) / G)})`,
        result: `${answer} s`,
        interpretation: 'This ignores air resistance, which is the standard assumption for these problems.',
      },
    };
  },
};

const freeFallSpeed = {
  id: 'ch2.free-fall.speed', skillId: 'ch2.free-fall', type: 'numerical',
  title: 'Landing speed from a given height',
  generate(rng) {
    const h = randFloat(rng, 4, 80, 1);
    const answer = roundToSigFigs(Math.sqrt(2 * G * h), 3);
    const who = subject(rng, 'faller');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} is released from rest and falls ${h} m. Find its speed just before landing. (g = 9.8 m/s²)`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 0.1),
      unit: 'm/s',
      hints: [
        'Starting from rest means v₀ = 0.',
        'v_f² = v₀² + 2gh  ⟹  v_f = √(2gh)',
        `v_f = √(2 × 9.8 × ${h})`,
      ],
      solution: {
        knowns: [`h = ${h} m`, `v₀ = 0`, `g = 9.8 m/s²`],
        unknown: 'landing speed',
        principle: 'v_f² = v₀² + 2gh',
        substitution: `v_f = √(2 × 9.8 × ${h})`,
        algebra: `= √(${round2(2 * G * h)})`,
        result: `${answer} m/s`,
        interpretation: 'Speed grows with the SQUARE ROOT of height — quadrupling the height only doubles the landing speed.',
      },
    };
  },
};

const thrownUpwardMaxHeight = {
  id: 'ch2.free-fall.max-height', skillId: 'ch2.free-fall', type: 'numerical',
  title: 'Maximum height of a vertical throw',
  generate(rng) {
    const v0 = randFloat(rng, 6, 30, 1);
    const answer = roundToSigFigs((v0 * v0) / (2 * G), 3);
    const who = subject(rng, 'thrown');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} at ${v0} m/s. Find the maximum height it reaches. (g = 9.8 m/s², ignore air resistance)`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 0.1),
      unit: 'm',
      hints: [
        'At the very top of the flight, the velocity is momentarily zero.',
        'v_f² = v₀² − 2gh, with v_f = 0',
        `0 = (${v0})² − 2(9.8)h`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s (upward)`, `v_f = 0 at the top`, `g = 9.8 m/s²`],
        unknown: 'maximum height',
        principle: '0 = v₀² − 2gh  ⟹  h = v₀²/(2g)',
        substitution: `h = (${v0})² / (2 × 9.8)`,
        algebra: `= ${round2(v0 * v0)} / ${round2(2 * G)}`,
        result: `${answer} m`,
        interpretation: 'The object still HAS acceleration (g, downward) at the top — only its velocity is momentarily zero.',
      },
    };
  },
};

const thrownUpwardTimeAloft = {
  id: 'ch2.free-fall.time-aloft', skillId: 'ch2.free-fall', type: 'numerical',
  title: 'Total time in the air',
  generate(rng) {
    const v0 = randFloat(rng, 6, 30, 1);
    const answer = roundToSigFigs((2 * v0) / G, 3);
    const who = subject(rng, 'thrown');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} at ${v0} m/s and is caught again at the same height it was released. Find the total time it spends in the air. (g = 9.8 m/s²)`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 0.05),
      unit: 's',
      hints: [
        'By symmetry, the time going up equals the time coming back down to the same height.',
        'Time up to the peak: t_up = v₀/g. Total time is twice that.',
        `t = 2(${v0})/9.8`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `returns to launch height`, `g = 9.8 m/s²`],
        unknown: 'total time aloft',
        principle: 't_total = 2v₀/g (by up/down symmetry, when landing height = launch height)',
        substitution: `t = 2(${v0}) / 9.8`,
        algebra: `= ${round2(2 * v0)} / 9.8`,
        result: `${answer} s`,
        interpretation: 'This shortcut only applies when the object returns to the SAME height it was launched from.',
      },
    };
  },
};

const freeFallTopConceptual = {
  id: 'ch2.free-fall.top-conceptual', skillId: 'ch2.free-fall', type: 'mc-concept',
  title: 'Acceleration at the top of a throw',
  generate(rng) {
    const correct = 'g, directed downward — the same as at every other point in the flight';
    const distractors = ['zero, since the object is momentarily at rest', 'g, directed upward', 'it depends on how fast the object was thrown'];
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: 'A ball is thrown straight up. What is its acceleration at the instant it reaches its highest point?',
      choices, answer,
      hints: [
        'Don\'t confuse velocity being zero with acceleration being zero — they\'re independent.',
        'Gravity acts on the ball the entire time it\'s in the air, with no exceptions.',
        'The velocity is momentarily zero at the top, but the acceleration is unaffected by that — it\'s still g, downward.',
      ],
      solution: {
        knowns: ['object in free flight under gravity alone'],
        unknown: 'acceleration at the peak of the trajectory',
        principle: 'Under free fall, acceleration is g (downward) at every instant, regardless of the object\'s velocity.',
        substitution: '—',
        algebra: '—',
        result: correct,
        interpretation: 'This is one of the most common free-fall misconceptions — "stopped" does not mean "unaccelerated".',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch2.multistage-motion
// ---------------------------------------------------------------------

const twoStageVelocity = {
  id: 'ch2.multistage-motion.velocity', skillId: 'ch2.multistage-motion', type: 'numerical',
  title: 'Final velocity after two stages',
  generate(rng) {
    const v0 = randFloat(rng, 0, 12, 1);
    const a1 = randFloat(rng, 1, 5, 1);
    const t1 = randFloat(rng, 2, 8, 1);
    const v1 = v0 + a1 * t1;
    const a2 = (chance(rng, 0.5) ? 1 : -1) * randFloat(rng, 0.5, 4, 1);
    const t2 = randFloat(rng, 2, 8, 1);
    const vf = v1 + a2 * t2;
    const answer = roundToSigFigs(vf, 3);
    const who = subject(rng, 'vehicle');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} starts at ${v0} m/s and accelerates at ${a1} m/s² for ${t1} s. It then accelerates at ${round2(a2)} m/s² for another ${t2} s. Find its final velocity.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.03, 0.2),
      unit: 'm/s',
      hints: [
        'Handle one stage at a time — the ending velocity of stage 1 becomes the starting velocity of stage 2.',
        'Stage 1: v₁ = v₀ + a₁t₁. Stage 2: v_f = v₁ + a₂t₂.',
        `v₁ = ${v0} + (${a1})(${t1}) = ${round2(v1)}, then v_f = ${round2(v1)} + (${round2(a2)})(${t2})`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `stage 1: a₁ = ${a1} m/s², t₁ = ${t1} s`, `stage 2: a₂ = ${round2(a2)} m/s², t₂ = ${t2} s`],
        unknown: 'final velocity',
        principle: 'Apply v = v₀ + at once per stage, chaining the result forward.',
        substitution: `v₁ = ${v0} + (${a1})(${t1}); v_f = v₁ + (${round2(a2)})(${t2})`,
        algebra: `v₁ = ${round2(v1)}; v_f = ${round2(v1)} + ${round2(a2 * t2)}`,
        result: `${answer} m/s`,
        interpretation: 'Multi-stage problems are just single-stage kinematics applied twice, using the previous stage\'s output as the next stage\'s input.',
      },
    };
  },
};

const twoStageDisplacement = {
  id: 'ch2.multistage-motion.displacement', skillId: 'ch2.multistage-motion', type: 'numerical',
  title: 'Total displacement over two stages',
  generate(rng) {
    const v0 = randFloat(rng, 0, 12, 1);
    const a1 = randFloat(rng, 1, 5, 1);
    const t1 = randFloat(rng, 2, 8, 1);
    const dx1 = v0 * t1 + 0.5 * a1 * t1 * t1;
    const v1 = v0 + a1 * t1;
    const a2 = (chance(rng, 0.5) ? 1 : -1) * randFloat(rng, 0.5, 4, 1);
    const t2 = randFloat(rng, 2, 8, 1);
    const dx2 = v1 * t2 + 0.5 * a2 * t2 * t2;
    const answer = roundToSigFigs(dx1 + dx2, 3);
    const who = subject(rng, 'vehicle');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} starts at ${v0} m/s and accelerates at ${a1} m/s² for ${t1} s. It then accelerates at ${round2(a2)} m/s² for another ${t2} s. Find its TOTAL displacement over both stages.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.03, 0.3),
      unit: 'm',
      hints: [
        'Find the displacement of each stage separately, then add them.',
        'Stage 1: Δx₁ = v₀t₁ + ½a₁t₁². Stage 2 starts at v₁ = v₀+a₁t₁: Δx₂ = v₁t₂ + ½a₂t₂².',
        `Δx₁ = ${round2(dx1)} m, Δx₂ = ${round2(dx2)} m`,
      ],
      solution: {
        knowns: [`v₀ = ${v0} m/s`, `stage 1: a₁=${a1}, t₁=${t1}`, `stage 2: a₂=${round2(a2)}, t₂=${t2}`],
        unknown: 'total displacement',
        principle: 'Total displacement = Δx₁ + Δx₂, computing each stage with its own starting velocity.',
        substitution: `Δx₁ = (${v0})(${t1}) + ½(${a1})(${t1})²; Δx₂ = (${round2(v1)})(${t2}) + ½(${round2(a2)})(${t2})²`,
        algebra: `Δx₁ = ${round2(dx1)}; Δx₂ = ${round2(dx2)}`,
        result: `${answer} m`,
        interpretation: 'A very common mistake is using v₀ (not v₁) as the starting velocity for stage 2 — always carry the ending velocity forward.',
      },
    };
  },
};

const twoStageFindUnknown = {
  id: 'ch2.multistage-motion.find-unknown-stage', skillId: 'ch2.multistage-motion', type: 'numerical',
  title: 'Find an unknown stage-2 acceleration',
  generate(rng) {
    const v0 = randFloat(rng, 2, 12, 1);
    const a1 = randFloat(rng, 1, 4, 1);
    const t1 = randFloat(rng, 2, 6, 1);
    const dx1 = v0 * t1 + 0.5 * a1 * t1 * t1;
    const v1 = v0 + a1 * t1;
    const a2Real = (chance(rng, 0.5) ? 1 : -1) * randFloat(rng, 0.5, 3, 1);
    const t2 = randFloat(rng, 2, 6, 1);
    const dx2 = v1 * t2 + 0.5 * a2Real * t2 * t2;
    const totalDx = dx1 + dx2;
    const answer = roundToSigFigs(a2Real, 3);
    const who = subject(rng, 'vehicle');
    return {
      type: 'numerical',
      prompt: `${who[0].toUpperCase()}${who.slice(1)} starts at ${v0} m/s and accelerates at ${a1} m/s² for ${t1} s. It then accelerates (at some unknown rate) for another ${t2} s. If the TOTAL displacement over both stages is ${round2(totalDx)} m, find the acceleration during the second stage.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.05, 0.15),
      unit: 'm/s²',
      hints: [
        'First work out stage 1 completely: its displacement, and the velocity it hands off to stage 2.',
        'Subtract stage 1\'s displacement from the total to get stage 2\'s displacement, then use Δx₂ = v₁t₂ + ½a₂t₂² and solve for a₂.',
        `Δx₁ = ${round2(dx1)} m, so Δx₂ = ${round2(totalDx)} − ${round2(dx1)} = ${round2(dx2)} m. Then solve ${round2(dx2)} = (${round2(v1)})(${t2}) + ½a₂(${t2})² for a₂.`,
      ],
      solution: {
        knowns: [`v₀=${v0}, a₁=${a1}, t₁=${t1}`, `t₂=${t2}`, `total Δx = ${round2(totalDx)} m`],
        unknown: 'stage-2 acceleration',
        principle: 'Isolate stage 2\'s displacement, then solve Δx₂ = v₁t₂ + ½a₂t₂² for a₂.',
        substitution: `v₁ = ${round2(v1)}; Δx₂ = ${round2(totalDx)} − ${round2(dx1)} = ${round2(dx2)}`,
        algebra: `a₂ = 2(Δx₂ − v₁t₂) / t₂² = 2(${round2(dx2)} − ${round2(v1 * t2)}) / ${round2(t2 * t2)}`,
        result: `${answer} m/s²`,
        interpretation: 'Working backward from a total is a "level 5" skill: it combines two stages AND requires solving for a variable buried inside the second equation.',
      },
    };
  },
};

export const CH2_ARCHETYPES = [
  posDispBasic, distanceVsDisplacement, positionSignConceptual,
  averageSpeed, averageVelocity, speedVsVelocityConceptual,
  accelFromVelocities, speedingUpSlowingDown, compareAccelerations,
  displacementFromAccel, finalVelocityFromDisplacement, stoppingDistance, stoppingTime, findInitialVelocity, equationSelectKinematics, impossibleInfoConceptual,
  graphSlopeVelocityTime, graphAreaVelocityTime, graphIdentifyPhase,
  freeFallTime, freeFallSpeed, thrownUpwardMaxHeight, thrownUpwardTimeAloft, freeFallTopConceptual,
  twoStageVelocity, twoStageDisplacement, twoStageFindUnknown,
];
