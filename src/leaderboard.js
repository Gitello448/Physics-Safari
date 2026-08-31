// Leaderboard: publicly viewable (guests included), ranked by skills
// mastered (>=4 stars). The developer account is excluded at the database
// level (see the `leaderboard` view's SQL) — never a client-side filter.
// Your own row (when visible) lets you edit your public display name.

import { fetchLeaderboard, setDisplayName } from './auth.js';

export function createLeaderboard({ root, getUserId }) {
  function render(html) { root.innerHTML = html; }

  function open() {
    root.classList.remove('hidden');
    document.getElementById('leaderboardBackdrop').classList.remove('hidden');
    load();
  }
  function close() {
    root.classList.add('hidden');
    document.getElementById('leaderboardBackdrop').classList.add('hidden');
  }

  async function load() {
    render(`<div class="cl-header">🏆 LEADERBOARD<span class="cl-sub">ranked by skills mastered (4+ stars)</span></div>
      <div class="cl-loading">Loading…</div>`);
    let rows;
    try {
      rows = await fetchLeaderboard();
    } catch (e) {
      render(`<div class="cl-header">🏆 LEADERBOARD</div><p class="cl-error">Couldn't load the leaderboard: ${escapeHtml(e.message || String(e))}</p>
        <div class="cl-actions"><button class="small-btn" id="lbCloseBtn">Close</button></div>`);
      document.getElementById('lbCloseBtn').addEventListener('click', close);
      return;
    }

    const myId = getUserId();
    render(`
      <div class="cl-header">🏆 LEADERBOARD<span class="cl-sub">ranked by skills mastered (4+ stars)</span></div>
      <div class="lb-list">
        ${rows.length === 0 ? '<div class="cl-empty">No one has mastered a skill yet — be the first!</div>' : rows.map((r, i) => `
          <div class="lb-row${r.user_id === myId ? ' lb-row-me' : ''}">
            <span class="lb-rank">#${i + 1}</span>
            <span class="lb-name">${r.user_id === myId
              ? `<input type="text" id="lbNameInput" class="lb-name-input numeric-input" value="${escapeHtml(r.display_name)}" maxlength="20" />`
              : escapeHtml(r.display_name)}</span>
            <span class="lb-score">${r.skills_mastered}</span>
          </div>`).join('')}
      </div>
      <div class="cl-actions">
        ${myId && rows.some((r) => r.user_id === myId) ? '<button class="small-btn" id="lbSaveName">Save Name</button>' : ''}
        <button class="small-btn" id="lbCloseBtn">Close</button>
      </div>
    `);
    document.getElementById('lbCloseBtn').addEventListener('click', close);
    document.getElementById('lbSaveName')?.addEventListener('click', async () => {
      const input = document.getElementById('lbNameInput');
      const name = input.value.trim();
      if (!name) return;
      const btn = document.getElementById('lbSaveName');
      btn.disabled = true;
      try {
        await setDisplayName(myId, name);
        await load();
      } catch (e) {
        btn.disabled = false;
        window.alert('Could not save name: ' + (e.message || e));
      }
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return { open, close };
}
