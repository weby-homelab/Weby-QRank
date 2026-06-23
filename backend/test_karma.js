const { getDb } = require('./db');
const { recalculateUserKarma } = require('./karma');
const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test_karma.db');
process.env.DB_PATH = testDbPath;

async function runTests() {
  console.log('Running Karma-2 Community App Tests...');

  // Clean up previous test DB
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const db = await getDb();

  // Helper to register a test user
  async function registerUser(id, username, first_name) {
    await db.run(
      'INSERT INTO users (id, username, first_name, karma, join_date) VALUES (?, ?, ?, 0, ?)',
      [id, username, first_name, Math.floor(Date.now() / 1000)]
    );
  }

  // Helper to insert a message
  async function sendMsg(message_id, user_id) {
    await db.run(
      'INSERT INTO messages (message_id, chat_id, user_id) VALUES (?, 100, ?)',
      [message_id, user_id]
    );
    await recalculateUserKarma(db, user_id);
  }

  // Helper to insert a reply
  async function replyMsg(message_id, replier_id, parent_message_id, author_id) {
    await db.run(
      'INSERT INTO messages (message_id, chat_id, user_id) VALUES (?, 100, ?)',
      [message_id, replier_id]
    );
    await db.run(
      `INSERT INTO replies (reply_message_id, reply_chat_id, parent_message_id, parent_chat_id, replier_id, author_id)
       VALUES (?, 100, ?, 100, ?, ?)`,
      [message_id, parent_message_id, replier_id, author_id]
    );
    await recalculateUserKarma(db, replier_id);
    await recalculateUserKarma(db, author_id);
  }

  // Helper to insert a reaction
  async function react(message_id, reactor_id, author_id, emoji) {
    await db.run(
      'INSERT INTO reactions (message_id, chat_id, reactor_id, author_id, emoji) VALUES (?, 100, ?, ?, ?)',
      [message_id, reactor_id, author_id, emoji]
    );
    await recalculateUserKarma(db, author_id);
  }

  // Register users
  await registerUser(1, 'author', 'Author');
  await registerUser(2, 'reactor_a', 'Reactor A');
  await registerUser(3, 'reactor_b', 'Reactor B');

  // Test 1: Message count scaling
  console.log('Test 1: Message count scaling...');
  await sendMsg(10, 1);
  
  let u1 = await db.get('SELECT * FROM users WHERE id = 1');
  console.log(`Author karma after 1 message: ${u1.karma} (expected 0.03)`);
  assert.equal(u1.karma, 0.03);

  // Test 2: Adding reactions and scaling
  console.log('Test 2: Adding reactions and scaling...');
  await react(10, 2, 1, '🔥'); // Guru reaction (weight 2.0)
  u1 = await db.get('SELECT * FROM users WHERE id = 1');
  console.log(`Author karma after reaction: ${u1.karma} (expected 2.05)`);
  assert.equal(u1.karma, 2.05);

  // Test 3: Flooding penalty
  console.log('Test 3: Flooding penalty...');
  for (let i = 11; i <= 20; i++) {
    await sendMsg(i, 1);
  }
  u1 = await db.get('SELECT * FROM users WHERE id = 1');
  console.log(`Author karma after flooding (11 msgs, 1 engaged): ${u1.karma} (expected 0.42)`);
  assert.equal(u1.karma, 0.42);

  // Test 4: Pairwise collusion discount
  console.log('Test 4: Pairwise collusion discount...');
  await react(11, 2, 1, '🔥'); // 2nd reaction from User 2
  u1 = await db.get('SELECT * FROM users WHERE id = 1');
  console.log(`Author karma after collusive 2nd reaction: ${u1.karma} (expected 0.89)`);
  assert.equal(u1.karma, 0.89);

  // Test 5: Non-collusive reactions
  console.log('Test 5: Non-collusive reactions...');
  await react(11, 3, 1, '🔥'); // Reaction from distinct User 3
  u1 = await db.get('SELECT * FROM users WHERE id = 1');
  console.log(`Author karma with User 3 reacting too: ${u1.karma} (expected 1.39)`);
  assert.equal(u1.karma, 1.39);

  // Test 6: Replies reward
  console.log('Test 6: Replies reward...');
  await replyMsg(30, 2, 10, 1);
  u1 = await db.get('SELECT * FROM users WHERE id = 1');
  console.log(`Author karma after receiving a reply: ${u1.karma} (expected 1.51)`);
  assert.equal(u1.karma, 1.51);

  console.log('All tests passed successfully!');

  // Clean up
  await db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
