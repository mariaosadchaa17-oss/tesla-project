:root {
  --bg: #0b0d0f;
  --surface: #16191c;
  --surface-2: #1f2428;
  --text: #f2f3f4;
  --text-muted: #8b9299;
  --accent: #4f83f7;
  --charge: #34d399;
  --tip: #f2b705;
  --radius: 14px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
}

.app {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 20px;
}

.header h1 {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 26px;
  margin: 0;
}

.date {
  color: var(--text-muted);
  font-size: 14px;
  text-transform: capitalize;
}

.charge-card {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 16px;
}

.charge-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.charge-icon { font-size: 20px; }

.charge-total {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 32px;
}

.charge-track {
  background: var(--surface-2);
  border-radius: 999px;
  height: 10px;
  overflow: hidden;
}

.charge-fill {
  background: var(--charge);
  height: 100%;
  width: 0%;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.charge-label {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-muted);
}

.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.stat {
  flex: 1;
  background: var(--surface);
  border-radius: var(--radius);
  padding: 14px;
  text-align: center;
}

.stat-value {
  display: block;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 22px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.trip-form {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.field {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 13px;
  color: var(--text-muted);
}

.field input {
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 10px;
  padding: 12px;
  color: var(--text);
  font-size: 18px;
  width: 100%;
}

.field input:focus {
  outline: none;
  border-color: var(--accent);
}

.save-btn {
  flex-basis: 100%;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 14px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.save-btn:active { opacity: 0.85; }

.history h2 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14px;
}

.history-time {
  color: var(--text-muted);
  width: 48px;
}

.history-amounts {
  flex: 1;
  text-align: left;
  margin-left: 8px;
}

.history-tip { color: var(--tip); }

.history-total {
  font-weight: 500;
  margin-right: 8px;
}

.delete-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
}

.empty {
  color: var(--text-muted);
  font-size: 14px;
  text-align: center;
  padding: 16px 0;
}

.settings {
  margin-top: 24px;
  color: var(--text-muted);
  font-size: 14px;
}

.goal-form {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.goal-form input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 10px;
  padding: 10px;
  color: var(--text);
}

.goal-form button {
  background: var(--surface-2);
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  color: var(--text);
  cursor: pointer;
}
