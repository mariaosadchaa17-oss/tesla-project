const firebaseConfig = {
  apiKey: "AIzaSyAxaxDHu_iFSPIDTQA7shlLq6H7XuNke6w",
  authDomain: "tesla-project-927d5.firebaseapp.com",
  projectId: "tesla-project-927d5",
  storageBucket: "tesla-project-927d5.firebasestorage.app",
  messagingSenderId: "210350219263",
  appId: "1:210350219263:web:711747b3886497d41a91ca"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

const tripsRef = db.collection('trips');
const expensesRef = db.collection('expenses');

const GAS_PRICE_PER_LITER = 55;
const GAS_CONSUMPTION_PER_100KM = 8;
const EV_PRICE_PER_KWH = 4;
const EV_CONSUMPTION_PER_100KM = 18;

const form = document.getElementById('trip-form');
const amountInput = document.getElementById('amount');
const tipInput = document.getElementById('tip');
const kmInput = document.getElementById('km');
const saveBtn = document.getElementById('save-trip-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const historyList = document.getElementById('history-list');

const todayTotalEl = document.getElementById('today-total');
const todayTipsEl = document.getElementById('today-tips');
const todayCountEl = document.getElementById('today-count');
const weekTotalEl = document.getElementById('week-total');
const monthTotalEl = document.getElementById('month-total');
const todayExpensesEl = document.getElementById('today-expenses');
const todayCommissionEl = document.getElementById('today-commission');
const todayNetEl = document.getElementById('today-net');
const commissionInput = document.getElementById('commission-input');

const expenseForm = document.getElementById('expense-form');
const expenseCategory = document.getElementById('expense-category');
const expenseAmount = document.getElementById('expense-amount');
const expenseList = document.getElementById('expense-list');

const teslaKmEl = document.getElementById('tesla-km');
const teslaSavingsEl = document.getElementById('tesla-savings');
const saveKmBtn = document.getElementById('save-km-btn');

const heatmapEl = document.getElementById('heatmap');
const weekCompareEl = document.getElementById('week-compare');
const monthCompareEl = document.getElementById('month-compare');

const rangeFrom = document.getElementById('range-from');
const rangeTo = document.getElementById('range-to');
const rangeTotalEl = document.getElementById('range-total');
const rangeCountEl = document.getElementById('range-count');

const exportPdfBtn = document.getElementById('export-pdf-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const micBtn = document.getElementById('mic-btn');

let editingId = null;
let allTrips = [];
let allExpenses = [];
let commissionPercent = Number(localStorage.getItem('uklonCommission')) || 15;
commissionInput.value = commissionPercent;

// ── Дати: день з 00:00 до 23:59 ───────────────────────────
function dateKeyOf(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function todayKey() { return dateKeyOf(new Date()); }
function startOfWeekKey() {
  const d = new Date();
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (day - 1));
  return dateKeyOf(d);
}
function startOfMonthKey() { const d = new Date(); d.setDate(1); return dateKeyOf(d); }
function addDaysToKey(key, delta) { const d = new Date(key); d.setDate(d.getDate() + delta); return dateKeyOf(d); }
function startOfMonthFromKey(key) { const d = new Date(key); d.setDate(1); return dateKeyOf(d); }

// Авто-оновлення о 00:00
function scheduleNextDayReset() {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  setTimeout(() => { render(); scheduleNextDayReset(); }, next.getTime() - now.getTime());
}
scheduleNextDayReset();

// ── Тема ─────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.classList.toggle('light', theme === 'light');
  document.body.classList.toggle('light', theme === 'light');
  themeToggleBtn.textContent = theme === 'light' ? '🌙' : '☀️';
}
let currentTheme = localStorage.getItem('theme') || ((new Date().getHours() >= 7 && new Date().getHours() < 19) ? 'light' : 'dark');
applyTheme(currentTheme);
themeToggleBtn.addEventListener('click', () => {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', currentTheme);
  applyTheme(currentTheme);
});

// ── Форма поїздки ───────────────────────────────
function getPaymentValue() {
  const checked = form.querySelector('input[name="payment"]:checked');
  return checked ? checked.value : 'cash';
}
function setPaymentValue(v) {
  const el = form.querySelector('input[name="payment"][value="' + v + '"]');
  if (el) el.checked = true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = Number(amountInput.value) || 0;
  const tip = Number(tipInput.value) || 0;
  if (amount <= 0 && tip <= 0) return;
  const tripData = {
    amount, tip, total: amount + tip,
    paymentMethod: getPaymentValue(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    dateKey: dateKeyOf(new Date()),
  };
  if (editingId) {
    await tripsRef.doc(editingId).update(tripData);
    stopEditing();
  } else {
    await tripsRef.add(tripData);
  }
  amountInput.value = '';
  tipInput.value = '';
  amountInput.focus();
});

cancelEditBtn.addEventListener('click', stopEditing);

function startEditing(t) {
  editingId = t.id;
  amountInput.value = t.amount;
  tipInput.value = t.tip;
  setPaymentValue(t.paymentMethod || 'cash');
  saveBtn.innerHTML = '💾 Зберегти зміни';
  cancelEditBtn.style.display = 'block';
  amountInput.focus();
}
function stopEditing() {
  editingId = null;
  saveBtn.innerHTML = '💾 Зберегти поїздку';
  cancelEditBtn.style.display = 'none';
}

commissionInput.addEventListener('input', () => {
  commissionPercent = Number(commissionInput.value) || 0;
  localStorage.setItem('uklonCommission', commissionPercent);
  render();
});

document.querySelectorAll('.quick-tip-btn').forEach((btn) => {
  btn.addEventListener('click', () => { tipInput.value = btn.dataset.val; });
});

// ── Голосовий ввід ─────────────────────────────────
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognitionCtor && micBtn) {
  const recognition = new SpeechRecognitionCtor();
  recognition.lang = 'uk-UA';
  recognition.interimResults = false;
  micBtn.addEventListener('click', () => { try { recognition.start(); } catch (e) { console.error(e); } });
  recognition.onresult = (e) => {
    const match = e.results[0][0].transcript.replace(',', '.').match(/\d+(\.\d+)?/);
    if (match) amountInput.value = match[0];
  };
} else if (micBtn) { micBtn.style.display = 'none'; }

// ── Firebase onSnapshot ──────────────────────────────────
tripsRef.orderBy('createdAt', 'desc').limit(1000).onSnapshot((snapshot) => {
  allTrips = snapshot.docs.map((doc) => {
    const data = doc.data();
    if (data.createdAt) data.dateKey = dateKeyOf(data.createdAt.toDate());
    return { id: doc.id, ...data };
  });
  render();
});

expensesRef.orderBy('createdAt', 'desc').limit(500).onSnapshot((snapshot) => {
  allExpenses = snapshot.docs.map((doc) => {
    const data = doc.data();
    if (data.createdAt) data.dateKey = dateKeyOf(data.createdAt.toDate());
    return { id: doc.id, ...data };
  });
  render();
});

async function deleteTrip(id) { await tripsRef.doc(id).delete(); }
async function deleteExpense(id) { await expensesRef.doc(id).delete(); }

expenseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = Number(expenseAmount.value) || 0;
  if (amount <= 0) return;
  await expensesRef.add({
    category: expenseCategory.value, amount,
    dateKey: todayKey(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  expenseAmount.value = '';
});

// ── Пробіг ───────────────────────────────────────────────
if (saveKmBtn) {
  saveKmBtn.addEventListener('click', async () => {
    const km = Number(kmInput.value) || 0;
    if (km <= 0) return;
    await tripsRef.add({
      amount: 0, tip: 0, total: 0, km, kmOnly: true,
      paymentMethod: 'cash',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      dateKey: dateKeyOf(new Date()),
    });
    kmInput.value = '';
    saveKmBtn.textContent = '✓';
    setTimeout(() => { saveKmBtn.textContent = 'Зберегти'; }, 1500);
  });
}

// ── Render ───────────────────────────────────────────────
function sumRange(from, to) {
  return allTrips
    .filter((t) => !t.kmOnly && t.dateKey >= from && t.dateKey <= to)
    .reduce((s, t) => s + t.total, 0);
}

function render() {
  const today = todayKey();
  const weekStart = startOfWeekKey();
  const monthStart = startOfMonthKey();

  const todayTrips = allTrips.filter((t) => t.dateKey === today && !t.kmOnly);
  const weekTrips  = allTrips.filter((t) => t.dateKey >= weekStart && !t.kmOnly);
  const monthTrips = allTrips.filter((t) => t.dateKey >= monthStart && !t.kmOnly);
  const todayExpensesList = allExpenses.filter((x) => x.dateKey === today);

  const todayTotal = todayTrips.reduce((s, t) => s + t.total, 0);
  const todayFare  = todayTrips.reduce((s, t) => s + t.amount, 0);
  const todayExpensesTotal = todayExpensesList.reduce((s, x) => s + x.amount, 0);
  const todayCommission = (todayFare * commissionPercent) / 100;

  todayTotalEl.textContent = todayTotal.toFixed(0);
  todayTipsEl.textContent  = todayTrips.reduce((s, t) => s + t.tip, 0).toFixed(0);
  todayCountEl.textContent = todayTrips.length;
  weekTotalEl.textContent  = weekTrips.reduce((s, t) => s + t.total, 0).toFixed(0);
  monthTotalEl.textContent = monthTrips.reduce((s, t) => s + t.total, 0).toFixed(0);
  todayExpensesEl.textContent   = todayExpensesTotal.toFixed(0) + ' грн';
  todayCommissionEl.textContent = '= ' + todayCommission.toFixed(0) + ' грн';
  todayNetEl.textContent = (todayTotal - todayCommission - todayExpensesTotal).toFixed(0) + ' грн';

  // Список поїздок
  historyList.innerHTML = '';
  todayTrips.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    const time = t.createdAt
      ? t.createdAt.toDate().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
      : '--:--';
    const payIcon = t.paymentMethod === 'card' ? '💳' : '💵';
    li.innerHTML = `
      <span class="history-time">${time}</span>
      <span class="history-amounts">${payIcon} ${t.amount} грн <span class="history-tip">+${t.tip} чай</span></span>
      <span class="history-total">${t.total} грн</span>
      <button class="edit-btn" aria-label="Редагувати">✎</button>
      <button class="delete-btn" aria-label="Видалити">×</button>
    `;
    li.querySelector('.edit-btn').addEventListener('click', () => startEditing(t));
    li.querySelector('.delete-btn').addEventListener('click', () => deleteTrip(t.id));
    historyList.appendChild(li);
  });
  if (todayTrips.length === 0)
    historyList.innerHTML = '<li class="empty">Поки немає замовлень за сьогодні</li>';

  // Список витрат
  expenseList.innerHTML = '';
  todayExpensesList.forEach((x) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <span class="history-time">${x.category}</span>
      <span class="history-amounts"></span>
      <span class="history-total">${x.amount} грн</span>
      <button class="delete-btn" aria-label="Видалити">×</button>
    `;
    li.querySelector('.delete-btn').addEventListener('click', () => deleteExpense(x.id));
    expenseList.appendChild(li);
  });
  if (todayExpensesList.length === 0)
    expenseList.innerHTML = '<li class="empty">Витрат сьогодні немає</li>';

  renderTesla();
  renderHeatmap();
  renderRange();
  renderCompare();
}

// ── Tesla ────────────────────────────────────────────────
function renderTesla() {
  const totalKm = allTrips.reduce((s, t) => s + (t.km || 0), 0);
  const gasCost = (totalKm / 100) * GAS_CONSUMPTION_PER_100KM * GAS_PRICE_PER_LITER;
  const evCost  = (totalKm / 100) * EV_CONSUMPTION_PER_100KM * EV_PRICE_PER_KWH;
  teslaKmEl.textContent      = totalKm.toFixed(0) + ' км';
  teslaSavingsEl.textContent = Math.max(0, gasCost - evCost).toFixed(0) + ' грн';
}

// ── Heatmap ─────────────────────────────────────────────
const DOW_LABELS    = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const BUCKET_LABELS = ['Ранок', 'День', 'Вечір'];
function getTimeBucket(hour) {
  if (hour >= 6  && hour < 12) return 0;
  if (hour >= 12 && hour < 18) return 1;
  if (hour >= 18) return 2;
  return null;
}
function renderHeatmap() {
  const grid = Array.from({ length: 7 }, () => [0, 0, 0]);
  allTrips.forEach((t) => {
    if (!t.createdAt || t.kmOnly) return;
    const d = t.createdAt.toDate();
    let dow = d.getDay(); dow = dow === 0 ? 6 : dow - 1;
    const bucket = getTimeBucket(d.getHours());
    if (bucket === null) return;
    grid[dow][bucket] += t.total;
  });
  let max = 0;
  grid.forEach((row) => row.forEach((v) => { if (v > max) max = v; }));
  let html = '<div class="heatmap-grid">';
  html += '<div class="heatmap-cell heatmap-label"></div>';
  BUCKET_LABELS.forEach((b) => { html += `<div class="heatmap-cell heatmap-label">${b}</div>`; });
  grid.forEach((row, i) => {
    html += `<div class="heatmap-cell heatmap-label">${DOW_LABELS[i]}</div>`;
    row.forEach((v) => {
      const opacity = max > 0 ? (0.15 + 0.85 * (v / max)).toFixed(2) : 0.1;
      const color   = v > 0 ? '#ffffff' : 'var(--text-muted)';
      html += `<div class="heatmap-cell" style="background:rgba(79,131,247,${opacity});color:${color}" title="${v.toFixed(0)} грн">${v > 0 ? Math.round(v) : ''}</div>`;
    });
  });
  html += '</div>';
  heatmapEl.innerHTML = html;
}

// ── Range ────────────────────────────────────────────────
function renderRange() {
  const from = rangeFrom.value, to = rangeTo.value;
  if (!from && !to) { rangeTotalEl.textContent = '0 грн'; rangeCountEl.textContent = '0'; return; }
  const filtered = allTrips.filter((t) => {
    if (t.kmOnly) return false;
    if (from && t.dateKey < from) return false;
    if (to   && t.dateKey > to)   return false;
    return true;
  });
  rangeTotalEl.textContent = filtered.reduce((s, t) => s + t.total, 0).toFixed(0) + ' грн';
  rangeCountEl.textContent = filtered.length;
}
rangeFrom.addEventListener('change', renderRange);
rangeTo.addEventListener('change', renderRange);

// ── Compare ─────────────────────────────────────────────
// Показує зміну в % без тексту "вс" / "проти" — тільки стрілка і %
function compareBadge(current, previous) {
  if (previous === 0) return current > 0 ? '<span class="badge up">▲</span>' : '';
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 1) return '';
  const cls  = pct >= 0 ? 'up' : 'down';
  const sign = pct >= 0 ? '▲' : '▼';
  return `<span class="badge ${cls}">${sign}${Math.abs(pct).toFixed(0)}%</span>`;
}
function renderCompare() {
  const weekStart = startOfWeekKey(), today = todayKey();
  const prevWeekEnd = addDaysToKey(weekStart, -1), prevWeekStart = addDaysToKey(weekStart, -7);
  const monthStart = startOfMonthKey();
  const prevMonthEnd = addDaysToKey(monthStart, -1), prevMonthStart = startOfMonthFromKey(prevMonthEnd);
  weekCompareEl.innerHTML  = compareBadge(sumRange(weekStart, today), sumRange(prevWeekStart, prevWeekEnd));
  monthCompareEl.innerHTML = compareBadge(sumRange(monthStart, today), sumRange(prevMonthStart, prevMonthEnd));
}

// ── PDF ──────────────────────────────────────────────────
exportPdfBtn.addEventListener('click', async () => {
  const oldText = exportPdfBtn.textContent;
  exportPdfBtn.textContent = 'Генерація...';
  exportPdfBtn.disabled = true;
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const resp = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf');
    if (!resp.ok) throw new Error('Font load failed');
    const fontB64 = btoa(new Uint8Array(await resp.arrayBuffer()).reduce((d, b) => d + String.fromCharCode(b), ''));
    doc.addFileToVFS('Roboto-Regular.ttf', fontB64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(18); doc.text('Звіт по заробітку', 14, 20);
    doc.setFontSize(10); doc.setTextColor(120,120,120);
    doc.text('Дата: ' + new Date().toLocaleDateString('uk-UA'), 14, 30);
    doc.setTextColor(0,0,0);
    let y = 45;
    const line = (label, value) => {
      doc.setFontSize(10); doc.setTextColor(100,100,100); doc.text(label, 14, y);
      doc.setTextColor(0,0,0); doc.setFontSize(12); doc.text(String(value), 100, y);
      y += 9;
    };
    const sep = () => { doc.setDrawColor(220,220,220); doc.line(14,y,196,y); y += 6; };
    line('Сьогодні зароблено:', todayTotalEl.textContent + ' грн (' + todayCountEl.textContent + ' поїздок)');
    line('Чайові:', todayTipsEl.textContent + ' грн'); sep();
    line('Витрати:', todayExpensesEl.textContent);
    line('Комісія Uklon:', todayCommissionEl.textContent);
    line('Чистими:', todayNetEl.textContent); sep();
    line('Тиждень:', weekTotalEl.textContent + ' грн');
    line('Місяць:', monthTotalEl.textContent + ' грн');
    doc.save('zvit-' + todayKey() + '.pdf');
  } catch (err) {
    console.error(err);
    const txt = [
      'Звіт', 'Дата: ' + new Date().toLocaleDateString('uk-UA'), '',
      'Сьогодні: ' + todayTotalEl.textContent + ' грн (поїздок: ' + todayCountEl.textContent + ')',
      'Чайові: ' + todayTipsEl.textContent + ' грн',
      'Витрати: ' + todayExpensesEl.textContent,
      'Комісія: ' + todayCommissionEl.textContent,
      'Чистими: ' + todayNetEl.textContent, '',
      'Тиждень: ' + weekTotalEl.textContent + ' грн',
      'Місяць: ' + monthTotalEl.textContent + ' грн',
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + txt], { type: 'text/plain;charset=utf-8;' }));
    a.download = 'zvit-' + todayKey() + '.txt';
    a.click();
  } finally {
    exportPdfBtn.textContent = oldText;
    exportPdfBtn.disabled = false;
  }
});
