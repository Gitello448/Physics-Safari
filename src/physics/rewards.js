// Physics-side reward tuning — separate from the park's economy.js so the
// two currencies/systems can be rebalanced independently. Practice Mode
// never touches these (it's free/no-reward-and-no-risk by design).

export const PHYSICS_REWARDS = {
  creditsByDifficulty: { 1: 80, 2: 130, 3: 200, 4: 300, 5: 450 },
  researchPointsByDifficulty: { 1: 1, 2: 1, 3: 2, 4: 3, 5: 5 },
  // Each hint used reduces the reward by this fraction (hints are meant to
  // help learning, not be "free" relative to solving it unaided).
  hintPenaltyPerHint: 0.15,
  minPenaltyMultiplier: 0.4,
};

export function computeReward(difficulty, correct, hintsUsed = 0) {
  if (!correct) return { credits: 0, researchPoints: 0 };
  const multiplier = Math.max(
    PHYSICS_REWARDS.minPenaltyMultiplier,
    1 - hintsUsed * PHYSICS_REWARDS.hintPenaltyPerHint,
  );
  const baseCredits = PHYSICS_REWARDS.creditsByDifficulty[difficulty] ?? PHYSICS_REWARDS.creditsByDifficulty[1];
  const baseResearch = PHYSICS_REWARDS.researchPointsByDifficulty[difficulty] ?? 1;
  return {
    credits: Math.round(baseCredits * multiplier),
    researchPoints: Math.max(1, Math.round(baseResearch * multiplier)),
  };
}

// "Research Opportunity" pop-up events: occasional, optional physics
// challenges surfaced during normal park play — NOT gating every purchase.
export const RESEARCH_EVENT = {
  minIntervalMs: 3 * 60 * 1000,
  maxIntervalMs: 6 * 60 * 1000,
  questionCount: 2,
  bonusMultiplier: 1.5, // reward bump to make the pop-up worth stopping for
};
