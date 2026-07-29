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
const weekChartEl = document.getElementById('week-chart');
const weekCompareEl = document.getElementById('week-compare');
const monthCompareEl = document.getElementById('month-compare');

const rangeFrom = document.getElementById('range-from');
const rangeTo = document.getElementById('range-to');
const rangeTotalEl = document.getElementById('range-total');
const rangeCountEl = document.getElementById('range-count');

const exportPdfBtn = document.getElementById('export-pdf-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const lockBtn = document.getElementById('lock-btn');
const pinOverlay = document.getElementById('pin-overlay');
const pinInput = document.getElementById('pin-input');
const pinSubmitBtn = document.getElementById('pin-submit-btn');
const pinError = document.getElementById('pin-error');
const pinSetupForm = document.getElementById('pin-setup-form');
const pinSetupInput = document.getElementById('pin-setup-input');
const pinRemoveBtn = document.getElementById('pin-remove-btn');
const micBtn = document.getElementById('mic-btn');

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

function addDaysToKey(key, delta) {
  const d = new Date(key);
  d.setDate(d.getDate() + delta);
  return dateKeyOf(d);
}

function startOfMonthFromKey(key) {
  const d = new Date(key);
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

document.querySelectorAll('.quick-tip-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    tipInput.value = btn.dataset.val;
  });
});

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognitionCtor && micBtn) {
  const recognition = new SpeechRecognitionCtor();
  recognition.lang = 'uk-UA';
  recognition.interimResults = false;
  micBtn.addEventListener('click', () => {
    try { recognition.start(); } catch (e) {}
  });
  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    const match = transcript.replace(',', '.').match(/\d+(\.\d+)?/);
    if (match) amountInput.value = match[0];
  };
} else if (micBtn) {
  micBtn.style.display = 'none';
}

function checkLock() {
  const savedPin = localStorage.getItem('appPin');
  if (savedPin && sessionStorage.getItem('unlocked') !== '1') {
    pinOverlay.classList.remove('hidden');
  } else {
    pinOverlay.classList.add('hidden');
  }
}
checkLock();

pinSubmitBtn.addEventListener('click', () => {
  if (pinInput.value && pinInput.value === localStorage.getItem('appPin')) {
    sessionStorage.setItem('unlocked', '1');
    pinInput.value = '';
    pinError.textContent = '';
    checkLock();
  } else {
    pinError.textContent = 'Невірний PIN';
  }
});

lockBtn.addEventListener('click', () => {
  if (!localStorage.getItem('appPin')) {
    alert('Спочатку встанови PIN у розділі "Захист паролем" внизу сторінки');
    return;
  }
  sessionStorage.removeItem('unlocked');
  checkLock();
});

pinSetupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = pinSetupInput.value.trim();
  if (val.length < 4) {
    alert('PIN має бути мінімум 4 цифри');
    return;
  }
  localStorage.setItem('appPin', val);
  sessionStorage.setItem('unlocked', '1');
  pinSetupInput.value = '';
  alert('PIN встановлено');
});

pinRemoveBtn.addEventListener('click', () => {
  localStorage.removeItem('appPin');
  sessionStorage.removeItem('unlocked');
  alert('Захист вимкнено');
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

function sumRange(from, to) {
  return allTrips.filter((t) => t.dateKey >= from && t.dateKey <= to).reduce((s, t) => s + t.total, 0);
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
  renderHeatmap();
  renderRange();
  renderWeekChart();
  renderCompare();
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

function renderWeekChart() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(dateKeyOf(d));
  }
  const totals = days.map((key) => allTrips.filter((t) => t.dateKey === key).reduce((s, t) => s + t.total, 0));
  const max = Math.max(...totals, 1);
  weekChartEl.innerHTML = days.map((key, i) => {
    const h = Math.max(2, Math.round((totals[i] / max) * 100));
    const label = new Date(key).toLocaleDateString('uk-UA', { day: 'numeric', month: 'numeric' });
    return `<div class="bar-col"><div class="bar" style="height:${h}%" title="${totals[i].toFixed(0)} грн"></div><div class="bar-label">${label}</div></div>`;
  }).join('');
}

function compareBadge(curr, prev) {
  if (prev === 0) {
    return curr > 0 ? '<span class="badge up">новий результат</span>' : '<span class="badge">—</span>';
  }
  const pct = ((curr - prev) / prev) * 100;
  const cls = pct >= 0 ? 'up' : 'down';
  const sign = pct >= 0 ? '+' : '';
  return `<span class="badge ${cls}">${sign}${pct.toFixed(0)}%</span>`;
}

function renderCompare() {
  const weekStart = startOfWeekKey();
  const weekEnd = todayKey();
  const prevWeekEnd = addDaysToKey(weekStart, -1);
  const prevWeekStart = addDaysToKey(weekStart, -7);

  const monthStart = startOfMonthKey();
  const prevMonthEnd = addDaysToKey(monthStart, -1);
  const prevMonthStart = startOfMonthFromKey(prevMonthEnd);

  const curWeek = sumRange(weekStart, weekEnd);
  const prevWeek = sumRange(prevWeekStart, prevWeekEnd);
  const curMonth = sumRange(monthStart, todayKey());
  const prevMonth = sumRange(prevMonthStart, prevMonthEnd);

  weekCompareEl.innerHTML = compareBadge(curWeek, prevWeek);
  monthCompareEl.innerHTML = compareBadge(curMonth, prevMonth);
}

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

exportCsvBtn.addEventListener('click', () => {
  const header = 'Дата,Час,Сума,Чайові,Разом,Пробіг,Оплата\n';
  const rows = allTrips.map((t) => {
    const d = t.createdAt ? t.createdAt.toDate() : null;
    const date = d ? dateKeyOf(d) : t.dateKey;
    const time = d ? d.toLocaleTimeString('uk-UA') : '';
    const pay = t.paymentMethod === 'card' ? 'картка' : 'готівка';
    return [date, time, t.amount, t.tip, t.total, t.km || 0, pay].join(',');
  }).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'poizdky.csv';
  a.click();
  URL.revokeObjectURL(url);
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
