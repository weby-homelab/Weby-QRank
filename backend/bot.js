const { Bot } = require('grammy');
const { getDb } = require('./db');
const { 
  recalculateUserKarma, 
  FLOODER_EMOJIS, 
  GURU_EMOJIS, 
  SKEPTIC_EMOJIS, 
  NEGATIVE_EMOJIS 
} = require('./karma');

const VALID_EMOJIS = [...FLOODER_EMOJIS, ...GURU_EMOJIS, ...SKEPTIC_EMOJIS, ...NEGATIVE_EMOJIS];

let botInstance = null;

async function startBot(token, webAppUrl, targetChatId) {
  if (!token || token === 'DUMMY_TOKEN') {
    console.warn("No BOT_TOKEN provided. Bot will not start.");
    return;
  }

  const bot = new Bot(token);
  botInstance = bot;

  // Start command
  bot.command('start', async (ctx) => {
    const db = await getDb();
    await registerUser(db, ctx.from);
    
    await ctx.reply('Вітаємо у Karma Community! Натисніть кнопку нижче, щоб відкрити додаток.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Відкрити App', web_app: { url: webAppUrl } }]
        ]
      }
    });
  });

  // Track messages and replies
  bot.on('message', async (ctx) => {
    if (!ctx.from) return;
    const db = await getDb();
    await registerUser(db, ctx.from);
    
    if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
      if (targetChatId && String(ctx.chat.id) !== String(targetChatId)) return;
      
      const res = await db.run(
        'INSERT OR IGNORE INTO messages (message_id, chat_id, user_id, date_unixtime) VALUES (?, ?, ?, ?)',
        [ctx.message.message_id, ctx.chat.id, ctx.from.id, ctx.message.date]
      );
      
      let parentAuthorRecalc = null;
      
      // Handle replies (Every action has weight)
      if (ctx.message.reply_to_message) {
        const parentMsgId = ctx.message.reply_to_message.message_id;
        const parentRow = await db.get(
          'SELECT user_id FROM messages WHERE message_id = ? AND chat_id = ?',
          [parentMsgId, ctx.chat.id]
        );
        if (parentRow && parentRow.user_id !== ctx.from.id) { // No self-replies
          await db.run(
            `INSERT OR IGNORE INTO replies (reply_message_id, reply_chat_id, parent_message_id, parent_chat_id, replier_id, author_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [ctx.message.message_id, ctx.chat.id, parentMsgId, ctx.chat.id, ctx.from.id, parentRow.user_id]
          );
          parentAuthorRecalc = parentRow.user_id;
        }
      }

      // Recalculate sender's karma (total messages count changed, affecting Quality Index Q)
      await recalculateUserKarma(db, ctx.from.id);
      
      // Recalculate parent author's karma (received reply)
      if (parentAuthorRecalc) {
        await recalculateUserKarma(db, parentAuthorRecalc);
      }
      
      if (res.changes > 0 || parentAuthorRecalc) {
        await updateLastUpdateTime(db);
      }
    }
  });

  // Handle reactions
  bot.on('message_reaction', async (ctx) => {
    const reaction = ctx.messageReaction;
    const db = await getDb();
    
    if (targetChatId && String(reaction.chat.id) !== String(targetChatId)) return;
    
    const reactor = reaction.user;
    if (!reactor) return; // Anonymous reactor
    
    await registerUser(db, reactor);

    // Find original message author
    const msgRow = await db.get(
      'SELECT user_id FROM messages WHERE message_id = ? AND chat_id = ?',
      [reaction.message_id, reaction.chat.id]
    );
    
    if (!msgRow) return; // We don't have this message in DB
    const authorId = msgRow.user_id;
    
    if (authorId === reactor.id) return; // No self-karma

    // Calculate difference between old and new reactions
    const oldEmojis = reaction.old_reaction.filter(r => r.type === 'emoji').map(r => r.emoji);
    const newEmojis = reaction.new_reaction.filter(r => r.type === 'emoji').map(r => r.emoji);
    
    const added = newEmojis.filter(e => !oldEmojis.includes(e) && VALID_EMOJIS.includes(e));
    const removed = oldEmojis.filter(e => !newEmojis.includes(e) && VALID_EMOJIS.includes(e));
    
    let dbUpdated = false;

    // Process removals
    for (const emoji of removed) {
      const res = await db.run(
        'DELETE FROM reactions WHERE message_id = ? AND chat_id = ? AND reactor_id = ? AND emoji = ?',
        [reaction.message_id, reaction.chat.id, reactor.id, emoji]
      );
      if (res.changes > 0) dbUpdated = true;
    }
    
    // Process additions
    for (const emoji of added) {
      const res = await db.run(
        'INSERT OR IGNORE INTO reactions (message_id, chat_id, reactor_id, author_id, emoji) VALUES (?, ?, ?, ?, ?)',
        [reaction.message_id, reaction.chat.id, reactor.id, authorId, emoji]
      );
      if (res.changes > 0) dbUpdated = true;
    }
    
    if (dbUpdated) {
      // Recalculate target user's karma
      await recalculateUserKarma(db, authorId);
      await updateLastUpdateTime(db);
    }
  });

  bot.start({
    allowed_updates: ["message", "message_reaction", "callback_query"],
    onStart: (botInfo) => {
      console.log(`Bot @${botInfo.username} started!`);
    }
  }).catch(err => console.error('Bot start error:', err));
}

// Helper to register user
async function registerUser(db, user) {
  if (!user || user.is_bot) return;
  await db.run(
    `INSERT INTO users (id, username, first_name, join_date) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET 
       username=excluded.username, 
       first_name=excluded.first_name,
       join_date=MIN(users.join_date, excluded.join_date)`,
    [user.id, user.username, user.first_name, Math.floor(Date.now() / 1000)]
  );
}

async function updateLastUpdateTime(db) {
  try {
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
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['last_update', formattedDate]);
  } catch (e) {
    console.error('Error updating last_update time:', e);
  }
}

module.exports = { startBot };