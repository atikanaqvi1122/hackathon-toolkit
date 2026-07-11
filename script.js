const STORAGE_KEY = 'hackadminTeams';
const THEME_KEY = 'hackadminTheme';

let teams = [];
let searchQuery = '';
let sortKey = null;   // 'name' | 'score' | 'status'
let sortDir = 1;      // 1 asc, -1 desc
let editingId = null;
let expandedId = null;
let viewMode = 'log'; // 'log' | 'leaderboard'

/* ---------- persistence ---------- */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    teams = raw ? JSON.parse(raw) : [];
  } catch (e) {
    teams = [];
  }
  // migrate older records to the current shape
  teams.forEach(t => {
    if (typeof t.description !== 'string') t.description = '';
    if (!t.scores || typeof t.scores !== 'object') {
      t.scores = { innovation: '', execution: '', presentation: '' };
      if (typeof t.score === 'number') t.scores.innovation = t.score;
    }
    ['innovation', 'execution', 'presentation'].forEach(k => {
      if (t.scores[k] === undefined) t.scores[k] = '';
    });
  });
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

function shortHash() {
  return Math.random().toString(16).slice(2, 8);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.innerText = str == null ? '' : String(str);
  return d.innerHTML;
}

function memberList(t) {
  return (t.members || '').split(',').map(s => s.trim()).filter(Boolean);
}

function avgScore(t) {
  const vals = ['innovation', 'execution', 'presentation']
    .map(k => t.scores ? t.scores[k] : '')
    .filter(v => v !== '' && v != null && !isNaN(v))
    .map(Number);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/* ---------- theme ---------- */
function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  btn.textContent = theme === 'dark' ? '☾ dark mode' : '☀ light mode';
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* ---------- view toggle ---------- */
function toggleView() {
  viewMode = viewMode === 'log' ? 'leaderboard' : 'log';
  const btn = document.getElementById('viewToggleBtn');
  btn.textContent = viewMode === 'log' ? '🏆 leaderboard' : '📋 team log';
  btn.classList.toggle('active', viewMode === 'leaderboard');
  document.getElementById('logWrap').style.display = viewMode === 'log' ? '' : 'none';
  document.getElementById('leaderboardWrap').style.display = viewMode === 'leaderboard' ? '' : 'none';
  render();
}

/* ---------- derived view (search + sort) ---------- */
function getVisibleTeams() {
  let list = teams.slice();

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.members || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  }

  if (sortKey) {
    list.sort((a, b) => {
      let av, bv;
      if (sortKey === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (sortKey === 'score') {
        const aa = avgScore(a), bb = avgScore(b);
        av = aa === null ? -Infinity : aa; bv = bb === null ? -Infinity : bb;
      }
      else if (sortKey === 'status') { av = a.status; bv = b.status; }
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
  }

  return list;
}

/* ---------- render ---------- */
function render() {
  updateSortArrows();

  if (viewMode === 'log') {
    renderLog();
  } else {
    renderLeaderboard();
  }

  const total = teams.length;
  const done = teams.filter(t => t.status === 'done').length;
  const pending = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const allAvgs = teams.map(avgScore).filter(v => v !== null);
  const overallAvg = allAvgs.length ? (allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length).toFixed(1) : '—';

  document.getElementById('statPill').innerHTML = `<b>${done}</b> / ${total} shipped`;
  document.getElementById('avgPill').innerHTML = `avg score <b>${overallAvg}</b>`;
  document.getElementById('buildPct').textContent = pct + '%';
  document.getElementById('segDone').style.width = (total ? (done / total) * 100 : 0) + '%';
  document.getElementById('segPending').style.width = (total ? (pending / total) * 100 : 0) + '%';
}

function renderLog() {
  const tbody = document.getElementById('teamBody');
  const empty = document.getElementById('emptyState');
  const table = document.getElementById('teamTable');
  const visible = getVisibleTeams();

  if (teams.length === 0) {
    tbody.innerHTML = '';
    table.style.display = 'none';
    empty.style.display = 'block';
    empty.innerHTML = `no teams logged yet — run <b>add-team</b> above to log your first entry<span class="cursor"></span>`;
  } else if (visible.length === 0) {
    tbody.innerHTML = '';
    table.style.display = 'none';
    empty.style.display = 'block';
    empty.innerHTML = `no matches for "<b>${escapeHtml(searchQuery)}</b>"`;
  } else {
    table.style.display = '';
    empty.style.display = 'none';
    tbody.innerHTML = visible.map(t => renderRow(t)).join('');
  }
}

function renderRow(t) {
  const avg = avgScore(t);
  const scoreDisplay = avg === null
    ? '<span class="score-cell empty">—</span>'
    : `<span class="score-cell">${avg.toFixed(1)}</span>`;
  const isEditing = editingId === t.id;
  const isExpanded = expandedId === t.id;

  const mainRow = isEditing ? `
    <tr class="main-row" data-id="${t.id}">
      <td></td>
      <td><input class="edit-input" id="edit-name-${t.id}" value="${escapeHtml(t.name)}"></td>
      <td><input class="edit-input" id="edit-link-${t.id}" value="${escapeHtml(t.link || '')}"></td>
      <td><input class="edit-input" id="edit-members-${t.id}" value="${escapeHtml(t.members || '')}"></td>
      <td>${scoreDisplay}</td>
      <td>
        <button class="badge ${t.status === 'done' ? 'done' : 'progress'}" onclick="toggle('${t.id}')">
          <span class="dot"></span>${t.status === 'done' ? 'submitted' : 'in progress'}
        </button>
      </td>
      <td>
        <div class="row-actions">
          <button class="icon-btn confirm" title="save" onclick="saveEdit('${t.id}')">✓</button>
          <button class="icon-btn" title="cancel" onclick="cancelEdit()">✕</button>
        </div>
      </td>
    </tr>
  ` : `
    <tr class="main-row" data-id="${t.id}">
      <td><button class="expand-btn ${isExpanded ? 'open' : ''}" title="details" onclick="toggleExpand('${t.id}')">▸</button></td>
      <td><span class="hash">#${t.hash}</span><span class="team-name">${escapeHtml(t.name)}</span></td>
      <td>${t.link ? `<a class="repo-link" href="${escapeHtml(t.link)}" target="_blank" rel="noopener">↗ view</a>` : '<span style="color:var(--text-dim);font-family:var(--mono);font-size:12px;">—</span>'}</td>
      <td><span class="member-count">${memberList(t).length} member${memberList(t).length === 1 ? '' : 's'}</span></td>
      <td>${scoreDisplay}</td>
      <td>
        <button class="badge ${t.status === 'done' ? 'done' : 'progress'}" onclick="toggle('${t.id}')">
          <span class="dot"></span>${t.status === 'done' ? 'submitted' : 'in progress'}
        </button>
      </td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" title="edit" onclick="startEdit('${t.id}')">✎</button>
          <button class="icon-btn" title="toggle status" onclick="toggle('${t.id}')">⟳</button>
          <button class="icon-btn danger" title="delete" onclick="del('${t.id}')">✕</button>
        </div>
      </td>
    </tr>
  `;

  const detailRow = isExpanded ? renderDetailRow(t) : '';
  return mainRow + detailRow;
}

function renderDetailRow(t) {
  const members = memberList(t);
  const s = t.scores || {};
  const avg = avgScore(t);

  return `
    <tr class="detail-row" data-detail-id="${t.id}">
      <td colspan="7">
        <div class="detail-panel">
          <div>
            <div class="detail-col-label">description</div>
            <textarea class="detail-textarea" id="desc-${t.id}" placeholder="What is this team building?">${escapeHtml(t.description || '')}</textarea>
            <div class="detail-col-label" style="margin-top:16px;">members (${members.length})</div>
            ${members.length
              ? `<div class="member-chips">${members.map(m => `<span class="member-chip">${escapeHtml(m)}</span>`).join('')}</div>`
              : `<span class="no-members">no members listed — edit the row to add names</span>`}
          </div>
          <div>
            <div class="detail-col-label">judging criteria</div>
            <div class="criteria-grid">
              ${criteriaRow(t.id, 'innovation', 'Innovation', s.innovation)}
              ${criteriaRow(t.id, 'execution', 'Execution', s.execution)}
              ${criteriaRow(t.id, 'presentation', 'Presentation', s.presentation)}
            </div>
            <div class="criteria-avg" id="avg-${t.id}">average: <b>${avg === null ? '—' : avg.toFixed(1)}</b> / 10</div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function criteriaRow(id, key, label, value) {
  const v = (value === '' || value == null) ? 0 : Number(value);
  return `
    <div class="criteria-row">
      <span class="criteria-label">${label}</span>
      <input type="range" min="0" max="10" step="1" value="${v}"
        oninput="onCriteriaInput('${id}','${key}', this.value)"
        onchange="onCriteriaChange('${id}','${key}', this.value)">
      <span class="criteria-value" id="val-${id}-${key}">${v}</span>
    </div>
  `;
}

function renderLeaderboard() {
  const container = document.getElementById('leaderboardList');
  let list = teams.slice();

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(t => t.name.toLowerCase().includes(q) || (t.members || '').toLowerCase().includes(q));
  }

  list.sort((a, b) => {
    const aa = avgScore(a), bb = avgScore(b);
    if (aa === null && bb === null) return a.name.localeCompare(b.name);
    if (aa === null) return 1;
    if (bb === null) return -1;
    return bb - aa;
  });

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state">no teams to rank yet</div>`;
    return;
  }

  container.innerHTML = list.map((t, i) => {
    const rank = i + 1;
    const medalClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
    const rankDisplay = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank;
    const avg = avgScore(t);
    const s = t.scores || {};
    return `
      <div class="lb-row">
        <div class="lb-rank ${medalClass}">${rankDisplay}</div>
        <div class="lb-main">
          <div class="lb-name">${escapeHtml(t.name)}</div>
          <div class="lb-sub">
            <span>I ${s.innovation === '' || s.innovation == null ? '—' : s.innovation}</span>
            <span>E ${s.execution === '' || s.execution == null ? '—' : s.execution}</span>
            <span>P ${s.presentation === '' || s.presentation == null ? '—' : s.presentation}</span>
            <span>${t.status === 'done' ? 'submitted' : 'in progress'}</span>
          </div>
        </div>
        <div class="lb-score ${avg === null ? 'empty' : ''}">${avg === null ? '—' : avg.toFixed(1)}</div>
      </div>
    `;
  }).join('');
}

function updateSortArrows() {
  ['name', 'score', 'status'].forEach(key => {
    const el = document.getElementById('arrow-' + key);
    if (!el) return;
    el.textContent = (sortKey === key) ? (sortDir === 1 ? '↑' : '↓') : '';
  });
}

/* ---------- actions ---------- */
function addTeam() {
  const nameInput = document.getElementById('teamName');
  const linkInput = document.getElementById('link');
  const membersInput = document.getElementById('members');

  const name = nameInput.value.trim();
  const link = linkInput.value.trim();
  const members = membersInput.value.trim();

  if (!name) { nameInput.focus(); return; }

  teams.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    hash: shortHash(),
    name,
    link,
    members,
    description: '',
    scores: { innovation: '', execution: '', presentation: '' },
    status: 'progress'
  });

  nameInput.value = '';
  linkInput.value = '';
  membersInput.value = '';
  nameInput.focus();
  persist();
  render();
}

function toggle(id) {
  const t = teams.find(t => t.id === id);
  if (!t) return;
  t.status = t.status === 'done' ? 'progress' : 'done';
  persist();
  render();
}

function del(id) {
  teams = teams.filter(t => t.id !== id);
  if (editingId === id) editingId = null;
  if (expandedId === id) expandedId = null;
  persist();
  render();
}

function startEdit(id) {
  editingId = id;
  render();
  const nameField = document.getElementById('edit-name-' + id);
  if (nameField) nameField.focus();
}

function cancelEdit() {
  editingId = null;
  render();
}

function saveEdit(id) {
  const t = teams.find(t => t.id === id);
  if (!t) return;

  const name = document.getElementById('edit-name-' + id).value.trim();
  const link = document.getElementById('edit-link-' + id).value.trim();
  const members = document.getElementById('edit-members-' + id).value.trim();

  if (!name) return;

  t.name = name;
  t.link = link;
  t.members = members;

  editingId = null;
  persist();
  render();
}

function toggleExpand(id) {
  expandedId = expandedId === id ? null : id;
  render();
}

/* description autosave on blur */
document.addEventListener('change', e => {
  if (e.target.id && e.target.id.startsWith('desc-')) {
    const id = e.target.id.replace('desc-', '');
    const t = teams.find(t => t.id === id);
    if (t) {
      t.description = e.target.value;
      persist();
    }
  }
});

/* criteria sliders: live label update while dragging, persist + full render on release */
function onCriteriaInput(id, key, value) {
  const label = document.getElementById(`val-${id}-${key}`);
  if (label) label.textContent = value;
  const t = teams.find(t => t.id === id);
  if (!t) return;
  t.scores[key] = Number(value);
  const avg = avgScore(t);
  const avgEl = document.getElementById('avg-' + id);
  if (avgEl) avgEl.innerHTML = `average: <b>${avg === null ? '—' : avg.toFixed(1)}</b> / 10`;
}

function onCriteriaChange(id, key, value) {
  const t = teams.find(t => t.id === id);
  if (!t) return;
  t.scores[key] = Number(value);
  persist();
  render();
}

/* ---------- search & sort wiring ---------- */
function onSearch(e) {
  searchQuery = e.target.value;
  render();
}

function onSortClick(key) {
  if (sortKey === key) {
    sortDir = sortDir * -1;
  } else {
    sortKey = key;
    sortDir = 1;
  }
  render();
}

/* ---------- CSV export ---------- */
function exportCsv() {
  const header = ['Team', 'Repo', 'Members', 'Member Count', 'Description', 'Innovation', 'Execution', 'Presentation', 'Avg Score', 'Status'];
  const rows = teams.map(t => {
    const avg = avgScore(t);
    const s = t.scores || {};
    return [
      t.name,
      t.link || '',
      t.members || '',
      memberList(t).length,
      t.description || '',
      s.innovation === '' ? '' : s.innovation,
      s.execution === '' ? '' : s.execution,
      s.presentation === '' ? '' : s.presentation,
      avg === null ? '' : avg.toFixed(1),
      t.status === 'done' ? 'submitted' : 'in progress'
    ];
  });

  const csv = [header, ...rows]
    .map(row => row.map(csvEscape).join(','))
    .join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'teams.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(val) {
  const str = String(val ?? '');
  if (/[",\r\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/* ---------- init ---------- */
document.getElementById('teamName').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTeam();
});
document.getElementById('link').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTeam();
});
document.getElementById('members').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTeam();
});
document.getElementById('searchInput').addEventListener('input', onSearch);

document.querySelectorAll('th.sortable').forEach(th => {
  th.addEventListener('click', () => onSortClick(th.getAttribute('data-key')));
});

loadTheme();
load();
render();
