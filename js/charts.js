/**
 * charts.js
 * Gestión de todos los gráficos con Chart.js.
 * Soporta: donut dashboard, barra presupuesto vs real, línea tendencia, barra diaria.
 */

const chartInstances = {};

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      labels: {
        color: '#94a3b8',
        font: { family: 'DM Mono', size: 11 },
        boxWidth: 10,
        padding: 12,
      }
    },
    tooltip: {
      backgroundColor: '#1e2535',
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      borderColor: '#2d3748',
      borderWidth: 1,
      padding: 10,
      titleFont: { family: 'Syne', weight: '700' },
      bodyFont: { family: 'DM Mono', size: 11 },
      callbacks: {
        label: ctx => ` $${Number(ctx.raw).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`,
      }
    }
  },
};


function destroyChart(id) {
  if (chartInstances[id]) {
    try { chartInstances[id].destroy(); } catch(e) {}
    delete chartInstances[id];
  }
}

/* ─── RING / MINI DONUT ─────────────────────── */

function renderRingChart(pct) {
  const canvas = document.getElementById('ring-chart');
  if (!canvas) return;
  destroyChart('ring');
  const color = pct >= 100 ? '#ef4444' : pct >= 8 ? '#f97316' : '#10b981';
  chartInstances['ring'] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [Math.min(pct, 100), Math.max(0, 100 - Math.min(pct, 100))],
        backgroundColor: [color, '#1e2535'],
        borderWidth: 0,
        hoverOffset: 0,
      }]
    },
    options: {
      cutout: '75%',
      responsive: false,
      maintainAspectRatio: true,
      aspectRatio: 1,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { animateRotate: true, duration: 800 }
    }
  });
  const label = document.getElementById('ring-pct');
  if (label) label.textContent = `${Math.round(pct)}%`;
}

/* ─── DONUT DASHBOARD ─────────────────────── */

function renderDashDonut(expensesByCategory) {
  const canvas = document.getElementById('dash-donut');
  const noData = document.getElementById('no-categories');
  if (!canvas) return;

  destroyChart('dashDonut');

  const entries = Object.entries(expensesByCategory).filter(([,v]) => v > 0);
  if (entries.length === 0) {
    canvas.style.display = 'none';
    if (noData) noData.classList.remove('hidden');
    return;
  }
  canvas.style.display = '';
  if (noData) noData.classList.add('hidden');

  const labels = entries.map(([id]) => {
    const cat = getCategoryById(id);
    return cat ? `${cat.icon} ${cat.label}` : id;
  });
  const data   = entries.map(([,v]) => v);
  const colors = entries.map(([id]) => {
    const cat = getCategoryById(id);
    return cat ? cat.color : '#6b7280';
  });

  chartInstances['dashDonut'] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor: colors,
        borderWidth: 1,
        hoverOffset: 6,
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      aspectRatio: 1.8,
      cutout: '65%',
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: { ...CHART_DEFAULTS.plugins.legend, position: 'bottom' }
      }
    }
  });
}

/* ─── BAR: PRESUPUESTO VS REAL ──────────────── */

function renderBudgetVsRealChart(budgets, spentByCategory) {
  const canvas = document.getElementById('bar-budget-vs-real');
  if (!canvas) return;
  destroyChart('barBudget');

  const cats = CATEGORIES.filter(c => budgets[c.id] > 0 || spentByCategory[c.id] > 0);
  if (cats.length === 0) {
    canvas.style.display = 'none';
    return;
  }
  canvas.style.display = '';

  const labels     = cats.map(c => `${c.icon} ${c.label}`);
  const budgetVals = cats.map(c => budgets[c.id] || 0);
  const realVals   = cats.map(c => spentByCategory[c.id] || 0);

  chartInstances['barBudget'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Presupuesto',
          data: budgetVals,
          backgroundColor: 'rgba(245,158,11,0.3)',
          borderColor: '#f59e0b',
          borderWidth: 1,
        },
        {
          label: 'Gasto real',
          data: realVals,
          backgroundColor: realVals.map((v, i) =>
            v > budgetVals[i] ? 'rgba(239,68,68,0.6)' : 'rgba(16,185,129,0.6)'
          ),
          borderColor: realVals.map((v, i) =>
            v > budgetVals[i] ? '#ef4444' : '#10b981'
          ),
          borderWidth: 1,
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      aspectRatio: 2,
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { family: 'DM Mono', size: 10 } },
          grid: { color: '#2d3748' }
        },
        y: {
          ticks: {
            color: '#94a3b8', font: { family: 'DM Mono', size: 10 },
            callback: v => '$' + v.toLocaleString()
          },
          grid: { color: '#2d3748' }
        }
      }
    }
  });
}

/* ─── LINE: TENDENCIA MENSUAL ──────────────── */

function renderTrendChart(monthlyData) {
  const canvas = document.getElementById('line-trend');
  if (!canvas) return;
  destroyChart('lineTrend');

  if (!monthlyData || monthlyData.length === 0) {
    canvas.style.display = 'none';
    return;
  }
  canvas.style.display = '';

  const labels = monthlyData.map(m => m.label);
  const values = monthlyData.map(m => m.total);

  chartInstances['lineTrend'] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Gasto mensual',
        data: values,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#f59e0b',
        pointRadius: 4,
        tension: 0.35,
        fill: true,
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      aspectRatio: 2,
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { family: 'DM Mono', size: 10 } },
          grid: { color: '#2d3748' }
        },
        y: {
          ticks: {
            color: '#94a3b8', font: { family: 'DM Mono', size: 10 },
            callback: v => '$' + v.toLocaleString()
          },
          grid: { color: '#2d3748' }
        }
      }
    }
  });
}

/* ─── DONUT DISTRIBUCIÓN ─────────────────── */

function renderDistributionDonut(expensesByCategory) {
  const canvas = document.getElementById('donut-distribution');
  if (!canvas) return;
  destroyChart('donutDist');

  const entries = Object.entries(expensesByCategory).filter(([,v]) => v > 0);
  if (entries.length === 0) {
    canvas.style.display = 'none';
    return;
  }
  canvas.style.display = '';

  const labels = entries.map(([id]) => {
    const cat = getCategoryById(id);
    return cat ? `${cat.icon} ${cat.label}` : id;
  });
  const data   = entries.map(([,v]) => v);
  const colors = entries.map(([id]) => {
    const cat = getCategoryById(id); return cat ? cat.color : '#6b7280';
  });

  chartInstances['donutDist'] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + 'bb'),
        borderColor: '#0a0f1e',
        borderWidth: 2,
        hoverOffset: 8,
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      aspectRatio: 1.8,
      cutout: '55%',
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: { ...CHART_DEFAULTS.plugins.legend, position: 'right' }
      }
    }
  });
}

/* ─── BAR: GASTOS DIARIOS ─────────────────── */

function renderDailyBarChart(dailyData) {
  const canvas = document.getElementById('bar-daily');
  if (!canvas) return;
  destroyChart('barDaily');

  if (!dailyData || dailyData.length === 0) {
    canvas.style.display = 'none';
    return;
  }
  canvas.style.display = '';

  const labels = dailyData.map(d => d.day);
  const values = dailyData.map(d => d.total);
  const max    = Math.max(...values, 1);

  chartInstances['barDaily'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Gasto diario',
        data: values,
        backgroundColor: values.map(v =>
          v > max * 0.8 ? 'rgba(239,68,68,0.7)' :
          v > max * 0.5 ? 'rgba(249,115,22,0.7)' :
          'rgba(245,158,11,0.6)'
        ),
        borderRadius: 3,
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      aspectRatio: 2,
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { family: 'DM Mono', size: 10 } },
          grid: { color: '#2d3748' }
        },
        y: {
          ticks: {
            color: '#94a3b8', font: { family: 'DM Mono', size: 10 },
            callback: v => '$' + v.toLocaleString()
          },
          grid: { color: '#2d3748' }
        }
      }
    }
  });
}