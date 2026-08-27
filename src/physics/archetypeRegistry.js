// Central registry: skillId -> list of archetypes available for that skill.
// Later chapters plug in here the same way Chapter 1 does — nothing else in
// the engine needs to change when Chapter 2+ archetypes are added.

import { CH1_ARCHETYPES } from './ch1archetypes.js';
import { CH2_ARCHETYPES } from './ch2archetypes.js';
import { CH3_ARCHETYPES } from './ch3archetypes.js';

const ALL_ARCHETYPES = [...CH1_ARCHETYPES, ...CH2_ARCHETYPES, ...CH3_ARCHETYPES];

const BY_SKILL = new Map();
const BY_ID = new Map();
for (const arch of ALL_ARCHETYPES) {
  BY_ID.set(arch.id, arch);
  if (!BY_SKILL.has(arch.skillId)) BY_SKILL.set(arch.skillId, []);
  BY_SKILL.get(arch.skillId).push(arch);
}

export function archetypesForSkill(skillId) {
  return BY_SKILL.get(skillId) || [];
}

export function getArchetype(archetypeId) {
  return BY_ID.get(archetypeId) || null;
}

export function skillHasContent(skillId) {
  return archetypesForSkill(skillId).length > 0;
}

export function allArchetypes() {
  return ALL_ARCHETYPES;
}
