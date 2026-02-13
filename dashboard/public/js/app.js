/**
 * Dashboard client — fetches data, renders DOM, handles test runs.
 */

let currentRunId = null;
let pollInterval = null;

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  loadSummary();
  loadLatestReport();
});

// --- API Helpers ---
async function api(path, opts) {
  const res = await fetch(path, opts);
  return res.json();
}

// --- Summary Cards ---
async function loadSummary() {
  try {
    const data = await api('/api/summary');
    document.getElementById('total-runs').textContent = data.totalRuns;

    const rateEl = document.getElementById('pass-rate');
    rateEl.textContent = data.passRate + '%';
    rateEl.className = 'card-value ' + (data.passRate >= 80 ? 'pass' : 'fail');

    document.getElementById('avg-duration').textContent = formatDuration(data.avgDuration);

    const statusEl = document.getElementById('last-status');
    statusEl.textContent = data.lastStatus;
    statusEl.className = 'card-value ' + (data.lastStatus === 'passed' ? 'pass' : data.lastStatus === 'failed' ? 'fail' : '');

    const health = document.getElementById('health-indicator');
    health.className = 'health ' + (data.lastStatus === 'passed' ? 'pass' : data.lastStatus === 'failed' ? 'fail' : 'unknown');

    // Draw charts
    if (data.history && data.history.length > 0) {
      drawTrendChart('trend-chart', data.history);
      drawDurationChart('duration-chart', data.history);
    }
  } catch (e) {
    console.error('Failed to load summary:', e);
  }
}

// --- Latest Report ---
async function loadLatestReport() {
  try {
    const report = await api('/api/reports/latest');
    renderTestList(report.tests);
    renderArticleData(report.tests);
  } catch (e) {
    // No reports yet — that's fine
  }
}

function renderTestList(tests) {
  const container = document.getElementById('latest-tests');
  if (!tests || tests.length === 0) {
    container.innerHTML = '<p class="muted">No test results available.</p>';
    return;
  }

  container.innerHTML = tests.map((t, i) => `
    <div class="test-item" onclick="toggleDetail(${i})">
      <span class="test-badge ${t.status}">${t.status}</span>
      <span class="test-title">${escapeHtml(t.suite ? t.suite + ' > ' + t.title : t.title)}</span>
      <span class="test-duration">${formatDuration(t.duration)}</span>
    </div>
    <div class="test-detail hidden" id="detail-${i}">${t.error ? escapeHtml(t.error.message) : 'Passed — no errors.'}</div>
  `).join('');
}

function toggleDetail(index) {
  const el = document.getElementById('detail-' + index);
  if (el) el.classList.toggle('hidden');
}

function renderArticleData(tests) {
  const container = document.getElementById('article-table-container');

  // Find article-data attachment in any test
  let articles = null;
  let violations = null;
  for (const t of tests) {
    if (t.attachments && t.attachments['article-data']) {
      articles = t.attachments['article-data'];
    }
    if (t.attachments && t.attachments['sort-violations']) {
      violations = t.attachments['sort-violations'];
    }
  }

  if (!articles || !Array.isArray(articles) || articles.length === 0) {
    container.innerHTML = '<p class="muted">No article data in latest report.</p>';
    return;
  }

  const violationIndices = new Set();
  if (violations && Array.isArray(violations)) {
    violations.forEach((v) => violationIndices.add(v.index));
  }

  const rows = articles.map((a) => {
    const isViolation = violationIndices.has(a.index);
    return `<tr class="${isViolation ? 'violation' : ''}">
      <td>${a.index}</td>
      <td>${escapeHtml(a.title)}</td>
      <td>${a.parsedTime ? new Date(a.parsedTime).toLocaleString() : a.timestamp}</td>
      <td>${a.url ? '<a href="' + escapeHtml(a.url) + '" target="_blank" style="color:var(--blue)">link</a>' : ''}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="table-scroll">
      <table>
        <thead><tr><th>#</th><th>Title</th><th>Timestamp</th><th>Link</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// --- Run Tests ---
async function triggerTestRun() {
  const btn = document.getElementById('run-btn');
  const browser = document.getElementById('browser-select').value;
  const suite = document.getElementById('suite-select').value;
  const statusEl = document.getElementById('run-status');
  const outputEl = document.getElementById('run-output');

  btn.disabled = true;
  statusEl.className = 'run-status running';
  statusEl.textContent = 'Starting test run...';
  statusEl.classList.remove('hidden');
  outputEl.textContent = '';
  outputEl.classList.remove('hidden');

  try {
    const data = await api('/api/run-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ browser, suite }),
    });

    currentRunId = data.runId;
    statusEl.textContent = `Running... (${data.runId})`;
    startPolling();
  } catch (e) {
    statusEl.className = 'run-status error';
    statusEl.textContent = 'Failed to start: ' + e.message;
    btn.disabled = false;
  }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    if (!currentRunId) return;

    try {
      const data = await api(`/api/run-tests/${currentRunId}/status`);
      const statusEl = document.getElementById('run-status');
      const outputEl = document.getElementById('run-output');

      outputEl.textContent = data.output || '';
      outputEl.scrollTop = outputEl.scrollHeight;

      if (data.status !== 'running') {
        clearInterval(pollInterval);
        pollInterval = null;
        statusEl.className = 'run-status ' + data.status;
        statusEl.textContent = `${data.status.toUpperCase()} (${formatDuration(new Date(data.finishedAt) - new Date(data.startedAt))})`;
        document.getElementById('run-btn').disabled = false;
        currentRunId = null;

        // Refresh data
        setTimeout(() => {
          loadSummary();
          loadLatestReport();
        }, 1000);
      }
    } catch (e) {
      console.error('Poll error:', e);
    }
  }, 2000);
}

// --- Helpers ---
function formatDuration(ms) {
  if (typeof ms !== 'number' || isNaN(ms)) return '—';
  if (ms < 1000) return Math.round(ms) + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  return (ms / 60000).toFixed(1) + 'm';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
