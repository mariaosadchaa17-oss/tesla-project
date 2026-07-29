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

const form = document.getElementById('trip-form');
const amountInput = document.getElementById('amount');
const tipInput = document.getElementById('tip');
const historyList = document.getElementById('history-list');
const daysList = document.getElementById('days-list');
const todayTotalEl = document.getElementById('today-total');
const todayTipsEl = document.getElementById('today-tips');
const todayCountEl = document.getElementById('today-count');
const weekTotalEl = document.getElementById('week-total');
const monthTotalEl = document.getElementById('month-total');

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

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = Number(amountInput.value) || 0;
  const tip = Number(tipInput.value) || 0;
  if (amount <= 0 && tip <= 0) return;

  await tripsRef.add({
    amount,
    tip,
    total: amount + tip,
    dateKey: todayKey(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  amountInput.value = '';
  tipInput.value = '';
  amountInput.focus();
});

let allTrips = [];

tripsRef.orderBy('createdAt', 'desc').limit(1000).onSnapshot((snapshot) => {
  allTrips = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  render();
});

async function deleteTrip(id) {
  await tripsRef.doc(id).delete();
}

function render() {
  const today = todayKey();
  const weekStart = startOfWeekKey();
  const monthStart = startOfMonthKey();

  const todayTrips = allTrips.filter((t) => t.dateKey === today);
  const weekTrips = allTrips.filter((t) => t.dateKey >= weekStart);
  const monthTrips = allTrips.filter((t) => t.dateKey >= monthStart);

  todayTotalEl.textContent = todayTrips.reduce((s, t) => s + t.total, 0).toFixed(0);
  todayTipsEl.textContent = todayTrips.reduce((s, t) => s + t.tip, 0).toFixed(0);
  todayCountEl.textContent = todayTrips.length;

  weekTotalEl.textContent = weekTrips.reduce((s, t) => s + t.total, 0).toFixed(0);
  monthTotalEl.textContent = monthTrips.reduce((s, t) => s + t.total, 0).toFixed(0);

  historyList.innerHTML = '';
  todayTrips.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    const time = t.createdAt
      ? t.createdAt.toDate().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
      : '--:--';
    li.innerHTML = `
      <span class="history-time">${time}</span>
      <span class="history-amounts">${t.amount} грн <span class="history-tip">+${t.tip} чай</span></span>
      <span class="history-total">${t.total} грн</span>
      <button class="delete-btn" aria-label="Видалити запис">×</button>
    `;
    li.querySelector('.delete-btn').addEventListener('click', () => deleteTrip(t.id));
    historyList.appendChild(li);
  });

  if (todayTrips.length === 0) {
    historyList.innerHTML = '<li class="empty">Поки немає замовлень за сьогодні</li>';
  }

  renderDays();
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
