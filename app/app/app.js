// ==========================================
// 1. ІНІЦІАЛІЗАЦІЯ FIREBASE
// ==========================================
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

// ==========================================
// 2. ЕЛЕМЕНТИ DOM
// ==========================================
const form = document.getElementById('trip-form');
const amountInput = document.getElementById('amount');
const tipInput = document.getElementById('tip');
const kmInput = document.getElementById('km');
const historyList = document.getElementById('history-list');

const todayTotalEl = document.getElementById('today-total');
const todayTipsEl = document.getElementById('today-tips');
const todayCountEl = document.getElementById('today-count');
const weekTotalEl = document.getElementById('week-total');
const monthTotalEl = document.getElementById('month-total');

const commissionInput = document.getElementById('commission-input');
const todayCommissionEl = document.getElementById('today-commission');
const todayExpensesEl = document.getElementById('today-expenses');
const todayNetEl = document.getElementById('today-net');

const expenseForm = document.getElementById('expense-form');
const expenseCategory = document.getElementById('expense-category');
const expenseAmount = document.getElementById('expense-amount');
const expenseList = document.getElementById('expense-list');

const teslaKmEl = document.getElementById('tesla-km');
const teslaSavingsEl = document.getElementById('tesla-savings');

const shiftBtn = document.getElementById('shift-btn');
const shiftStatus = document.getElementById('shift-status');
const shiftRateRow = document.getElementById('shift-rate-row');
const shiftRateEl = document.getElementById('shift-rate');

const rangeFrom = document.getElementById('range-from');
const rangeTo = document.getElementById('range-to');
const rangeTotalEl = document.getElementById('range-total');
const rangeCountEl = document.getElementById('range-count');

// ==========================================
// 3. ДОПОМІЖНІ ФУНКЦІЇ ДАТИ ТА СТАНУ
// ==========================================
function dateKeyOf(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

let allTrips = [];
let allExpenses = [];
let shiftStartTime = localStorage.getItem('shiftStartTime') ? Number(localStorage.getItem('shiftStartTime')) : null;

// ==========================================
// 4. СЛУХАЧІ FIREBASE (REALTIME)
// ==========================================
tripsRef.orderBy('createdAt', 'desc').limit(500).onSnapshot((snapshot) => {
  allTrips = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  render();
});

expensesRef.orderBy('createdAt', 'desc').limit(200).onSnapshot((snapshot) => {
  allExpenses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  render();
});

// ==========================================
// 5. ДОДАВАННЯ ПОЇЗДКИ ТА ВИИТРАТ
// ==========================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = Number(amountInput.value) || 0;
  const tip = Number(tipInput.value) || 0;
  const km = Number(kmInput.value) || 0;
  const payment = document.querySelector('input[name="payment"]:checked')?.value || 'cash';

  if (amount <= 0 && tip <= 0) return;

  await tripsRef.add({
    amount,
    tip,
    total: amount + tip,
    km,
    payment,
    dateKey: dateKeyOf(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  amountInput.value = '';
  tipInput.value = '';
  kmInput.value = '';
  amountInput.focus();
});

expenseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = Number(expenseAmount.value) || 0;
  const category = expenseCategory.value;

  if (amount <= 0) return;

  await expensesRef.add({
    category,
    amount,
    dateKey: dateKeyOf(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  expenseAmount.value = '';
});

async function deleteTrip(id) {
  if (confirm('Видалити цю поїздку?')) {
    await tripsRef.doc(id).delete();
  }
}

async function deleteExpense(id) {
  if (confirm('Видалити цю витрату?')) {
    await expensesRef.doc(id).delete();
  }
}

// Швидкі чайові
document.querySelectorAll('.quick-tip-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const val = Number(btn.dataset.val) || 0;
    const current = Number(tipInput.value) || 0;
    tipInput.value = current + val;
  });
});

// Голосовий ввід
const micBtn = document.getElementById('mic-btn');
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'uk-UA';

  micBtn.addEventListener('click', () => {
    recognition.start();
    micBtn.style.opacity = '0.5';
  });

  recognition.onresult = (event) => {
    micBtn.style.opacity = '1';
    const text = event.results[0][0].transcript;
    const num = text.replace(/[^0-9]/g, '');
    if (num) amountInput.value = num;
  };

  recognition.onerror = () => { micBtn.style.opacity = '1'; };
  recognition.onend = () => { micBtn.style.opacity = '1'; };
}

// ==========================================
// 6. ЗМІНА (ГОДИНИ РОБОТИ)
// ==========================================
function updateShiftUI() {
  if (!shiftStartTime) {
    shiftStatus.textContent = 'Зміну не розпочато';
    shiftBtn.textContent = 'Почати зміну';
    shiftRateRow.style.display = 'none';
  } else {
    const hours = (Date.now() - shiftStartTime) / (1000 * 60 * 60);
    const today = dateKeyOf();
    const todayTrips = allTrips.filter((t) => t.dateKey === today);
    const todayGross = todayTrips.reduce((s, t) => s + t.total, 0);
    const rate = hours > 0 ? (todayGross / hours).toFixed(0) : 0;

    shiftStatus.textContent = `В дорозі: ${hours.toFixed(1)} год`;
    shiftBtn.textContent = 'Завершити зміну';
    shiftRateRow.style.display = 'flex';
    shiftRateEl.textContent = `${rate} грн/год`;
  }
}

shiftBtn.addEventListener('click', () => {
  if (!shiftStartTime) {
    shiftStartTime = Date.now();
    localStorage.setItem('shiftStartTime', shiftStartTime);
  } else {
    shiftStartTime = null;
    localStorage.removeItem('shiftStartTime');
  }
  updateShiftUI();
});

// ==========================================
// 7. ОСНОВНА ФУНКЦІЯ РЕНДЕРУ
// ==========================================
function render() {
  const today = dateKeyOf();

  // Поїздки та витрати за сьогодні
  const todayTrips = allTrips.filter((t) => t.dateKey === today);
  const todayExp = allExpenses.filter((e) => e.dateKey === today);

  const totalSum = todayTrips.reduce((s, t) => s + t.total, 0);
  const tipsSum = todayTrips.reduce((s, t) => s + t.tip, 0);
  const totalExpSum = todayExp.reduce((s, e) => s + e.amount, 0);

  // Комісія та чистий прибуток
  const commPercent = Number(commissionInput.value) || 15;
  const commSum = Math.round((totalSum * commPercent) / 100);
  const netProfit = totalSum - commSum - totalExpSum;

  todayTotalEl.textContent = totalSum.toFixed(0);
  todayTipsEl.textContent = tipsSum.toFixed(0);
  todayCountEl.textContent = todayTrips.length;

  todayCommissionEl.textContent = `${commSum} грн`;
  todayExpensesEl.textContent = `${totalExpSum} грн`;
  todayNetEl.textContent = `${netProfit} грн`;

  // Список поїздок за сьогодні
  historyList.innerHTML = '';
  todayTrips.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    const time = t.createdAt
      ? t.createdAt.toDate().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
      : '--:--';
    const payBadge = t.payment === 'card' ? '💳' : '💵';
    li.innerHTML = `
      <span class="history-time">${time} ${payBadge}</span>
      <span class="history-amounts">${t.amount} грн ${t.tip ? `<span class="history-tip">+${t.tip} чай</span>` : ''}</span>
      <span class="history-total">${t.total} грн</span>
      <button class="delete-btn" aria-label="Видалити">×</button>
    `;
    li.querySelector('.delete-btn').addEventListener('click', () => deleteTrip(t.id));
    historyList.appendChild(li);
  });

  if (todayTrips.length === 0) {
    historyList.innerHTML = '<li class="empty">Поки немає замовлень за сьогодні</li>';
  }

  // Список витрат за сьогодні
  expenseList.innerHTML = '';
  todayExp.forEach((e) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <span>${e.category}</span>
      <span class="card-value negative">-${e.amount} грн</span>
      <button class="delete-btn">×</button>
    `;
    li.querySelector('.delete-btn').addEventListener('click', () => deleteExpense(e.id));
    expenseList.appendChild(li);
  });

  // За тиждень і місяць
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const weekSum = allTrips
    .filter((t) => new Date(t.dateKey) >= weekAgo)
    .reduce((s, t) => s + t.total, 0);

  const monthSum = allTrips
    .filter((t) => new Date(t.dateKey) >= monthAgo)
    .reduce((s, t) => s + t.total, 0);

  weekTotalEl.textContent = weekSum.toFixed(0);
  monthTotalEl.textContent = monthSum.toFixed(0);

  // Економія на паливі (Tesla / Электро)
  const totalKm = allTrips.reduce((s, t) => s + (t.km || 0), 0);
  // Приблизна економія: ~4 грн/км порівняно з бензином
  const savings = Math.round(totalKm * 4);
  if (teslaKmEl) teslaKmEl.textContent = `${totalKm} км`;
  if (teslaSavingsEl) teslaSavingsEl.textContent = `${savings} грн`;

  // Оновлення зміни
  updateShiftUI();

  // Оновлення довільного періоду
  renderRange();
}

commissionInput.addEventListener('input', render);

// ==========================================
// 8. ДОВІЛЬНИЙ ПЕРІОД
// ==========================================
function renderRange() {
  if (!rangeFrom.value || !rangeTo.value) return;

  const from = rangeFrom.value;
  const to = rangeTo.value;

  const filtered = allTrips.filter((t) => t.dateKey >= from && t.dateKey <= to);
  const sum = filtered.reduce((s, t) => s + t.total, 0);

  rangeTotalEl.textContent = `${sum} грн`;
  rangeCountEl.textContent = filtered.length;
}

rangeFrom.addEventListener('change', renderRange);
rangeTo.addEventListener('change', renderRange);

// ==========================================
// 9. ЕКСПОРТ У CSV (З UTF-8 ДЛЯ EXCEL)
// ==========================================
document.getElementById('export-csv-btn').addEventListener('click', () => {
  if (allTrips.length === 0) {
    alert('Немає поїздок для експорту');
    return;
  }

  let csv = '\uFEFFДата;Час;Сума;Чайові;Разом;Пробіг;Оплата\n';

  allTrips.forEach((t) => {
    const dateStr = t.dateKey || '';
    const timeStr = t.createdAt
      ? t.createdAt.toDate().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
      : '';
    const paymentStr = t.payment === 'card' ? 'Картка' : 'Готівка';

    csv += `${dateStr};${timeStr};${t.amount || 0};${t.tip || 0};${t.total || 0};${t.km || 0};${paymentStr}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `poizdky-${dateKeyOf()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ==========================================
// 10. ЯКІСНИЙ PDF-ЗВІТ (БЕЗ ПОМИЛОК КИРИЛИЦІ)
// ==========================================
document.getElementById('export-pdf-btn').addEventListener('click', async () => {
  const reportEl = document.getElementById('pdf-report');
  if (!reportEl) return;

  // 1. Заповнюємо дані
  const nowStr = new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  
  document.getElementById('pdf-date').textContent = `Дата: ${nowStr}`;
  document.getElementById('pdf-today').textContent = `Зароблено сьогодні (брутто): ${todayTotalEl.textContent} грн`;
  document.getElementById('pdf-tips').textContent = `Чайові сьогодні: ${todayTipsEl.textContent} грн`;
  document.getElementById('pdf-week').textContent = `За останні 7 днів: ${weekTotalEl.textContent} грн`;
  document.getElementById('pdf-month').textContent = `За останні 30 днів: ${monthTotalEl.textContent} грн`;
  document.getElementById('pdf-expenses').textContent = `Витрати сьогодні: ${todayExpensesEl.textContent}`;
  document.getElementById('pdf-commission').textContent = `Комісія Uklon: ${todayCommissionEl.textContent}`;
  document.getElementById('pdf-net').textContent = `Чистий прибуток сьогодні: ${todayNetEl.textContent}`;

  // 2. Тимчасово показуємо і стилізуємо блок для знімка
  const originalStyle = reportEl.style.cssText;
  reportEl.style.display = 'block';
  reportEl.style.position = 'fixed';
  reportEl.style.top = '0';
  reportEl.style.left = '0';
  reportEl.style.width = '550px';
  reportEl.style.padding = '30px';
  reportEl.style.backgroundColor = '#ffffff';
  reportEl.style.color = '#000000';
  reportEl.style.zIndex = '99999';

  try {
    const canvas = await html2canvas(reportEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`zvit-${dateKeyOf()}.pdf`);
  } catch (err) {
    console.error('Помилка генерації PDF:', err);
    alert('Не вдалося сформувати PDF-звіт');
  } finally {
    // 3. Повертаємо блок у початковий стан
    reportEl.style.cssText = originalStyle;
  }
});

// ==========================================
// 11. ПЕРЕМИКАННЯ ТЕМИ (СВІТЛА / ТЕМНА)
// ==========================================
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    themeToggleBtn.textContent = document.body.classList.contains('light-theme') ? '🌙' : '☀️';
  });
}
