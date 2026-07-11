const STORAGE_KEY = 'hackadminTeams';
let teams = [];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    teams = raw ? JSON.parse(raw) : [];
  } catch (e) {
    teams = [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

function shortHash() {
  return Math.random().toString(16).slice(2, 8);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.innerText = str;
  return d.innerHTML;
}

function render() {
  const tbody = document.getElementById('teamBody');
  const empty = document.getElementById('emptyState');
  const table = document.getElementById('teamTable');

  if (teams.length === 0) {
    tbody.innerHTML = '';
    table.style.display = 'none';
    empty.style.display = 'block';
  } else {
    table.style.display = '';
    empty.style.display = 'none';
    tbody.innerHTML = teams.map(t => `
      <tr data-id="${t.id}">
        <td><span class="hash">#${t.hash}</span><span class="team-name">${escapeHtml(t.name)}</span></td>
        <td>${t.link ? `<a class="repo-link" href="${escapeHtml(t.link)}" target="_blank" rel="noopener">↗ view</a>` : '<span style="color:var(--text-dim);font-family:var(--mono);font-size:12px;">—</span>'}</td>
        <td>
          <button class="badge ${t.status === 'done' ? 'done' : 'progress'}" onclick="toggle('${t.id}')">
            <span class="dot"></span>${t.status === 'done' ? 'submitted' : 'in progress'}
          </button>
        </td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="toggle status" onclick="toggle('${t.id}')">⟳</button>
            <button class="icon-btn danger" title="delete" onclick="del('${t.id}')">✕</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  const total = teams.length;
  const done = teams.filter(t => t.status === 'done').length;
  const pending = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('statPill').innerHTML = `<b>${done}</b> / ${total} shipped`;
  document.getElementById('buildPct').textContent = pct + '%';
  document.getElementById('segDone').style.width = (total ? (done / total) * 100 : 0) + '%';
  document.getElementById('segPending').style.width = (total ? (pending / total) * 100 : 0) + '%';
}

function addTeam() {
  const nameInput = document.getElementById('teamName');
  const linkInput = document.getElementById('link');
  const name = nameInput.value.trim();
  const link = linkInput.value.trim();
  if (!name) { nameInput.focus(); return; }

  teams.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    hash: shortHash(),
    name,
    link,
    status: 'progress'
  });

  nameInput.value = '';
  linkInput.value = '';
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
  persist();
  render();
}

document.getElementById('teamName').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTeam();
});
document.getElementById('link').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTeam();
});

load();
render();
