require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { getDb } = require('./db');
const { getSettings, updateSettings } = require('./settings');
const { startBot } = require('./bot');
const { recalculateUserQRank } = require('./qrank');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 } // Limit file size to 200MB
});

const bcrypt = require('bcryptjs');

function getAdminPasswordHash(settings) {
  const rawPassword = settings.admin_password || process.env.ADMIN_PASSWORD;
  if (!rawPassword) return null;
  const isBcryptHash = rawPassword.startsWith('$2a$') || 
                       rawPassword.startsWith('$2b$') || 
                       rawPassword.startsWith('$2y$');
  if (isBcryptHash && rawPassword.length === 60) {
    return rawPassword;
  }
  return bcrypt.hashSync(rawPassword, 12);
}


// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', (() => {
  const val = process.env.TRUST_PROXY;
  if (!val) return 1;
  if (val === 'true') return true;
  if (val === 'false') return false;
  return isNaN(val) ? val : Number(val);
})());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  validate: { trustProxy: false }
});

app.use(cors());

// Apply the rate limiting middleware to API calls only, BEFORE body parser
app.use('/api', apiLimiter);

const path = require('path');
app.use(express.json());
app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Файл надто великий. Максимальний розмір: 200MB' });
    }
  }
  next(err);
});


const FLOODER_EMOJIS = ['😁', '🤣', '🤪'];
const GURU_EMOJIS = ['🔥', '👍', '💯', '🤝', '🫡', '❤️', '❤', '❤️🔥', '👌', '😎'];
const SKEPTIC_EMOJIS = ['🤔', '👀', '🤷‍♂️', '🤷\u200d♂️', '🤷', '🤯', '😱', '👎', '😢', '🙈', '🥴'];
const VALID_EMOJIS = [...FLOODER_EMOJIS, ...GURU_EMOJIS, ...SKEPTIC_EMOJIS];

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    let ownerInfo = null;
    if (settings.chat_owner_id) {
      const db = await getDb();
      let cleanId = settings.chat_owner_id.toString().trim();
      
      // Strip 'user' or 'channel' prefix if present (common in Telegram export JSON)
      if (cleanId.toLowerCase().startsWith('user')) {
        cleanId = cleanId.substring(4).trim();
      } else if (cleanId.toLowerCase().startsWith('channel')) {
        cleanId = cleanId.substring(7).trim();
      }
      
      if (!isNaN(cleanId) && cleanId.length > 0) {
        // Find by numeric user ID
        ownerInfo = await db.get(
          `SELECT 
            u.id, u.username, u.first_name, u.karma, u.karma_flooder, u.karma_guru, u.karma_skeptic, u.message_count, u.engaged_message_count,
            (SELECT COUNT(*) FROM replies r WHERE r.author_id = u.id) AS replies_count,
            (SELECT COUNT(*) FROM reactions rx WHERE rx.author_id = u.id AND rx.emoji IN ('😁', '🤣', '🤪')) AS reactions_flooder_count,
            (SELECT COUNT(*) FROM reactions rx WHERE rx.author_id = u.id AND rx.emoji IN ('🔥', '👍', '💯', '🤝', '🫡', '❤️', '❤', '❤️🔥', '👌', '😎')) AS reactions_guru_count,
            (SELECT COUNT(*) FROM reactions rx WHERE rx.author_id = u.id AND rx.emoji IN ('🤔', '👀', '🤷‍♂️', '🤷\u200d♂️', '🤷', '🤯', '😱', '😢', '🙈', '🥴')) AS reactions_skeptic_count,
            (SELECT COUNT(*) FROM reactions rx WHERE rx.author_id = u.id AND rx.emoji IN ('👎', '🤮', '💩')) AS reactions_negative_count
           FROM users u WHERE u.id = ?`,
          [parseInt(cleanId, 10)]
        );
      }
      
      // Fallback: If not found by ID or if ID is not numeric, search by username or first_name
      if (!ownerInfo) {
        let searchName = settings.chat_owner_id.toString().trim();
        if (searchName.startsWith('@')) {
          searchName = searchName.substring(1);
        }
        ownerInfo = await db.get(
          `SELECT 
            u.id, u.username, u.first_name, u.karma, u.karma_flooder, u.karma_guru, u.karma_skeptic, u.message_count, u.engaged_message_count,
            (SELECT COUNT(*) FROM replies r WHERE r.author_id = u.id) AS replies_count,
            (SELECT COUNT(*) FROM reactions rx WHERE rx.author_id = u.id AND rx.emoji IN ('😁', '🤣', '🤪')) AS reactions_flooder_count,
            (SELECT COUNT(*) FROM reactions rx WHERE rx.author_id = u.id AND rx.emoji IN ('🔥', '👍', '💯', '🤝', '🫡', '❤️', '❤', '❤️🔥', '👌', '😎')) AS reactions_guru_count,
            (SELECT COUNT(*) FROM reactions rx WHERE rx.author_id = u.id AND rx.emoji IN ('🤔', '👀', '🤷‍♂️', '🤷\u200d♂️', '🤷', '🤯', '😱', '😢', '🙈', '🥴')) AS reactions_skeptic_count,
            (SELECT COUNT(*) FROM reactions rx WHERE rx.author_id = u.id AND rx.emoji IN ('👎', '🤮', '💩')) AS reactions_negative_count
           FROM users u WHERE (u.username <> "" AND LOWER(u.username) = ?) OR LOWER(u.first_name) = ?`,
          [searchName.toLowerCase(), searchName.toLowerCase()]
        );
      }
    }
    res.json({
      site_title: settings.site_title || '🏆 Рейтинг активності',
      bot_name: settings.bot_name || '',
      last_update: settings.last_update || '28.05.2026 17:57',
      chat_owner_id: settings.chat_owner_id || '',
      owner_info: ownerInfo
    });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/admin/status', async (req, res) => {
  try {
    const settings = await getSettings();
    const isConfigured = !!(settings.admin_password || process.env.ADMIN_PASSWORD);
    res.json({ isConfigured });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/admin/setup', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Пароль надто короткий' });
    }

    const settings = await getSettings();
    const isConfigured = !!(settings.admin_password || process.env.ADMIN_PASSWORD);
    
    if (isConfigured) {
      return res.status(403).json({ error: 'Пароль вже встановлено' });
    }

    const hashedPassword = bcrypt.hashSync(password, 12);
    await updateSettings({ admin_password: hashedPassword });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    const settings = await getSettings();
    const adminPasswordHash = getAdminPasswordHash(settings);
    
    if (!adminPasswordHash) {
      return res.status(403).json({ error: 'Адмін-пароль не встановлено. Використовуйте сторінку налаштування.' });
    }

    if (bcrypt.compareSync(password, adminPasswordHash)) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Невірний пароль' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

app.post('/api/admin/settings', async (req, res) => {
  try {
    const { password, newSettings } = req.body;
    const settings = await getSettings();
    const adminPasswordHash = getAdminPasswordHash(settings);
    
    if (!adminPasswordHash || !bcrypt.compareSync(password, adminPasswordHash)) {
      return res.status(401).send('Невірний пароль');
    }

    if (newSettings) {
      if (newSettings.admin_password && typeof newSettings.admin_password === 'string' && newSettings.admin_password.trim() !== '') {
        const isBcryptHash = newSettings.admin_password.startsWith('$2a$') || 
                             newSettings.admin_password.startsWith('$2b$') || 
                             newSettings.admin_password.startsWith('$2y$');
        if (!(isBcryptHash && newSettings.admin_password.length === 60)) {
          newSettings.admin_password = bcrypt.hashSync(newSettings.admin_password, 12);
        }
      } else {
        delete newSettings.admin_password;
      }
    }

    await updateSettings(newSettings);
    res.json({ success: true });
    
    // Restart process to apply bot token changes if running under PM2/Systemd
    setTimeout(() => process.exit(0), 1000);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).send('Помилка сервера');
  }
});

app.post('/api/admin/settings/view', async (req, res) => {
  try {
    const { password } = req.body;
    const settings = await getSettings();
    const adminPasswordHash = getAdminPasswordHash(settings);
    
    if (!adminPasswordHash || !bcrypt.compareSync(password, adminPasswordHash)) {
      return res.status(401).send('Невірний пароль');
    }

    const responseSettings = { ...settings };
    responseSettings.admin_password = '';

    res.json(responseSettings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).send('Помилка сервера');
  }
});

app.post('/api/admin/upload-json', upload.single('file'), async (req, res) => {
  try {
    const password = req.body.password;
    const settings = await getSettings();
    const adminPasswordHash = getAdminPasswordHash(settings);
    
    if (!adminPasswordHash || !bcrypt.compareSync(password, adminPasswordHash)) {
      return res.status(401).send('Невірний пароль');
    }

    if (!req.file) {
      return res.status(400).send('Файл не знайдено');
    }

    const data = JSON.parse(req.file.buffer.toString('utf8'));
    const messages = data.messages || [];
    
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
      return res.status(400).send('Неможливо визначити ID чату');
    }

    // Map to resolve message authors for replies and registrations
    const messageIdToUserId = new Map();
    const userInfos = new Map();

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
        `INSERT OR IGNORE INTO messages (message_id, chat_id, user_id) VALUES (?, ?, ?)`
      );
      for (const msg of messages) {
        if (!msg.id) continue;
        const userId = messageIdToUserId.get(msg.id);
        if (userId) {
          await msgStmt.run([msg.id, chatId, userId]);
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
      for (const userId of userInfos.keys()) {
        await recalculateUserQRank(db, userId);
      }
      
      await db.exec('COMMIT');

      // Update last_update setting after a successful import (run outside transaction)
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
      
      res.status(200).send('Успішно оновлено');
    } catch (err) {
      await db.exec('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).send('Внутрішня помилка сервера під час обробки файлу');
  }
});

  app.get('/api/leaderboard', async (req, res) => {
  try {
    const db = await getDb();
    const topUsers = await db.all(
      `SELECT 
        u.id, u.username, u.first_name, u.karma, u.karma_flooder, u.karma_guru, u.karma_skeptic, u.message_count, u.engaged_message_count,
        (SELECT COUNT(*) FROM replies r WHERE r.author_id = u.id) AS replies_count,
        (SELECT COUNT(*) FROM reactions rx WHERE rx.author_id = u.id AND rx.emoji IN ('😁', '🤣', '🤪')) AS reactions_flooder_count,
        (SELECT COUNT(*) FROM reactions rx WHERE rx.author_id = u.id AND rx.emoji IN ('🔥', '👍', '💯', '🤝', '🫡', '❤️', '❤', '❤️🔥', '👌', '😎')) AS reactions_guru_count,
        (SELECT COUNT(*) FROM reactions rx WHERE rx.author_id = u.id AND rx.emoji IN ('🤔', '👀', '🤷‍♂️', '🤷\u200d♂️', '🤷', '🤯', '😱', '😢', '🙈', '🥴')) AS reactions_skeptic_count,
        (SELECT COUNT(*) FROM reactions rx WHERE rx.author_id = u.id AND rx.emoji IN ('👎', '🤮', '💩')) AS reactions_negative_count
       FROM users u ORDER BY u.karma DESC, u.join_date ASC, u.id ASC LIMIT 50`
    );
    res.json(topUsers);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, first_name } = req.query;
    const db = await getDb();
    
    let user = await db.get('SELECT id, username, first_name, karma, karma_flooder, karma_guru, karma_skeptic, message_count, engaged_message_count, join_date FROM users WHERE id = ?', id);
    
    // Auto-register if user not found and info is provided
    if (!user && first_name) {
      await db.run(
        'INSERT INTO users (id, username, first_name, karma, karma_flooder, karma_guru, karma_skeptic, message_count, engaged_message_count, join_date) VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, ?)',
        [id, username || '', first_name, Math.floor(Date.now() / 1000)]
      );
      user = { id: parseInt(id), username: username || '', first_name, karma: 0, karma_flooder: 0, karma_guru: 0, karma_skeptic: 0, message_count: 0, engaged_message_count: 0, join_date: Math.floor(Date.now() / 1000) };
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get replies received count
    const repliesRow = await db.get('SELECT COUNT(*) as total FROM replies WHERE author_id = ?', [user.id]);
    const repliesCount = repliesRow ? repliesRow.total : 0;

    // Get reactions count by category
    const rxFlooder = await db.get(`SELECT COUNT(*) as total FROM reactions WHERE author_id = ? AND emoji IN ('😁', '🤣', '🤪')`, [user.id]);
    const rxGuru = await db.get(`SELECT COUNT(*) as total FROM reactions WHERE author_id = ? AND emoji IN ('🔥', '👍', '💯', '🤝', '🫡', '❤️', '❤', '❤️🔥', '👌', '😎')`, [user.id]);
    const rxSkeptic = await db.get(`SELECT COUNT(*) as total FROM reactions WHERE author_id = ? AND emoji IN ('🤔', '👀', '🤷‍♂️', '🤷\u200d♂️', '🤷', '🤯', '😱', '😢', '🙈', '🥴')`, [user.id]);
    const rxNegative = await db.get(`SELECT COUNT(*) as total FROM reactions WHERE author_id = ? AND emoji IN ('👎', '🤮', '💩')`, [user.id]);

    // Rank logic
    const rankData = await db.get(
      'SELECT COUNT(*) as rank FROM users WHERE karma > ? OR (karma = ? AND join_date < ?) OR (karma = ? AND join_date = ? AND id <= ?)',
      [user.karma, user.karma, user.join_date, user.karma, user.join_date, user.id]
    );
    
    res.json({ 
      ...user, 
      rank: rankData.rank,
      replies_count: repliesCount,
      reactions_flooder_count: rxFlooder ? rxFlooder.total : 0,
      reactions_guru_count: rxGuru ? rxGuru.total : 0,
      reactions_skeptic_count: rxSkeptic ? rxSkeptic.total : 0,
      reactions_negative_count: rxNegative ? rxNegative.total : 0
    });
  } catch (error) {
    console.error('User profile error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Catch-all route for SPA with dynamic SEO injection
const fs = require('fs');
app.use(async (req, res, next) => {
  if ((req.method === 'GET' || req.method === 'HEAD') && !req.path.startsWith('/api/')) {
    try {
      const { getSettings } = require('./settings');
      const settings = await getSettings();
      const indexPath = path.join(__dirname, 'public', 'index.html');
      
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8');
        
        const siteTitle = escapeHtml(settings.site_title || '🏆 Рейтинг активності спільноти');
        const seoDesc = escapeHtml(settings.seo_description || 'Офіційний рейтинг активності учасників спільноти. Отримуйте карму за реакції!');
        const ogImage = escapeHtml(settings.seo_image || '/og-image.png');
        const webappUrl = escapeHtml(settings.webapp_url || '');
        const channelUrl = escapeHtml(settings.telegram_channel_url || '');
        
        // Dynamic HTML replacements for SEO
        html = html.replace(/<title>.*?<\/title>/g, `<title>${siteTitle}</title>`);
        html = html.replace(/<meta name="description" content=".*?"\s*\/?>/g, `<meta name="description" content="${seoDesc}" />`);
        
        html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/g, `<meta property="og:title" content="${siteTitle}" />`);
        html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/g, `<meta property="og:description" content="${seoDesc}" />`);
        html = html.replace(/<meta property="og:image" content=".*?"\s*\/?>/g, `<meta property="og:image" content="${ogImage}" />`);
        
        html = html.replace(/<meta name="twitter:title" content=".*?"\s*\/?>/g, `<meta name="twitter:title" content="${siteTitle}" />`);
        html = html.replace(/<meta name="twitter:description" content=".*?"\s*\/?>/g, `<meta name="twitter:description" content="${seoDesc}" />`);
        html = html.replace(/<meta name="twitter:image" content=".*?"\s*\/?>/g, `<meta name="twitter:image" content="${ogImage}" />`);
        
        let extraMeta = '';
        if (webappUrl) {
          extraMeta += `  <meta property="og:url" content="${webappUrl}" />\n`;
          extraMeta += `  <link rel="canonical" href="${webappUrl}" />\n`;
        }
        if (channelUrl) {
          extraMeta += `  <meta property="og:see_also" content="${channelUrl}" />\n`;
        }
        
        if (extraMeta) {
          html = html.replace(/<\/head>/, `${extraMeta}</head>`);
        }
        
        res.send(html);
      } else {
        res.sendFile(indexPath);
      }
    } catch (err) {
      console.error('SEO middleware error:', err);
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  } else {
    next();
  }
});

const PORT = process.env.PORT || 3015;

app.listen(PORT, async () => {
  console.log(`API Server running on port ${PORT}`);
  await getDb();
  
  const settings = await getSettings();
  const token = settings.bot_token || process.env.BOT_TOKEN;
  const webAppUrl = settings.webapp_url || 'https://kruhlyk.srvrs.top/';
  const chatId = settings.chat_id || '';
  
  if (token && token !== 'DUMMY_TOKEN') {
    startBot(token, webAppUrl, chatId);
  } else {
    console.log('BOT_TOKEN not provided in DB or .env, bot polling not started.');
  }
});