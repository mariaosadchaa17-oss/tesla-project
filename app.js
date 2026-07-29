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

const GAS_PRICE_PER_LITER      = 55;
const GAS_CONSUMPTION_PER_100KM = 8;
const EV_PRICE_PER_KWH         = 4;
const EV_CONSUMPTION_PER_100KM  = 18;

function startAppWithUid(uid) {
  const tripsRef    = db.collection('users').doc(uid).collection('trips');
  const expensesRef = db.collection('users').doc(uid).collection('expenses');

  const form          = document.getElementById('trip-form');
  const amountInput   = document.getElementById('amount');
  const tipInput      = document.getElementById('tip');
  const kmInput       = document.getElementById('km');
  const saveBtn       = document.getElementById('save-trip-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const historyList   = document.getElementById('history-list');

  const todayTotalEl      = document.getElementById('today-total');
  const todayTipsEl       = document.getElementById('today-tips');
  const todayCountEl      = document.getElementById('today-count');
  const weekTotalEl       = document.getElementById('week-total');
  const monthTotalEl      = document.getElementById('month-total');
  const todayExpensesEl   = document.getElementById('today-expenses');
  const todayCommissionEl = document.getElementById('today-commission');
  const todayNetEl        = document.getElementById('today-net');
  const commissionInput   = document.getElementById('commission-input');

  const expenseForm     = document.getElementById('expense-form');
  const expenseCategory = document.getElementById('expense-category');
  const expenseAmount   = document.getElementById('expense-amount');
  const expenseList     = document.getElementById('expense-list');

  const teslaKmEl      = document.getElementById('tesla-km');
  const teslaSavingsEl = document.getElementById('tesla-savings');
  const saveKmBtn      = document.getElementById('save-km-btn');
  const clearKmBtn     = document.getElementById('clear-km-btn');

  const heatmapEl      = document.getElementById('heatmap');
  const weekCompareEl  = document.getElementById('week-compare');
  const monthCompareEl = document.getElementById('month-compare');

  const rangeFrom    = document.getElementById('range-from');
  const rangeTo      = document.getElementById('range-to');
  const rangeTotalEl = document.getElementById('range-total');
  const rangeCountEl = document.getElementById('range-count');

  const exportPdfBtn   = document.getElementById('export-pdf-btn');
  const themeToggleBtn = document.getElementById('theme-toggle');

  let editingId = null;
  let allTrips    = [];
  let allExpenses = [];
  let commissionPercent = Number(localStorage.getItem(uid + '-commission')) || 15;
  commissionInput.value = commissionPercent;

  // ── Дати ──
  function dateKeyOf(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  const todayKey = () => dateKeyOf(new Date());
  function startOfWeekKey() {
    const d = new Date(), day = d.getDay() || 7;
    d.setDate(d.getDate() - (day - 1)); return dateKeyOf(d);
  }
  function startOfMonthKey()         { const d = new Date(); d.setDate(1); return dateKeyOf(d); }
  function addDaysToKey(key, delta)   { const d = new Date(key); d.setDate(d.getDate() + delta); return dateKeyOf(d); }
  function startOfMonthFromKey(key)   { const d = new Date(key); d.setDate(1); return dateKeyOf(d); }
  function formatDateUA(key)          { return new Date(key).toLocaleDateString('uk-UA', {day:'numeric', month:'long', year:'numeric'}); }
  function getWeekDates() {
    const today = new Date(), dow = today.getDay() || 7, mon = new Date(today);
    mon.setDate(today.getDate() - (dow - 1));
    return Array.from({length:7}, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
  }

  // ── Сума по діапазону — тільки чиста поїздка (без чайових) ──
  const sumRange = (from, to) =>
    allTrips
      .filter(t => !t.kmOnly && t.dateKey >= from && t.dateKey <= to)
      .reduce((s, t) => s + t.amount, 0); // <-- amount, не total

  // ── Авто-скидання о півночі ──
  function scheduleNextDayReset() {
    const now = new Date(), next = new Date(now);
    next.setDate(next.getDate() + 1); next.setHours(0, 0, 0, 0);
    setTimeout(() => { render(); scheduleNextDayReset(); }, next.getTime() - now.getTime());
  }
  scheduleNextDayReset();

  // ── Тема ──
  function applyTheme(theme) {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.body.classList.toggle('light', theme === 'light');
    themeToggleBtn.textContent = theme === 'light' ? '🌙' : '☀️';
  }
  let currentTheme = localStorage.getItem('theme') || ((new Date().getHours() >= 7 && new Date().getHours() < 19) ? 'light' : 'dark');
  applyTheme(currentTheme);
  themeToggleBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme); applyTheme(currentTheme);
  });

  // ── Форма поїздки ──
  const getPayment = () => (form.querySelector('input[name="payment"]:checked') || {}).value || 'cash';
  const setPayment = v => { const el = form.querySelector(`input[name="payment"][value="${v}"]`); if (el) el.checked = true; };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const amount = Number(amountInput.value) || 0;
    const tip    = Number(tipInput.value)    || 0;
    if (amount <= 0 && tip <= 0) return;
    const data = {
      amount, tip,
      total: amount + tip,      // зберігаємо для історії, але в статистиці не використовуємо
      paymentMethod: getPayment(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      dateKey: dateKeyOf(new Date())
    };
    if (editingId) { await tripsRef.doc(editingId).update(data); stopEditing(); }
    else           { await tripsRef.add(data); }
    amountInput.value = ''; tipInput.value = ''; amountInput.focus();
  });

  cancelEditBtn.addEventListener('click', stopEditing);
  function startEditing(t) {
    editingId = t.id; amountInput.value = t.amount; tipInput.value = t.tip; setPayment(t.paymentMethod || 'cash');
    saveBtn.innerHTML = '💾 Зберегти зміни'; cancelEditBtn.style.display = 'block'; amountInput.focus();
  }
  function stopEditing() {
    editingId = null; saveBtn.innerHTML = '💾 Зберегти поїздку'; cancelEditBtn.style.display = 'none';
  }

  commissionInput.addEventListener('input', () => {
    commissionPercent = Number(commissionInput.value) || 0;
    localStorage.setItem(uid + '-commission', commissionPercent); render();
  });
  document.querySelectorAll('.quick-tip-btn').forEach(btn =>
    btn.addEventListener('click', () => { tipInput.value = btn.dataset.val; })
  );

  // ── Firebase ──
  tripsRef.orderBy('createdAt', 'desc').limit(1000).onSnapshot(snap => {
    allTrips = snap.docs.map(doc => {
      const d = doc.data();
      if (d.createdAt) d.dateKey = dateKeyOf(d.createdAt.toDate());
      return { id: doc.id, ...d };
    }); render();
  });
  expensesRef.orderBy('createdAt', 'desc').limit(500).onSnapshot(snap => {
    allExpenses = snap.docs.map(doc => {
      const d = doc.data();
      if (d.createdAt) d.dateKey = dateKeyOf(d.createdAt.toDate());
      return { id: doc.id, ...d };
    }); render();
  });

  const deleteTrip    = id => tripsRef.doc(id).delete();
  const deleteExpense = id => expensesRef.doc(id).delete();

  expenseForm.addEventListener('submit', async e => {
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

  // ── Пробіг ──
  saveKmBtn.addEventListener('click', async () => {
    const km = Number(kmInput.value) || 0; if (km <= 0) return;
    await tripsRef.add({
      amount: 0, tip: 0, total: 0, km, kmOnly: true, paymentMethod: 'cash',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      dateKey: dateKeyOf(new Date())
    });
    kmInput.value = ''; saveKmBtn.textContent = '✓';
    setTimeout(() => { saveKmBtn.textContent = 'Зберегти'; }, 1500);
  });
  clearKmBtn.addEventListener('click', async () => {
    const kmT = allTrips.filter(t => t.kmOnly);
    if (!kmT.length) return;
    if (!confirm('Очистити весь пробіг?')) return;
    await Promise.all(kmT.map(t => tripsRef.doc(t.id).delete()));
  });

  // ── Render ──
  function render() {
    const today = todayKey(), ws = startOfWeekKey(), ms = startOfMonthKey();
    const todayT  = allTrips.filter(t => t.dateKey === today && !t.kmOnly);
    const weekT   = allTrips.filter(t => t.dateKey >= ws     && !t.kmOnly);
    const monthT  = allTrips.filter(t => t.dateKey >= ms     && !t.kmOnly);
    const todayEx = allExpenses.filter(x => x.dateKey === today);

    // ── Центральна логіка: чайові не обкладаються комісією ──
    // • amount  — чиста сума поїздки (комісія береться з неї)
    // • tip     — чайові (повністю до чистого прибутку)
    // • чистий = amount - commission + tips - expenses
    // • Статистика тижня/місяця = тільки amount (без чайових)

    const todayAmount  = todayT.reduce((s, t) => s + t.amount, 0);
    const todayTips    = todayT.reduce((s, t) => s + t.tip,    0);
    const todayTotal   = todayAmount + todayTips;          // для показу ⬚ заголовка
    const todayComm    = todayAmount * commissionPercent / 100;
    const todayExTotal = todayEx.reduce((s, x) => s + x.amount, 0);
    const todayNet     = todayAmount - todayComm + todayTips - todayExTotal;

    // Статистика тижня/місяця — тільки amount
    const weekAmount  = weekT.reduce((s, t)  => s + t.amount, 0);
    const monthAmount = monthT.reduce((s, t) => s + t.amount, 0);

    // … але в заголовку показуємо повну виручку за сьогодні (з чайовими)
    todayTotalEl.textContent      = todayTotal.toFixed(0);
    todayTipsEl.textContent       = todayTips.toFixed(0);
    todayCountEl.textContent      = todayT.length;
    weekTotalEl.textContent       = weekAmount.toFixed(0);
    monthTotalEl.textContent      = monthAmount.toFixed(0);
    todayExpensesEl.textContent   = todayExTotal.toFixed(0) + ' грн';
    todayCommissionEl.textContent = '= ' + todayComm.toFixed(0) + ' грн';
    todayNetEl.textContent        = todayNet.toFixed(0) + ' грн';

    // ── Список поїздок ──
    historyList.innerHTML = '';
    todayT.forEach(t => {
      const li = document.createElement('li'); li.className = 'history-item';
      const time = t.createdAt ? t.createdAt.toDate().toLocaleTimeString('uk-UA', {hour:'2-digit', minute:'2-digit'}) : '--:--';
      const pi   = t.paymentMethod === 'card' ? '💳' : '💵';
      li.innerHTML = `
        <span class="history-time">${time}</span>
        <span class="history-amounts">${pi} ${t.amount} грн <span class="history-tip">+${t.tip} чай</span></span>
        <span class="history-total">${t.total} грн</span>
        <button class="edit-btn">✎</button>
        <button class="delete-btn">×</button>`;
      li.querySelector('.edit-btn').addEventListener('click',   () => startEditing(t));
      li.querySelector('.delete-btn').addEventListener('click', () => deleteTrip(t.id));
      historyList.appendChild(li);
    });
    if (!todayT.length) historyList.innerHTML = '<li class="empty">Поки немає замовлень за сьогодні</li>';

    expenseList.innerHTML = '';
    todayEx.forEach(x => {
      const li = document.createElement('li'); li.className = 'history-item';
      li.innerHTML = `<span class="history-time">${x.category}</span><span class="history-amounts"></span><span class="history-total">${x.amount} грн</span><button class="delete-btn">×</button>`;
      li.querySelector('.delete-btn').addEventListener('click', () => deleteExpense(x.id));
      expenseList.appendChild(li);
    });
    if (!todayEx.length) expenseList.innerHTML = '<li class="empty">Витрат сьогодні немає</li>';

    renderTesla(); renderHeatmap(); renderRange(); renderCompare();
  }

  // ── Tesla ──
  function renderTesla() {
    const km  = allTrips.reduce((s, t) => s + (t.km || 0), 0);
    const gas = km / 100 * GAS_CONSUMPTION_PER_100KM * GAS_PRICE_PER_LITER;
    const ev  = km / 100 * EV_CONSUMPTION_PER_100KM  * EV_PRICE_PER_KWH;
    teslaKmEl.textContent      = km.toFixed(0) + ' км';
    teslaSavingsEl.textContent = Math.max(0, gas - ev).toFixed(0) + ' грн';
  }

  // ── Heatmap — теж по amount ──
  const DOW_LABELS    = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  const BUCKET_LABELS = ['Ранок', 'День', 'Вечір'];
  function getTimeBucket(h) { return h >= 6 && h < 12 ? 0 : h >= 12 && h < 18 ? 1 : h >= 18 ? 2 : null; }

  function renderHeatmap() {
    const grid = Array.from({length: 7}, () => [0, 0, 0]);
    allTrips.forEach(t => {
      if (!t.createdAt || t.kmOnly) return;
      const d   = t.createdAt.toDate();
      const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
      const b   = getTimeBucket(d.getHours());
      if (b === null) return;
      grid[dow][b] += t.amount; // <-- тільки чиста поїздка
    });
    let max = 0; grid.forEach(r => r.forEach(v => { if (v > max) max = v; }));
    const wd = getWeekDates(), ts = dateKeyOf(new Date());
    let html = '<div class="heatmap-grid">';
    html += '<div class="heatmap-cell heatmap-label"></div>';
    BUCKET_LABELS.forEach(b => { html += `<div class="heatmap-cell heatmap-label">${b}</div>`; });
    grid.forEach((row, i) => {
      const d = wd[i], isT = dateKeyOf(d) === ts;
      const s = isT ? 'color:var(--accent);font-weight:700;' : '';
      html += `<div class="heatmap-cell heatmap-label heatmap-day-label" style="${s}"><span class="hm-dow">${DOW_LABELS[i]}</span><span class="hm-date">${d.getDate()}.${String(d.getMonth()+1).padStart(2,'0')}</span></div>`;
      row.forEach(v => {
        const op = max > 0 ? (0.15 + 0.85 * (v / max)).toFixed(2) : 0.1;
        const c  = v > 0 ? '#ffffff' : 'var(--text-muted)';
        html += `<div class="heatmap-cell" style="background:rgba(79,131,247,${op});color:${c}" title="${v.toFixed(0)} грн">${v > 0 ? Math.round(v) : ''}</div>`;
      });
    });
    html += '</div>'; heatmapEl.innerHTML = html;
  }

  // ── Range — по amount ──
  function renderRange() {
    const from = rangeFrom.value, to = rangeTo.value;
    if (!from && !to) { rangeTotalEl.textContent = '0 грн'; rangeCountEl.textContent = '0'; return; }
    const f = allTrips.filter(t => {
      if (t.kmOnly) return false;
      if (from && t.dateKey < from) return false;
      if (to   && t.dateKey > to)   return false;
      return true;
    });
    rangeTotalEl.textContent = f.reduce((s, t) => s + t.amount, 0).toFixed(0) + ' грн'; // <-- amount
    rangeCountEl.textContent = f.length;
  }
  rangeFrom.addEventListener('change', renderRange);
  rangeTo.addEventListener('change',   renderRange);

  // ── Compare ──
  function compareBadge(cur, prev) {
    if (!prev) return cur > 0 ? '<span class="badge up">▲</span>' : '';
    const p = ((cur - prev) / prev) * 100;
    if (Math.abs(p) < 1) return '';
    return `<span class="badge ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'}${Math.abs(p).toFixed(0)}%</span>`;
  }
  function renderCompare() {
    const ws = startOfWeekKey(), today = todayKey();
    const pwe = addDaysToKey(ws, -1), pws = addDaysToKey(ws, -7);
    const ms  = startOfMonthKey(), pme = addDaysToKey(ms, -1), pms = startOfMonthFromKey(pme);
    weekCompareEl.innerHTML  = compareBadge(sumRange(ws,  today), sumRange(pws, pwe));
    monthCompareEl.innerHTML = compareBadge(sumRange(ms,  today), sumRange(pms, pme));
  }

  // ── PDF ──
  exportPdfBtn.addEventListener('click', async () => {
    const old = exportPdfBtn.textContent;
    exportPdfBtn.textContent = 'Генерація...'; exportPdfBtn.disabled = true;
    const from = rangeFrom.value, to = rangeTo.value, isRange = from || to;
    let rt, re, title, period, fname;
    if (isRange) {
      rt = allTrips.filter(t => {
        if (t.kmOnly) return false;
        if (from && t.dateKey < from) return false;
        if (to   && t.dateKey > to)   return false;
        return true;
      });
      re = allExpenses.filter(x => {
        if (from && x.dateKey < from) return false;
        if (to   && x.dateKey > to)   return false;
        return true;
      });
      period = (from ? formatDateUA(from) : '...') + ' — ' + (to ? formatDateUA(to) : '...');
      title = 'Звіт за період'; fname = 'zvit-' + (from || 'start') + '-' + (to || 'end') + '.pdf';
    } else {
      const td = todayKey();
      rt = allTrips.filter(t => t.dateKey === td && !t.kmOnly);
      re = allExpenses.filter(x => x.dateKey === td);
      period = formatDateUA(td); title = 'Звіт за день'; fname = 'zvit-' + td + '.pdf';
    }
    // PDF — чиста поїздка + чайові окремо
    const fare     = rt.reduce((s, t) => s + t.amount, 0);
    const tips     = rt.reduce((s, t) => s + t.tip,    0);
    const total    = fare + tips;
    const count    = rt.length;
    const expenses = re.reduce((s, x) => s + x.amount, 0);
    const comm     = fare * commissionPercent / 100;
    const net      = fare - comm + tips - expenses;
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const resp = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf');
      if (!resp.ok) throw new Error('font');
      const fb64 = btoa(new Uint8Array(await resp.arrayBuffer()).reduce((d, b) => d + String.fromCharCode(b), ''));
      doc.addFileToVFS('Roboto-Regular.ttf', fb64);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(18); doc.text(title, 14, 20);
      doc.setFontSize(10); doc.setTextColor(120, 120, 120);
      doc.text('Період: ' + period, 14, 30);
      doc.text('Сформовано: ' + new Date().toLocaleDateString('uk-UA'), 14, 37);
      doc.setTextColor(0, 0, 0); let y = 50;
      const line = (l, v) => { doc.setFontSize(10); doc.setTextColor(100,100,100); doc.text(l, 14, y); doc.setTextColor(0,0,0); doc.setFontSize(12); doc.text(String(v), 110, y); y += 9; };
      const sep  = () => { doc.setDrawColor(220,220,220); doc.line(14, y, 196, y); y += 6; };
      line('Чиста поїздка:', fare.toFixed(0)  + ' грн (' + count + ' поїздок)');
      line('Чайові (+):', tips.toFixed(0) + ' грн');
      line('Комісія Uklon (' + commissionPercent + '%) (-):', comm.toFixed(0) + ' грн'); sep();
      line('Витрати (-):', expenses.toFixed(0) + ' грн'); sep();
      line('Чистими:', net.toFixed(0) + ' грн');
      doc.save(fname);
    } catch (err) {
      const txt = [title, 'Період: ' + period, '',
        'Чиста поїздка: ' + fare.toFixed(0) + ' грн (' + count + ' поїздок)',
        'Чайові: ' + tips.toFixed(0) + ' грн',
        'Комісія (' + commissionPercent + '%): ' + comm.toFixed(0) + ' грн',
        'Витрати: ' + expenses.toFixed(0) + ' грн',
        'Чистими: ' + net.toFixed(0) + ' грн'
      ].join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['\uFEFF' + txt], { type: 'text/plain;charset=utf-8;' }));
      a.download = fname.replace('.pdf', '.txt'); a.click();
    } finally {
      exportPdfBtn.textContent = old; exportPdfBtn.disabled = false;
    }
  });
}
