import { allArchetypes, archetypesForSkill } from '../src/physics/archetypeRegistry.js';
import { generateProblem, regenerateProblem } from '../src/physics/generator.js';
import { checkAnswer, parseNumericInput } from '../src/physics/validate.js';
import { countSigFigs, roundToSigFigs, roundToDecimalPlaces } from '../src/physics/sigfigsUtil.js';
import { SkillMasteryStore as Store2 } from '../src/physics/mastery.js';
import { buildSession } from '../src/physics/practice.js';
import { mulberry32, newSeed } from '../src/physics/rng.js';
import { CHAPTERS, allSkillIds } from '../src/physics/curriculum.js';

const results = [];
let pass = 0, fail = 0;

function assert(name, cond, extra = '') {
  if (cond) { pass++; results.push({ ok: true, name }); }
  else { fail++; results.push({ ok: false, name, extra }); }
}

const NUMERIC_TYPES = new Set(['numerical', 'vector']);

// --- sig figs util -------------------------------------------------------
assert('countSigFigs("0.0450") === 3', countSigFigs('0.0450') === 3);
assert('countSigFigs("1500") === 2', countSigFigs('1500') === 2);
assert('countSigFigs("1500.") === 4', countSigFigs('1500.') === 4);
assert('countSigFigs("3.14") === 3', countSigFigs('3.14') === 3);
assert('countSigFigs("100.0") === 4', countSigFigs('100.0') === 4);
assert('roundToSigFigs(3.14159,3) === 3.14', roundToSigFigs(3.14159, 3) === 3.14);
assert('roundToSigFigs(1234,2) === 1200', roundToSigFigs(1234, 2) === 1200);
assert('roundToSigFigs(0.000456,2) === 0.00046', roundToSigFigs(0.000456, 2) === 0.00046);
assert('roundToDecimalPlaces(3.14159,2) === 3.14', roundToDecimalPlaces(3.14159, 2) === 3.14);

// --- numeric parsing / answer validation ----------------------------------
assert('parseNumericInput("14.20") === 14.2', parseNumericInput('14.20') === 14.2);
assert('parseNumericInput("14.2") === parseNumericInput("14.20")', parseNumericInput('14.2') === parseNumericInput('14.20'));
assert('parseNumericInput("3.2e4") === 32000', Math.abs(parseNumericInput('3.2e4') - 32000) < 1e-6);
assert('parseNumericInput("3.2x10^4") === 32000', Math.abs(parseNumericInput('3.2x10^4') - 32000) < 1e-6);
assert('parseNumericInput("3.2 x 10^-2") === 0.032', Math.abs(parseNumericInput('3.2 x 10^-2') - 0.032) < 1e-6);
assert('parseNumericInput("54 m/s") === 54', parseNumericInput('54 m/s') === 54);
assert('parseNumericInput("not a number") is NaN', Number.isNaN(parseNumericInput('not a number')));

{
  const fakeProblem = { type: 'numerical', answer: 14.2, tolerance: 0.05 };
  assert('checkAnswer accepts "14.20" for answer 14.2', checkAnswer(fakeProblem, '14.20').correct === true);
  assert('checkAnswer accepts "14.2"', checkAnswer(fakeProblem, '14.2').correct === true);
  assert('checkAnswer rejects "20"', checkAnswer(fakeProblem, '20').correct === false);
  assert('checkAnswer rejects garbage', checkAnswer(fakeProblem, 'banana').correct === false);
}
{
  const fakeMc = { type: 'mc-concept', choices: ['a', 'b', 'c', 'd'], answer: 'b' };
  assert('checkAnswer exact-matches MC answer', checkAnswer(fakeMc, 'b').correct === true);
  assert('checkAnswer rejects wrong MC choice', checkAnswer(fakeMc, 'a').correct === false);
}

// --- curriculum scaffold ---------------------------------------------------
assert('15 chapters defined', CHAPTERS.length === 15);
assert('every chapter has an id/title/skills[]', CHAPTERS.every((c) => c.id && c.title && Array.isArray(c.skills) && c.skills.length > 0));
assert('all skill ids unique', new Set(allSkillIds()).size === allSkillIds().length);

// --- archetype generation: fuzz every Chapter 1 archetype -----------------
const ARCHS = allArchetypes();
assert('at least 20 archetypes registered for Chapter 1', ARCHS.length >= 20);

for (const arch of ARCHS) {
  let sawFiniteNumeric = false;
  for (let trial = 0; trial < 15; trial++) {
    const difficulty = (trial % 5) + 1;
    let problem;
    try {
      problem = generateProblem({ archetypeId: arch.id, difficulty });
    } catch (e) {
      assert(`${arch.id}: generates without throwing (difficulty ${difficulty})`, false, String(e));
      continue;
    }
    assert(`${arch.id}: has a non-empty prompt`, typeof problem.prompt === 'string' && problem.prompt.length > 5);
    assert(`${arch.id}: has exactly 3 hints`, Array.isArray(problem.hints) && problem.hints.length === 3);
    assert(`${arch.id}: solution has all 7 fields`, ['knowns', 'unknown', 'principle', 'substitution', 'algebra', 'result', 'interpretation'].every((k) => problem.solution && problem.solution[k]));

    if (NUMERIC_TYPES.has(problem.type)) {
      const finite = Number.isFinite(problem.answer);
      assert(`${arch.id}: numeric answer is finite (trial ${trial})`, finite, `answer=${problem.answer}`);
      if (finite) sawFiniteNumeric = true;
      if (finite) {
        const tol = problem.tolerance ?? Math.max(Math.abs(problem.answer) * 0.01, 1e-6);
        assert(`${arch.id}: tolerance is positive finite`, Number.isFinite(tol) && tol >= 0);
        const check = checkAnswer(problem, String(problem.answer));
        assert(`${arch.id}: exact stored answer validates as correct`, check.correct === true, `answer=${problem.answer}`);
        const wrongCheck = checkAnswer(problem, String(problem.answer + Math.max(tol * 50, 1000)));
        assert(`${arch.id}: a wildly wrong answer is rejected`, wrongCheck.correct === false);
      }
    } else {
      assert(`${arch.id}: MC-style answer is one of its own choices`, Array.isArray(problem.choices) && problem.choices.includes(problem.answer));
      const check = checkAnswer(problem, problem.answer);
      assert(`${arch.id}: stored MC answer validates as correct`, check.correct === true);
      const wrongChoice = problem.choices.find((c) => c !== problem.answer);
      if (wrongChoice) {
        assert(`${arch.id}: a different choice is rejected`, checkAnswer(problem, wrongChoice).correct === false);
      }
    }

    // Reproducibility: regenerating from the same seed/archetype/difficulty
    // must produce an identical prompt and answer.
    const again = regenerateProblem({ archetypeId: problem.archetypeId, difficulty: problem.difficulty, seed: problem.seed });
    assert(`${arch.id}: regenerateProblem reproduces the same prompt`, again.prompt === problem.prompt);
    assert(`${arch.id}: regenerateProblem reproduces the same answer`, again.answer === problem.answer);
  }
  if (NUMERIC_TYPES.has(arch.generate(mulberry32(newSeed()), 3).type)) {
    assert(`${arch.id}: produced at least one finite numeric answer across trials`, sawFiniteNumeric);
  }
}

// --- mastery store ----------------------------------------------------------
{
  const store = new Store2();
  const skillId = 'ch1.trig';
  assert('fresh skill status is AVAILABLE', store.status(skillId) === 'AVAILABLE');
  for (let i = 0; i < 4; i++) store.recordAttempt(skillId, { correct: true, difficulty: 2 });
  assert('4 correct attempts -> still LEARNING (below proficient min attempts)', store.status(skillId) === 'LEARNING');
  store.recordAttempt(skillId, { correct: true, difficulty: 2 });
  assert('5 correct/5 attempts -> PROFICIENT', store.status(skillId) === 'PROFICIENT');
  for (let i = 0; i < 5; i++) store.recordAttempt(skillId, { correct: true, difficulty: 3 });
  assert('10/10 correct incl. difficulty 3 -> MASTERED', store.status(skillId) === 'MASTERED');
  const weight = store.weightFor(skillId);
  assert('mastered skill still has a nonzero selection weight (spaced review)', weight > 0);

  const store2 = new Store2();
  store2.recordAttempt('x', { correct: false, difficulty: 1 });
  store2.recordAttempt('x', { correct: false, difficulty: 1 });
  assert('a weak skill has weight higher than a mastered one', store2.weightFor('x') > weight);

  const noContentStatus = store.status('nonexistent.skill', { hasContent: false });
  assert('a skill with no archetypes yet reports LOCKED', noContentStatus === 'LOCKED');
}

// --- practice session builder -----------------------------------------------
{
  const store = new Store2();
  const rng = mulberry32(12345);
  const single = buildSession({ mode: 'skill', skillId: 'ch1.trig', count: 6 }, { mastery: store, rng });
  assert('skill-mode session has requested length', single.length === 6);
  assert('skill-mode session only draws the requested skill', single.every((q) => q.skillId === 'ch1.trig'));

  const chapterSession = buildSession({ mode: 'chapter', chapterId: 'ch1', count: 10 }, { mastery: store, rng });
  assert('chapter-mode session has requested length', chapterSession.length === 10);
  assert('chapter-mode session only draws ch1 skills', chapterSession.every((q) => q.skillId.startsWith('ch1.')));

  const cumulative = buildSession({ mode: 'cumulative', count: 5 }, { mastery: store, rng });
  assert('cumulative session returns items even though only ch1 has content', cumulative.length === 5);

  const examSession = buildSession({ mode: 'exam', examId: 'exam1', count: 5 }, { mastery: store, rng });
  assert('exam1 session (ch1-3) pulls only from ch1/ch2/ch3', examSession.every((q) => q.skillId.startsWith('ch1.') || q.skillId.startsWith('ch2.') || q.skillId.startsWith('ch3.')));

  const bogus = buildSession({ mode: 'chapter', chapterId: 'ch9', count: 5 }, { mastery: store, rng });
  assert('a chapter with zero implemented skills yields an empty session (no crash)', bogus.length === 0);
}

// --- regression: order-of-magnitude must actually apply its own rounding rule ---
// (bug found in manual UI testing: the stored answer used the raw exponent
// and ignored the coefficient, contradicting the solution text it showed.)
for (let i = 0; i < 60; i++) {
  const p = generateProblem({ archetypeId: 'ch1.sci-notation.order-of-magnitude', difficulty: 2 });
  const m = p.prompt.match(/for (-?\d+(?:\.\d+)?)e([+-]\d+)\?/);
  if (!m) { assert('order-of-magnitude prompt is parseable', false, p.prompt); continue; }
  const coeff = parseFloat(m[1]);
  const baseExp = parseInt(m[2], 10);
  const expectedExp = coeff >= Math.sqrt(10) ? baseExp + 1 : baseExp;
  const answerExp = parseInt(String(p.answer).replace('10^', ''), 10);
  assert(`order-of-magnitude answer (10^${answerExp}) matches the √10 rounding rule for coefficient ${coeff}`, answerExp === expectedExp);
}

// --- regression: sig-fig arithmetic must not lose precision through a
// parseFloat/String round-trip (bug found in manual audit: "20.0" collapsed
// to "20", silently claiming the wrong sig-fig count). ---
for (let i = 0; i < 60; i++) {
  const p = generateProblem({ archetypeId: 'ch1.sigfigs.arithmetic', difficulty: 2 });
  const m = p.solution.knowns[0].match(/^a = (-?[\d.]+) \((\d+) sig figs\)$/);
  if (!m) continue; // this trial was the addition (decimal-places) branch, not multiplication
  const displayedA = m[1];
  const claimedSigFigs = parseInt(m[2], 10);
  assert(`sigfigs-arithmetic claims the TRUE sig-fig count of displayed "${displayedA}"`, countSigFigs(displayedA) === claimedSigFigs);
}

// --- render results ----------------------------------------------------------
const summary = `${pass} passed, ${fail} failed (of ${pass + fail})`;
console.log(`[physics tests] ${summary}`);
for (const r of results) {
  if (!r.ok) console.error(`FAIL: ${r.name}${r.extra ? ' — ' + r.extra : ''}`);
}

const el = document.getElementById('output');
if (el) {
  el.textContent = summary + '\n\n' + results.map((r) => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : '  ' + r.extra}`).join('\n');
  el.style.color = fail === 0 ? '#7CFC00' : '#ff6b6b';
}
window.__TEST_SUMMARY__ = { pass, fail, results };
