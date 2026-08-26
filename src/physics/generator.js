// Orchestrates turning "give me a problem for skill X at difficulty D" into
// a fully-formed, self-contained Problem object. A Problem stores its own
// archetype id + seed + difficulty, so regenerateProblem() can reproduce the
// exact same problem later (e.g. for a "review this mistake" feature) without
// persisting the whole rendered text.

import { mulberry32, newSeed, choice } from './rng.js';
import { archetypesForSkill, getArchetype } from './archetypeRegistry.js';
import { getSkill } from './curriculum.js';

let nextInstanceId = 1;

export function generateProblem({ skillId, archetypeId, difficulty = 3 } = {}) {
  const archetype = archetypeId ? getArchetype(archetypeId) : choice(mulberry32(newSeed()), archetypesForSkill(skillId));
  if (!archetype) {
    throw new Error(`No archetype available for skill "${skillId}"${archetypeId ? ` / archetype "${archetypeId}"` : ''}`);
  }
  const seed = newSeed();
  return buildProblem(archetype, difficulty, seed);
}

// Rebuilds the exact same problem from a previously-generated Problem's
// {archetypeId, difficulty, seed} — used for reviewing past mistakes.
export function regenerateProblem({ archetypeId, difficulty, seed }) {
  const archetype = getArchetype(archetypeId);
  if (!archetype) throw new Error(`Unknown archetype "${archetypeId}"`);
  return buildProblem(archetype, difficulty, seed);
}

function buildProblem(archetype, difficulty, seed) {
  const rng = mulberry32(seed);
  const core = archetype.generate(rng, difficulty);
  const found = getSkill(archetype.skillId);
  return {
    instanceId: nextInstanceId++,
    archetypeId: archetype.id,
    skillId: archetype.skillId,
    chapterId: found ? found.chapter.id : null,
    difficulty,
    seed,
    ...core,
  };
}
