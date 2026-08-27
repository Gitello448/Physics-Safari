import { World, STRUCTURE } from './world.js';
import { Camera } from './camera.js';
import { attachInput } from './input.js';
import { render } from './render.js';
import { Animal, ANIMAL_DEFS } from './animals.js';
import { Visitor, pickDestination, computeAttractionScore, targetVisitorCount } from './visitors.js';
import { BUILD_COSTS, PASSIVE_REVENUE, VISITORS } from './economy.js';
import { SkillMasteryStore } from './physics/mastery.js';
import { RESEARCH_EVENT, computeReward } from './physics/rewards.js';
import { buildSession } from './physics/practice.js';
import { mulberry32, newSeed } from './physics/rng.js';
import { createEduUI } from './eduUI.js';
import { ExpeditionScenery } from './expeditionScenery.js';
import { onAuthStateChange, signUp, signIn, signOut, ensurePlayerRows, fetchCloudSave, writeCloudSave } from './auth.js';

const SAVE_KEY = 'safari-scholar-save-v3';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const world = new World();
const camera = new Camera(canvas);

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  camera.viewW = w;
  camera.viewH = h;
}
window.addEventListener('resize', resize);
resize();

let animals = [];
let visitors = [];
let credits = 5000;
let researchPoints = 0;
const mastery = new SkillMasteryStore();

// --- Development / preview mode ---------------------------------------
// OFF by default on every load (never persisted) so the real economy is
// always what a fresh session sees. Purchases still show their normal
// prices; dev mode just bypasses the affordability check and skips the
// real deduction, so the underlying credits value is never touched by it
// and the actual economy keeps working exactly the same once disabled.
let devMode = false;
const devBadgeEl = document.getElementById('devBadge');
const devToggleBtn = document.getElementById('devModeToggle');
function setDevMode(on) {
  devMode = on;
  devBadgeEl.classList.toggle('hidden', !devMode);
  devToggleBtn.classList.toggle('active', devMode);
}
devToggleBtn.addEventListener('click', () => setDevMode(!devMode));

function canAfford(cost) { return devMode || credits >= cost; }
function spend(cost) { if (!devMode) { credits -= cost; updateCreditsUI(); } }

// --- Account (Phase 2: Supabase is the authoritative save for logged-in
// accounts; local storage remains for guest/offline play only) -----------
const authBtn = document.getElementById('authBtn');
const authBackdropEl = document.getElementById('authBackdrop');
const authPanelEl = document.getElementById('authPanel');
const authLoggedOutEl = document.getElementById('authLoggedOut');
const authLoggedInEl = document.getElementById('authLoggedIn');
const authEmailInput = document.getElementById('authEmail');
const authPasswordInput = document.getElementById('authPassword');
const authMessageEl = document.getElementById('authMessage');
const authEmailDisplayEl = document.getElementById('authEmailDisplay');

function showAuthPanel() {
  authPanelEl.classList.remove('hidden');
  authBackdropEl.classList.remove('hidden');
  setAuthMessage('');
}
function hideAuthPanel() {
  authPanelEl.classList.add('hidden');
  authBackdropEl.classList.add('hidden');
}
function setAuthMessage(text, isSuccess = false) {
  authMessageEl.textContent = text;
  authMessageEl.classList.toggle('hidden', !text);
  authMessageEl.classList.toggle('success', isSuccess);
}

authBtn.addEventListener('click', showAuthPanel);
authBackdropEl.addEventListener('click', hideAuthPanel);
document.getElementById('authCancelBtn').addEventListener('click', hideAuthPanel);

document.getElementById('authSignInBtn').addEventListener('click', async () => {
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  if (!email || !password) { setAuthMessage('Enter both an email and password.'); return; }
  setAuthMessage('Logging in…');
  try {
    await signIn(email, password);
    setAuthMessage('');
  } catch (e) {
    setAuthMessage(e.message || 'Could not log in.');
  }
});

document.getElementById('authSignUpBtn').addEventListener('click', async () => {
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  if (!email || !password) { setAuthMessage('Enter both an email and password.'); return; }
  if (password.length < 6) { setAuthMessage('Password must be at least 6 characters.'); return; }
  setAuthMessage('Creating account…');
  try {
    const data = await signUp(email, password);
    if (data.session) {
      setAuthMessage('');
    } else {
      setAuthMessage('Account created — check your email to confirm it, then log in.', true);
    }
  } catch (e) {
    setAuthMessage(e.message || 'Could not create account.');
  }
});

document.getElementById('authSignOutBtn').addEventListener('click', async () => {
  try { await signOut(); } catch (e) { /* ignore */ }
});

// --- Cloud save wiring ---------------------------------------------------
// cloudUserId is null in guest mode. Whenever it's set, persist() writes to
// Supabase (debounced) instead of localStorage, and that account's row is
// authoritative on every future login. Local storage is only ever read/
// written in guest mode, so it can never be silently mixed between accounts.
let cloudUserId = null;
let cloudSaveTimer = null;
const CLOUD_SAVE_DEBOUNCE_MS = 2000;

function currentGameStateBlob() {
  return {
    credits,
    researchPoints,
    structures: world.exportStructures(),
    animals: animals.map((a) => ({ species: a.species, x: a.tileX, y: a.tileY })),
    mastery: mastery.toJSON(),
  };
}

function applyGameStateBlob(data) {
  credits = typeof data.credits === 'number' ? data.credits : 5000;
  researchPoints = typeof data.researchPoints === 'number' ? data.researchPoints : 0;
  world.clearStructures();
  if (Array.isArray(data.structures)) world.loadStructures(data.structures);
  animals = Array.isArray(data.animals) ? data.animals.map(({ species, x, y }) => new Animal(species, x, y)) : [];
  mastery.bySkill = new SkillMasteryStore(data.mastery && typeof data.mastery === 'object' ? data.mastery : {}).bySkill;
  updateCreditsUI();
  updateResearchUI();
}

function readLocalBlob() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function guestHasMeaningfulProgress(blob) {
  if (!blob) return false;
  if (typeof blob.credits === 'number' && blob.credits !== 5000) return true;
  if (typeof blob.researchPoints === 'number' && blob.researchPoints > 0) return true;
  if (Array.isArray(blob.structures) && blob.structures.length > 0) return true;
  if (Array.isArray(blob.animals) && blob.animals.length > 0) return true;
  if (blob.mastery && typeof blob.mastery === 'object' && Object.keys(blob.mastery).length > 0) return true;
  return false;
}

function loadLocalIntoGame() {
  applyGameStateBlob(readLocalBlob() || {});
}

async function flushCloudSave(userId) {
  if (!userId) return;
  const blob = currentGameStateBlob();
  try {
    await writeCloudSave(userId, {
      credits: blob.credits,
      researchPoints: blob.researchPoints,
      parkState: { structures: blob.structures, animals: blob.animals },
      curriculumState: { mastery: blob.mastery },
    });
  } catch (e) {
    console.warn('cloud save failed', e);
  }
}

// Set while an account switch is actively loading/deciding (network round
// trips + a possible Import/Start Fresh prompt). persist() is a no-op during
// this window so nothing — e.g. a passive-revenue tick — can schedule a
// write of the OLD in-memory state under the NEW account's id before that
// account's own data has actually been applied.
let switchingAccount = false;

function scheduleCloudSave() {
  if (switchingAccount) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => flushCloudSave(cloudUserId), CLOUD_SAVE_DEBOUNCE_MS);
}

const cloudSyncBackdropEl = document.getElementById('cloudSyncBackdrop');
const cloudSyncPanelEl = document.getElementById('cloudSyncPanel');
const cloudSyncBodyEl = document.getElementById('cloudSyncBody');

function showImportChoice(guestBlob, userId) {
  const guestCredits = typeof guestBlob.credits === 'number' ? guestBlob.credits : 5000;
  const structCount = Array.isArray(guestBlob.structures) ? guestBlob.structures.length : 0;
  const animalCount = Array.isArray(guestBlob.animals) ? guestBlob.animals.length : 0;
  cloudSyncBodyEl.textContent = `This account doesn't have a saved park yet, but this browser has an existing guest park (🪙${guestCredits.toLocaleString()}, ${structCount} built tiles, ${animalCount} animals). Import it into this account, or start fresh?`;
  cloudSyncBackdropEl.classList.remove('hidden');
  cloudSyncPanelEl.classList.remove('hidden');

  function cleanup() {
    cloudSyncBackdropEl.classList.add('hidden');
    cloudSyncPanelEl.classList.add('hidden');
    importBtn.removeEventListener('click', onImport);
    freshBtn.removeEventListener('click', onFresh);
  }
  const importBtn = document.getElementById('cloudSyncImportBtn');
  const freshBtn = document.getElementById('cloudSyncFreshBtn');
  async function onImport() {
    cleanup();
    applyGameStateBlob(guestBlob);
    await flushCloudSave(userId);
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    toast('Imported your guest park into this account.');
  }
  async function onFresh() {
    cleanup();
    await flushCloudSave(userId);
    toast('Started a fresh park for this account.');
  }
  importBtn.addEventListener('click', onImport);
  freshBtn.addEventListener('click', onFresh);
}

async function switchToCloudAccount(userId) {
  toast('Loading your saved park…');
  await ensurePlayerRows(userId);
  const row = await fetchCloudSave(userId);
  const hasSavedBefore = row && row.park_state && Array.isArray(row.park_state.structures);
  console.info('[cloud-save] switchToCloudAccount', {
    userId, hasSavedBefore,
    row: row && { credits: row.credits, researchPoints: row.research_points, structCount: row.park_state && row.park_state.structures && row.park_state.structures.length, animalCount: row.park_state && row.park_state.animals && row.park_state.animals.length },
  });

  if (hasSavedBefore) {
    applyGameStateBlob({
      credits: row.credits,
      researchPoints: row.research_points,
      structures: row.park_state.structures,
      animals: row.park_state.animals,
      mastery: (row.curriculum_state && row.curriculum_state.mastery) || {},
    });
    toast('Loaded your saved park.');
    return;
  }

  // Brand-new account: never auto-copy guest progress. Reset to a clean
  // slate first so nothing from a previous account lingers on screen, then
  // decide what to do with whatever's sitting in the local guest slot.
  const guestBlob = readLocalBlob();
  applyGameStateBlob({});
  if (guestHasMeaningfulProgress(guestBlob)) {
    console.info('[cloud-save] offering guest import', { userId, guestBlob });
    showImportChoice(guestBlob, userId);
  } else {
    console.info('[cloud-save] starting fresh, no meaningful guest progress', { userId });
    await flushCloudSave(userId);
  }
}

onAuthStateChange((session) => {
  authBtn.classList.toggle('active', !!session);
  if (session) {
    authLoggedOutEl.classList.add('hidden');
    authLoggedInEl.classList.remove('hidden');
    authEmailDisplayEl.textContent = session.user.email;
  } else {
    authLoggedOutEl.classList.remove('hidden');
    authLoggedInEl.classList.add('hidden');
  }

  const newUserId = session ? session.user.id : null;
  console.info('[cloud-save] auth state change', { newUserId, cloudUserId, switchingAccount });
  if (newUserId === cloudUserId) return; // token refresh etc. — nothing actually changed

  (async () => {
    switchingAccount = true;
    try {
      const previousUserId = cloudUserId;
      if (previousUserId) {
        clearTimeout(cloudSaveTimer);
        await flushCloudSave(previousUserId);
      }
      cloudUserId = newUserId;

      if (!newUserId) {
        loadLocalIntoGame();
        return;
      }
      try {
        await switchToCloudAccount(newUserId);
      } catch (e) {
        console.warn('cloud save load failed', e);
        toast('Could not load your saved park — check your connection and try again.');
      }
    } finally {
      switchingAccount = false;
    }
  })();
});

const creditsEl = document.getElementById('creditsValue');
const researchEl = document.getElementById('researchValue');
const visitorEl = document.getElementById('visitorValue');
const toastEl = document.getElementById('toast');
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2200);
}

function updateCreditsUI(pulse = false) {
  creditsEl.textContent = credits.toLocaleString();
  if (pulse) {
    const el = document.getElementById('credits');
    el.classList.remove('pulse');
    // force reflow so the animation replays even if it's already mid-pulse
    void el.offsetWidth;
    el.classList.add('pulse');
  }
}
updateCreditsUI();

function awardCredits(amount) {
  if (amount === 0) return;
  credits += amount;
  updateCreditsUI(true);
  persist();
}

function updateResearchUI() {
  researchEl.textContent = researchPoints.toLocaleString();
}
updateResearchUI();

function awardResearch(amount) {
  if (amount === 0) return;
  researchPoints += amount;
  updateResearchUI();
  persist();
}

let currentTool = 'pan';
const toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
toolButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTool = btn.dataset.tool;
    toolButtons.forEach((b) => b.classList.toggle('active', b === btn));
  });
});
toolButtons[0].classList.add('active');

function isPlacementValid(x, y) {
  if (currentTool === 'pan' || currentTool === 'delete') return true;
  if (currentTool === 'path' || currentTool === 'fence' || currentTool === 'gate') {
    return world.isBuildable(x, y) && !world.structures[y][x];
  }
  if (currentTool.startsWith('animal:')) {
    const habitat = world.habitatAt(x, y);
    return !!(habitat && habitat.enclosed && !animalAt(x, y));
  }
  return true;
}

function animalAt(x, y) {
  return animals.find((a) => a.tileX === x && a.tileY === y);
}

// --- Expedition HQ ------------------------------------------------------
const hqPromptEl = document.getElementById('hqPrompt');
const hqBackdropEl = document.getElementById('hqBackdrop');
const expeditionEl = document.getElementById('expedition');
const expeditionScenery = new ExpeditionScenery(document.getElementById('expeditionBg'));

function showHqPrompt() {
  hqPromptEl.classList.remove('hidden');
  hqBackdropEl.classList.remove('hidden');
}
function hideHqPrompt() {
  hqPromptEl.classList.add('hidden');
  hqBackdropEl.classList.add('hidden');
}
document.getElementById('hqCancelBtn').addEventListener('click', hideHqPrompt);
hqBackdropEl.addEventListener('click', hideHqPrompt);
document.getElementById('hqGoBtn').addEventListener('click', () => {
  hideHqPrompt();
  openEdu();
  eduUI.showGoOnSafari();
});

function openEdu() {
  expeditionEl.classList.remove('hidden');
  expeditionScenery.start();
}

const eduUI = createEduUI({
  root: document.getElementById('expeditionContent'),
  mastery,
  isDevMode: () => devMode,
  awardCredits,
  awardResearch,
  onClose: () => {
    expeditionEl.classList.add('hidden');
    expeditionScenery.stop();
    persist();
  },
});

document.getElementById('eduHomeBtn').addEventListener('click', () => {
  openEdu();
  eduUI.showHome();
});

function onAction(x, y) {
  if (!world.inBounds(x, y)) return;

  if (world.isHQTile(x, y)) {
    showHqPrompt();
    return;
  }

  if (currentTool === 'pan') return;

  if (currentTool === 'delete') {
    const a = animalAt(x, y);
    if (a) {
      animals = animals.filter((an) => an !== a);
      toast(`Removed ${ANIMAL_DEFS[a.species].name}.`);
      persist();
      return;
    }
    if (world.removeStructure(x, y)) {
      persist();
    }
    return;
  }

  if (currentTool === 'path' || currentTool === 'fence' || currentTool === 'gate') {
    const kind = { path: STRUCTURE.PATH, fence: STRUCTURE.FENCE, gate: STRUCTURE.GATE }[currentTool];
    const cost = BUILD_COSTS[currentTool];
    if (!world.isBuildable(x, y) || world.structures[y][x]) return;
    if (!canAfford(cost)) { toast(`Not enough credits — need 🪙${cost}.`); return; }
    if (world.placeStructure(x, y, kind)) {
      spend(cost);
      persist();
    }
    return;
  }

  if (currentTool.startsWith('animal:')) {
    const species = currentTool.split(':')[1];
    const def = ANIMAL_DEFS[species];
    const habitat = world.habitatAt(x, y);
    if (!habitat || !habitat.enclosed) {
      toast('THIS HABITAT IS NOT FULLY ENCLOSED');
      return;
    }
    if (animalAt(x, y)) return;
    if (!canAfford(def.cost)) { toast(`Not enough credits — need 🪙${def.cost}.`); return; }
    spend(def.cost);
    animals.push(new Animal(species, x, y));
    toast(`${def.name} placed in habitat!`);
    persist();
    return;
  }
}

const input = attachInput(canvas, camera, {
  getTool: () => currentTool,
  onAction,
  isPlacementValid,
});
input.state.isPlacementValid = isPlacementValid;

// Guest mode writes straight to localStorage; logged-in mode debounces a
// write to that account's Supabase row instead (see cloud save wiring above).
function persist() {
  if (cloudUserId) {
    scheduleCloudSave();
    return;
  }
  const data = currentGameStateBlob();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
}

// Guest state loads immediately at boot so there's no blank-park flash while
// auth resolves asynchronously; onAuthStateChange (above) then overrides this
// with the account's cloud save if the player turns out to already be logged in.
loadLocalIntoGame();

// Make sure the last few seconds of play aren't lost if the tab is closed
// or backgrounded right after an edit, since cloud saves are debounced.
window.addEventListener('beforeunload', () => {
  if (cloudUserId) { clearTimeout(cloudSaveTimer); flushCloudSave(cloudUserId); }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && cloudUserId) {
    clearTimeout(cloudSaveTimer);
    flushCloudSave(cloudUserId);
  }
});

// --- Visitors: population target tracks how developed the park is ------
let populationCheckAccum = 0;
let spawnAccum = 0;
let targetPopulation = 0;

function updateVisitorPopulation(dt) {
  populationCheckAccum += dt;
  if (populationCheckAccum >= VISITORS.populationCheckMs) {
    populationCheckAccum = 0;
    targetPopulation = world.spawnTile ? targetVisitorCount(computeAttractionScore(world, animals)) : 0;
  }

  spawnAccum += dt;
  if (spawnAccum >= VISITORS.spawnIntervalMs) {
    spawnAccum = 0;
    const active = visitors.filter((v) => v.state !== 'gone').length;
    if (active < targetPopulation && world.spawnTile) {
      visitors.push(new Visitor(world.spawnTile));
    } else if (active > targetPopulation) {
      const candidate = visitors.find((v) => v.state === 'walking' || v.state === 'paused');
      if (candidate) candidate.state = 'leaving';
    }
  }

  for (const v of visitors) v.update(dt, world, pickDestination);
  if (visitors.length > 0) visitors = visitors.filter((v) => v.state !== 'gone');

  visitorEl.textContent = visitors.length;
}

// --- Passive park revenue (deliberately small next to expedition rewards) ---
let revenueAccum = 0;
function updatePassiveRevenue(dt) {
  revenueAccum += dt;
  if (revenueAccum < PASSIVE_REVENUE.tickMs) return;
  revenueAccum = 0;

  const speciesVariety = new Set(animals.map((a) => a.species)).size;
  const raw = PASSIVE_REVENUE.base
    + visitors.length * PASSIVE_REVENUE.perVisitor
    + animals.length * PASSIVE_REVENUE.perAnimal
    + speciesVariety * PASSIVE_REVENUE.perSpeciesVariety;
  const revenue = Math.round(Math.min(raw, PASSIVE_REVENUE.maxPerTick));
  if (revenue > 0) {
    credits += revenue;
    updateCreditsUI(true);
    persist();
  }
}

// --- Research Opportunity: an occasional, optional physics pop-up. Not
// gating any purchase — just a bonus-flavored nudge back toward studying,
// per the "meaningful events at reasonable intervals" design goal. ---------
const researchPanelEl = document.getElementById('researchOpportunity');
let researchEventTimer = null;
function scheduleNextResearchEvent() {
  clearTimeout(researchEventTimer);
  const delay = RESEARCH_EVENT.minIntervalMs + Math.random() * (RESEARCH_EVENT.maxIntervalMs - RESEARCH_EVENT.minIntervalMs);
  researchEventTimer = setTimeout(() => researchPanelEl.classList.remove('hidden'), delay);
}
document.getElementById('researchDismissBtn').addEventListener('click', () => {
  researchPanelEl.classList.add('hidden');
  scheduleNextResearchEvent();
});
document.getElementById('researchGoBtn').addEventListener('click', () => {
  researchPanelEl.classList.add('hidden');
  openEdu();
  eduUI.startResearchEvent({
    rng: mulberry32(newSeed()),
    count: RESEARCH_EVENT.questionCount,
    bonusMultiplier: RESEARCH_EVENT.bonusMultiplier,
  });
  scheduleNextResearchEvent();
});
scheduleNextResearchEvent();

window.__ss = {
  world, camera, Animal, ANIMAL_DEFS, mastery, Visitor, pickDestination,
  computeAttractionScore, targetVisitorCount, buildSession,
  get animals() { return animals; },
  set animals(v) { animals = v; },
  get visitors() { return visitors; },
  set visitors(v) { visitors = v; },
  get credits() { return credits; },
  set credits(v) { credits = v; },
  get researchPoints() { return researchPoints; },
  setDevMode, expeditionScenery, eduUI,
};

let lastT = performance.now();
function loop(t) {
  const dt = Math.min(64, t - lastT);
  lastT = t;

  if (!eduUI.isOpen()) input.panFromKeys(dt);
  for (const a of animals) a.update(dt, world);
  updateVisitorPopulation(dt);
  updatePassiveRevenue(dt);

  render(ctx, canvas, world, camera, animals, visitors, input.state, t);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
