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

// Орієнтовні значення для розрахунку економії (можна підкоригувати)
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
const daysList = document.getElementById('days-list');

const todayTotalEl = document.getElementById('today-total');
const todayTipsEl = document.getElementById('today-tips');
const todayCountEl = document.getElementById('today-count');
const weekTotalEl = document.getElementById('week-total');
const monthTotalEl = document.getElementById('month-total');
const todayExpensesEl = document.getElementById('today-expenses');
const todayNetEl = document.getElementById('today-net');

const expenseForm = document.getElementById('expense-form');
const expenseCategory = document.getElementById('expense-category');
const expenseAmount = document.getElementById('expense-amount');
const expenseList = document.getElementById('expense-list');

const shiftBtn = document.getElementById('shift-btn');
const shiftStatus = document.getElementById('shift-status');
const shiftRateRow = document.getElementById('shift-rate-row');
const shiftRate = document.getElementById('shift-rate');

const teslaKmEl = document.getElementById('tesla-km');
const teslaSavingsEl = document.getElementById('tesla-savings');

let editingId = null;
let allTrips = [];
let allExpenses = [];
let activeShift = null;
let shiftInterval = null;

function dateKeyOf(date) {
  return date.toISOString().slice(0, 10);
}

function todayKey() {
  return dateKeyOf(new Date());
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

function render() {
  const today = todayKey();
  const weekStart = startOfWeekKey();
  const monthStart = startOfMonthKey();

  const todayTrips = allTrips.filter((t) => t.dateKey === today);
  const weekTrips = allTrips.filter((t) => t.dateKey >= weekStart);
  const monthTrips = allTrips.filter((t) => t.dateKey >= monthStart);
  const todayExpensesList = allExpenses.filter((x) => x.dateKey === today);

  const todayTotal = todayTrips.reduce((s, t) => s + t.total, 0);
  const todayExpensesTotal = todayExpensesList.reduce((s, x) => s + x.amount, 0);

  todayTotalEl.textContent = todayTotal.toFixed(0);
  todayTipsEl.textContent = todayTrips.reduce((s, t) => s + t.tip, 0).toFixed(0);
  todayCountEl.textContent = todayTrips.length;

  weekTotalEl.textContent = weekTrips.reduce((s, t) => s + t.total, 0).toFixed(0);
  monthTotalEl.textContent = monthTrips.reduce((s, t) => s + t.total, 0).toFixed(0);

  todayExpensesEl.textContent = todayExpensesTotal.toFixed(0) + ' грн';
  todayNetEl.textContent = (todayTotal - todayExpensesTotal).toFixed(0) + ' грн';

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
