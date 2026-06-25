const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let dbPromise;

async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: process.env.DB_PATH || path.join(__dirname, 'qrank.db'),
      driver: sqlite3.Database
    }).then(async (db) => {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          username TEXT,
          first_name TEXT,
          karma REAL DEFAULT 0,
          join_date INTEGER DEFAULT 9999999999,
          karma_flooder REAL DEFAULT 0,
          karma_guru REAL DEFAULT 0,
          karma_skeptic REAL DEFAULT 0,
          message_count INTEGER DEFAULT 0,
          engaged_message_count INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS messages (
          message_id INTEGER,
          chat_id INTEGER,
          user_id INTEGER,
          date_unixtime INTEGER DEFAULT 0,
          PRIMARY KEY (message_id, chat_id)
        );
        CREATE TABLE IF NOT EXISTS reactions (
          message_id INTEGER,
          chat_id INTEGER,
          reactor_id INTEGER,
          author_id INTEGER,
          emoji TEXT,
          PRIMARY KEY (message_id, chat_id, reactor_id, emoji)
        );
        CREATE TABLE IF NOT EXISTS replies (
          reply_message_id INTEGER,
          reply_chat_id INTEGER,
          parent_message_id INTEGER,
          parent_chat_id INTEGER,
          replier_id INTEGER,
          author_id INTEGER,
          PRIMARY KEY (reply_message_id, reply_chat_id)
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);
      
      try {
        await db.exec('ALTER TABLE users ADD COLUMN join_date INTEGER DEFAULT 9999999999;');
      } catch (e) {}
      
      try {
        await db.exec('ALTER TABLE users ADD COLUMN karma_flooder REAL DEFAULT 0;');
      } catch (e) {}
      
      try {
        await db.exec('ALTER TABLE users ADD COLUMN karma_guru REAL DEFAULT 0;');
      } catch (e) {}
      
      try {
        await db.exec('ALTER TABLE users ADD COLUMN karma_skeptic REAL DEFAULT 0;');
      } catch (e) {}

      try {
        await db.exec('ALTER TABLE users ADD COLUMN message_count INTEGER DEFAULT 0;');
      } catch (e) {}

      try {
        await db.exec('ALTER TABLE users ADD COLUMN engaged_message_count INTEGER DEFAULT 0;');
      } catch (e) {}

      try {
        await db.exec('ALTER TABLE messages ADD COLUMN date_unixtime INTEGER DEFAULT 0;');
      } catch (e) {}
      
      return db;
    });
  }
  return dbPromise;
}

module.exports = { getDb };