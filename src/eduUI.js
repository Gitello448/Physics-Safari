// The full educational-physics UI: home hub, curriculum/mastery map,
// practice mode, equation sheet, exam review, dev tools, and the shared
// question-session runner (prompt → hints → answer → solution → next).
//
// This replaces the old placeholder expedition.js. It's DOM-based (reusing
// the game's existing pixel-panel CSS) rendered into #expeditionContent,
// same integration point as before, so main.js/index.html wiring barely
// changes.

import { getChapters, getChapter } from './physics/curriculum.js';
import { skillHasContent, archetypesForSkill, allArchetypes } from './physics/archetypeRegistry.js';
import { generateProblem } from './physics/generator.js';
import { checkAnswer } from './physics/validate.js';
import { equationsForChapter } from './physics/equations.js';
import { EXAM_RANGES, buildSession } from './physics/practice.js';
import { MASTERY_STATUS } from './physics/mastery.js';
import { computeReward } from './physics/rewards.js';
import { mulberry32, newSeed } from './physics/rng.js';
import { drawDiagram } from './physics/diagrams.js';

const STATUS_LABEL = {
  [MASTERY_STATUS.LOCKED]: '🔒 Locked',
  [MASTERY_STATUS.AVAILABLE]: 'Available',
  [MASTERY_STATUS.LEARNING]: 'Learning',
  [MASTERY_STATUS.PROFICIENT]: 'Proficient',
  [MASTERY_STATUS.MASTERED]: '✓ Mastered',
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function createEduUI({ root, mastery, isDevMode, awardCredits, awardResearch, onClose }) {
  let screen = null;
  let devUnlockAll = false; // dev-only override, resets whenever dev mode is toggled off
  let session = null; // { queue, index, rewarded, label, results:[], researchBonus }
  let current = null; // { problem, hintsRevealed, answered, chosenBtn }

  function render(html) { root.innerHTML = html; }
  function chapterHasContent(chapterId) {
    const ch = getChapter(chapterId);
    return !!ch && ch.skills.some((s) => skillHasContent(s.id));
  }
  function chapterUnlocked(chapterId) {
    return chapterHasContent(chapterId) || (isDevMode() && devUnlockAll);
  }

  // ---- Home -------------------------------------------------------------
  function showHome() {
    screen = 'home';
    render(`
      <div class="exp-header">SAFARI SCHOLAR — FIELD RESEARCH</div>
      <div class="exp-subheader">PHYS 211 · Cutnell &amp; Johnson 12e curriculum</div>
      <div class="exp-list">
        <button class="chapter-btn" id="goCurriculum"><span>📖 Curriculum &amp; Mastery</span><span class="exp-badge">view progress</span></button>
        <button class="chapter-btn" id="goPractice"><span>🎯 Practice Mode</span><span class="exp-badge">free · no risk</span></button>
        <button class="chapter-btn" id="goEquations"><span>📐 Equation Sheet</span><span class="exp-badge">reference</span></button>
        <button class="chapter-btn" id="goExam"><span>📝 Exam Review</span><span class="exp-badge">free · no risk</span></button>
        ${isDevMode() ? '<button class="chapter-btn" id="goDevTools"><span>🔧 Physics Dev Tools</span><span class="exp-badge">dev mode</span></button>' : ''}
      </div>
      <div class="exp-actions" style="justify-content:flex-start;margin-top:24px;">
        <button class="small-btn" id="expBack">← Return to Park</button>
      </div>
    `);
    root.querySelector('#goCurriculum').addEventListener('click', () => showCurriculum());
    root.querySelector('#goPractice').addEventListener('click', () => showPracticeMode());
    root.querySelector('#goEquations').addEventListener('click', () => showEquationSheet());
    root.querySelector('#goExam').addEventListener('click', () => showExamReview());
    root.querySelector('#goDevTools')?.addEventListener('click', () => showDevTools());
    root.querySelector('#expBack').addEventListener('click', close);
  }

  // ---- GO ON SAFARI (rewarded chapter → skill → session) ----------------
  function showGoOnSafari() {
    showChapterList({ rewarded: true, backLabel: '← Return to Park', onBack: close, headerNote: '🪙 Rewarded — correct answers earn credits & research points' });
  }

  function showChapterList({ rewarded, backLabel, onBack, headerNote }) {
    screen = 'chapters';
    const chapters = getChapters();
    const rows = chapters.map((ch) => {
      const unlocked = chapterUnlocked(ch.id);
      const masteredCount = ch.skills.filter((s) => mastery.status(s.id, { hasContent: skillHasContent(s.id) }) === MASTERY_STATUS.MASTERED).length;
      const badge = chapterHasContent(ch.id)
        ? `${masteredCount}/${ch.skills.length} mastered`
        : (unlocked ? 'dev-unlocked · no content yet' : '🔒 coming soon');
      return `
        <button class="chapter-btn" data-chapter="${ch.id}" ${unlocked ? '' : 'disabled'}>
          <span>Chapter ${ch.order} — ${escapeHtml(ch.title)}</span>
          <span class="exp-badge">${badge}</span>
        </button>`;
    }).join('');

    render(`
      <div class="exp-header">${rewarded ? 'CHOOSE YOUR SAFARI' : 'CURRICULUM &amp; MASTERY'}</div>
      <div class="exp-subheader">${headerNote || 'Pick a chapter to see its skills.'}</div>
      <div class="exp-list">${rows}</div>
      <div class="exp-actions" style="justify-content:flex-start;margin-top:24px;">
        <button class="small-btn" id="expBack">${backLabel}</button>
      </div>
    `);
    root.querySelectorAll('[data-chapter]:not([disabled])').forEach((btn) => {
      btn.addEventListener('click', () => showSkillList(btn.dataset.chapter, { rewarded, onBack: () => showChapterList({ rewarded, backLabel, onBack, headerNote }) }));
    });
    root.querySelector('#expBack').addEventListener('click', onBack);
  }

  function showSkillList(chapterId, { rewarded, onBack }) {
    screen = 'skills';
    const ch = getChapter(chapterId);
    const rows = ch.skills.map((s) => {
      const hasContent = skillHasContent(s.id);
      const status = mastery.status(s.id, { hasContent });
      const stats = mastery.get(s.id);
      const acc = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0;
      const disabled = !hasContent && !(isDevMode() && devUnlockAll);
      const statusClass = status === MASTERY_STATUS.MASTERED ? 'mastered' : status === MASTERY_STATUS.PROFICIENT ? 'proficient' : status === MASTERY_STATUS.LEARNING ? 'in-progress' : '';
      return `
        <button class="concept-btn ${statusClass}" data-skill="${s.id}" ${disabled ? 'disabled' : ''}>
          <span>${escapeHtml(s.title)}</span>
          <span class="exp-badge" style="display:flex;align-items:center;gap:8px;">
            ${hasContent ? `<span class="progress-bar-track"><span class="progress-bar-fill ${status === MASTERY_STATUS.MASTERED ? 'mastered' : ''}" style="width:${acc}%"></span></span>` : ''}
            ${hasContent ? STATUS_LABEL[status] : '🔒 coming soon'}
          </span>
        </button>`;
    }).join('');

    render(`
      <div class="exp-nav"><button class="small-btn" id="expToChapters">← Chapters</button></div>
      <div class="exp-header">${escapeHtml(ch.title.toUpperCase())}</div>
      <div class="exp-subheader">${rewarded ? '🪙 Rewarded session' : 'Free practice — select a skill'}</div>
      <div class="exp-list">${rows}</div>
    `);
    root.querySelectorAll('[data-skill]:not([disabled])').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rng = mulberry32(newSeed());
        const queue = buildSession({ mode: 'skill', skillId: btn.dataset.skill, count: 6 }, { mastery, rng });
        const skillTitle = ch.skills.find((s) => s.id === btn.dataset.skill)?.title || btn.dataset.skill;
        startSession(queue, { rewarded, label: skillTitle, onFinish: () => showSkillList(chapterId, { rewarded, onBack }) });
      });
    });
    root.querySelector('#expToChapters').addEventListener('click', onBack);
  }

  // ---- Curriculum & Mastery (free browsing) ------------------------------
  function showCurriculum() {
    showChapterList({ rewarded: false, backLabel: '← Back to Menu', onBack: showHome, headerNote: 'Pick a chapter to see its skills and mastery.' });
  }

  // ---- Practice Mode ------------------------------------------------------
  function showPracticeMode() {
    screen = 'practice';
    const chapters = getChapters().filter((c) => chapterUnlocked(c.id));
    const chapterOptions = chapters.map((c) => `<option value="${c.id}">Chapter ${c.order} — ${escapeHtml(c.title)}</option>`).join('');
    render(`
      <div class="exp-header">PRACTICE MODE</div>
      <div class="exp-subheader">Free — never costs credits or affects the park.</div>
      <div class="exp-list">
        <button class="chapter-btn" data-mode="chapter"><span>Current Chapter</span><span class="exp-badge">pick below</span></button>
        <button class="chapter-btn" data-mode="skill"><span>Specific Skill</span><span class="exp-badge">pick below</span></button>
        <button class="chapter-btn" data-mode="cumulative"><span>Mixed / Cumulative Review</span><span class="exp-badge">all unlocked chapters</span></button>
        <button class="chapter-btn" data-mode="weak"><span>Weak Skills Focus</span><span class="exp-badge">adaptive</span></button>
      </div>
      <div id="practicePicker" style="margin-top:18px;"></div>
      <div class="exp-actions" style="justify-content:flex-start;margin-top:18px;">
        <button class="small-btn" id="expBack">← Back to Menu</button>
      </div>
    `);

    const pickerEl = root.querySelector('#practicePicker');
    root.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b === btn));
        const mode = btn.dataset.mode;
        if (mode === 'chapter') {
          pickerEl.innerHTML = `
            <select id="chapterSelect" class="numeric-input" style="width:100%;max-width:420px;">${chapterOptions}</select>
            <div style="margin-top:12px;"><button class="big-btn" id="startPractice">Start Practice</button></div>`;
          pickerEl.querySelector('#startPractice').addEventListener('click', () => {
            const chapterId = pickerEl.querySelector('#chapterSelect').value;
            launchPractice({ mode: 'chapter', chapterId }, `Practice — ${getChapter(chapterId).title}`);
          });
        } else if (mode === 'skill') {
          const skillOptions = chapters.flatMap((c) => c.skills.filter((s) => skillHasContent(s.id)).map((s) => `<option value="${s.id}">${escapeHtml(c.title)} — ${escapeHtml(s.title)}</option>`)).join('');
          pickerEl.innerHTML = `
            <select id="skillSelect" class="numeric-input" style="width:100%;max-width:420px;">${skillOptions}</select>
            <div style="margin-top:12px;"><button class="big-btn" id="startPractice">Start Practice</button></div>`;
          pickerEl.querySelector('#startPractice').addEventListener('click', () => {
            const skillId = pickerEl.querySelector('#skillSelect').value;
            launchPractice({ mode: 'skill', skillId }, 'Practice — Specific Skill');
          });
        } else {
          pickerEl.innerHTML = `<button class="big-btn" id="startPractice">Start Practice</button>`;
          pickerEl.querySelector('#startPractice').addEventListener('click', () => {
            launchPractice({ mode }, mode === 'weak' ? 'Practice — Weak Skills' : 'Practice — Cumulative Review');
          });
        }
      });
    });

    function launchPractice(opts, label) {
      const rng = mulberry32(newSeed());
      const queue = buildSession({ ...opts, count: 8 }, { mastery, rng });
      if (queue.length === 0) { alertNoContent(); return; }
      startSession(queue, { rewarded: false, label, onFinish: showPracticeMode });
    }
    root.querySelector('#expBack').addEventListener('click', showHome);
  }

  function alertNoContent() {
    render(`
      <div class="exp-header">NO QUESTIONS YET</div>
      <div class="exp-subheader">That selection has no implemented content yet — try Chapter 1.</div>
      <div class="exp-actions" style="justify-content:flex-start;"><button class="small-btn" id="back">← Back</button></div>
    `);
    root.querySelector('#back').addEventListener('click', showPracticeMode);
  }

  // ---- Equation Sheet -----------------------------------------------------
  function showEquationSheet() {
    screen = 'equations';
    const unlockedChapters = getChapters().filter((c) => chapterUnlocked(c.id));
    const sections = unlockedChapters.map((ch) => {
      const eqs = equationsForChapter(ch.id);
      if (eqs.length === 0) return '';
      const rows = eqs.map((eq) => `
        <div class="equation-card">
          <div class="equation-formula">${escapeHtml(eq.equation)}</div>
          <div class="equation-vars">
            ${eq.variables.map((v) => `<div><b>${escapeHtml(v.symbol)}</b> — ${escapeHtml(v.meaning)} <span class="equation-unit">[${escapeHtml(v.unit)}]</span></div>`).join('')}
          </div>
        </div>`).join('');
      return `<div class="equation-chapter-title">Chapter ${ch.order} — ${escapeHtml(ch.title)}</div>${rows}`;
    }).join('');

    render(`
      <div class="exp-header">EQUATION SHEET</div>
      <div class="exp-subheader">Reference only — figuring out WHICH equation to use is part of the skill.</div>
      <div class="exp-list">${sections || '<div class="exp-subheader">No chapters unlocked yet.</div>'}</div>
      <div class="exp-actions" style="justify-content:flex-start;margin-top:18px;">
        <button class="small-btn" id="expBack">← Back to Menu</button>
      </div>
    `);
    root.querySelector('#expBack').addEventListener('click', showHome);
  }

  // ---- Exam Review ---------------------------------------------------------
  function showExamReview() {
    screen = 'exam';
    const rows = Object.entries(EXAM_RANGES).map(([examId, range]) => {
      const contentChapters = range.chapters.filter(chapterHasContent);
      const badge = contentChapters.length === range.chapters.length
        ? 'full coverage'
        : `${contentChapters.length}/${range.chapters.length} chapters have content`;
      return `
        <button class="chapter-btn" data-exam="${examId}">
          <span>${escapeHtml(range.label)}</span>
          <span class="exp-badge">${badge}</span>
        </button>`;
    }).join('');
    render(`
      <div class="exp-header">EXAM REVIEW</div>
      <div class="exp-subheader">Free — mixes conceptual, numerical, and multi-step questions from the covered chapters.</div>
      <div class="exp-list">${rows}</div>
      <div class="exp-actions" style="justify-content:flex-start;margin-top:18px;">
        <button class="small-btn" id="expBack">← Back to Menu</button>
      </div>
    `);
    root.querySelectorAll('[data-exam]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rng = mulberry32(newSeed());
        const queue = buildSession({ mode: 'exam', examId: btn.dataset.exam, count: 10 }, { mastery, rng });
        if (queue.length === 0) { alertNoContentExam(); return; }
        startSession(queue, { rewarded: false, label: EXAM_RANGES[btn.dataset.exam].label, onFinish: showExamReview });
      });
    });
    root.querySelector('#expBack').addEventListener('click', showHome);
  }
  function alertNoContentExam() {
    render(`
      <div class="exp-header">NO QUESTIONS YET</div>
      <div class="exp-subheader">None of that exam's chapters have implemented content yet.</div>
      <div class="exp-actions" style="justify-content:flex-start;"><button class="small-btn" id="back">← Back</button></div>
    `);
    root.querySelector('#back').addEventListener('click', showExamReview);
  }

  // ---- Dev Tools ------------------------------------------------------------
  function showDevTools() {
    screen = 'devtools';
    render(`
      <div class="exp-header">🔧 PHYSICS DEV TOOLS</div>
      <div class="exp-subheader">Only visible in Development Mode. Never affects the shipped experience.</div>
      <div class="exp-list">
        <button class="chapter-btn" id="toggleUnlock"><span>Unlock all chapters for testing</span><span class="exp-badge">${devUnlockAll ? 'ON' : 'OFF'}</span></button>
        <button class="chapter-btn" id="resetMastery"><span>Reset ALL mastery progress</span><span class="exp-badge">destructive</span></button>
      </div>
      <div class="exp-subheader" style="margin-top:22px;text-align:left;">Launch a specific archetype directly:</div>
      <div id="archetypeList" class="exp-list" style="max-height:320px;overflow-y:auto;"></div>
      <div class="exp-actions" style="justify-content:flex-start;margin-top:18px;">
        <button class="small-btn" id="expBack">← Back to Menu</button>
      </div>
    `);
    root.querySelector('#toggleUnlock').addEventListener('click', () => { devUnlockAll = !devUnlockAll; showDevTools(); });
    root.querySelector('#resetMastery').addEventListener('click', () => {
      if (confirm('Reset all skill mastery progress? This cannot be undone.')) { mastery.reset(); showDevTools(); }
    });
    const list = root.querySelector('#archetypeList');
    list.innerHTML = allArchetypes().map((a) => `
      <button class="concept-btn" data-archetype="${a.id}"><span>${escapeHtml(a.title)}</span><span class="exp-badge">${a.skillId}</span></button>
    `).join('');
    list.querySelectorAll('[data-archetype]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const queue = [1, 2, 3, 4, 5].map((difficulty) => ({ skillId: null, difficulty, archetypeId: btn.dataset.archetype }));
        startSession(queue, { rewarded: false, label: `Dev Test — ${btn.dataset.archetype}`, onFinish: showDevTools, forcedArchetype: true });
      });
    });
    root.querySelector('#expBack').addEventListener('click', showHome);
  }

  // ---- Shared question-session runner ---------------------------------------
  function startSession(queue, { rewarded, label, onFinish, forcedArchetype = false }) {
    session = { queue, index: 0, rewarded, label, onFinish, results: [], creditsEarned: 0, researchEarned: 0, masteryBefore: {}, forcedArchetype };
    for (const { skillId } of queue) {
      if (skillId && !(skillId in session.masteryBefore)) session.masteryBefore[skillId] = mastery.accuracy(skillId);
    }
    showQuestion();
  }

  function showQuestion() {
    screen = 'question';
    const spec = session.queue[session.index];
    const problem = spec.archetypeId
      ? generateProblem({ archetypeId: spec.archetypeId, difficulty: spec.difficulty })
      : generateProblem({ skillId: spec.skillId, difficulty: spec.difficulty });
    current = { problem, hintsRevealed: 0, answered: false };

    renderQuestion();
  }

  function renderQuestion() {
    const { problem, hintsRevealed, answered } = current;
    const progressLabel = `Question ${session.index + 1} / ${session.queue.length} · ${session.label}`;
    const diffStars = '★'.repeat(problem.difficulty) + '☆'.repeat(5 - problem.difficulty);

    let answerArea;
    if (problem.type === 'numerical' || problem.type === 'vector') {
      answerArea = `
        <div class="numeric-row">
          <input class="numeric-input" id="numericAnswer" type="text" inputmode="decimal" placeholder="${problem.unit ? `answer (${problem.unit})` : 'answer'}" ${answered ? 'disabled' : ''} />
          <button class="big-btn" id="submitBtn" ${answered ? 'disabled' : ''}>Submit</button>
        </div>`;
    } else {
      answerArea = `<div class="choice-list">${problem.choices.map((c) => `<button class="choice-btn" data-choice="${escapeHtml(c)}" ${answered ? 'disabled' : ''}>${escapeHtml(c)}</button>`).join('')}</div>`;
    }

    const hintButtons = [0, 1, 2].map((i) => {
      if (i < hintsRevealed) return `<div class="hint-revealed">💡 Hint ${i + 1}: ${escapeHtml(problem.hints[i])}</div>`;
      if (i === hintsRevealed) return `<button class="small-btn hint-btn" data-hint="${i}">Show Hint ${i + 1} (${['Concept', 'Approach', 'Setup'][i]})</button>`;
      return '';
    }).join('');

    render(`
      <div class="exp-nav"><span class="exp-subheader" style="margin:0;">${progressLabel} &nbsp;·&nbsp; ${diffStars}</span></div>
      <div class="question-card">
        <div class="question-prompt">${escapeHtml(problem.prompt)}</div>
        ${problem.diagram ? '<canvas id="diagramCanvas" class="diagram-canvas"></canvas>' : ''}
        ${answerArea}
        <div class="hint-area">${hintButtons}</div>
        <div id="feedbackArea"></div>
        <div class="exp-actions" id="questionActions"></div>
      </div>
    `);

    if (problem.diagram) {
      const canvas = root.querySelector('#diagramCanvas');
      canvas.style.width = '100%';
      canvas.style.height = '160px';
      requestAnimationFrame(() => drawDiagram(canvas, problem.diagram));
    }

    root.querySelectorAll('.hint-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        current.hintsRevealed = parseInt(btn.dataset.hint, 10) + 1;
        renderQuestion();
      });
    });

    if (!answered) {
      if (problem.type === 'numerical' || problem.type === 'vector') {
        const input = root.querySelector('#numericAnswer');
        const submit = () => submitAnswer(input.value, null);
        root.querySelector('#submitBtn').addEventListener('click', submit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
        input.focus();
      } else {
        root.querySelectorAll('[data-choice]').forEach((btn) => {
          btn.addEventListener('click', () => submitAnswer(btn.dataset.choice, btn));
        });
      }
    } else {
      renderFeedback();
    }
  }

  function submitAnswer(rawValue, chosenBtn) {
    const { problem } = current;
    const { correct } = checkAnswer(problem, rawValue);
    current.answered = true;
    current.correct = correct;
    current.chosenValue = rawValue;

    if (problem.type === 'mc-calc' || problem.type === 'mc-concept' || problem.type === 'equation-select') {
      root.querySelectorAll('[data-choice]').forEach((btn) => {
        btn.disabled = true;
        if (btn.dataset.choice === problem.answer) btn.classList.add('correct');
        else if (btn === chosenBtn) btn.classList.add('incorrect');
      });
    } else {
      root.querySelector('#numericAnswer').disabled = true;
      root.querySelector('#submitBtn').disabled = true;
    }

    const skillId = problem.skillId;
    // Dev-tool "launch this archetype directly" sessions are a testing
    // sandbox — they shouldn't silently inflate a skill's real mastery stats.
    if (skillId && !session.forcedArchetype) mastery.recordAttempt(skillId, { correct, difficulty: problem.difficulty, hintsUsed: current.hintsRevealed });
    session.results.push({ skillId, difficulty: problem.difficulty, correct });

    let reward = { credits: 0, researchPoints: 0 };
    if (session.rewarded) {
      reward = computeReward(problem.difficulty, correct, current.hintsRevealed);
      if (session.researchBonus) {
        reward = { credits: Math.round(reward.credits * session.researchBonus), researchPoints: Math.round(reward.researchPoints * session.researchBonus) };
      }
      if (reward.credits > 0) awardCredits(reward.credits);
      if (reward.researchPoints > 0) awardResearch(reward.researchPoints);
      session.creditsEarned += reward.credits;
      session.researchEarned += reward.researchPoints;
    }
    current.reward = reward;
    renderFeedback();
  }

  function renderFeedback() {
    const { problem, correct, reward } = current;
    const feedback = root.querySelector('#feedbackArea');
    const rewardLine = session.rewarded && correct
      ? `CORRECT! +${reward.credits.toLocaleString()} credits, +${reward.researchPoints} research`
      : correct ? 'CORRECT!' : 'Not quite.';
    feedback.innerHTML = `
      <div class="feedback-box ${correct ? 'correct' : 'incorrect'}">
        <div class="feedback-reward">${rewardLine}</div>
        <div id="solutionArea"></div>
        ${current.solutionShown ? '' : '<button class="small-btn" id="showSolutionBtn">Show Full Solution</button>'}
      </div>
    `;
    if (current.solutionShown) renderSolution();
    else root.querySelector('#showSolutionBtn').addEventListener('click', () => { current.solutionShown = true; renderFeedback(); });

    const isLast = session.index >= session.queue.length - 1;
    root.querySelector('#questionActions').innerHTML = `<button class="big-btn" id="nextBtn">${isLast ? 'Finish Session' : 'Next Question'}</button>`;
    root.querySelector('#nextBtn').addEventListener('click', () => {
      if (isLast) showSummary();
      else { session.index++; showQuestion(); }
    });
  }

  function renderSolution() {
    const sol = current.problem.solution;
    const area = root.querySelector('#solutionArea');
    area.innerHTML = `
      <div class="solution-block">
        <div><b>Known:</b> ${sol.knowns.map(escapeHtml).join('; ')}</div>
        <div><b>Find:</b> ${escapeHtml(sol.unknown)}</div>
        <div><b>Principle:</b> ${escapeHtml(sol.principle)}</div>
        <div><b>Substitution:</b> ${escapeHtml(sol.substitution)}</div>
        <div><b>Algebra:</b> ${escapeHtml(sol.algebra)}</div>
        <div><b>Result:</b> ${escapeHtml(sol.result)}</div>
        <div class="feedback-explanation"><b>Interpretation:</b> ${escapeHtml(sol.interpretation)}</div>
      </div>
    `;
  }

  function showSummary() {
    screen = 'summary';
    const total = session.results.length;
    const correctCount = session.results.filter((r) => r.correct).length;
    const skillDeltas = Object.entries(session.masteryBefore).map(([skillId, before]) => {
      const after = mastery.accuracy(skillId);
      return { skillId, before, after };
    });
    render(`
      <div class="exp-header">${session.rewarded ? 'EXPEDITION COMPLETE' : 'SESSION COMPLETE'}</div>
      <div class="summary-stats">
        <div class="summary-big">${correctCount} / ${total} Correct</div>
        ${session.rewarded ? `<div class="summary-credits">+${session.creditsEarned.toLocaleString()} Credits &nbsp;·&nbsp; +${session.researchEarned} 🔬 Research</div>` : '<div class="summary-mastery">Free practice — no credits spent or earned.</div>'}
        ${skillDeltas.map((d) => `<div class="summary-mastery">Mastery (${d.skillId}): ${Math.round(d.before * 100)}% → ${Math.round(d.after * 100)}%</div>`).join('')}
        <button class="big-btn" id="doneBtn">${session.rewarded ? 'RETURN TO PARK' : 'CONTINUE'}</button>
      </div>
    `);
    root.querySelector('#doneBtn').addEventListener('click', () => {
      const wasRewarded = session.rewarded;
      const finish = session.onFinish;
      session = null;
      current = null;
      if (wasRewarded) { onClose(); return; }
      if (finish) finish(); else showHome();
    });
  }

  function close() {
    screen = null;
    session = null;
    current = null;
    onClose();
  }

  // Launched from the periodic "Research Opportunity" pop-up on the park
  // itself — a short REWARDED session (with a bonus multiplier) drawn from
  // weak skills across everything unlocked so far, not tied to any one
  // chapter/skill picker screen.
  function startResearchEvent({ rng, count, bonusMultiplier }) {
    const queue = buildSession({ mode: 'weak', count }, { mastery, rng });
    if (queue.length === 0) { showHome(); return; }
    startSession(queue, { rewarded: true, label: 'Field Research', onFinish: close });
    session.researchBonus = bonusMultiplier;
  }

  return {
    showHome,
    showGoOnSafari,
    startResearchEvent,
    isOpen: () => screen !== null,
  };
}
