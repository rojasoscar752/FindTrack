'use strict';

/* ═══════════════════════════════════════════
   SERVICE WORKER REGISTRATION
═══════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('[App] Service Worker registrado. Scope:', reg.scope);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('Nueva versión disponible. Recarga para actualizar.', 'info', 6000);
          }
        });
      });
    } catch (err) {
      console.error('[App] Error registrando Service Worker:', err);
    }
  });
}

/* ═══════════════════════════════════════════
   INSTALL PROMPT (PWA)
═══════════════════════════════════════════ */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const prompt = document.getElementById('install-prompt');
  if (prompt) prompt.classList.remove('hidden');
});

document.getElementById('btn-install')?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('[App] Install outcome:', outcome);
  deferredPrompt = null;
  document.getElementById('install-prompt')?.classList.add('hidden');
});

document.getElementById('btn-dismiss')?.addEventListener('click', () => {
  document.getElementById('install-prompt')?.classList.add('hidden');
});

window.addEventListener('appinstalled', () => {
  showToast('¡App instalada correctamente!', 'success');
  document.getElementById('install-prompt')?.classList.add('hidden');
  deferredPrompt = null;
});

/* ═══════════════════════════════════════════
   OFFLINE / ONLINE DETECTION
═══════════════════════════════════════════ */
function updateOnlineStatus() {
  const banner = document.getElementById('offline-banner');
  if (!banner) return;
  if (!navigator.onLine) {
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}
window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

/* ═══════════════════════════════════════════
   MODAL: AGREGAR / EDITAR GASTO
═══════════════════════════════════════════ */
const modal       = document.getElementById('modal-expense');
const form        = document.getElementById('expense-form');
const modalTitle  = document.getElementById('modal-title');

function openModal(expenseToEdit = null) {
  form.reset();
  clearFormErrors();

  populateCategorySelect(document.getElementById('exp-cat'));

  if (expenseToEdit) {
    modalTitle.textContent = 'Editar gasto';
    document.getElementById('exp-id').value      = expenseToEdit.id;
    document.getElementById('exp-desc').value    = expenseToEdit.description;
    document.getElementById('exp-amount').value  = expenseToEdit.amount;
    document.getElementById('exp-date').value    = expenseToEdit.date;
    document.getElementById('exp-cat').value     = expenseToEdit.category;
    document.getElementById('exp-notes').value   = expenseToEdit.notes || '';
  } else {
    modalTitle.textContent = 'Nuevo gasto';
    document.getElementById('exp-id').value      = '';
    document.getElementById('exp-date').value    = todayStr();
  }

  modal.classList.remove('hidden');
  document.getElementById('exp-desc').focus();
}

function closeModal() {
  modal.classList.add('hidden');
  form.reset();
  clearFormErrors();
}

document.getElementById('btn-open-modal')?.addEventListener('click', () => openModal());
document.getElementById('fab-add')?.addEventListener('click',         () => { navigateTo('gastos'); openModal(); });
document.getElementById('add-expense-quick')?.addEventListener('click', () => { navigateTo('gastos'); openModal(); });

document.getElementById('modal-close')?.addEventListener('click', closeModal);
document.getElementById('btn-cancel')?.addEventListener('click',   closeModal);
modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

/* ─── FORM VALIDATION ───────────────────────── */

function clearFormErrors() {
  ['desc','amount','date','cat'].forEach(f => {
    const input = document.getElementById(`exp-${f}`);
    const err   = document.getElementById(`err-${f}`);
    if (input) input.classList.remove('error');
    if (err)   err.textContent = '';
  });
}

function validateExpenseForm() {
  let valid = true;
  clearFormErrors();

  const desc   = document.getElementById('exp-desc').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const date   = document.getElementById('exp-date').value;
  const cat    = document.getElementById('exp-cat').value;

  if (!desc) {
    setFieldError('desc', 'La descripción es obligatoria');
    valid = false;
  }
  if (isNaN(amount) || amount <= 0) {
    setFieldError('amount', 'Ingrese un monto mayor a 0');
    valid = false;
  }
  if (!date) {
    setFieldError('date', 'Seleccione una fecha');
    valid = false;
  }
  if (!cat) {
    setFieldError('cat', 'Seleccione una categoría');
    valid = false;
  }
  return valid;
}

function setFieldError(field, msg) {
  const input = document.getElementById(`exp-${field}`);
  const err   = document.getElementById(`err-${field}`);
  if (input) input.classList.add('error');
  if (err)   err.textContent = msg;
}

/* ─── FORM SUBMIT ─────────────────────────── */

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateExpenseForm()) return;

  const saveBtn = document.getElementById('btn-save-expense');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';

  try {
    const id = document.getElementById('exp-id').value;
    const expense = {
      description: document.getElementById('exp-desc').value.trim(),
      amount:      parseFloat(document.getElementById('exp-amount').value),
      date:        document.getElementById('exp-date').value,
      category:    document.getElementById('exp-cat').value,
      notes:       document.getElementById('exp-notes').value.trim(),
    };

    if (id) {
      expense.id = parseInt(id);
      await updateExpense(expense);
      showToast('Gasto actualizado', 'success');
    } else {
      await addExpense(expense);
      showToast('Gasto registrado', 'success');
    }

    closeModal();
    await populateMonthSelect();
    await refreshCurrentPage();
  } catch (err) {
    console.error('[App] Error guardando gasto:', err);
    showToast('Error al guardar el gasto. Intenta de nuevo.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar';
  }
});

/* ═══════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════ */
async function renderDashboard() {
  try {
    const ym       = getSelectedMonth();
    const expenses = await getExpensesByMonth(ym);
    const budgets  = await getBudgetsForMonth(ym);
    const income   = (await getConfig(`income-${ym}`)) || 0;

    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const balance    = income - totalSpent;
    const pct        = income > 0 ? (totalSpent / income) * 100 : 0;

    document.getElementById('kpi-income').textContent  = formatCurrency(income);
    document.getElementById('kpi-spent').textContent   = formatCurrency(totalSpent);
    const balEl = document.getElementById('kpi-balance');
    balEl.textContent = formatCurrency(balance);
    balEl.style.color = balance >= 0 ? 'var(--accent2)' : 'var(--danger)';

    renderRingChart(pct);

    const recentEl  = document.getElementById('recent-expenses');
    const noRecent  = document.getElementById('no-recent');
    const recent    = expenses.slice(0, 5);
    recentEl.innerHTML = '';

    if (recent.length > 0) {
      noRecent.style.display = 'none';
      recent.forEach(exp => {
        const li = document.createElement('li');
        li.className = 'expense-item';
        li.appendChild(createCategoryDot(exp.category));
        const info = document.createElement('div');
        info.className = 'exp-info';
        info.innerHTML = `<div class="exp-desc">${escapeHtml(exp.description)}</div>
                          <div class="exp-meta">${formatDate(exp.date)}</div>`;
        const amt = document.createElement('span');
        amt.className = 'exp-amount';
        amt.textContent = formatCurrency(exp.amount);
        li.appendChild(info);
        li.appendChild(amt);
        recentEl.appendChild(li);
      });
    } else {
      noRecent.style.display = '';
    }

    renderDashDonut(groupByCategory(expenses));

  } catch (err) {
    console.error('[Dashboard] Error:', err);
    showToast('Error cargando el dashboard', 'error');
  }
}

/* ═══════════════════════════════════════════
   GASTOS PAGE
═══════════════════════════════════════════ */
async function renderExpensesPage() {
  try {
    const ym = getSelectedMonth();
    let expenses = await getExpensesByMonth(ym);

    const filterCat   = document.getElementById('filter-cat')?.value;
    const filterFrom  = document.getElementById('filter-date-from')?.value;
    const filterTo    = document.getElementById('filter-date-to')?.value;

    if (filterCat)  expenses = expenses.filter(e => e.category === filterCat);
    if (filterFrom) expenses = expenses.filter(e => e.date >= filterFrom);
    if (filterTo)   expenses = expenses.filter(e => e.date <= filterTo);

    const tbody    = document.getElementById('expenses-tbody');
    const noExp    = document.getElementById('no-expenses');
    const tableEl  = document.getElementById('expenses-table');

    tbody.innerHTML = '';

    if (expenses.length === 0) {
      tableEl.style.display = 'none';
      noExp.style.display   = '';
      return;
    }
    tableEl.style.display = '';
    noExp.style.display   = 'none';

    expenses.forEach(exp => {
      const tr = document.createElement('tr');
      const badge = createCategoryBadge(exp.category);

      const tdActions = document.createElement('td');
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn-edit';
      btnEdit.textContent = 'Editar';
      btnEdit.addEventListener('click', () => editExpense(exp.id));

      const btnDel = document.createElement('button');
      btnDel.className = 'btn-danger';
      btnDel.style.marginLeft = '6px';
      btnDel.textContent = 'Eliminar';
      btnDel.addEventListener('click', () => deleteExpenseAction(exp.id));
      tdActions.appendChild(btnEdit);
      tdActions.appendChild(btnDel);

      tr.innerHTML = `
        <td style="font-family:var(--font-data);font-size:12px;">${formatDate(exp.date)}</td>
        <td>${escapeHtml(exp.description)}${exp.notes ? `<br><small style="color:var(--text-muted)">${escapeHtml(exp.notes)}</small>` : ''}</td>
        <td></td>
        <td class="td-amount">${formatCurrency(exp.amount)}</td>
      `;
      tr.cells[2].appendChild(badge);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  } catch(err) {
    console.error('[Gastos] Error:', err);
    showToast('Error cargando gastos', 'error');
  }
}

async function editExpense(id) {
  try {
    const exp = await getExpenseById(id);
    if (exp) openModal(exp);
  } catch(err) {
    showToast('Error al cargar el gasto', 'error');
  }
}

async function deleteExpenseAction(id) {
  if (!confirmAction('¿Eliminar este gasto?')) return;
  try {
    await deleteExpense(id);
    showToast('Gasto eliminado', 'info');
    await refreshCurrentPage();
  } catch(err) {
    console.error('[App] Error eliminando:', err);
    showToast('Error al eliminar el gasto', 'error');
  }
}

document.getElementById('filter-cat') && populateCategorySelect(document.getElementById('filter-cat'), true);
document.getElementById('filter-cat')?.addEventListener('change', renderExpensesPage);
document.getElementById('filter-date-from')?.addEventListener('change', renderExpensesPage);
document.getElementById('filter-date-to')?.addEventListener('change', renderExpensesPage);
document.getElementById('btn-clear-filter')?.addEventListener('click', () => {
  document.getElementById('filter-cat').value       = '';
  document.getElementById('filter-date-from').value = '';
  document.getElementById('filter-date-to').value   = '';
  renderExpensesPage();
});

/* ═══════════════════════════════════════════
   PRESUPUESTO PAGE
═══════════════════════════════════════════ */
async function renderBudgetPage() {
  try {
    const ym      = getSelectedMonth();
    const income  = (await getConfig(`income-${ym}`)) || 0;
    const budgets = await getBudgetsForMonth(ym);
    const expenses = await getExpensesByMonth(ym);
    const spent   = groupByCategory(expenses);

    const incInput = document.getElementById('income-input');
    if (incInput) incInput.value = income > 0 ? income : '';

    const listEl = document.getElementById('budget-categories-list');
    if (listEl) {
      listEl.innerHTML = '';
      CATEGORIES.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'budget-item';

        const label = document.createElement('label');
        label.innerHTML = `<span style="font-size:16px;">${cat.icon}</span>${cat.label}`;

        const input = document.createElement('input');
        input.type        = 'number';
        input.min         = '0';
        input.step        = '0.01';
        input.placeholder = income > 0 ? formatCurrency((income * cat.pct) / 100) : '0.00';
        input.value       = budgets[cat.id] > 0 ? budgets[cat.id] : '';
        input.dataset.cat = cat.id;

        const btn = document.createElement('button');
        btn.className   = 'btn-save-cat';
        btn.textContent = 'Guardar';
        btn.addEventListener('click', async () => {
          const val = parseFloat(input.value);
          if (isNaN(val) || val < 0) {
            showToast('Ingresa un monto válido', 'error'); return;
          }
          try {
            await saveBudget(ym, cat.id, val);
            showToast(`Presupuesto "${cat.label}" guardado`, 'success');
            renderBudgetProgressBars(ym);
          } catch(e) {
            showToast('Error guardando presupuesto', 'error');
          }
        });

        div.appendChild(label);
        div.appendChild(input);
        div.appendChild(btn);
        listEl.appendChild(div);
      });
    }

    renderBudgetProgressBars(ym);
  } catch(err) {
    console.error('[Budget] Error:', err);
    showToast('Error cargando presupuesto', 'error');
  }
}

async function renderBudgetProgressBars(ym) {
  const budgets  = await getBudgetsForMonth(ym);
  const expenses = await getExpensesByMonth(ym);
  const spent    = groupByCategory(expenses);
  const listEl   = document.getElementById('budget-progress-list');
  const noEl     = document.getElementById('no-budget');
  if (!listEl) return;

  const cats = CATEGORIES.filter(c => budgets[c.id] > 0);
  if (cats.length === 0) {
    listEl.innerHTML = '';
    if (noEl) noEl.style.display = '';
    return;
  }
  if (noEl) noEl.style.display = 'none';
  listEl.innerHTML = '';

  cats.forEach(cat => {
    const budget = budgets[cat.id];
    const real   = spent[cat.id] || 0;
    const pct    = budget > 0 ? Math.min((real / budget) * 100, 100) : 0;
    const cls    = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';

    const item = document.createElement('div');
    item.className = 'bp-item';
    item.innerHTML = `
      <div class="bp-header">
        <span class="bp-label">${cat.icon} ${cat.label}</span>
        <span class="bp-amounts">${formatCurrency(real)} / ${formatCurrency(budget)}</span>
      </div>
      <div class="bp-bar-track">
        <div class="bp-bar-fill ${cls}" style="width:${pct.toFixed(1)}%"></div>
      </div>
    `;
    listEl.appendChild(item);
  });
}

document.getElementById('btn-save-income')?.addEventListener('click', async () => {
  const val = parseFloat(document.getElementById('income-input').value);
  if (isNaN(val) || val < 0) { showToast('Ingresa un ingreso válido', 'error'); return; }
  const ym = getSelectedMonth();
  try {
    await setConfig(`income-${ym}`, val);
    showToast('Ingreso guardado', 'success');
    await renderBudgetPage();
    await renderDashboard();
  } catch(e) {
    showToast('Error guardando ingreso', 'error');
  }
});

/* ═══════════════════════════════════════════
   GRÁFICOS PAGE
═══════════════════════════════════════════ */
async function renderChartsPage() {
  try {
    const ym         = getSelectedMonth();
    const expenses   = await getExpensesByMonth(ym);
    const budgets    = await getBudgetsForMonth(ym);
    const byCategory = groupByCategory(expenses);
    const daily      = groupByDay(expenses, ym);

    // Solo renderizar si hay datos, si no ocultar canvas
    if (Object.values(byCategory).some(v => v > 0)) {
      renderBudgetVsRealChart(budgets, byCategory);
      renderDistributionDonut(byCategory);
    } else {
      ['bar-budget-vs-real', 'donut-distribution'].forEach(id => {
        const c = document.getElementById(id);
        if (c) c.style.display = 'none';
      });
    }

    if (daily && daily.length > 0) {
      renderDailyBarChart(daily);
    } else {
      const c = document.getElementById('bar-daily');
      if (c) c.style.display = 'none';
    }

    const trendData = await buildTrendData(6);
    if (trendData && trendData.some(m => m.total > 0)) {
      renderTrendChart(trendData);
    } else {
      const c = document.getElementById('line-trend');
      if (c) c.style.display = 'none';
    }
  } catch(err) {
    console.error('[Charts] Error:', err);
    showToast('Error cargando gráficos', 'error');
  }
}

async function buildTrendData(months) {
  const result = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const exps = await getExpensesByMonth(ym);
    result.push({
      label: labelForYearMonth(ym).substring(0, 3) + ' ' + d.getFullYear().toString().slice(-2),
      total: exps.reduce((s, e) => s + e.amount, 0),
    });
  }
  return result;
}

/* ═══════════════════════════════════════════
   RESUMEN PAGE
═══════════════════════════════════════════ */
async function renderSummaryPage() {
  try {
    const ym       = getSelectedMonth();
    const expenses = await getExpensesByMonth(ym);
    const budgets  = await getBudgetsForMonth(ym);
    const byCategory = groupByCategory(expenses);
    const days     = daysInMonth(ym);
    const total    = expenses.reduce((s, e) => s + e.amount, 0);
    const avgDaily = expenses.length > 0 ? total / days : 0;

    document.getElementById('sum-total').textContent     = formatCurrency(total);
    document.getElementById('sum-count').textContent     = expenses.length;
    document.getElementById('sum-daily-avg').textContent = formatCurrency(avgDaily);

    const topCat = Object.entries(byCategory).sort(([,a],[,b]) => b - a)[0];
    const topCatEl = document.getElementById('sum-top-cat');
    if (topCat && topCat[1] > 0) {
      const catDef = getCategoryById(topCat[0]);
      topCatEl.textContent = catDef ? `${catDef.icon} ${catDef.label}` : topCat[0];
    } else {
      topCatEl.textContent = '—';
    }

    const tbody = document.getElementById('summary-tbody');
    const noEl  = document.getElementById('no-summary');
    tbody.innerHTML = '';

    const hasData = CATEGORIES.some(c => byCategory[c.id] > 0);
    if (!hasData) {
      document.getElementById('summary-table').style.display = 'none';
      if (noEl) { noEl.classList.remove('hidden'); noEl.style.display = ''; }
      return;
    }
    document.getElementById('summary-table').style.display = '';
    if (noEl) noEl.classList.add('hidden');

    CATEGORIES.forEach(cat => {
      const real   = byCategory[cat.id] || 0;
      const budget = budgets[cat.id] || 0;
      if (real === 0 && budget === 0) return;

      const count = expenses.filter(e => e.category === cat.id).length;
      let status, cls;
      if (budget === 0) { status = '—'; cls = ''; }
      else if (real > budget)   { status = 'Excedido'; cls = 'over'; }
      else if (real > budget * 0.8) { status = 'En límite'; cls = 'warn'; }
      else { status = 'OK'; cls = 'ok'; }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${cat.icon} ${cat.label}</td>
        <td style="font-family:var(--font-data)">${count}</td>
        <td class="td-amount">${formatCurrency(real)}</td>
        <td style="font-family:var(--font-data);color:var(--text-muted)">${budget > 0 ? formatCurrency(budget) : '—'}</td>
        <td>${cls ? `<span class="status-badge ${cls}">${status}</span>` : status}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch(err) {
    console.error('[Resumen] Error:', err);
    showToast('Error cargando resumen', 'error');
  }
}

/* ─── EXPORT CSV ─────────────────────────── */
document.getElementById('btn-export')?.addEventListener('click', async () => {
  try {
    const ym  = getSelectedMonth();
    const csv = await exportMonthCSV(ym);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `fintrack-${ym}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado correctamente', 'success');
  } catch(err) {
    console.error('[Export] Error:', err);
    showToast('Error exportando CSV', 'error');
  }
});

/* ═══════════════════════════════════════════
   MONTH CHANGE → REFRESH
═══════════════════════════════════════════ */
document.getElementById('month-select')?.addEventListener('change', () => {
  refreshCurrentPage();
});

async function refreshCurrentPage() {
  await populateMonthSelect();
  switch (currentPage) {
    case 'dashboard':   await renderDashboard();     break;
    case 'gastos':      await renderExpensesPage();  break;
    case 'presupuesto': await renderBudgetPage();    break;
    case 'graficos':    await renderChartsPage();    break;
    case 'resumen':     await renderSummaryPage();   break;
  }
}

/* ═══════════════════════════════════════════
   UTILITY: HTML ESCAPE
═══════════════════════════════════════════ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

/* ═══════════════════════════════════════════
   INITIALIZE APP
═══════════════════════════════════════════ */
async function initApp() {
  try {
    await openDB();

    populateCategorySelect(document.getElementById('filter-cat'), true);
    populateCategorySelect(document.getElementById('exp-cat'));

    updateDateHeader();

    await populateMonthSelect();

    await renderDashboard();
  } catch (err) {
    console.error('[App] Error de inicialización:', err);
    showToast('Error al iniciar la aplicación. Verifica tu navegador.', 'error', 6000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}