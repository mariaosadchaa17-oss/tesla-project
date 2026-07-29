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
  try {
    const snapshot = await db.collection('trips').limit(1).get();
    const docs = snapshot.docs.map((d) => ({ id: d.id, data: d.data() }));
    res.status(200).json({ ok: true, count: snapshot.size, docs });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err) });
  }
};
