require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.argv[2]; // Pass chat ID as argument

if (!BOT_TOKEN || BOT_TOKEN === 'DUMMY_TOKEN') {
  console.error("No valid BOT_TOKEN found in .env.");
  process.exit(1);
}

if (!CHAT_ID) {
  console.error("Please provide the CHAT_ID as an argument.");
  process.exit(1);
}

async function main() {
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'karma.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  const users = await db.all('SELECT id, first_name FROM users');
  console.log(`Checking ${users.length} users...`);

  let updatedCount = 0;

  for (const user of users) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHAT_ID}&user_id=${user.id}`);
      const data = await response.json();

      if (data.ok && data.result && data.result.user) {
        const telegramUser = data.result.user;
        const realName = [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ');
        
        if (realName && realName !== user.first_name) {
          console.log(`Updating: ${user.first_name} -> ${realName}`);
          await db.run('UPDATE users SET first_name = ? WHERE id = ?', [realName, user.id]);
          updatedCount++;
        }
      } else {
        // User might have left the chat or API error
        console.log(`Could not fetch data for ${user.first_name} (ID: ${user.id}): ${data.description || 'Unknown'}`);
      }
    } catch (err) {
      console.error(`Fetch error for user ${user.id}:`, err.message);
    }
    
    // Slight delay to avoid hitting Telegram API rate limits
    await new Promise(res => setTimeout(res, 200));
  }

  console.log(`\nFinished! Updated ${updatedCount} users.`);
}

main().catch(console.error);