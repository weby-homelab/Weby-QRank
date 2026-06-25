const fs = require('fs');
const path = require('path');
const { getDb } = require('./db');
const { updateSettings } = require('./settings');
const { recalculateUserQRank } = require('./qrank');

async function importData() {
  console.log('Loading result-5.json...');
  const jsonPath = path.join(__dirname, '../result-5.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error('File result-5.json not found!');
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(rawData);
  const messages = data.messages || [];
  
  console.log(`Found ${messages.length} messages. Processing...`);
  
  const db = await getDb();
  
  // Determine chat_id
  let chatId = null;
  const chatIdRow = await db.get("SELECT value FROM settings WHERE key = 'chat_id'");
  if (chatIdRow && chatIdRow.value) {
    chatId = parseInt(chatIdRow.value, 10);
  } else if (data.id) {
    chatId = parseInt(data.id, 10);
    if (chatId > 0) {
      chatId = -parseInt("100" + data.id, 10);
    }
  }

  if (!chatId) {
    console.error('Chat ID could not be determined.');
    process.exit(1);
  }

  // Map to resolve message authors for replies and registrations
  const messageIdToUserId = new Map();
  const userInfos = new Map(); // id -> { first_name, username, join_date }

  for (const msg of messages) {
    if (!msg.from_id || typeof msg.from_id !== 'string') continue;
    
    let userId;
    if (msg.from_id.startsWith('user')) {
      userId = parseInt(msg.from_id.substring(4), 10);
    } else if (msg.from_id.startsWith('channel')) {
      userId = parseInt(msg.from_id.substring(7), 10);
    } else {
      continue;
    }
    
    messageIdToUserId.set(msg.id, userId);
    
    const firstName = msg.from || 'Unknown';
    const msgDate = parseInt(msg.date_unixtime || '9999999999', 10);
    
    if (!userInfos.has(userId)) {
      userInfos.set(userId, {
        id: userId,
        first_name: firstName,
        username: '',
        join_date: msgDate
      });
    } else {
      const u = userInfos.get(userId);
      if (msgDate < u.join_date) {
        u.join_date = msgDate;
      }
    }
  }

  console.log(`Clearing old data and importing ${userInfos.size} users and ${messages.length} messages...`);
  
  await db.exec('BEGIN TRANSACTION');
  try {
    await db.exec('DELETE FROM users;');
    await db.exec('DELETE FROM messages;');
    await db.exec('DELETE FROM reactions;');
    await db.exec('DELETE FROM replies;');

    // 1. Insert users
    const userStmt = await db.prepare(
      `INSERT INTO users (id, username, first_name, karma, karma_flooder, karma_guru, karma_skeptic, join_date, message_count, engaged_message_count) 
       VALUES (?, ?, ?, 0, 0, 0, 0, ?, 0, 0)`
    );
    for (const u of userInfos.values()) {
      await userStmt.run([u.id, u.username, u.first_name, u.join_date]);
    }
    await userStmt.finalize();

    // 2. Insert messages
    const msgStmt = await db.prepare(
      `INSERT OR IGNORE INTO messages (message_id, chat_id, user_id, date_unixtime) VALUES (?, ?, ?, ?)`
    );
    for (const msg of messages) {
      if (!msg.id) continue;
      const userId = messageIdToUserId.get(msg.id);
      const date = parseInt(msg.date_unixtime || '0', 10);
      if (userId) {
        await msgStmt.run([msg.id, chatId, userId, date]);
      }
    }
    await msgStmt.finalize();

    // 3. Insert replies
    const replyStmt = await db.prepare(
      `INSERT OR IGNORE INTO replies (reply_message_id, reply_chat_id, parent_message_id, parent_chat_id, replier_id, author_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const msg of messages) {
      if (!msg.id || !msg.reply_to_message_id) continue;
      const replierId = messageIdToUserId.get(msg.id);
      const parentMsgId = msg.reply_to_message_id;
      const parentAuthorId = messageIdToUserId.get(parentMsgId);
      
      if (replierId && parentAuthorId && replierId !== parentAuthorId) {
        await replyStmt.run([msg.id, chatId, parentMsgId, chatId, replierId, parentAuthorId]);
      }
    }
    await replyStmt.finalize();

    // 4. Insert reactions with unique dummy reactor IDs
    let dummyReactorId = -1;
    const rxStmt = await db.prepare(
      `INSERT INTO reactions (message_id, chat_id, reactor_id, author_id, emoji) VALUES (?, ?, ?, ?, ?)`
    );
    for (const msg of messages) {
      if (!msg.id || !msg.reactions || !Array.isArray(msg.reactions)) continue;
      const authorId = messageIdToUserId.get(msg.id);
      if (!authorId) continue;

      for (const reaction of msg.reactions) {
        if (reaction.type === 'emoji') {
          const emoji = reaction.emoji;
          const count = reaction.count || 1;
          for (let i = 0; i < count; i++) {
            await rxStmt.run([msg.id, chatId, dummyReactorId--, authorId, emoji]);
          }
        }
      }
    }
    await rxStmt.finalize();

    // 5. Recalculate karma for all users
    console.log('Recalculating karma for all users...');
    for (const userId of userInfos.keys()) {
      await recalculateUserQRank(db, userId);
    }

    await db.exec('COMMIT');

    // Update last_update setting (run outside transaction)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('uk-UA', {
      timeZone: 'Europe/Kyiv',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const formattedDate = formatter.format(now).replace(',', '').replace(/\s+/g, ' ').trim();
    await updateSettings({ last_update: formattedDate });
    
    console.log('Import completed successfully!');
  } catch (err) {
    await db.exec('ROLLBACK');
    throw err;
  }
}

importData().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});