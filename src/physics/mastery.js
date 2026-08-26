// Tracks performance PER SKILL (not per chapter, not per question) — this is
// what adaptive practice and the curriculum screen both read from.

export const MASTERY_STATUS = {
  LOCKED: 'LOCKED',
  AVAILABLE: 'AVAILABLE',
  LEARNING: 'LEARNING',
  PROFICIENT: 'PROFICIENT',
  MASTERED: 'MASTERED',
};

export const MASTERY_THRESHOLDS = {
  proficientMinAttempts: 5,
  proficientAccuracy: 0.7,
  masteredMinAttempts: 10,
  masteredAccuracy: 0.85,
  masteredMinDifficulty: 3,
  // mastered skills never drop to 0 selection weight — they still resurface
  // periodically for spaced review, per the spec's explicit requirement.
  masteredSelectionFloor: 0.15,
};

const EMPTY_STATS = Object.freeze({
  attempts: 0, correct: 0, incorrect: 0, hintsUsed: 0, maxDifficultyCorrect: 0, recent: [],
  bestStars: 0, bestLevelPercent: 0,
});

// Star thresholds for a Level Test score: star N requires N*20% (so 4 stars
// = 80% exactly, matching the "4 stars = passing" requirement). Below 20%
// earns zero stars.
export function starsForPercent(percent) {
  return Math.min(5, Math.max(0, Math.floor(percent / 20)));
}

export class SkillMasteryStore {
  constructor(data = {}) {
    this.bySkill = new Map(Object.entries(data || {}));
  }

  get(skillId) {
    return this.bySkill.get(skillId) || EMPTY_STATS;
  }

  recordAttempt(skillId, { correct, difficulty = 1, hintsUsed = 0 }) {
    const prev = this.get(skillId);
    const next = {
      attempts: prev.attempts + 1,
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
      hintsUsed: prev.hintsUsed + hintsUsed,
      maxDifficultyCorrect: correct ? Math.max(prev.maxDifficultyCorrect, difficulty) : prev.maxDifficultyCorrect,
      recent: [...prev.recent, correct].slice(-10),
    };
    this.bySkill.set(skillId, next);
    return next;
  }

  accuracy(skillId) {
    const s = this.get(skillId);
    return s.attempts > 0 ? s.correct / s.attempts : 0;
  }

  recentAccuracy(skillId) {
    const r = this.get(skillId).recent;
    return r.length > 0 ? r.filter(Boolean).length / r.length : 0;
  }

  // A continuous 0..1 sense of "how solid is this skill", combining overall
  // accuracy with how difficult a problem the player has actually solved.
  masteryScore(skillId) {
    const s = this.get(skillId);
    if (s.attempts === 0) return 0;
    const diffBonus = Math.min(1, s.maxDifficultyCorrect / 5);
    return Math.min(1, this.accuracy(skillId) * 0.7 + diffBonus * 0.3);
  }

  status(skillId, { hasContent = true } = {}) {
    if (!hasContent) return MASTERY_STATUS.LOCKED;
    const s = this.get(skillId);
    if (s.attempts === 0) return MASTERY_STATUS.AVAILABLE;
    const acc = this.accuracy(skillId);
    const t = MASTERY_THRESHOLDS;
    if (s.attempts >= t.masteredMinAttempts && acc >= t.masteredAccuracy && s.maxDifficultyCorrect >= t.masteredMinDifficulty) {
      return MASTERY_STATUS.MASTERED;
    }
    if (s.attempts >= t.proficientMinAttempts && acc >= t.proficientAccuracy) {
      return MASTERY_STATUS.PROFICIENT;
    }
    return MASTERY_STATUS.LEARNING;
  }

  // Higher weight = practiced more often by the adaptive selector. Weak
  // skills naturally end up near 1; strong skills settle toward the floor
  // rather than vanishing entirely (spaced review of mastered material).
  weightFor(skillId) {
    return Math.max(MASTERY_THRESHOLDS.masteredSelectionFloor, 1 - this.masteryScore(skillId));
  }

  // Records a Level Test result (as opposed to a single-question attempt).
  // Only the BEST star rating ever earned is kept, and credit payout
  // (computed by the caller) is meant to only cover newly-earned stars —
  // this method just reports what's new so the caller can do that math.
  recordLevelTestResult(skillId, percent) {
    const prev = this.get(skillId);
    const stars = starsForPercent(percent);
    const prevBestStars = prev.bestStars || 0;
    const bestStars = Math.max(prevBestStars, stars);
    const bestLevelPercent = Math.max(prev.bestLevelPercent || 0, percent);
    this.bySkill.set(skillId, { ...prev, bestStars, bestLevelPercent });
    return { stars, prevBestStars, bestStars, newStars: Math.max(0, bestStars - prevBestStars), passed: stars >= 4 };
  }

  bestStars(skillId) {
    return this.get(skillId).bestStars || 0;
  }

  recommendedDifficulty(skillId) {
    const s = this.get(skillId);
    return Math.min(5, Math.max(1, s.maxDifficultyCorrect + 1));
  }

  reset(skillId) {
    if (skillId) this.bySkill.delete(skillId);
    else this.bySkill.clear();
  }

  toJSON() {
    return Object.fromEntries(this.bySkill.entries());
  }
}

// Weighted-random pick from a list of skill ids, using the store's
// weightFor() for each. Falls back to uniform pick if all weights are 0.
export function pickWeightedSkill(rng, store, skillIds) {
  if (skillIds.length === 0) return null;
  const weights = skillIds.map((id) => store.weightFor(id));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return skillIds[Math.floor(rng() * skillIds.length)];
  let r = rng() * total;
  for (let i = 0; i < skillIds.length; i++) {
    r -= weights[i];
    if (r <= 0) return skillIds[i];
  }
  return skillIds[skillIds.length - 1];
}
