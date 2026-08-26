// Significant-figure helpers shared by the Chapter 1 archetypes and by
// answer validation (so "14.20" and "14.2" are never wrongly treated as
// different answers — see validate.js).

// Counts sig figs in a decimal STRING the generator itself produced (not a
// float), so there's no ambiguity about intent: include a trailing "." to
// mean "these trailing zeros are significant".
export function countSigFigs(numStr) {
  const s = String(numStr).trim().replace(/^-/, '');
  const hasDot = s.includes('.');
  const digits = s.replace('.', '');
  const firstNonZero = digits.search(/[1-9]/);
  if (firstNonZero === -1) return 1;
  let lastRelevant = digits.length - 1;
  if (!hasDot) {
    while (lastRelevant > firstNonZero && digits[lastRelevant] === '0') lastRelevant--;
  }
  return lastRelevant - firstNonZero + 1;
}

// Rounds a number to n significant figures (standard log10-based technique).
export function roundToSigFigs(value, n) {
  if (value === 0) return 0;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const d = Math.ceil(Math.log10(abs));
  const power = n - d;
  const factor = Math.pow(10, power);
  return sign * Math.round(abs * factor) / factor;
}

// Rounds to a fixed number of decimal places (used for the addition/
// subtraction sig-fig rule, which tracks decimal places rather than count).
export function roundToDecimalPlaces(value, places) {
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
}

export function decimalPlacesOf(numStr) {
  const s = String(numStr);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}
