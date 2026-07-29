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
const tripsRef = db.collection('trips');
const expensesRef = db.collection('expenses');
const shiftsRef = db.collection('shifts');

const GAS_PRICE_PER_LITER = 55;
const GAS_CONSUMPTION_PER_100KM = 8;
const EV_PRICE_PER_KWH = 4;
const EV_CONSUMPTION_PER_100KM = 18;

const TAX_UNIFIED = 1729.40;
const TAX_MILITARY = 864.70;

const form = document.getElementById('trip-form');
const amountInput = document.getElementById('amount');
const tipInput = document.getElementById('tip');
const kmInput = document.getElementById('km');
const saveBtn = document.getElementById('save-trip-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const historyList = document.getElementById('history-list');
const daysList = document.getElementById('days-list');

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

const shiftBtn = document.getElementById('shift-btn');
const shiftStatus = document.getElementById('shift-status');
const shiftRateRow = document.getElementById('shift-rate-row');
const shiftRate = document.getElementById('shift-rate');

const taxUnifiedEl = document.getElementById('tax-unified');
const taxMilitaryEl = document.getElementById('tax-military');
const taxTotalEl = document.getElementById('tax-total');
const taxStatusLabel = document.getElementById('tax-status-label');
const taxPaidBtn = document.getElementById('tax-paid-btn');

const teslaKmEl = document.getElementById('tesla-km');
const teslaSavingsEl = document.getElementById('tesla-savings');

const heatmapEl = document.getElementById('heatmap');

const rangeFrom = document.getElementById('range-from');
const rangeTo = document.getElementById('range-to');
const rangeTotalEl = document.getElementById('range-total');
const rangeCountEl = document.getElementById('range-count');

const exportPdfBtn = document.getElementById('export-pdf-btn');
const themeToggleBtn = document.getElementById('theme-toggle');

let editingId = null;
let allTrips = [];
let allExpenses = [];
let activeShift = null;
let shiftInterval = null;
let commissionPercent = Number(localStorage.getItem('uklonCommission')) || 15;
commissionInput.value = commissionPercent;

function dateKeyOf(date) {
  return date.toISOString().slice(0, 10);
}

function todayKey() {
  return dateKeyOf(new Date());
}

function monthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function startOfWeekKey() {
  const d = new Date();
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (day - 1));
  return dateKeyOf(d);
}

function startOfMonthKey() {
  const d = new Date();
  d.setDate(1);
  return dateKeyOf(d);
}

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
  const km = Number(kmInput.value) || 0;
  if (amount <= 0 && tip <= 0) return;
  const paymentMethod = getPaymentValue();

  if (editingId) {
    await tripsRef.doc(editingId).update({
      amount, tip, total: amount + tip, km, paymentMethod
    });
    stopEditing();
  } else {
    await tripsRef.add({
      amount, tip, total: amount + tip, km, paymentMethod,
      dateKey: todayKey(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  amountInput.value = '';
  tipInput.value = '';
  kmInput.value = '';
  amountInput.focus();
});

cancelEditBtn.addEventListener('click', stopEditing);

function startEditing(t) {
  editingId = t.id;
  amountInput.value = t.amount;
  tipInput.value = t.tip;
  kmInput.value = t.km || '';
  setPaymentValue(t.paymentMethod || 'cash');
  saveBtn.textContent = 'Зберегти зміни';
  cancelEditBtn.style.display = 'block';
  amountInput.focus();
}

function stopEditing() {
  editingId = null;
  saveBtn.textContent = 'Зберегти';
  cancelEditBtn.style.display = 'none';
}

commissionInput.addEventListener('input', () => {
  commissionPercent = Number(commissionInput.value) || 0;
  localStorage.setItem('uklonCommission', commissionPercent);
  render();
});

tripsRef.orderBy('createdAt', 'desc').limit(1000).onSnapshot((snapshot) => {
  allTrips = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  render();
});

expensesRef.orderBy('createdAt', 'desc').limit(500).onSnapshot((snapshot) => {
  allExpenses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  render();
});

async function deleteTrip(id) {
  await tripsRef.doc(id).delete();
}

async function deleteExpense(id) {
  await expensesRef.doc(id).delete();
}

expenseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = Number(expenseAmount.value) || 0;
  if (amount <= 0) return;
  await expensesRef.add({
    category: expenseCategory.value,
    amount,
    dateKey: todayKey(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  expenseAmount.value = '';
});

function sumToday() {
  const today = todayKey();
  return allTrips.filter((t) => t.dateKey === today).reduce((s, t) => s + t.total, 0);
}

function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h + 'год ' + m + 'хв';
}

function updateShiftUI() {
  if (activeShift) {
    shiftBtn.textContent = 'Завершити зміну';
    shiftBtn.classList.add('stop');
    const elapsedMs = Date.now() - activeShift.startedAt;
    const hours = elapsedMs / 3600000;
    shiftStatus.textContent = 'Зміна триває: ' + formatDuration(elapsedMs);
    shiftRateRow.style.display = 'flex';
    const total = sumToday();
    shiftRate.textContent = hours > 0.05 ? Math.round(total / hours) + ' грн/год' : '—';
  } else {
    shiftBtn.textContent = 'Почати зміну';
    shiftBtn.classList.remove('stop');
    shiftStatus.textContent = 'Зміну не розпочато';
    shiftRateRow.style.display = 'none';
  }
}

shiftBtn.addEventListener('click', async () => {
  if (activeShift) {
    await shiftsRef.doc(activeShift.id).update({
      endedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    localStorage.removeItem('activeShiftId');
    activeShift = null;
    clearInterval(shiftInterval);
    updateShiftUI();
  } else {
    const docRef = await shiftsRef.add({
      startedAt: firebase.firestore.FieldValue.serverTimestamp(),
      endedAt: null,
      dateKey: todayKey()
    });
    localStorage.setItem('activeShiftId', docRef.id);
    activeShift = { id: docRef.id, startedAt: Date.now() };
    shiftInterval = setInterval(updateShiftUI, 30000);
    updateShiftUI();
  }
});

async function restoreShift() {
  const id = localStorage.getItem('activeShiftId');
  if (!id) return;
  const doc = await shiftsRef.doc(id).get();
  if (doc.exists && !doc.data().endedAt) {
    const data = doc.data();
    activeShift = {
      id,
      startedAt: data.startedAt ? data.startedAt.toDate().getTime() : Date.now()
    };
    shiftInterval = setInterval(updateShiftUI, 30000);
    updateShiftUI();
  } else {
    localStorage.removeItem('activeShiftId');
  }
}
restoreShift();

function renderTax() {
  taxUnifiedEl.textContent = TAX_UNIFIED.toFixed(2) + ' грн';
  taxMilitaryEl.textContent = TAX_MILITARY.toFixed(2) + ' грн';
  taxTotalEl.textContent = (TAX_UNIFIED + TAX_MILITARY).toFixed(2) + ' грн';

  const key = 'taxPaid-' + monthKey();
  const paid = localStorage.getItem(key) === '1';
  const day = new Date().getDate();

  if (paid) {
    taxStatusLabel.textContent = 'Сплачено за цей місяць';
    taxStatusLabel.style.color = 'var(--charge)';
    taxPaidBtn.textContent = 'Скасувати позначку';
  } else {
    taxPaidBtn.textContent = 'Позначити сплачено';
    if (day >= 15) {
      taxStatusLabel.textContent = 'Наближається дата сплати (до 20 числа)!';
      taxStatusLabel.style.color = 'var(--tip)';
    } else {
      taxStatusLabel.textContent = 'Ще не сплачено за цей місяць';
      taxStatusLabel.style.color = 'var(--text-muted)';
    }
  }
}

taxPaidBtn.addEventListener('click', () => {
  const key = 'taxPaid-' + monthKey();
  const paid = localStorage.getItem(key) === '1';
  if (paid) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, '1');
  }
  renderTax();
});
renderTax();

function render() {
  const today = todayKey();
  const weekStart = startOfWeekKey();
  const monthStart = startOfMonthKey();

  const todayTrips = allTrips.filter((t) => t.dateKey === today);
  const weekTrips = allTrips.filter((t) => t.dateKey >= weekStart);
  const monthTrips = allTrips.filter((t) => t.dateKey >= monthStart);
  const todayExpensesList = allExpenses.filter((x) => x.dateKey === today);

  const todayTotal = todayTrips.reduce((s, t) => s + t.total, 0);
  const todayFare = todayTrips.reduce((s, t) => s + t.amount, 0);
  const todayExpensesTotal = todayExpensesList.reduce((s, x) => s + x.amount, 0);
  const todayCommission = (todayFare * commissionPercent) / 100;

  todayTotalEl.textContent = todayTotal.toFixed(0);
  todayTipsEl.textContent = todayTrips.reduce((s, t) => s + t.tip, 0).toFixed(0);
  todayCountEl.textContent = todayTrips.length;

  weekTotalEl.textContent = weekTrips.reduce((s, t) => s + t.total, 0).toFixed(0);
  monthTotalEl.textContent = monthTrips.reduce((s, t) => s + t.total, 0).toFixed(0);

  todayExpensesEl.textContent = todayExpensesTotal.toFixed(0) + ' грн';
  todayCommissionEl.textContent = todayCommission.toFixed(0) + ' грн';
  todayNetEl.textContent = (todayTotal - todayCommission - todayExpensesTotal).toFixed(0) + ' грн';

  historyList.innerHTML = '';
  todayTrips.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    const time = t.createdAt
      ? t.createdAt.toDate().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
      : '--:--';
    const paymentLabel = t.paymentMethod === 'card' ? '💳' : '💵';
    li.innerHTML = `
      <span class="history-time">${time}</span>
      <span class="history-amounts">${paymentLabel} ${t.amount} грн <span class="history-tip">+${t.tip} чай</span></span>
      <span class="history-total">${t.total} грн</span>
      <button class="edit-btn" aria-label="Редагувати">✎</button>
      <button class="delete-btn" aria-label="Видалити запис">×</button>
    `;
    li.querySelector('.edit-btn').addEventListener('click', () => startEditing(t));
    li.querySelector('.delete-btn').addEventListener('click', () => deleteTrip(t.id));
    historyList.appendChild(li);
  });
  if (todayTrips.length === 0) {
    historyList.innerHTML = '<li class="empty">Поки немає замовлень за сьогодні</li>';
  }

  expenseList.innerHTML = '';
  todayExpensesList.forEach((x) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <span class="history-time">${x.category}</span>
      <span class="history-amounts"></span>
      <span class="history-total">${x.amount} грн</span>
      <button class="delete-btn" aria-label="Видалити витрату">×</button>
    `;
    li.querySelector('.delete-btn').addEventListener('click', () => deleteExpense(x.id));
    expenseList.appendChild(li);
  });
  if (todayExpensesList.length === 0) {
    expenseList.innerHTML = '<li class="empty">Витрат сьогодні немає</li>';
  }

  renderTesla();
  renderDays();
  renderHeatmap();
  renderRange();
  updateShiftUI();
}

function renderTesla() {
  const totalKm = allTrips.reduce((s, t) => s + (t.km || 0), 0);
  const gasCost = (totalKm / 100) * GAS_CONSUMPTION_PER_100KM * GAS_PRICE_PER_LITER;
  const evCost = (totalKm / 100) * EV_CONSUMPTION_PER_100KM * EV_PRICE_PER_KWH;
  const savings = Math.max(0, gasCost - evCost);
  teslaKmEl.textContent = totalKm.toFixed(0) + ' км';
  teslaSavingsEl.textContent = savings.toFixed(0) + ' грн';
}

function renderDays() {
  const byDay = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDay[dateKeyOf(d)] = 0;
  }

  allTrips.forEach((t) => {
    if (t.dateKey in byDay) byDay[t.dateKey] += t.total;
  });

  daysList.innerHTML = '';
  Object.keys(byDay).sort().reverse().forEach((key) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    const label = new Date(key).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
    li.innerHTML = `
      <span class="history-time">${label}</span>
      <span class="history-amounts"></span>
      <span class="history-total">${byDay[key].toFixed(0)} грн</span>
    `;
    daysList.appendChild(li);
  });
}

const DOW_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const BUCKET_LABELS = ['Ніч', 'Ранок', 'День', 'Вечір'];

function renderHeatmap() {
  const grid = Array.from({ length: 7 }, () => [0, 0, 0, 0]);
  allTrips.forEach((t) => {
    if (!t.createdAt) return;
    const d = t.createdAt.toDate();
    let dow = d.getDay();
    dow = dow === 0 ? 6 : dow - 1;
    const bucket = Math.floor(d.getHours() / 6);
    grid[dow][bucket] += t.total;
  });

  let max = 0;
  grid.forEach((row) => row.forEach((v) => { if (v > max) max = v; }));

  let html = '<div class="heatmap">';
  html += '<div class="heatmap-cell heatmap-label"></div>';
  BUCKET_LABELS.forEach((b) => {
    html += `<div class="heatmap-cell heatmap-label">${b}</div>`;
  });
  grid.forEach((row, i) => {
    html += `<div class="heatmap-cell heatmap-label">${DOW_LABELS[i]}</div>`;
    row.forEach((v) => {
      const opacity = max > 0 ? (0.12 + 0.75 * (v / max)).toFixed(2) : 0.08;
      html += `<div class="heatmap-cell" style="background:rgba(79,131,247,${opacity})" title="${v.toFixed(0)} грн">${v > 0 ? Math.round(v) : ''}</div>`;
    });
  });
  html += '</div>';
  heatmapEl.innerHTML = html;
}

function renderRange() {
  const from = rangeFrom.value;
  const to = rangeTo.value;
  if (!from && !to) {
    rangeTotalEl.textContent = '0 грн';
    rangeCountEl.textContent = '0';
    return;
  }
  const filtered = allTrips.filter((t) => {
    if (from && t.dateKey < from) return false;
    if (to && t.dateKey > to) return false;
    return true;
  });
  rangeTotalEl.textContent = filtered.reduce((s, t) => s + t.total, 0).toFixed(0) + ' грн';
  rangeCountEl.textContent = filtered.length;
}

rangeFrom.addEventListener('change', renderRange);
rangeTo.addEventListener('change', renderRange);

exportPdfBtn.addEventListener('click', () => {
  const doc = new window.jspdf.jsPDF();
  doc.setFontSize(16);
  doc.text('Звіт по заробітку', 14, 18);
  doc.setFontSize(11);
  let y = 30;
  const line = (label, value) => {
    doc.text(`${label}: ${value}`, 14, y);
    y += 8;
  };
  line('Дата формування', new Date().toLocaleDateString('uk-UA'));
  line('Сьогодні', todayTotalEl.textContent + ' грн (' + todayCountEl.textContent + ' поїздок)');
  line('Чайові сьогодні', todayTipsEl.textContent + ' грн');
  line('За тиждень', weekTotalEl.textContent + ' грн');
  line('За місяць', monthTotalEl.textContent + ' грн');
  line('Витрати сьогодні', todayExpensesEl.textContent);
  line('Комісія Uklon сьогодні', todayCommissionEl.textContent);
  line('Чистими сьогодні', todayNetEl.textContent);
  doc.save('zvit-' + todayKey() + '.pdf');
});

function getDefaultTheme() {
  const hour = new Date().getHours();
  return (hour >= 7 && hour < 19) ? 'light' : 'dark';
}

function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  themeToggleBtn.textContent = theme === 'light' ? '🌙' : '☀️';
}

let currentTheme = localStorage.getItem('theme') || getDefaultTheme();
applyTheme(currentTheme);

themeToggleBtn.addEventListener('click', () => {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', currentTheme);
  applyTheme(currentTheme);
});
