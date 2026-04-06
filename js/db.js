/**
 * db.js
 * Capa de abstracción sobre IndexedDB para persistencia offline de datos.
 * Almacena: gastos (expenses), presupuestos (budgets), configuración (config).
 */

const DB_NAME    = 'fintrack-db';
const DB_VERSION = 1;

let _db = null;

/**
 * Abre (o crea) la base de datos IndexedDB.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) { resolve(_db); return; }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('expenses')) {
        const store = db.createObjectStore('expenses', {
          keyPath: 'id', autoIncrement: true
        });
        store.createIndex('date',     'date',     { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('yearMonth','yearMonth', { unique: false });
      }

      if (!db.objectStoreNames.contains('budgets')) {
        db.createObjectStore('budgets', { keyPath: 'key' });
        // key = `${year}-${month}-${categoryId}` | `${year}-${month}-income`
      }

      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'key' });
      }
    };

    req.onsuccess = (event) => {
      _db = event.target.result;
      _db.onerror = (e) => console.error('[DB] Error no manejado:', e.target.error);
      resolve(_db);
    };

    req.onerror = (event) => {
      console.error('[DB] No se pudo abrir la base de datos:', event.target.error);
      reject(new Error('No se pudo abrir IndexedDB: ' + event.target.error.message));
    };

    req.onblocked = () => {
      console.warn('[DB] Apertura bloqueada por otra pestaña. Cierra las demás pestañas.');
    };
  });
}

/* ─── HELPERS ──────────────────────────────── */

function txStore(storeName, mode = 'readonly') {
  const tx = _db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

function yearMonth(dateStr) {
  // dateStr: 'YYYY-MM-DD'
  return dateStr ? dateStr.slice(0, 7) : '';
}

/* ─── EXPENSES ──────────────────────────────── */

async function addExpense(expense) {
  await openDB();
  const record = {
    ...expense,
    yearMonth: yearMonth(expense.date),
    createdAt: new Date().toISOString(),
  };
  const store = txStore('expenses', 'readwrite');
  const id = await promisify(store.add(record));
  return { ...record, id };
}

async function updateExpense(expense) {
  await openDB();
  const record = {
    ...expense,
    yearMonth: yearMonth(expense.date),
    updatedAt: new Date().toISOString(),
  };
  const store = txStore('expenses', 'readwrite');
  await promisify(store.put(record));
  return record;
}

async function deleteExpense(id) {
  await openDB();
  const store = txStore('expenses', 'readwrite');
  await promisify(store.delete(id));
}

async function getExpensesByMonth(ym) {
  await openDB();
  const store = txStore('expenses');
  const idx   = store.index('yearMonth');
  const results = await promisify(idx.getAll(IDBKeyRange.only(ym)));
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

async function getAllExpenses() {
  await openDB();
  const store = txStore('expenses');
  const all = await promisify(store.getAll());
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

async function getExpenseById(id) {
  await openDB();
  const store = txStore('expenses');
  return promisify(store.get(id));
}

/* ─── BUDGETS ──────────────────────────────── */

async function saveBudget(yearMonthStr, categoryId, amount) {
  await openDB();
  const store = txStore('budgets', 'readwrite');
  await promisify(store.put({
    key: `${yearMonthStr}-${categoryId}`,
    yearMonth: yearMonthStr,
    categoryId,
    amount: parseFloat(amount) || 0,
    updatedAt: new Date().toISOString(),
  }));
}

async function getBudgetsForMonth(ym) {
  await openDB();
  const store   = txStore('budgets');
  const all     = await promisify(store.getAll());
  const budgets = {};
  all.filter(b => b.yearMonth === ym).forEach(b => {
    budgets[b.categoryId] = b.amount;
  });
  return budgets;
}

/* ─── CONFIG ────────────────────────────────── */

async function setConfig(key, value) {
  await openDB();
  const store = txStore('config', 'readwrite');
  await promisify(store.put({ key, value, updatedAt: new Date().toISOString() }));
}

async function getConfig(key) {
  await openDB();
  const store = txStore('config');
  const rec   = await promisify(store.get(key));
  return rec ? rec.value : null;
}

/* ─── AVAILABLE MONTHS ──────────────────────── */

async function getAvailableMonths() {
  await openDB();
  const all = await getAllExpenses();
  const months = [...new Set(all.map(e => e.yearMonth))].sort().reverse();
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  if (!months.includes(currentYM)) months.unshift(currentYM);
  return months;
}

/* ─── EXPORT ────────────────────────────────── */

async function exportMonthCSV(ym) {
  const expenses = await getExpensesByMonth(ym);
  const rows = [['Fecha','Descripcion','Categoria','Monto','Notas']];
  expenses.forEach(e => {
    const cat = getCategoryById(e.category);
    rows.push([
      e.date,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      cat ? cat.label : e.category,
      e.amount.toFixed(2),
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);
  });
  return rows.map(r => r.join(',')).join('\n');
}
