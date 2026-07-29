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
const todayTotalEl = document.getElementById('today-total');
const todayTipsEl = document.getElementById('today-tips');
const todayCountEl = document.getElementById('today-count');
const chargeFill = document.getElementById('charge-fill');
const chargeLabel = document.getElementById('charge-label');
const goalInput = document.getElementById('goal-input');
const goalForm = document.getElementById('goal-form');

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

let goal = Number(localStorage.getItem('dailyGoal')) || 3000;
goalInput.value = goal;

goalForm.addEventListener('submit', (e) => {
  e.preventDefault();
  goal = Number(goalInput.value) || 0;
  localStorage.setItem('dailyGoal', goal);
  render();
});

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

tripsRef.orderBy('createdAt', 'desc').limit(200).onSnapshot((snapshot) => {
  allTrips = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  render();
});

async function deleteTrip(id) {
  await tripsRef.doc(id).delete();
}

function render() {
  const today = todayKey();
  const todayTrips = allTrips.filter((t) => t.dateKey === today);

  const totalSum = todayTrips.reduce((s, t) => s + t.total, 0);
  const tipsSum = todayTrips.reduce((s, t) => s + t.tip, 0);

  todayTotalEl.textContent = totalSum.toFixed(0);
  todayTipsEl.textContent = tipsSum.toFixed(0);
  todayCountEl.textContent = todayTrips.length;

  const pct = goal > 0 ? Math.min(100, Math.round((totalSum / goal) * 100)) : 0;
  chargeFill.style.width = pct + '%';
  chargeLabel.textContent = pct + '% від цілі ' + goal + ' грн';

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
}
