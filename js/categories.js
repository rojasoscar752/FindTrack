/**
 * categories.js
 * Definición de categorías predefinidas de gastos con colores e iconos
 */

const CATEGORIES = [
  { id: 'comida',      label: 'Comida',       icon: '',  color: '#f59e0b', pct: 30 },
  { id: 'transporte',  label: 'Transporte',   icon: '',  color: '#3b82f6', pct: 15 },
  { id: 'ocio',        label: 'Ocio',         icon: '',  color: '#8b5cf6', pct: 10 },
  { id: 'salud',       label: 'Salud',        icon: '',  color: '#10b981', pct: 10 },
  { id: 'hogar',       label: 'Hogar',        icon: '',  color: '#ec4899', pct: 20 },
  { id: 'educacion',   label: 'Educación',    icon: '',  color: '#06b6d4', pct: 5  },
  { id: 'ropa',        label: 'Ropa',         icon: '',  color: '#f97316', pct: 5  },
  { id: 'otros',       label: 'Otros',        icon: '',  color: '#6b7280', pct: 5  },
];

/**
 * Retorna la definición de una categoría por ID.
 * @param {string} id
 * @returns {object|undefined}
 */
function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id);
}

/**
 * Popula elementos <select> con las categorías disponibles.
 * @param {HTMLSelectElement} selectEl
 * @param {boolean} [includeEmpty=true]
 */
function populateCategorySelect(selectEl, includeEmpty = true) {
  if (!selectEl) return;
  const current = selectEl.value;
  selectEl.innerHTML = '';
  if (includeEmpty) {
    const def = document.createElement('option');
    def.value = '';
    def.textContent = 'Selecciona una categoría';
    selectEl.appendChild(def);
  }
  CATEGORIES.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = `${cat.icon} ${cat.label}`;
    selectEl.appendChild(opt);
  });
  if (current) selectEl.value = current;
}

/**
 * Crea un dot de color para mostrar junto a un item de gasto.
 * @param {string} catId
 * @returns {HTMLElement}
 */
function createCategoryDot(catId) {
  const cat = getCategoryById(catId);
  const dot = document.createElement('span');
  dot.className = 'cat-dot';
  dot.style.background = cat ? cat.color : '#6b7280';
  dot.title = cat ? cat.label : catId;
  return dot;
}

/**
 * Crea un badge con el nombre de la categoría.
 * @param {string} catId
 * @returns {HTMLElement}
 */
function createCategoryBadge(catId) {
  const cat = getCategoryById(catId);
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.style.background = cat ? cat.color + '22' : '#6b728022';
  badge.style.color = cat ? cat.color : '#6b7280';
  badge.textContent = cat ? `${cat.icon} ${cat.label}` : catId;
  return badge;
}
