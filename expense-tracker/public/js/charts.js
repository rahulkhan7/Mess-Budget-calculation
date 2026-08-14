// ---------- Lightweight canvas chart helpers (no external libraries) ----------

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.parentElement.clientWidth;
  const height = 220;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, width, height };
}

// ---------- Donut chart: spending by category ----------
function drawDonutChart(canvas, data) {
  // data: [{ label, value, color }]
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return;

  const cx = width * 0.32;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 10;
  const innerRadius = radius * 0.6;

  let startAngle = -Math.PI / 2;

  data.forEach((d) => {
    const sliceAngle = (d.value / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();

    startAngle = endAngle;
  });

  // Center label
  ctx.fillStyle = '#e8e9ed';
  ctx.font = '600 14px Segoe UI';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Total', cx, cy - 8);
  ctx.font = '700 15px Segoe UI';
  ctx.fillText('₹' + Math.round(total).toLocaleString('en-IN'), cx, cy + 12);

  // Legend
  const legendX = width * 0.62;
  let legendY = 20;
  ctx.textAlign = 'left';
  ctx.font = '12px Segoe UI';

  data.slice(0, 6).forEach((d) => {
    ctx.fillStyle = d.color;
    ctx.fillRect(legendX, legendY - 8, 10, 10);
    ctx.fillStyle = '#e8e9ed';
    const pct = ((d.value / total) * 100).toFixed(0);
    ctx.fillText(`${d.label} (${pct}%)`, legendX + 16, legendY);
    legendY += 22;
  });
}

// ---------- Bar chart: daily spending ----------
function drawBarChart(canvas, labels, values, barColor = '#6c5ce7') {
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  if (values.length === 0) return;

  const padding = { top: 10, right: 10, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...values, 1);
  const barGap = 4;
  const barWidth = Math.max((chartW / values.length) - barGap, 2);

  // Y-axis grid lines (4 lines)
  ctx.strokeStyle = '#2a2e3d';
  ctx.fillStyle = '#9298a8';
  ctx.font = '10px Segoe UI';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 3; i++) {
    const y = padding.top + (chartH / 3) * i;
    const val = maxVal - (maxVal / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(Math.round(val).toString(), padding.left - 6, y + 3);
  }

  values.forEach((val, i) => {
    const barH = (val / maxVal) * chartH;
    const x = padding.left + i * (barWidth + barGap);
    const y = padding.top + chartH - barH;

    ctx.fillStyle = barColor;
    ctx.fillRect(x, y, barWidth, barH);

    // Show every nth label to avoid overlap
    if (values.length <= 15 || i % Math.ceil(values.length / 10) === 0) {
      ctx.fillStyle = '#9298a8';
      ctx.font = '9px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barWidth / 2, height - padding.bottom + 14);
    }
  });
}

// ---------- Line chart: monthly trend ----------
function drawLineChart(canvas, labels, values, lineColor = '#a29bfe') {
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  if (values.length === 0) return;

  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...values, 1);
  const stepX = values.length > 1 ? chartW / (values.length - 1) : 0;

  // Grid
  ctx.strokeStyle = '#2a2e3d';
  ctx.fillStyle = '#9298a8';
  ctx.font = '10px Segoe UI';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 3; i++) {
    const y = padding.top + (chartH / 3) * i;
    const val = maxVal - (maxVal / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(Math.round(val).toString(), padding.left - 8, y + 3);
  }

  // Line
  ctx.beginPath();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2.5;
  values.forEach((val, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + chartH - (val / maxVal) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Fill under line
  ctx.lineTo(padding.left + (values.length - 1) * stepX, padding.top + chartH);
  ctx.lineTo(padding.left, padding.top + chartH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(162, 155, 254, 0.12)';
  ctx.fill();

  // Points + labels
  ctx.textAlign = 'center';
  values.forEach((val, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + chartH - (val / maxVal) * chartH;

    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();

    ctx.fillStyle = '#9298a8';
    ctx.font = '10px Segoe UI';
    ctx.fillText(labels[i], x, height - padding.bottom + 16);
  });
}
