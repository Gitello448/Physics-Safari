// Answer checking. Numeric answers get tolerant, format-forgiving parsing
// (scientific notation, stray units, equivalent rounding like 14.20 vs
// 14.2) instead of brittle string equality. Multiple-choice-style types
// (mc-calc, mc-concept, equation-select) are exact matches against one of
// the problem's own `choices`, since those are pre-validated strings.

const NUMERIC_TYPES = new Set(['numerical', 'vector']);

// Accepts "3.2e4", "3.2E4", "3.2x10^4", "3.2×10^4", "3.2 x 10^-4", plain
// decimals, and tolerates a trailing unit the student typed (e.g. "54 m/s")
// by simply ignoring anything after the numeric portion.
export function parseNumericInput(raw) {
  if (typeof raw !== 'string') return NaN;
  let s = raw.trim();
  if (s === '') return NaN;
  s = s.replace(/−/g, '-').replace(/[×xX]\s*10\s*\^?/, 'e').replace(/\s+/g, '');
  const match = s.match(/^-?\d*\.?\d+(?:e-?\d+)?/i);
  if (!match) return NaN;
  return parseFloat(match[0]);
}

export function checkAnswer(problem, rawInput) {
  if (NUMERIC_TYPES.has(problem.type)) {
    const value = parseNumericInput(rawInput);
    if (!Number.isFinite(value)) return { correct: false, parsedValue: null };
    const tolerance = problem.tolerance ?? Math.max(Math.abs(problem.answer) * 0.01, 1e-6);
    return { correct: Math.abs(value - problem.answer) <= tolerance, parsedValue: value };
  }
  // mc-calc / mc-concept / equation-select
  return { correct: rawInput === problem.answer, parsedValue: rawInput };
}
