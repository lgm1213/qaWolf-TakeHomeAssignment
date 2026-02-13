/**
 * Hand-rolled Canvas charts — no dependencies.
 */

const CHART_COLORS = {
  green: '#3fb950',
  red: '#f85149',
  blue: '#58a6ff',
  gridLine: '#21262d',
  text: '#8b949e',
  bg: '#0d1117',
};

function drawTrendChart(canvasId, history) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !history.length) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 20, right: 20, bottom: 30, left: 40 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  // Limit to last 20 runs
  const data = history.slice(-20);
  const maxVal = Math.max(...data.map((d) => d.total), 1);

  ctx.clearRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = CHART_COLORS.gridLine;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();

    ctx.fillStyle = CHART_COLORS.text;
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), pad.left - 6, y + 3);
  }

  if (data.length < 2) return;

  const xStep = plotW / (data.length - 1);

  function drawLine(values, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((val, i) => {
      const x = pad.left + i * xStep;
      const y = pad.top + plotH - (val / maxVal) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    ctx.fillStyle = color;
    values.forEach((val, i) => {
      const x = pad.left + i * xStep;
      const y = pad.top + plotH - (val / maxVal) * plotH;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawLine(data.map((d) => d.passed), CHART_COLORS.green);
  drawLine(data.map((d) => d.failed), CHART_COLORS.red);

  // X-axis labels
  ctx.fillStyle = CHART_COLORS.text;
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  const labelStep = Math.max(1, Math.floor(data.length / 6));
  data.forEach((d, i) => {
    if (i % labelStep === 0 || i === data.length - 1) {
      const x = pad.left + i * xStep;
      const label = new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      ctx.fillText(label, x, h - 8);
    }
  });

  // Legend
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = CHART_COLORS.green;
  ctx.fillRect(w - 130, 8, 10, 10);
  ctx.fillText('Passed', w - 116, 17);
  ctx.fillStyle = CHART_COLORS.red;
  ctx.fillRect(w - 130, 24, 10, 10);
  ctx.fillText('Failed', w - 116, 33);
}

function drawDurationChart(canvasId, history) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !history.length) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const data = history.slice(-20);
  const maxDur = Math.max(...data.map((d) => d.duration), 1);

  ctx.clearRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = CHART_COLORS.gridLine;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();

    ctx.fillStyle = CHART_COLORS.text;
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    const val = maxDur - (maxDur / 4) * i;
    ctx.fillText(formatDuration(val), pad.left - 6, y + 3);
  }

  const barWidth = Math.max(8, (plotW / data.length) * 0.6);
  const gap = (plotW - barWidth * data.length) / (data.length + 1);

  data.forEach((d, i) => {
    const barH = (d.duration / maxDur) * plotH;
    const x = pad.left + gap + i * (barWidth + gap);
    const y = pad.top + plotH - barH;

    ctx.fillStyle = d.status === 'passed' ? CHART_COLORS.green : CHART_COLORS.red;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x, y, barWidth, barH);
    ctx.globalAlpha = 1;
  });

  // X labels
  ctx.fillStyle = CHART_COLORS.text;
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  const labelStep = Math.max(1, Math.floor(data.length / 6));
  data.forEach((d, i) => {
    if (i % labelStep === 0 || i === data.length - 1) {
      const x = pad.left + gap + i * (barWidth + gap) + barWidth / 2;
      const label = new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      ctx.fillText(label, x, h - 8);
    }
  });
}

function formatDuration(ms) {
  if (ms < 1000) return Math.round(ms) + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}
