/**
 * ui.js
 * Funciones auxiliares de UI: toasts, formateo, navegación, sidebar, modal.
 */

/* ─── TOAST NOTIFICATIONS ─────────────────── */

const toastContainer = document.getElementById('toast-container');

function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

/* ─── FORMAT ───────────────────────────────── */

function formatCurrency(amount) {
  return '$' + Number(amount).toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${d} ${months[parseInt(m,10)-1]} ${y}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function labelForYearMonth(ym) {
  const [y, m] = ym.split('-');
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${months[parseInt(m,10)-1]} ${y}`;
}

function daysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/* ─── NAVIGATION ───────────────────────────── */

let currentPage = 'dashboard';
const pages     = document.querySelectorAll('.page');
const navLinks  = document.querySelectorAll('.nav-link');

function navigateTo(pageId) {
  pages.forEach(p => p.classList.remove('active'));
  navLinks.forEach(l => l.classList.remove('active'));

  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');

  const link = document.querySelector(`[data-page="${pageId}"]`);
  if (link) link.classList.add('active');

  currentPage = pageId;
  closeSidebar();
}

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = link.dataset.page;
    navigateTo(page);
    if (page === 'graficos')  renderChartsPage();
    if (page === 'resumen')   renderSummaryPage();
    if (page === 'presupuesto') renderBudgetPage();
    if (page === 'gastos')    renderExpensesPage();
    if (page === 'dashboard') renderDashboard();
  });
});

/* ─── SIDEBAR TOGGLE ────────────────────────── */

const sidebar  = document.getElementById('sidebar');
const overlay  = (() => {
  const el = document.createElement('div');
  el.className = 'sidebar-overlay';
  document.body.appendChild(el);
  return el;
})();

function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('active');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
}

document.getElementById('menu-toggle')?.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});
overlay.addEventListener('click', closeSidebar);

/* ─── DATE HEADER ───────────────────────────── */

function updateDateHeader() {
  const el = document.getElementById('current-date');
  if (!el) return;
  const d = new Date();
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  el.textContent = `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

/* ─── MONTH SELECT ──────────────────────────── */

async function populateMonthSelect() {
  const sel = document.getElementById('month-select');
  if (!sel) return;
  try {
    const months = await getAvailableMonths();
    sel.innerHTML = '';
    months.forEach(ym => {
      const opt = document.createElement('option');
      opt.value = ym;
      opt.textContent = labelForYearMonth(ym);
      sel.appendChild(opt);
    });

    sel.value = currentYearMonth();
  } catch(e) {
    console.error('[UI] Error populando meses:', e);
  }
}

function getSelectedMonth() {
  const sel = document.getElementById('month-select');
  return sel?.value || currentYearMonth();
}

/* ─── AGGREGATE DATA HELPERS ─────────────────── */

function groupByCategory(expenses) {
  const result = {};
  CATEGORIES.forEach(c => { result[c.id] = 0; });
  expenses.forEach(e => {
    if (result[e.category] !== undefined) result[e.category] += e.amount;
    else result[e.category] = e.amount;
  });
  return result;
}

function groupByDay(expenses, ym) {
  const days = daysInMonth(ym);
  const map = {};
  for (let i = 1; i <= days; i++) map[String(i).padStart(2,'0')] = 0;
  expenses.forEach(e => {
    const day = e.date.split('-')[2];
    map[day] = (map[day] || 0) + e.amount;
  });
  return Object.entries(map).map(([day, total]) => ({ day: parseInt(day), total }));
}

/* ─── CONFIRMATION DIALOG ─────────────────── */

function confirmAction(message) {
  return window.confirm(message);
}

/* ─── EMPTY STATE TOGGLE ─────────────────── */

function toggleEmptyState(listEl, emptyEl, hasItems) {
  if (!listEl || !emptyEl) return;
  listEl.style.display  = hasItems ? '' : 'none';
  emptyEl.style.display = hasItems ? 'none' : '';
}
