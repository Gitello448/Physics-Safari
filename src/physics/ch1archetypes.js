// Chapter 1 — Mathematical Concepts: fully implemented archetype bank.
// Each archetype is a pure function of (rng, difficulty) -> "problem core".
// generator.js wraps these with ids/seed/metadata. Nothing here talks to the
// UI or storage — keep it that way so it stays independently testable.

import { randInt, randFloat, choice, chance, shuffleInPlace } from './rng.js';
import { countSigFigs, roundToSigFigs, roundToDecimalPlaces, decimalPlacesOf } from './sigfigsUtil.js';
import { SI_BASE_UNITS, DERIVED_UNITS } from './siUnits.js';

const round2 = (n) => Math.round(n * 100) / 100;
const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

// Distractor-shuffling multiple-choice helper: builds a choices[] with the
// correct answer inserted at a random position, returns {choices, answer}.
function buildChoices(rng, correct, distractors) {
  const choices = shuffleInPlace(rng, [correct, ...distractors]);
  return { choices, answer: correct };
}

// A small pool of subjects so ~half the questions read as safari-park
// operations and half read as ordinary physics contexts, per the user's
// explicit 50/50 request.
function subject(rng, kind) {
  const pools = {
    vehicle: {
      safari: ['the safari transport truck', "the ranger's jeep", 'the supply aircraft', 'the water tanker'],
      generic: ['a car', 'a train', 'a delivery truck', 'a cyclist'],
    },
    distanceThing: {
      safari: ['the new elephant enclosure fence line', 'the path from the HQ to the watering hole', 'the perimeter of the giraffe habitat'],
      generic: ['a running track', 'a hiking trail', 'a hallway', 'a fenced yard'],
    },
    massThing: {
      safari: ['a crate of feed supplies', 'a water tank', 'a young rhino', 'a bag of veterinary equipment'],
      generic: ['a shipping crate', 'a bag of cement', 'a suitcase', 'a block of steel'],
    },
    ramp: {
      safari: ['the loading ramp into the supply truck', "the observation tower's access ramp"],
      generic: ['a skateboard ramp', 'a wheelchair ramp', 'a loading dock ramp'],
    },
  };
  const pool = pools[kind];
  return chance(rng, 0.5) ? choice(rng, pool.safari) : choice(rng, pool.generic);
}

// ---------------------------------------------------------------------
// ch1.units — Units, SI System & Dimensional Analysis
// ---------------------------------------------------------------------

const unitsIdentifyBase = {
  id: 'ch1.units.identify-base', skillId: 'ch1.units', type: 'mc-concept',
  title: 'Identify SI base unit',
  generate(rng) {
    const target = choice(rng, SI_BASE_UNITS);
    const distractors = shuffleInPlace(rng, SI_BASE_UNITS.filter((u) => u !== target))
      .slice(0, 3)
      .map((u) => `${u.unit} (${u.symbol})`);
    const { choices, answer } = buildChoices(rng, `${target.unit} (${target.symbol})`, distractors);
    return {
      type: 'mc-concept',
      prompt: `What is the SI base unit of ${target.quantity}?`,
      choices, answer,
      hints: [
        'This is asking about one of the seven SI base quantities, not a derived unit.',
        `Think about what you'd measure ${target.quantity} with directly, in the metric system.`,
        `The SI base unit of ${target.quantity} is the ${target.unit}.`,
      ],
      solution: {
        knowns: [`Quantity: ${target.quantity}`],
        unknown: 'SI base unit',
        principle: 'The SI system defines seven base quantities, each with one base unit.',
        substitution: `${target.quantity} → ${target.unit} (${target.symbol})`,
        algebra: '—',
        result: `${target.unit} (${target.symbol})`,
        interpretation: `All other units for ${target.quantity} (e.g. km, g, ms) are just scaled versions of this base unit.`,
      },
    };
  },
};

const unitsDerived = {
  id: 'ch1.units.derived', skillId: 'ch1.units', type: 'mc-concept',
  title: 'Identify derived SI unit',
  generate(rng) {
    const target = choice(rng, DERIVED_UNITS);
    const distractors = shuffleInPlace(rng, DERIVED_UNITS.filter((u) => u !== target))
      .slice(0, 3)
      .map((u) => u.unit);
    const { choices, answer } = buildChoices(rng, target.unit, distractors);
    return {
      type: 'mc-concept',
      prompt: `${target.quantity[0].toUpperCase()}${target.quantity.slice(1)} is defined as ${target.definition}. What is its SI unit?`,
      choices, answer,
      hints: [
        'A derived unit is built by combining base units according to the quantity\'s definition.',
        `Write out the definition (${target.definition}) using base-unit symbols, then simplify.`,
        `Substitute SI units for each piece of "${target.definition}" and simplify the combination.`,
      ],
      solution: {
        knowns: [`Definition: ${target.quantity} = ${target.definition}`],
        unknown: 'SI unit',
        principle: 'Derived units come from substituting base units into a quantity\'s defining formula.',
        substitution: `${target.definition} → ${target.unit}`,
        algebra: 'Simplify the combined base units.',
        result: target.unit,
        interpretation: `Any formula for ${target.quantity} must produce this combination of units, or something has gone wrong.`,
      },
    };
  },
};

const unitsDimensionalCheck = {
  id: 'ch1.units.dimensional-check', skillId: 'ch1.units', type: 'mc-concept',
  title: 'Dimensional consistency check',
  generate(rng, difficulty) {
    const target = choice(rng, DERIVED_UNITS);
    const correctUnit = target.unit.split(' ')[0];
    const wrongPool = ['m', 's', 'kg', 'm/s', 'm/s²', 'kg·m/s', 'kg/m³', 'N·m', 'N/m²', 'J/s', 'm²', 'm³']
      .filter((u) => u !== correctUnit);
    const distractors = shuffleInPlace(rng, wrongPool).slice(0, 3);
    const { choices, answer } = buildChoices(rng, correctUnit, distractors);
    return {
      type: 'mc-concept',
      prompt: `A student calculates ${target.quantity} (${target.definition}) and gets a numeric answer. Which unit MUST that answer carry to be dimensionally consistent?`,
      choices, answer,
      hints: [
        'Every valid physics equation must have matching units on both sides.',
        `Break "${target.definition}" into the units of each piece.`,
        'Combine (multiply/divide) the base units of each piece exactly as the definition combines the quantities.',
      ],
      solution: {
        knowns: [`${target.quantity} = ${target.definition}`],
        unknown: 'required unit',
        principle: 'Dimensional consistency: the units on both sides of an equation must match.',
        substitution: `Units of (${target.definition}) → ${correctUnit}`,
        algebra: 'Simplify the unit combination.',
        result: correctUnit,
        interpretation: 'If your answer doesn\'t carry this unit, you\'ve made an algebra or setup error — a fast way to catch mistakes.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch1.sci-notation — Scientific Notation
// ---------------------------------------------------------------------

function randomSciFactor(rng) {
  const coeff = randFloat(rng, 1.1, 9.8, 1);
  const exp = randInt(rng, -6, 8);
  return { coeff, exp, value: coeff * Math.pow(10, exp) };
}

const sciMultiplyDivide = {
  id: 'ch1.sci-notation.mult-div', skillId: 'ch1.sci-notation', type: 'numerical',
  title: 'Multiply/divide in scientific notation',
  generate(rng, difficulty) {
    const a = randomSciFactor(rng);
    const b = randomSciFactor(rng);
    const op = difficulty >= 3 ? choice(rng, ['×', '÷']) : '×';
    const result = op === '×' ? a.value * b.value : a.value / b.value;
    const rounded = roundToSigFigs(result, 2);
    return {
      type: 'numerical',
      prompt: `Compute (${a.coeff} × 10^${a.exp}) ${op} (${b.coeff} × 10^${b.exp}). Enter the result as a plain decimal number (2 sig figs).`,
      answer: rounded,
      tolerance: Math.max(Math.abs(rounded) * 0.03, 1e-9),
      hints: [
        'Handle the coefficients and the powers of ten separately.',
        op === '×'
          ? 'Multiply the coefficients together, and add the exponents.'
          : 'Divide the coefficients, and subtract the exponents.',
        `${a.coeff} ${op} ${b.coeff} = ${round2(op === '×' ? a.coeff * b.coeff : a.coeff / b.coeff)}, exponent: ${op === '×' ? a.exp : '(subtract)'} ${op === '×' ? '+' : ''} ${b.exp}`,
      ],
      solution: {
        knowns: [`a = ${a.coeff} × 10^${a.exp}`, `b = ${b.coeff} × 10^${b.exp}`],
        unknown: `a ${op} b`,
        principle: 'Scientific notation: combine coefficients directly; add exponents for ×, subtract for ÷.',
        substitution: `(${a.coeff} × 10^${a.exp}) ${op} (${b.coeff} × 10^${b.exp})`,
        algebra: op === '×'
          ? `= (${a.coeff} ${op} ${b.coeff}) × 10^(${a.exp}+${b.exp})`
          : `= (${a.coeff} ${op} ${b.coeff}) × 10^(${a.exp}-${b.exp})`,
        result: `${rounded}`,
        interpretation: 'Keeping coefficients and exponents separate avoids errors from typing huge/tiny numbers directly.',
      },
    };
  },
};

const sciConvertForm = {
  id: 'ch1.sci-notation.convert-form', skillId: 'ch1.sci-notation', type: 'mc-calc',
  title: 'Convert to scientific notation',
  generate(rng) {
    const coeff = randFloat(rng, 1.1, 9.8, 2);
    const exp = randInt(rng, -5, 6);
    const value = coeff * Math.pow(10, exp);
    const correct = `${coeff} × 10^${exp}`;
    const distractors = [
      `${coeff} × 10^${exp + 1}`,
      `${coeff} × 10^${exp - 1}`,
      `${roundToSigFigs(coeff * 10, 3)} × 10^${exp - 1}`,
    ];
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-calc',
      prompt: `Which of the following correctly expresses ${value.toPrecision(3)} in scientific notation?`,
      choices, answer,
      hints: [
        'Scientific notation needs exactly one nonzero digit before the decimal point.',
        'Count how many places you move the decimal point to get one digit before it — that\'s your exponent.',
        'Moving the decimal LEFT gives a positive exponent; moving it RIGHT gives a negative exponent.',
      ],
      solution: {
        knowns: [`value ≈ ${value.toPrecision(3)}`],
        unknown: 'scientific notation form',
        principle: 'a × 10^n, with 1 ≤ |a| < 10.',
        substitution: `${value.toPrecision(3)} → move decimal to after the first nonzero digit`,
        algebra: `coefficient = ${coeff}, exponent = ${exp}`,
        result: correct,
        interpretation: 'The exponent tracks how many factors of 10 you divided out to normalize the coefficient.',
      },
    };
  },
};

const sciOrderOfMagnitude = {
  id: 'ch1.sci-notation.order-of-magnitude', skillId: 'ch1.sci-notation', type: 'mc-concept',
  title: 'Order-of-magnitude estimate',
  generate(rng) {
    const exp = randInt(rng, -4, 7);
    // Keep the coefficient clearly away from the √10 ≈ 3.16 rounding
    // boundary so the "correct" choice is never ambiguous to a student
    // (or to this generator's own distractor-uniqueness check).
    const coeff = chance(rng, 0.5) ? randFloat(rng, 1.2, 2.8, 1) : randFloat(rng, 4.0, 9.5, 1);
    const value = coeff * Math.pow(10, exp);
    const roundedExp = coeff >= Math.sqrt(10) ? exp + 1 : exp;
    const correct = `10^${roundedExp}`;
    const distractors = [`10^${roundedExp + 1}`, `10^${roundedExp - 1}`, `10^${roundedExp + 2}`];
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: `Which power of ten is the best order-of-magnitude estimate for ${value.toExponential(2)}?`,
      choices, answer,
      hints: [
        'Order of magnitude rounds the whole number to the nearest power of ten — the coefficient still matters for which way it rounds.',
        'Write the number in scientific notation, coefficient × 10^n, then decide whether the coefficient is closer to 1 or to 10.',
        `Coefficient ${coeff} is ${coeff >= Math.sqrt(10) ? '≥' : '<'} √10 (≈3.16), so round the exponent ${coeff >= Math.sqrt(10) ? 'up' : 'to stay the same'}.`,
      ],
      solution: {
        knowns: [`value ≈ ${value.toExponential(2)}`],
        unknown: 'order of magnitude',
        principle: 'Order of magnitude = the power of 10 closest to the value; round the exponent up when the coefficient is ≥ √10.',
        substitution: `${coeff} × 10^${exp}`,
        algebra: coeff >= Math.sqrt(10) ? `coefficient (${coeff}) ≥ √10, so round exponent up to ${roundedExp}` : `coefficient (${coeff}) < √10, so exponent stays ${roundedExp}`,
        result: correct,
        interpretation: 'Order-of-magnitude estimates are a fast sanity check before doing exact arithmetic.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch1.sigfigs — Significant Figures
// ---------------------------------------------------------------------

function randomMeasurementString(rng, targetSigFigs) {
  // Builds a decimal string with an unambiguous, known sig-fig count.
  const useDecimal = chance(rng, 0.7) || targetSigFigs > 3;
  if (useDecimal) {
    const intDigits = randInt(rng, 0, 2);
    let digits = '';
    for (let i = 0; i < targetSigFigs; i++) digits += randInt(rng, i === 0 ? 1 : 0, 9);
    const pointPos = Math.min(intDigits + 1, digits.length - 1) || 1;
    // ensure at least one digit before and after the point when possible
    const before = digits.slice(0, Math.max(1, intDigits));
    const after = digits.slice(before.length) || '0';
    return `${before}.${after}`;
  }
  // integer with a trailing "." to make trailing zeros explicitly significant
  let digits = String(randInt(rng, 1, 9));
  for (let i = 1; i < targetSigFigs; i++) digits += randInt(rng, 0, 9);
  return `${digits}.`;
}

const sigCount = {
  id: 'ch1.sigfigs.count', skillId: 'ch1.sigfigs', type: 'mc-concept',
  title: 'Count significant figures',
  generate(rng) {
    const target = randInt(rng, 2, 5);
    const str = randomMeasurementString(rng, target);
    const display = str.endsWith('.') ? str.slice(0, -1) : str; // hide the "trick" trailing dot visually is fine—dot is a legitimate way to write it
    const actual = countSigFigs(str);
    const distractors = shuffleInPlace(rng, [actual - 1, actual + 1, actual + 2].filter((n) => n > 0 && n !== actual))
      .slice(0, 3);
    while (distractors.length < 3) distractors.push(actual + distractors.length + 2);
    const { choices, answer } = buildChoices(rng, String(actual), distractors.map(String));
    return {
      type: 'mc-concept',
      prompt: `How many significant figures does the measurement ${display} have?`,
      choices, answer,
      hints: [
        'Nonzero digits always count. The question is what to do with the zeros.',
        'Leading zeros never count; zeros between nonzero digits always count.',
        'Trailing zeros only count if the number has a decimal point.',
      ],
      solution: {
        knowns: [`measurement: ${display}`],
        unknown: 'number of significant figures',
        principle: 'Sig fig rules: nonzero digits count; leading zeros don\'t; captured trailing zeros (with a decimal point) do.',
        substitution: `Identify digits in ${display}`,
        algebra: 'Apply the leading/trailing zero rules.',
        result: String(actual),
        interpretation: 'Significant figures communicate how precisely a quantity was actually measured.',
      },
    };
  },
};

const sigRound = {
  id: 'ch1.sigfigs.round', skillId: 'ch1.sigfigs', type: 'numerical',
  title: 'Round to N significant figures',
  generate(rng, difficulty) {
    const value = randFloat(rng, 1, 9999, 4);
    const n = difficulty >= 3 ? randInt(rng, 2, 3) : randInt(rng, 3, 4);
    const answer = roundToSigFigs(value, n);
    return {
      type: 'numerical',
      prompt: `Round ${value} to ${n} significant figures.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 1e-6, 1e-9),
      hints: [
        `Find the first ${n} significant digits, starting from the first nonzero digit.`,
        'Look at the digit immediately after your cutoff to decide whether to round up.',
        `${value} → keep ${n} digits from the left, round based on the next digit.`,
      ],
      solution: {
        knowns: [`value = ${value}`, `n = ${n}`],
        unknown: `${value} rounded to ${n} sig figs`,
        principle: 'Round based on the first digit beyond the desired precision.',
        substitution: `${value} → identify digit ${n + 1}`,
        algebra: 'Round up if that digit is 5 or greater, otherwise truncate.',
        result: String(answer),
        interpretation: 'A rounded result should never claim more precision than the original measurement supports.',
      },
    };
  },
};

const sigArithmetic = {
  id: 'ch1.sigfigs.arithmetic', skillId: 'ch1.sigfigs', type: 'numerical',
  title: 'Sig figs in a calculation',
  generate(rng, difficulty) {
    const op = difficulty >= 3 ? choice(rng, ['×', '+']) : '×';
    const requestedSfA = randInt(rng, 2, 4);
    const requestedSfB = randInt(rng, 2, 4);
    // Keep the ORIGINAL strings for display/decimal-place counting — do not
    // round-trip through parseFloat/String, which silently drops trailing
    // zeros (e.g. "20.0" -> 20 -> "20") and would misreport precision.
    const rawA = randomMeasurementString(rng, requestedSfA);
    const rawB = randomMeasurementString(rng, requestedSfB);
    // Display the raw string AS-IS, trailing "." included when present: a
    // bare trailing decimal point (e.g. "50.") is the standard, unambiguous
    // way to show that trailing zeros are significant. Stripping it back to
    // "50" would silently reintroduce the exact ambiguity this archetype
    // needs to avoid (bare "50" conventionally reads as only 1 sig fig).
    const displayA = rawA;
    const displayB = rawB;
    const numA = parseFloat(rawA);
    const numB = parseFloat(rawB);
    // Recompute the TRUE sig-fig count from the generated string rather than
    // trusting the requested count — randomMeasurementString can pad an
    // extra trailing zero in some digit-count combinations, and the claimed
    // count must always match what's actually displayed.
    const sfA = countSigFigs(rawA);
    const sfB = countSigFigs(rawB);
    let exact, answer, ruleText;
    if (op === '×') {
      exact = numA * numB;
      const n = Math.min(sfA, sfB);
      answer = roundToSigFigs(exact, n);
      ruleText = `result keeps the smaller sig-fig count of the two factors (${n})`;
    } else {
      exact = numA + numB;
      const dpA = decimalPlacesOf(rawA);
      const dpB = decimalPlacesOf(rawB);
      const dp = Math.min(dpA, dpB);
      answer = roundToDecimalPlaces(exact, dp);
      ruleText = `result keeps the smaller number of decimal places of the two terms (${dp})`;
    }
    return {
      type: 'numerical',
      prompt: `A measurement of ${displayA} is ${op === '×' ? 'multiplied by' : 'added to'} a measurement of ${displayB}. Report the result with the correct number of significant figures.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 1e-6, 1e-9),
      hints: [
        op === '×'
          ? 'For multiplication/division, the sig-fig rule is about the COUNT of sig figs, not decimal places.'
          : 'For addition/subtraction, the rule is about decimal PLACES, not sig-fig count.',
        `Compute the exact result first, then apply the rule: ${ruleText}.`,
        `Exact result ≈ ${round2(exact)}. Now round using: ${ruleText}.`,
      ],
      solution: {
        knowns: [`a = ${displayA} (${op === '×' ? `${sfA} sig figs` : `${decimalPlacesOf(rawA)} decimal places`})`, `b = ${displayB} (${op === '×' ? `${sfB} sig figs` : `${decimalPlacesOf(rawB)} decimal places`})`],
        unknown: 'correctly-rounded result',
        principle: op === '×' ? 'Multiplication/division: keep the fewest sig figs of any factor.' : 'Addition/subtraction: keep the fewest decimal places of any term.',
        substitution: `${displayA} ${op} ${displayB} = ${round2(exact)}`,
        algebra: ruleText,
        result: String(answer),
        interpretation: 'A calculated result can\'t be more precise than its least-precise input.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch1.unit-conversion — Unit Conversions
// ---------------------------------------------------------------------

const LENGTH_FACTORS = { km: 1000, m: 1, cm: 0.01, mm: 0.001, mi: 1609.34, ft: 0.3048, in: 0.0254 };
const TIME_FACTORS = { h: 3600, min: 60, s: 1 };
const MASS_FACTORS = { kg: 1, g: 0.001, mg: 1e-6 };

function pickTwoUnits(rng, table) {
  const keys = Object.keys(table);
  const a = choice(rng, keys);
  let b = choice(rng, keys);
  while (b === a) b = choice(rng, keys);
  return [a, b];
}

const convSingleStep = {
  id: 'ch1.unit-conversion.single-step', skillId: 'ch1.unit-conversion', type: 'numerical',
  title: 'Single-step unit conversion',
  generate(rng) {
    const tableChoice = choice(rng, ['length', 'time', 'mass']);
    const table = tableChoice === 'length' ? LENGTH_FACTORS : tableChoice === 'time' ? TIME_FACTORS : MASS_FACTORS;
    const [from, to] = pickTwoUnits(rng, table);
    const value = randFloat(rng, 1.5, 250, 2);
    const meters = value * table[from];
    const answer = roundToSigFigs(meters / table[to], 3);
    const noun = tableChoice === 'length' ? subject(rng, 'distanceThing') : tableChoice === 'mass' ? subject(rng, 'massThing') : subject(rng, 'vehicle');
    const verb = tableChoice === 'time' ? `takes ${value} ${from} to complete a task` : `measures ${value} ${from}`;
    return {
      type: 'numerical',
      prompt: `${noun[0].toUpperCase()}${noun.slice(1)} ${verb}. Convert this to ${to}.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.01, 1e-6),
      unit: to,
      hints: [
        `You need a conversion factor between ${from} and ${to}.`,
        `1 ${from} = ${table[from] / table[to]} ${to}.`,
        `Multiply: ${value} ${from} × (${(table[from] / table[to]).toPrecision(4)} ${to}/${from}).`,
      ],
      solution: {
        knowns: [`${value} ${from}`, `1 ${from} = ${table[from] / table[to]} ${to}`],
        unknown: `value in ${to}`,
        principle: 'Multiply by a conversion factor equal to 1 (same quantity, different units).',
        substitution: `${value} ${from} × (${table[from]} m / 1 ${from}) ÷ (${table[to]} m / 1 ${to})`,
        algebra: `= ${value} × ${(table[from] / table[to]).toPrecision(4)}`,
        result: `${answer} ${to}`,
        interpretation: 'The conversion factor is just "1", written in different units, so multiplying by it never changes the physical quantity.',
      },
    };
  },
};

const convChained = {
  id: 'ch1.unit-conversion.chained', skillId: 'ch1.unit-conversion', type: 'numerical',
  title: 'Multi-step (chained) conversion',
  generate(rng) {
    const speedUnits = ['km/h', 'mi/h', 'm/s'];
    const from = choice(rng, speedUnits);
    let to = choice(rng, speedUnits);
    while (to === from) to = choice(rng, speedUnits);
    const value = randFloat(rng, 8, 130, 1);
    const toMps = (v, u) => (u === 'km/h' ? v / 3.6 : u === 'mi/h' ? v * 0.44704 : v);
    const fromMps = (v, u) => (u === 'km/h' ? v * 3.6 : u === 'mi/h' ? v / 0.44704 : v);
    const mps = toMps(value, from);
    const answer = roundToSigFigs(fromMps(mps, to), 3);
    const vehicle = subject(rng, 'vehicle');
    return {
      type: 'numerical',
      prompt: `${vehicle[0].toUpperCase()}${vehicle.slice(1)} travels at ${value} ${from}. What is this speed in ${to}? (This takes more than one conversion factor.)`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.015, 1e-6),
      unit: to,
      hints: [
        'Speed conversions usually require converting both the distance unit AND the time unit.',
        'It can help to convert through m/s as an intermediate step.',
        `${value} ${from} → m/s → ${to}. Do it in two multiplications rather than one.`,
      ],
      solution: {
        knowns: [`${value} ${from}`],
        unknown: `speed in ${to}`,
        principle: 'Chain multiple conversion factors, canceling units at each step.',
        substitution: `${value} ${from} → ${mps.toPrecision(4)} m/s → ${to}`,
        algebra: `${mps.toPrecision(4)} m/s × (conversion to ${to})`,
        result: `${answer} ${to}`,
        interpretation: 'Converting through a common intermediate unit (like m/s) avoids memorizing every possible direct factor.',
      },
    };
  },
};

const convAreaVolume = {
  id: 'ch1.unit-conversion.area-volume', skillId: 'ch1.unit-conversion', type: 'numerical',
  title: 'Area/volume conversion (squaring/cubing factors)',
  generate(rng) {
    const isArea = chance(rng, 0.5);
    const [from, to] = pickTwoUnits(rng, LENGTH_FACTORS);
    const value = randFloat(rng, 2, 60, 1);
    const linearFactor = LENGTH_FACTORS[from] / LENGTH_FACTORS[to];
    const power = isArea ? 2 : 3;
    const answer = roundToSigFigs(value * Math.pow(linearFactor, power), 3);
    const unitLabel = (u) => (isArea ? `${u}²` : `${u}³`);
    return {
      type: 'numerical',
      prompt: `A ${isArea ? 'rectangular enclosure has an area' : 'storage tank has a volume'} of ${value} ${unitLabel(from)}. Convert this to ${unitLabel(to)}.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 1e-6),
      unit: unitLabel(to),
      hints: [
        `This is ${isArea ? 'an area (length²)' : 'a volume (length³)'}, so the conversion factor must be applied ${power} times.`,
        `1 ${from} = ${linearFactor} ${to}, so 1 ${unitLabel(from)} = (${linearFactor})^${power} ${unitLabel(to)}.`,
        `Multiply ${value} by (${linearFactor})^${power} ≈ ${roundToSigFigs(Math.pow(linearFactor, power), 4)}.`,
      ],
      solution: {
        knowns: [`${value} ${unitLabel(from)}`, `1 ${from} = ${linearFactor} ${to}`],
        unknown: `value in ${unitLabel(to)}`,
        principle: `${isArea ? 'Area' : 'Volume'} scales with the linear conversion factor raised to the ${power}${power === 2 ? 'nd' : 'rd'} power.`,
        substitution: `${value} ${unitLabel(from)} × (${linearFactor} ${to}/${from})^${power}`,
        algebra: `= ${value} × ${roundToSigFigs(Math.pow(linearFactor, power), 4)}`,
        result: `${answer} ${unitLabel(to)}`,
        interpretation: 'A very common mistake is applying the linear factor only once instead of squaring/cubing it — always check the units carefully.',
      },
    };
  },
};

const convChooseFactorFirst = {
  id: 'ch1.unit-conversion.choose-factor', skillId: 'ch1.unit-conversion', type: 'mc-concept',
  title: 'Choose the correct conversion setup',
  generate(rng) {
    const [from, to] = pickTwoUnits(rng, LENGTH_FACTORS);
    const factor = LENGTH_FACTORS[from] / LENGTH_FACTORS[to];
    const correct = `× (${factor} ${to} / 1 ${from})`;
    const distractors = [
      `× (1 ${from} / ${factor} ${to})`,
      `× (${factor} ${from} / 1 ${to})`,
      `÷ (${factor} ${to} / 1 ${from})`,
    ];
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: `You need to convert a measurement from ${from} to ${to}. Which conversion factor setup correctly cancels the ${from} unit?`,
      choices, answer,
      hints: [
        'Write the conversion factor as a fraction equal to 1.',
        `The unit you want to CANCEL (${from}) must appear in the denominator.`,
        `Since 1 ${from} = ${factor} ${to}, put ${to} on top and ${from} on the bottom.`,
      ],
      solution: {
        knowns: [`1 ${from} = ${factor} ${to}`],
        unknown: 'correct conversion factor orientation',
        principle: 'Multiplying by a conversion factor (=1) should cancel the starting unit, leaving the target unit.',
        substitution: `starting unit ${from} must cancel → goes in the denominator`,
        algebra: `× (${factor} ${to} / 1 ${from})`,
        result: correct,
        interpretation: 'Setting up the factor upside-down is the single most common unit-conversion mistake — always check that units cancel.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch1.trig — Right-Triangle Trigonometry
// ---------------------------------------------------------------------

const trigFindSide = {
  id: 'ch1.trig.find-side', skillId: 'ch1.trig', type: 'numerical',
  title: 'Find a missing side',
  generate(rng, difficulty) {
    const angle = randInt(rng, 20, 70);
    const hyp = randFloat(rng, 5, 40, 1);
    const opp = hyp * Math.sin(toRad(angle));
    const adj = hyp * Math.cos(toRad(angle));
    const askFor = difficulty >= 3 ? choice(rng, ['opposite', 'adjacent']) : choice(rng, ['opposite', 'adjacent']);
    const answer = roundToSigFigs(askFor === 'opposite' ? opp : adj, 3);
    const ramp = subject(rng, 'ramp');
    const fn = askFor === 'opposite' ? 'sin' : 'cos';
    return {
      type: 'numerical',
      prompt: `${ramp[0].toUpperCase()}${ramp.slice(1)} rises at an angle of ${angle}° from the ground and is ${hyp} m long (measured along the slope). Find the ${askFor === 'opposite' ? 'height' : 'horizontal length'} of the ramp.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 1e-6),
      unit: 'm',
      diagram: { type: 'right-triangle', angleDeg: angle, hyp, highlight: askFor },
      hints: [
        `You have the hypotenuse and an angle — decide which trig ratio relates the ${askFor} side to the hypotenuse.`,
        `${askFor === 'opposite' ? 'Opposite/hypotenuse = sin(θ)' : 'Adjacent/hypotenuse = cos(θ)'}.`,
        `${askFor} = ${hyp} × ${fn}(${angle}°)`,
      ],
      solution: {
        knowns: [`hypotenuse = ${hyp} m`, `θ = ${angle}°`],
        unknown: `${askFor} side`,
        principle: `${fn}(θ) = ${askFor}/hypotenuse`,
        substitution: `${askFor} = ${hyp} × ${fn}(${angle}°)`,
        algebra: `= ${hyp} × ${round2(askFor === 'opposite' ? Math.sin(toRad(angle)) : Math.cos(toRad(angle)))}`,
        result: `${answer} m`,
        interpretation: 'Always identify which side is opposite vs. adjacent to the GIVEN angle before picking a ratio.',
      },
    };
  },
};

const trigFindAngle = {
  id: 'ch1.trig.find-angle', skillId: 'ch1.trig', type: 'numerical',
  title: 'Find a missing angle',
  generate(rng) {
    const opp = randFloat(rng, 3, 30, 1);
    const adj = randFloat(rng, 3, 30, 1);
    const angle = toDeg(Math.atan(opp / adj));
    const answer = roundToSigFigs(angle, 3);
    const ramp = subject(rng, 'ramp');
    return {
      type: 'numerical',
      prompt: `${ramp[0].toUpperCase()}${ramp.slice(1)} rises ${opp} m over a horizontal run of ${adj} m. Find the incline angle from the horizontal, in degrees.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 0.05),
      unit: '°',
      diagram: { type: 'right-triangle', opp, adj, highlight: 'angle' },
      hints: [
        'You have the two legs (opposite and adjacent) — that points to the tangent ratio.',
        'tan(θ) = opposite/adjacent',
        `θ = tan⁻¹(${opp}/${adj})`,
      ],
      solution: {
        knowns: [`opposite = ${opp} m`, `adjacent = ${adj} m`],
        unknown: 'angle θ',
        principle: 'tan(θ) = opposite/adjacent, so θ = tan⁻¹(opposite/adjacent)',
        substitution: `θ = tan⁻¹(${opp}/${adj})`,
        algebra: `= tan⁻¹(${round2(opp / adj)})`,
        result: `${answer}°`,
        interpretation: 'Inverse trig functions "undo" sin/cos/tan to recover an angle from a ratio of sides.',
      },
    };
  },
};

const trigPythagorean = {
  id: 'ch1.trig.pythagorean', skillId: 'ch1.trig', type: 'numerical',
  title: 'Pythagorean theorem',
  generate(rng) {
    const a = randFloat(rng, 3, 25, 1);
    const b = randFloat(rng, 3, 25, 1);
    const findHyp = chance(rng, 0.6);
    let answer, prompt, given;
    if (findHyp) {
      answer = roundToSigFigs(Math.sqrt(a * a + b * b), 3);
      prompt = `A right triangle has legs of ${a} m and ${b} m. Find the length of the hypotenuse.`;
      given = [`leg 1 = ${a} m`, `leg 2 = ${b} m`];
    } else {
      const hyp = Math.sqrt(a * a + b * b) * 1.15; // ensure hyp > a so the other leg is real
      answer = roundToSigFigs(Math.sqrt(hyp * hyp - a * a), 3);
      prompt = `A right triangle has one leg of ${a} m and a hypotenuse of ${roundToSigFigs(hyp, 3)} m. Find the length of the other leg.`;
      given = [`leg = ${a} m`, `hypotenuse = ${roundToSigFigs(hyp, 3)} m`];
    }
    return {
      type: 'numerical',
      prompt,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 1e-6),
      unit: 'm',
      hints: [
        'The Pythagorean theorem relates the two legs and the hypotenuse of a right triangle.',
        'a² + b² = c², where c is the hypotenuse.',
        findHyp ? `c = √(${a}² + ${b}²)` : 'Solve for the missing leg by isolating it before taking the square root.',
      ],
      solution: {
        knowns: given,
        unknown: findHyp ? 'hypotenuse' : 'other leg',
        principle: 'a² + b² = c²',
        substitution: findHyp ? `c = √(${a}² + ${b}²)` : `leg = √(c² - ${a}²)`,
        algebra: 'Square, add or subtract, then take the square root.',
        result: `${answer} m`,
        interpretation: 'This only applies to RIGHT triangles — always confirm the right angle first.',
      },
    };
  },
};

const trigConceptual = {
  id: 'ch1.trig.conceptual', skillId: 'ch1.trig', type: 'mc-concept',
  title: 'Trig ratio identification',
  generate(rng) {
    const ratios = [
      { name: 'sine', def: 'opposite / hypotenuse' },
      { name: 'cosine', def: 'adjacent / hypotenuse' },
      { name: 'tangent', def: 'opposite / adjacent' },
    ];
    const target = choice(rng, ratios);
    const distractors = ratios.filter((r) => r !== target).map((r) => r.def);
    distractors.push('adjacent / opposite');
    const { choices, answer } = buildChoices(rng, target.def, shuffleInPlace(rng, distractors).slice(0, 3));
    return {
      type: 'mc-concept',
      prompt: `In a right triangle, which ratio defines the ${target.name} of an angle?`,
      choices, answer,
      hints: [
        'Remember SOH-CAH-TOA.',
        `${target.name[0].toUpperCase()} stands for one specific pair of sides.`,
        `${target.name} = ${target.def}`,
      ],
      solution: {
        knowns: [`ratio requested: ${target.name}`],
        unknown: 'defining ratio',
        principle: 'SOH-CAH-TOA: Sine=Opp/Hyp, Cosine=Adj/Hyp, Tangent=Opp/Adj',
        substitution: '—',
        algebra: '—',
        result: `${target.name} = ${target.def}`,
        interpretation: 'These three ratios are the foundation for resolving vectors into components later in this chapter.',
      },
    };
  },
};

const trigEquationSelect = {
  id: 'ch1.trig.equation-select', skillId: 'ch1.trig', type: 'equation-select',
  title: 'Choose the right trig equation',
  generate(rng) {
    const angle = randInt(rng, 20, 70);
    const known = choice(rng, ['hyp-to-opp', 'hyp-to-adj', 'legs-to-angle']);
    let prompt, correct, distractors;
    if (known === 'hyp-to-opp') {
      prompt = `A ramp of length L (hypotenuse) rises at angle θ. Which equation gives the ramp's height h?`;
      correct = 'h = L·sin(θ)';
      distractors = ['h = L·cos(θ)', 'h = L·tan(θ)', 'h = L/sin(θ)'];
    } else if (known === 'hyp-to-adj') {
      prompt = `A ramp of length L (hypotenuse) rises at angle θ. Which equation gives the horizontal distance d it covers?`;
      correct = 'd = L·cos(θ)';
      distractors = ['d = L·sin(θ)', 'd = L·tan(θ)', 'd = L/cos(θ)'];
    } else {
      prompt = `A ramp has height h and horizontal length d. Which equation gives the incline angle θ?`;
      correct = 'θ = tan⁻¹(h/d)';
      distractors = ['θ = tan⁻¹(d/h)', 'θ = sin⁻¹(d/h)', 'θ = cos⁻¹(h/d)'];
    }
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'equation-select',
      prompt,
      choices, answer,
      hints: [
        'Identify which two sides (or side + angle) you know, and which one you need.',
        'Match that pairing to SOH-CAH-TOA.',
        `The correct relationship here is ${correct}.`,
      ],
      solution: {
        knowns: ['see diagram/description'],
        unknown: 'correct equation',
        principle: 'SOH-CAH-TOA determines which ratio connects the known and unknown sides.',
        substitution: '—',
        algebra: '—',
        result: correct,
        interpretation: 'Selecting the right equation before touching a calculator prevents most trig mistakes.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch1.vector-basics — Scalars, Vectors & Direction
// ---------------------------------------------------------------------

const SCALARS = ['mass', 'time', 'temperature', 'distance', 'speed', 'energy', 'volume', 'density'];
const VECTORS = ['displacement', 'velocity', 'acceleration', 'force', 'momentum', 'weight'];

const vecScalarVsVector = {
  id: 'ch1.vector-basics.scalar-vs-vector', skillId: 'ch1.vector-basics', type: 'mc-concept',
  title: 'Scalar vs. vector identification',
  generate(rng) {
    const askVector = chance(rng, 0.5);
    const correct = askVector ? choice(rng, VECTORS) : choice(rng, SCALARS);
    const distractors = shuffleInPlace(rng, askVector ? SCALARS.slice() : VECTORS.slice()).slice(0, 3);
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: `Which of the following is a ${askVector ? 'vector' : 'scalar'} quantity?`,
      choices, answer,
      hints: [
        'A vector has both magnitude AND direction; a scalar has only magnitude.',
        'Ask yourself: does "direction" even make sense for this quantity?',
        `${correct} ${askVector ? 'has a direction associated with it' : 'is fully described by a single number and unit — no direction needed'}.`,
      ],
      solution: {
        knowns: [`candidate: ${correct}`],
        unknown: `is it a ${askVector ? 'vector' : 'scalar'}?`,
        principle: 'Vectors require direction; scalars do not.',
        substitution: '—',
        algebra: '—',
        result: `${correct} is a ${askVector ? 'vector' : 'scalar'}.`,
        interpretation: 'Mixing up scalars and vectors (e.g. distance vs. displacement) is one of the most common early-physics errors.',
      },
    };
  },
};

const vecResultantRange = {
  id: 'ch1.vector-basics.resultant-range', skillId: 'ch1.vector-basics', type: 'mc-concept',
  title: 'Possible range of a resultant',
  generate(rng) {
    const a = randInt(rng, 3, 12);
    const b = randInt(rng, 2, a - 1);
    const min = a - b, max = a + b;
    const correct = `${min} N or less, or ${max} N or more`;
    // Build a plausible in-range distractor and clearly out-of-range ones.
    const inRange = randInt(rng, min, max);
    const distractors = shuffleInPlace(rng, [
      `exactly ${inRange} N`,
      `${max + randInt(rng, 1, 4)} N`,
      `${Math.max(0, min - randInt(rng, 1, 3))} N`,
    ]);
    // The question asks which is IMPOSSIBLE, so the "answer" choice should be an out-of-range value.
    const impossible = max + randInt(rng, 1, 4);
    const plausibleChoices = shuffleInPlace(rng, [inRange, min, max, impossible]);
    const { choices, answer } = buildChoices(rng, `${impossible} N`, [`${inRange} N`, `${min} N`, `${max} N`]);
    return {
      type: 'mc-concept',
      prompt: `Two forces of ${a} N and ${b} N act on an object. Which of the following CANNOT be the magnitude of their resultant?`,
      choices, answer,
      hints: [
        'The resultant magnitude depends on the angle between the two vectors.',
        `The resultant ranges from |${a}-${b}| (vectors opposite) to ${a}+${b} (vectors aligned).`,
        `Any value outside [${min}, ${max}] N is impossible.`,
      ],
      solution: {
        knowns: [`|A| = ${a} N`, `|B| = ${b} N`],
        unknown: 'impossible resultant magnitude',
        principle: 'The resultant of two vectors ranges from |A−B| to A+B depending on their relative angle.',
        substitution: `range = [${a}-${b}, ${a}+${b}] = [${min}, ${max}]`,
        algebra: '—',
        result: `${impossible} N is outside [${min}, ${max}] N, so it\'s impossible.`,
        interpretation: 'This range check is a fast way to sanity-check a vector-addition answer.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch1.vector-components — Resolving Vectors into Components
// ---------------------------------------------------------------------

const vecFindComponent = {
  id: 'ch1.vector-components.find-component', skillId: 'ch1.vector-components', type: 'vector',
  title: 'Find a vector component',
  generate(rng, difficulty) {
    const mag = randFloat(rng, 8, 60, 1);
    const angle = randInt(rng, 15, 75);
    const askX = chance(rng, 0.5);
    const answer = roundToSigFigs(askX ? mag * Math.cos(toRad(angle)) : mag * Math.sin(toRad(angle)), 3);
    const isSafari = chance(rng, 0.5);
    const label = isSafari ? "the ranger truck's velocity" : "an object's velocity";
    return {
      type: 'vector',
      prompt: `${isSafari ? 'A ranger truck moves' : 'An object moves'} with a velocity of ${mag} m/s directed ${angle}° above the horizontal (+x) axis. Find the ${askX ? 'x-component' : 'y-component'} of the velocity.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 1e-6),
      unit: 'm/s',
      diagram: { type: 'vector-arrow', magnitude: mag, angleDeg: angle, label: 'v' },
      hints: [
        `Resolving a vector into components uses the angle it makes with the x-axis.`,
        `x-component uses cosine; y-component uses sine.`,
        `${askX ? 'Vx' : 'Vy'} = ${mag} × ${askX ? 'cos' : 'sin'}(${angle}°)`,
      ],
      solution: {
        knowns: [`magnitude = ${mag} m/s`, `θ = ${angle}° from +x axis`],
        unknown: `${askX ? 'x' : 'y'}-component`,
        principle: askX ? 'Vx = V·cos(θ)' : 'Vy = V·sin(θ)',
        substitution: `${askX ? 'Vx' : 'Vy'} = ${mag} × ${askX ? 'cos' : 'sin'}(${angle}°)`,
        algebra: `= ${mag} × ${round2(askX ? Math.cos(toRad(angle)) : Math.sin(toRad(angle)))}`,
        result: `${answer} m/s`,
        interpretation: `The ${askX ? 'x' : 'y'}-component tells you how much of ${label} points along that axis alone.`,
      },
    };
  },
};

const vecFromComponents = {
  id: 'ch1.vector-components.magnitude-from-components', skillId: 'ch1.vector-components', type: 'vector',
  title: 'Find magnitude/angle from components',
  generate(rng) {
    const vx = randFloat(rng, 4, 40, 1);
    const vy = randFloat(rng, 4, 40, 1);
    const askMag = chance(rng, 0.5);
    const answer = askMag ? roundToSigFigs(Math.sqrt(vx * vx + vy * vy), 3) : roundToSigFigs(toDeg(Math.atan(vy / vx)), 3);
    return {
      type: 'vector',
      prompt: `A vector has an x-component of ${vx} and a y-component of ${vy} (both in m/s). Find the vector's ${askMag ? 'magnitude' : 'direction angle above the x-axis'}.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 0.05),
      unit: askMag ? 'm/s' : '°',
      diagram: { type: 'vector-components', vx, vy },
      hints: [
        'Think of the components as the two legs of a right triangle, with the vector as the hypotenuse.',
        askMag ? 'Use the Pythagorean theorem on the components.' : 'Use the inverse tangent of Vy/Vx.',
        askMag ? `magnitude = √(${vx}² + ${vy}²)` : `θ = tan⁻¹(${vy}/${vx})`,
      ],
      solution: {
        knowns: [`Vx = ${vx} m/s`, `Vy = ${vy} m/s`],
        unknown: askMag ? 'magnitude' : 'angle',
        principle: askMag ? 'V = √(Vx² + Vy²)' : 'θ = tan⁻¹(Vy / Vx)',
        substitution: askMag ? `V = √(${vx}² + ${vy}²)` : `θ = tan⁻¹(${vy}/${vx})`,
        algebra: askMag ? `= √(${round2(vx * vx)} + ${round2(vy * vy)})` : `= tan⁻¹(${round2(vy / vx)})`,
        result: `${answer} ${askMag ? 'm/s' : '°'}`,
        interpretation: 'Components and magnitude/angle are two equivalent descriptions of the same vector.',
      },
    };
  },
};

const vecComponentSigns = {
  id: 'ch1.vector-components.signs', skillId: 'ch1.vector-components', type: 'mc-concept',
  title: 'Signs of components by quadrant',
  generate(rng) {
    const quadrants = [
      { desc: 'up and to the right', signs: '(+x, +y)' },
      { desc: 'up and to the left', signs: '(−x, +y)' },
      { desc: 'down and to the left', signs: '(−x, −y)' },
      { desc: 'down and to the right', signs: '(+x, −y)' },
    ];
    const target = choice(rng, quadrants);
    const distractors = quadrants.filter((q) => q !== target).map((q) => q.signs);
    const { choices, answer } = buildChoices(rng, target.signs, distractors);
    return {
      type: 'mc-concept',
      prompt: `A vector points ${target.desc} (using standard x-y axes). What are the signs of its x- and y-components?`,
      choices, answer,
      hints: [
        'Sketch standard x-y axes and picture which quadrant the vector points into.',
        'Right = +x, up = +y (and vice versa).',
        `Pointing "${target.desc}" places it with signs ${target.signs}.`,
      ],
      solution: {
        knowns: [`direction: ${target.desc}`],
        unknown: 'signs of (Vx, Vy)',
        principle: 'Component signs follow the standard quadrant convention on x-y axes.',
        substitution: '—',
        algebra: '—',
        result: target.signs,
        interpretation: 'Checking component signs is a quick way to catch a calculator angle-mode or setup error.',
      },
    };
  },
};

const vecComponentEquationSelect = {
  id: 'ch1.vector-components.equation-select', skillId: 'ch1.vector-components', type: 'equation-select',
  title: 'Choose the component equation',
  generate(rng) {
    const askX = chance(rng, 0.5);
    const correct = askX ? 'Vx = V·cos(θ)' : 'Vy = V·sin(θ)';
    const distractors = ['Vx = V·sin(θ)', 'Vy = V·cos(θ)', 'V = Vx·Vy'].filter((c) => c !== correct);
    const { choices, answer } = buildChoices(rng, correct, shuffleInPlace(rng, distractors).slice(0, 3));
    return {
      type: 'equation-select',
      prompt: `A vector has magnitude V and makes angle θ with the +x axis. Which equation gives its ${askX ? 'x' : 'y'}-component?`,
      choices, answer,
      hints: [
        'The x-component is always the "adjacent" side relative to θ measured from the x-axis; the y-component is the "opposite" side.',
        'SOH-CAH-TOA still applies here.',
        `${askX ? 'x uses cosine' : 'y uses sine'}.`,
      ],
      solution: {
        knowns: ['θ measured from +x axis'],
        unknown: 'component equation',
        principle: 'Vx = V·cos(θ), Vy = V·sin(θ) when θ is measured from the +x axis.',
        substitution: '—',
        algebra: '—',
        result: correct,
        interpretation: 'If θ were measured from the y-axis instead, sine and cosine would swap — always check which axis the angle is measured from.',
      },
    };
  },
};

// ---------------------------------------------------------------------
// ch1.vector-addition — Vector Addition & Subtraction
// ---------------------------------------------------------------------

const vecAdditionMagnitude = {
  id: 'ch1.vector-addition.magnitude', skillId: 'ch1.vector-addition', type: 'vector',
  title: 'Resultant magnitude via components',
  generate(rng) {
    const m1 = randFloat(rng, 5, 30, 1), a1 = randInt(rng, 0, 80);
    const m2 = randFloat(rng, 5, 30, 1), a2 = randInt(rng, 90, 170);
    const x1 = m1 * Math.cos(toRad(a1)), y1 = m1 * Math.sin(toRad(a1));
    const x2 = m2 * Math.cos(toRad(a2)), y2 = m2 * Math.sin(toRad(a2));
    const rx = x1 + x2, ry = y1 + y2;
    const answer = roundToSigFigs(Math.sqrt(rx * rx + ry * ry), 3);
    return {
      type: 'vector',
      prompt: `Vector A has magnitude ${m1} N at ${a1}° from +x, and vector B has magnitude ${m2} N at ${a2}° from +x. Find the magnitude of the resultant A + B.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 1e-6),
      unit: 'N',
      diagram: { type: 'vector-sum', a: { magnitude: m1, angleDeg: a1 }, b: { magnitude: m2, angleDeg: a2 } },
      hints: [
        'Break each vector into x- and y-components first — you can\'t add magnitudes directly unless the vectors are parallel.',
        'Add the x-components together, and separately add the y-components together.',
        `Rx = ${round2(x1)} + ${round2(x2)} = ${round2(rx)}; Ry = ${round2(y1)} + ${round2(y2)} = ${round2(ry)}. Then |R| = √(Rx²+Ry²).`,
      ],
      solution: {
        knowns: [`A = ${m1} N @ ${a1}°`, `B = ${m2} N @ ${a2}°`],
        unknown: '|A + B|',
        principle: 'Add vectors by components: Rx = Ax+Bx, Ry = Ay+By, then |R| = √(Rx²+Ry²).',
        substitution: `Ax=${round2(x1)}, Ay=${round2(y1)}, Bx=${round2(x2)}, By=${round2(y2)}`,
        algebra: `Rx=${round2(rx)}, Ry=${round2(ry)}, |R|=√(${round2(rx)}²+${round2(ry)}²)`,
        result: `${answer} N`,
        interpretation: 'The component method works for ANY angle between vectors, unlike simply adding magnitudes.',
      },
    };
  },
};

const vecAdditionDirection = {
  id: 'ch1.vector-addition.direction', skillId: 'ch1.vector-addition', type: 'vector',
  title: 'Resultant direction via components',
  generate(rng) {
    const m1 = randFloat(rng, 5, 30, 1), a1 = randInt(rng, 0, 80);
    const m2 = randFloat(rng, 5, 30, 1), a2 = randInt(rng, 90, 170);
    const x1 = m1 * Math.cos(toRad(a1)), y1 = m1 * Math.sin(toRad(a1));
    const x2 = m2 * Math.cos(toRad(a2)), y2 = m2 * Math.sin(toRad(a2));
    const rx = x1 + x2, ry = y1 + y2;
    const answer = roundToSigFigs(toDeg(Math.atan2(ry, rx)), 3);
    return {
      type: 'vector',
      prompt: `Vector A has magnitude ${m1} N at ${a1}° from +x, and vector B has magnitude ${m2} N at ${a2}° from +x. Find the direction of the resultant A + B, measured in degrees from the +x axis.`,
      answer,
      tolerance: Math.max(Math.abs(answer) * 0.02, 0.5),
      unit: '°',
      diagram: { type: 'vector-sum', a: { magnitude: m1, angleDeg: a1 }, b: { magnitude: m2, angleDeg: a2 } },
      hints: [
        'First find the resultant\'s x- and y-components by adding the components of A and B.',
        'The direction angle comes from the inverse tangent of Ry/Rx.',
        `Rx = ${round2(rx)}, Ry = ${round2(ry)}; θ = tan⁻¹(Ry/Rx), adjusted for the correct quadrant.`,
      ],
      solution: {
        knowns: [`A = ${m1} N @ ${a1}°`, `B = ${m2} N @ ${a2}°`],
        unknown: 'direction of A + B',
        principle: 'θ = atan2(Ry, Rx) — the two-argument arctangent handles all quadrants correctly.',
        substitution: `Rx=${round2(rx)}, Ry=${round2(ry)}`,
        algebra: `θ = atan2(${round2(ry)}, ${round2(rx)})`,
        result: `${answer}°`,
        interpretation: 'A plain tan⁻¹ can put you in the wrong quadrant — always check the signs of Rx and Ry.',
      },
    };
  },
};

const vecOppositeSum = {
  id: 'ch1.vector-addition.opposite-sum', skillId: 'ch1.vector-addition', type: 'mc-concept',
  title: 'Sum of opposite vectors',
  generate(rng) {
    const mag = randInt(rng, 4, 20);
    const correct = 'zero vector (magnitude 0)';
    const distractors = [`${mag * 2} N`, `${mag} N`, `a vector with magnitude ${mag}, but undefined direction`];
    const { choices, answer } = buildChoices(rng, correct, distractors);
    return {
      type: 'mc-concept',
      prompt: `Two forces, each of magnitude ${mag} N, point in exactly opposite directions. What is their vector sum?`,
      choices, answer,
      hints: [
        'Consider what happens to the x- and y-components when two vectors point in exactly opposite directions.',
        'Opposite vectors have components that are exact negatives of each other.',
        'Adding a value to its negative always gives zero.',
      ],
      solution: {
        knowns: [`|A| = |B| = ${mag} N, opposite directions`],
        unknown: 'A + B',
        principle: 'If B = −A, then A + B = A − A = 0.',
        substitution: `${mag} N + (−${mag} N)`,
        algebra: '= 0',
        result: correct,
        interpretation: 'This is why an object in equilibrium can have several forces acting on it that sum to zero.',
      },
    };
  },
};

export const CH1_ARCHETYPES = [
  unitsIdentifyBase, unitsDerived, unitsDimensionalCheck,
  sciMultiplyDivide, sciConvertForm, sciOrderOfMagnitude,
  sigCount, sigRound, sigArithmetic,
  convSingleStep, convChained, convAreaVolume, convChooseFactorFirst,
  trigFindSide, trigFindAngle, trigPythagorean, trigConceptual, trigEquationSelect,
  vecScalarVsVector, vecResultantRange,
  vecFindComponent, vecFromComponents, vecComponentSigns, vecComponentEquationSelect,
  vecAdditionMagnitude, vecAdditionDirection, vecOppositeSum,
];
