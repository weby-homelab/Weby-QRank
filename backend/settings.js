const { getDb } = require('./db');

async function getSettings() {
  const db = await getDb();
  const rows = await db.all('SELECT key, value FROM settings');
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

async function updateSettings(newSettings) {
  const db = await getDb();
  await db.exec('BEGIN TRANSACTION');
  const stmt = await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(newSettings)) {
    if (value !== undefined && value !== null) {
      await stmt.run([key, value.toString()]);
    }
  }
  await stmt.finalize();
  await db.exec('COMMIT');
}

module.exports = { getSettings, updateSettings };