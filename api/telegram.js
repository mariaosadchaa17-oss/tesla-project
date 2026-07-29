const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(200).send('ok');
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const update = req.body;
  const message = update && update.message;

  if (!message || !message.text || !message.chat) {
    res.status(200).send('ok');
    return;
  }

  const chatId = message.chat.id;
  const text = message.text.trim();

  async function reply(replyText) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: replyText })
    });
  }

  try {
    if (text === '/start') {
      await reply(
        'Привіт! Пиши суму поїздки і чайові через пробіл.\n\n' +
        'Приклади:\n' +
        '500 — просто сума, без чайових\n' +
        '500 50 — сума і чайові\n' +
        '500 50 12 — сума, чайові, пробіг у км\n' +
        'Додай слово "картка", якщо оплата карткою (за замовчуванням готівка)'
      );
      res.status(200).send('ok');
      return;
    }

    const parts = text.split(/\s+/);
    let paymentMethod = 'cash';
    const numbers = [];

    parts.forEach((p) => {
      const lower = p.toLowerCase();
      if (lower.includes('карт')) {
        paymentMethod = 'card';
      } else if (lower.includes('готів') || lower.includes('налич')) {
        paymentMethod = 'cash';
      } else {
        const n = parseFloat(p.replace(',', '.'));
        if (!isNaN(n)) numbers.push(n);
      }
    });

    const amount = numbers[0] || 0;
    const tip = numbers[1] || 0;
    const km = numbers[2] || 0;

    if (amount <= 0 && tip <= 0) {
      await reply('Не зрозумів суму. Напиши, наприклад: 500 50');
      res.status(200).send('ok');
      return;
    }

    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);

    await db.collection('trips').add({
      amount,
      tip,
      total: amount + tip,
      km,
      paymentMethod,
      dateKey,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'telegram'
    });

    const paymentLabel = paymentMethod === 'card' ? 'картка' : 'готівка';
    await reply(`Записано: ${amount} грн + ${tip} чайових = ${amount + tip} грн (${paymentLabel})`);

    res.status(200).send('ok');
  } catch (err) {
    try {
      await reply('Сталася помилка: ' + String(err).slice(0, 300));
    } catch (e) {}
    res.status(200).send('ok');
  }
};
