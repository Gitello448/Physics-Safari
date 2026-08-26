// Builds practice/exam sessions: a queue of {skillId, difficulty} draws.
// Actual problem generation happens later, one at a time, via generator.js —
// this module only decides WHICH skill/difficulty comes next.

import { getChapter, allSkillIds } from './curriculum.js';
import { skillHasContent } from './archetypeRegistry.js';
import { pickWeightedSkill } from './mastery.js';

// Placeholder chapter ranges — deliberately NOT hardcoded as a fixed
// boundary elsewhere in the app. Adjust these once the syllabus confirms
// exactly which chapters each exam covers; nothing else needs to change.
export const EXAM_RANGES = {
  exam1: { label: 'Exam 1 Review', chapters: ['ch1', 'ch2', 'ch3'] },
  exam2: { label: 'Exam 2 Review', chapters: ['ch4', 'ch5', 'ch6', 'ch7'] },
  exam3: { label: 'Exam 3 Review', chapters: ['ch8', 'ch9', 'ch10', 'ch11'] },
  final: {
    label: 'Final Review (Cumulative)',
    chapters: ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'ch10', 'ch11', 'ch12', 'ch13', 'ch14', 'ch15'],
  },
};

function chapterSkillIds(chapterId) {
  const ch = getChapter(chapterId);
  return ch ? ch.skills.map((s) => s.id) : [];
}

// mode: 'skill' | 'chapter' | 'weak' | 'cumulative' | 'exam'
export function buildSession({ mode, chapterId, skillId, examId, count = 8 }, { mastery, rng }) {
  let candidates;
  if (mode === 'skill') {
    candidates = [skillId];
  } else if (mode === 'chapter') {
    candidates = chapterSkillIds(chapterId);
  } else if (mode === 'exam') {
    const range = EXAM_RANGES[examId];
    candidates = range ? range.chapters.flatMap(chapterSkillIds) : [];
  } else {
    // 'weak' and 'cumulative' both draw from everything unlocked; the
    // difference is entirely in the mastery-weighting, which already favors
    // weak skills — 'weak' just leans on that same mechanism.
    candidates = allSkillIds();
  }

  candidates = candidates.filter(skillHasContent);
  if (candidates.length === 0) return [];

  const queue = [];
  for (let i = 0; i < count; i++) {
    const chosenSkill = mode === 'skill' ? candidates[0] : pickWeightedSkill(rng, mastery, candidates);
    const difficulty = mastery.recommendedDifficulty(chosenSkill);
    queue.push({ skillId: chosenSkill, difficulty });
  }
  return queue;
}
