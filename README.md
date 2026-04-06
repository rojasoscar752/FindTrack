# FinTrack PWA — Control Financiero Personal

## 📋 Descripción
Aplicación web progresiva (PWA) para el seguimiento de gastos financieros, establecimiento de presupuestos y visualización de patrones de gasto.

---

## 🗂️ Estructura del proyecto

```
gastos-pwa/
├── index.html          ← Página principal (App Shell)
├── offline.html        ← Página de fallback sin conexión
├── manifest.json       ← Manifiesto PWA (instalación, iconos, shortcuts)
├── sw.js               ← Service Worker (caché, offline, estrategias fetch)
│
├── css/
│   └── styles.css      ← Estilos globales (dark theme, responsive)
│
├── js/
│   ├── db.js           ← Capa IndexedDB (gastos, presupuestos, config)
│   ├── categories.js   ← Definición de categorías predefinidas
│   ├── charts.js       ← Todos los gráficos (Chart.js)
│   ├── ui.js           ← Utilidades UI (toasts, navegación, formato)
│   └── app.js          ← Lógica principal + registro Service Worker
│
└── icons/
    ├── icon-192.png    ← Ícono PWA 192×192
    └── icon-512.png    ← Ícono PWA 512×512
```

---

## ⚙️ Funcionalidades implementadas

### Registro de gastos
- Formulario con descripción, monto, fecha, categoría y notas
- Validación completa del lado del cliente
- Edición y eliminación de gastos
- Filtros por categoría y rango de fechas

### Categorías predefinidas
Comida 🍽️ · Transporte 🚌 · Ocio 🎮 · Salud 💊 · Hogar 🏠 · Educación 📚 · Ropa 👕 · Otros 📦

### Presupuesto mensual
- Configuración de ingreso mensual por período
- Presupuesto individual por categoría
- Barras de progreso con alertas (verde/naranja/rojo)

### Gráficos (4 visualizaciones)
- **Donut dashboard** — distribución por categoría
- **Barras: Presupuesto vs Gasto real** — comparación por categoría
- **Línea: Tendencia mensual** — historial de 6 meses
- **Barras diarias** — gasto por día del mes

### Resumen mensual
- KPIs: total gastado, categoría líder, promedio diario, nº transacciones
- Tabla detallada por categoría con estado de presupuesto
- Exportación a CSV

---

## 🔧 Service Worker — Métodos implementados

### `install`
- Precacha el **App Shell** completo (HTML, CSS, JS, iconos)
- Descarga recursos CDN externos (Chart.js)
- Llama `skipWaiting()` para activación inmediata

### `activate`
- Elimina **cachés obsoletos** de versiones anteriores
- Llama `clients.claim()` para controlar pestañas abiertas sin recargar

### `fetch` — 3 estrategias de caché
| Recurso | Estrategia |
|---------|-----------|
| Fuentes Google | Stale While Revalidate |
| CDN externos | Cache First |
| HTML local | Network First + fallback offline |
| Assets locales (CSS/JS) | Cache First |

---

## 💾 Persistencia de datos

Usa **IndexedDB** como base de datos local (offline-first):

| Object Store | Descripción |
|-------------|-------------|
| `expenses` | Gastos con índices por fecha, categoría y mes |
| `budgets` | Presupuesto por mes + categoría |
| `config` | Ingreso mensual y configuración general |

---

## 📱 Características PWA

- ✅ Instalable (Add to Home Screen)
- ✅ Funciona completamente offline
- ✅ App Shell en caché con Service Worker
- ✅ Manifest con iconos y shortcuts
- ✅ Banner de estado offline/online
- ✅ Prompt de instalación personalizado
- ✅ Página de fallback offline
- ✅ Modo standalone (sin barra del navegador)

---

## 🚀 Cómo ejecutar

1. Sirve la carpeta raíz con cualquier servidor HTTP estático:
   ```bash
   # Con Python
   python3 -m http.server 8080
   
   # Con Node.js (npx)
   npx serve .
   
   # Con VS Code: Live Server extension
   ```
2. Abre `http://localhost:8080` en Chrome/Edge/Firefox
3. El Service Worker se registra automáticamente
4. Para instalar: usa el botón del banner o el menú del navegador

> **Nota:** El Service Worker requiere **HTTPS** o `localhost` para funcionar.

---

## 🛠️ Tecnologías

- HTML5 + CSS3 (Grid, Flexbox, Custom Properties, Animations)
- JavaScript ES2020+ (async/await, modules)
- IndexedDB (persistencia offline)
- Service Worker API (caché, estrategias fetch)
- Chart.js 4.4 (gráficos)
- Web App Manifest (instalación PWA)
- Google Fonts: Syne + DM Mono
