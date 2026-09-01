// A small in-game calculator scoped to exactly what the PHYS 211 problems
// actually use (confirmed by grepping src/physics/ch1-3archetypes.js for
// Math.* calls): the four operations, sqrt, x^y/x², sin/cos/tan and their
// inverses (all in degrees — every archetype gives/expects angles in
// degrees, never radians), and π. No log/ln (unused so far), no
// parentheses/expression parsing — like a real handheld scientific
// calculator, each button acts immediately on the current value.
//
// Floats as a small panel (no backdrop) so the question prompt underneath
// stays visible and usable while it's open — this isn't a blocking modal
// like Character Lab/Leaderboard, it's a reference tool meant to sit
// alongside a problem.

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

const UNARY_OPS = {
  sin: (x) => Math.sin(toRad(x)),
  cos: (x) => Math.cos(toRad(x)),
  tan: (x) => Math.tan(toRad(x)),
  'sin⁻¹': (x) => toDeg(Math.asin(x)),
  'cos⁻¹': (x) => toDeg(Math.acos(x)),
  'tan⁻¹': (x) => toDeg(Math.atan(x)),
  '√': (x) => Math.sqrt(x),
  'x²': (x) => x * x,
};

const BINARY_OPS = {
  '+': (a, b) => a + b,
  '−': (a, b) => a - b,
  '×': (a, b) => a * b,
  '÷': (a, b) => (b === 0 ? NaN : a / b),
  '^': (a, b) => Math.pow(a, b),
};

function formatNumber(n) {
  if (!isFinite(n)) return 'Error';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e10 || abs < 1e-6) {
    return n.toExponential(6).replace(/\.?0+e/, 'e').replace('e+', 'e');
  }
  // Round to 10 significant figures to kill float noise (e.g. 0.1+0.2),
  // then let Number->String trim any trailing zeros for us.
  return String(Number(n.toPrecision(10)));
}

export function createCalculator({ root }) {
  let display = '0';
  let storedValue = null;
  let pendingOp = null;
  let overwrite = true;
  let errored = false;

  function currentNumber() {
    return Number(display);
  }

  function applyPendingOp() {
    if (pendingOp === null || storedValue === null) return;
    const result = BINARY_OPS[pendingOp](storedValue, currentNumber());
    display = formatNumber(result);
    errored = display === 'Error';
    storedValue = null;
    pendingOp = null;
  }

  function inputDigit(d) {
    if (errored) clearAll();
    if (overwrite || display === '0') { display = d; overwrite = false; }
    else if (display.replace('-', '').replace('.', '').length < 12) display += d;
  }
  function inputDecimal() {
    if (errored) clearAll();
    if (overwrite) { display = '0.'; overwrite = false; return; }
    if (!display.includes('.')) display += '.';
  }
  function toggleSign() {
    if (errored) return;
    display = display.startsWith('-') ? display.slice(1) : (display === '0' ? '0' : '-' + display);
  }
  function backspace() {
    if (errored) { clearAll(); return; }
    if (overwrite) return;
    display = display.length > 1 ? display.slice(0, -1) : '0';
    if (display === '-') display = '0';
  }
  function clearAll() {
    display = '0'; storedValue = null; pendingOp = null; overwrite = true; errored = false;
  }
  function setBinaryOp(op) {
    if (errored) { clearAll(); }
    if (!errored) {
      applyPendingOp(); // chain left-to-right, no operator precedence — same as a basic calculator
      storedValue = currentNumber();
      pendingOp = op;
      overwrite = true;
    }
  }
  function equals() {
    if (errored) return;
    applyPendingOp();
    overwrite = true;
  }
  function applyUnary(fn) {
    if (errored) { clearAll(); return; }
    display = formatNumber(fn(currentNumber()));
    errored = display === 'Error';
    overwrite = true;
  }
  function insertPi() {
    if (errored) clearAll();
    display = formatNumber(Math.PI);
    overwrite = true;
  }

  function useInAnswer() {
    const target = document.getElementById('numericAnswer');
    if (!target || target.disabled) return;
    target.value = display;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.focus();
  }

  let displayEl = null;
  let useBtn = null;

  function refresh() {
    if (displayEl) displayEl.textContent = display;
    if (useBtn) {
      const target = document.getElementById('numericAnswer');
      useBtn.disabled = !target || target.disabled;
    }
  }

  function buildButton(label, onClick, extraClass) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'calc-btn' + (extraClass ? ' ' + extraClass : '');
    btn.textContent = label;
    btn.addEventListener('click', () => { onClick(); refresh(); });
    return btn;
  }

  function buildPanel() {
    root.innerHTML = '';
    root.className = 'pixel-panel';

    const header = document.createElement('div');
    header.className = 'calc-header';
    header.innerHTML = '<span title="Keyboard: 0–9, . , + − × ÷ ^, Enter, Backspace, C, Esc">🧮 CALCULATOR</span>';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'calc-close-btn';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', close);
    header.appendChild(closeBtn);
    root.appendChild(header);

    displayEl = document.createElement('div');
    displayEl.className = 'calc-display';
    displayEl.textContent = display;
    root.appendChild(displayEl);

    const grid = document.createElement('div');
    grid.className = 'calc-grid';

    const rows = [
      [['sin', () => applyUnary(UNARY_OPS.sin), 'calc-btn-fn'], ['cos', () => applyUnary(UNARY_OPS.cos), 'calc-btn-fn'], ['tan', () => applyUnary(UNARY_OPS.tan), 'calc-btn-fn'], ['^', () => setBinaryOp('^'), 'calc-btn-op']],
      [['sin⁻¹', () => applyUnary(UNARY_OPS['sin⁻¹']), 'calc-btn-fn'], ['cos⁻¹', () => applyUnary(UNARY_OPS['cos⁻¹']), 'calc-btn-fn'], ['tan⁻¹', () => applyUnary(UNARY_OPS['tan⁻¹']), 'calc-btn-fn'], ['√', () => applyUnary(UNARY_OPS['√']), 'calc-btn-fn']],
      [['π', insertPi, 'calc-btn-fn'], ['x²', () => applyUnary(UNARY_OPS['x²']), 'calc-btn-fn'], ['C', clearAll, 'calc-btn-clear'], ['⌫', backspace, 'calc-btn-clear']],
      [['7', () => inputDigit('7')], ['8', () => inputDigit('8')], ['9', () => inputDigit('9')], ['÷', () => setBinaryOp('÷'), 'calc-btn-op']],
      [['4', () => inputDigit('4')], ['5', () => inputDigit('5')], ['6', () => inputDigit('6')], ['×', () => setBinaryOp('×'), 'calc-btn-op']],
      [['1', () => inputDigit('1')], ['2', () => inputDigit('2')], ['3', () => inputDigit('3')], ['−', () => setBinaryOp('−'), 'calc-btn-op']],
      [['+/−', toggleSign], ['0', () => inputDigit('0')], ['.', inputDecimal], ['+', () => setBinaryOp('+'), 'calc-btn-op']],
    ];
    for (const row of rows) {
      for (const [label, fn, cls] of row) grid.appendChild(buildButton(label, fn, cls));
    }
    root.appendChild(grid);

    const equalsBtn = buildButton('=', equals, 'calc-btn-equals');
    root.appendChild(equalsBtn);

    useBtn = document.createElement('button');
    useBtn.type = 'button';
    useBtn.className = 'small-btn calc-use-btn';
    useBtn.textContent = '↩ Use as Answer';
    useBtn.addEventListener('click', useInAnswer);
    root.appendChild(useBtn);

    refresh();
  }

  function open() {
    if (root.classList.contains('hidden') === false && root.dataset.built === '1') {
      root.classList.remove('hidden');
      refresh();
      return;
    }
    buildPanel();
    root.dataset.built = '1';
    root.classList.remove('hidden');
  }
  function close() {
    root.classList.add('hidden');
  }
  function toggle() {
    if (root.classList.contains('hidden')) open(); else close();
  }
  function isOpen() {
    return !root.classList.contains('hidden');
  }

  // Digits/operators/Enter/Backspace/Escape work whenever the panel is open
  // — skipped while a real text field elsewhere has focus (e.g. the physics
  // answer box, a name input) so this never hijacks normal typing. createCalculator
  // is only ever instantiated once (a singleton, unlike the per-frame
  // pixelEditor instances), so this listener is added once for the app's
  // lifetime rather than needing its own open/close teardown.
  const KEY_TO_OP = { '+': '+', '-': '−', '*': '×', '/': '÷', '^': '^' };
  window.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key >= '0' && e.key <= '9') { e.preventDefault(); inputDigit(e.key); refresh(); return; }
    if (e.key === '.') { e.preventDefault(); inputDecimal(); refresh(); return; }
    if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); equals(); refresh(); return; }
    if (e.key === 'Backspace') { e.preventDefault(); backspace(); refresh(); return; }
    if (e.key.toLowerCase() === 'c') { e.preventDefault(); clearAll(); refresh(); return; }
    if (KEY_TO_OP[e.key]) { e.preventDefault(); setBinaryOp(KEY_TO_OP[e.key]); refresh(); return; }
  });

  return { open, close, toggle, isOpen };
}
