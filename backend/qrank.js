const FLOODER_EMOJIS = ['😁', '🤣', '🤪'];
const GURU_EMOJIS = ['🔥', '👍', '💯', '🤝', '🫡', '❤️', '❤', '❤️🔥', '👌', '😎'];
const SKEPTIC_EMOJIS = ['🤔', '👀', '🤷‍♂️', '🤷\u200d♂️', '🤷', '🤯', '😱', '😢', '🙈', '🥴'];
const NEGATIVE_EMOJIS = ['👎', '🤮', '💩'];

const EMOJI_WEIGHTS = {};
FLOODER_EMOJIS.forEach(e => EMOJI_WEIGHTS[e] = 1.5);
GURU_EMOJIS.forEach(e => EMOJI_WEIGHTS[e] = 2.0);
SKEPTIC_EMOJIS.forEach(e => EMOJI_WEIGHTS[e] = 1.0);
NEGATIVE_EMOJIS.forEach(e => EMOJI_WEIGHTS[e] = -1.0);

const ACTION_WEIGHTS = {
  MESSAGE: 0.5,
  REPLY_RECEIVED: 1.0,
};

async function recalculateUserQRank(db, userId) {
  const maxMsgRow = await db.get("SELECT MAX(date_unixtime) as max_date FROM messages");
  const nowUnix = (maxMsgRow && maxMsgRow.max_date > 0) ? maxMsgRow.max_date : Math.floor(Date.now() / 1000);

  // 1. Get user messages
  const userMessages = await db.all(
    'SELECT date_unixtime FROM messages WHERE user_id = ?',
    [userId]
  );
  const totalMsgs = userMessages.length;

  // 2. Get engaged messages count
  const engagedMsgsRow = await db.get(
    `SELECT COUNT(DISTINCT m.message_id) as engaged FROM messages m 
     LEFT JOIN reactions r ON m.message_id = r.message_id AND m.chat_id = r.chat_id
     LEFT JOIN replies rep ON m.message_id = rep.parent_message_id AND m.chat_id = rep.parent_chat_id
     WHERE m.user_id = ? AND (r.message_id IS NOT NULL OR rep.reply_message_id IS NOT NULL)`,
    [userId]
  );
  const engagedMsgs = engagedMsgsRow ? engagedMsgsRow.engaged : 0;

  // 3. Get replies received (join messages to get dates)
  const replies = await db.all(
    `SELECT m.date_unixtime 
     FROM replies r
     LEFT JOIN messages m ON r.reply_message_id = m.message_id AND r.reply_chat_id = m.chat_id
     WHERE r.author_id = ?`,
    [userId]
  );

  // 4. Get reactions on user's messages (join messages to get dates)
  const reactions = await db.all(
    `SELECT r.reactor_id, r.emoji, u.karma as reactor_karma, m.date_unixtime 
     FROM reactions r 
     LEFT JOIN users u ON r.reactor_id = u.id 
     LEFT JOIN messages m ON r.message_id = m.message_id AND r.chat_id = m.chat_id
     WHERE r.author_id = ? 
     ORDER BY r.rowid ASC`,
    [userId]
  );

  // 5. Calculate raw values with time decay (30-day halflife)
  let rawReactionsKarma = 0;
  let rawGuru = 0;
  let rawFlooder = 0;
  let rawSkeptic = 0;

  // Track reaction counts per reactor for collusion prevention (Harmonic scale)
  const reactorCounts = {};

  for (const rx of reactions) {
    const emoji = rx.emoji;
    const reactorId = rx.reactor_id;
    const baseWeight = EMOJI_WEIGHTS[emoji] || 0;

    // Determine reactor reputation factor
    let reactorRep = 1.0;
    if (reactorId > 0) {
      // Real user, apply log scale based on their karma
      const reactorKarma = rx.reactor_karma || 0;
      reactorRep = Math.log10(10 + Math.max(0, reactorKarma));
    }

    // Determine pairwise interaction count
    let pairwiseWeight = 1.0;
    if (reactorId !== 0) { // reactorId === 0 is reserved for imported reactions
      reactorCounts[reactorId] = (reactorCounts[reactorId] || 0) + 1;
      const k = reactorCounts[reactorId];
      pairwiseWeight = 1.0 / k;
    }

    // Determine time decay factor (30-day halflife)
    const dateUnix = rx.date_unixtime || 0;
    let decay = 1.0;
    if (dateUnix > 0) {
      const ageSeconds = Math.max(0, nowUnix - dateUnix);
      decay = Math.pow(0.5, ageSeconds / (30 * 24 * 3600));
    }

    const rxWeight = baseWeight * reactorRep * pairwiseWeight * decay;

    rawReactionsKarma += rxWeight;
    if (GURU_EMOJIS.includes(emoji)) rawGuru += rxWeight;
    else if (FLOODER_EMOJIS.includes(emoji)) rawFlooder += rxWeight;
    else if (SKEPTIC_EMOJIS.includes(emoji)) rawSkeptic += rxWeight;
  }

  // Raw action components with time decay
  let rawMsgBonus = 0;
  for (const msg of userMessages) {
    const dateUnix = msg.date_unixtime || 0;
    let decay = 1.0;
    if (dateUnix > 0) {
      const ageSeconds = Math.max(0, nowUnix - dateUnix);
      decay = Math.pow(0.5, ageSeconds / (30 * 24 * 3600));
    }
    rawMsgBonus += ACTION_WEIGHTS.MESSAGE * decay;
  }

  let rawReplyBonus = 0;
  for (const rep of replies) {
    const dateUnix = rep.date_unixtime || 0;
    let decay = 1.0;
    if (dateUnix > 0) {
      const ageSeconds = Math.max(0, nowUnix - dateUnix);
      decay = Math.pow(0.5, ageSeconds / (30 * 24 * 3600));
    }
    rawReplyBonus += ACTION_WEIGHTS.REPLY_RECEIVED * decay;
  }

  const rawTotal = rawReactionsKarma + rawMsgBonus + rawReplyBonus;

  // Calculate Quality Index
  const Q = (engagedMsgs + 1) / (totalMsgs + 1);

  // Apply Quality Index to everything
  const finalKarma = Math.max(0, parseFloat((rawTotal * Q).toFixed(2)));
  const finalGuru = Math.max(0, parseFloat((rawGuru * Q).toFixed(2)));
  const finalFlooder = Math.max(0, parseFloat((rawFlooder * Q).toFixed(2)));
  const finalSkeptic = Math.max(0, parseFloat((rawSkeptic * Q).toFixed(2)));

  // Update DB
  await db.run(
    `UPDATE users SET 
      karma = ?, 
      karma_flooder = ?, 
      karma_guru = ?, 
      karma_skeptic = ?, 
      message_count = ?, 
      engaged_message_count = ?
     WHERE id = ?`,
    [finalKarma, finalFlooder, finalGuru, finalSkeptic, totalMsgs, engagedMsgs, userId]
  );

  return {
    userId,
    karma: finalKarma,
    karma_flooder: finalFlooder,
    karma_guru: finalGuru,
    karma_skeptic: finalSkeptic,
    message_count: totalMsgs,
    engaged_message_count: engagedMsgs
  };
}

async function getLeaderboardForPeriod(db, startTime, endTime) {
  const usersList = await db.all('SELECT id, username, first_name, join_date, karma FROM users');
  const userProfiles = {};
  const reactorKarmas = {};
  for (const u of usersList) {
    userProfiles[u.id] = u;
    reactorKarmas[u.id] = u.karma;
  }
  
  const messages = await db.all(
    'SELECT user_id, message_id, date_unixtime FROM messages WHERE date_unixtime >= ? AND date_unixtime <= ?',
    [startTime, endTime]
  );
  
  const periodMessageIds = new Set(messages.map(m => m.message_id));
  
  const reactions = await db.all(
    `SELECT r.message_id, r.author_id, r.reactor_id, r.emoji, m.date_unixtime 
     FROM reactions r 
     JOIN messages m ON r.message_id = m.message_id AND r.chat_id = m.chat_id 
     WHERE m.date_unixtime >= ? AND m.date_unixtime <= ?`,
    [startTime, endTime]
  );
  
  const replies = await db.all(
    `SELECT r.parent_message_id, r.author_id, r.replier_id, m.date_unixtime 
     FROM replies r 
     JOIN messages m ON r.reply_message_id = m.message_id AND r.reply_chat_id = m.chat_id 
     WHERE m.date_unixtime >= ? AND m.date_unixtime <= ?`,
    [startTime, endTime]
  );

  const stats = {};
  function getStat(userId) {
    if (!stats[userId]) {
      stats[userId] = {
        id: userId,
        totalMsgs: 0,
        engagedMsgs: new Set(),
        repliesReceivedCount: 0,
        rawReactionsKarma: 0,
        rawGuru: 0,
        rawFlooder: 0,
        rawSkeptic: 0,
        rawMsgBonus: 0,
        rawReplyBonus: 0,
        reactorCounts: {},
        reactionsCountFlooder: 0,
        reactionsCountGuru: 0,
        reactionsCountSkeptic: 0,
        reactionsCountNegative: 0
      };
    }
    return stats[userId];
  }

  for (const msg of messages) {
    const u = getStat(msg.user_id);
    u.totalMsgs++;
    
    const dateUnix = msg.date_unixtime || 0;
    let decay = 1.0;
    if (dateUnix > 0) {
      const ageSeconds = Math.max(0, endTime - dateUnix);
      decay = Math.pow(0.5, ageSeconds / (30 * 24 * 3600));
    }
    u.rawMsgBonus += ACTION_WEIGHTS.MESSAGE * decay;
  }

  for (const rx of reactions) {
    const u = getStat(rx.author_id);
    
    if (periodMessageIds.has(rx.message_id)) {
      u.engagedMsgs.add(rx.message_id);
    }
    
    const emoji = rx.emoji;
    const reactorId = rx.reactor_id;
    const baseWeight = EMOJI_WEIGHTS[emoji] || 0;
    
    let reactorRep = 1.0;
    if (reactorId > 0) {
      const rKarma = reactorKarmas[reactorId] || 0;
      reactorRep = Math.log10(10 + Math.max(0, rKarma));
    }
    
    let pairwiseWeight = 1.0;
    if (reactorId !== 0) {
      u.reactorCounts[reactorId] = (u.reactorCounts[reactorId] || 0) + 1;
      pairwiseWeight = 1.0 / u.reactorCounts[reactorId];
    }
    
    const dateUnix = rx.date_unixtime || 0;
    let decay = 1.0;
    if (dateUnix > 0) {
      const ageSeconds = Math.max(0, endTime - dateUnix);
      decay = Math.pow(0.5, ageSeconds / (30 * 24 * 3600));
    }
    
    const rxWeight = baseWeight * reactorRep * pairwiseWeight * decay;
    u.rawReactionsKarma += rxWeight;
    
    if (GURU_EMOJIS.includes(emoji)) {
      u.rawGuru += rxWeight;
      u.reactionsCountGuru++;
    } else if (FLOODER_EMOJIS.includes(emoji)) {
      u.rawFlooder += rxWeight;
      u.reactionsCountFlooder++;
    } else if (SKEPTIC_EMOJIS.includes(emoji)) {
      u.rawSkeptic += rxWeight;
      u.reactionsCountSkeptic++;
    } else if (NEGATIVE_EMOJIS.includes(emoji)) {
      u.reactionsCountNegative++;
    }
  }

  for (const rep of replies) {
    const u = getStat(rep.author_id);
    u.repliesReceivedCount++;
    
    if (periodMessageIds.has(rep.parent_message_id)) {
      u.engagedMsgs.add(rep.parent_message_id);
    }
    
    const dateUnix = rep.date_unixtime || 0;
    let decay = 1.0;
    if (dateUnix > 0) {
      const ageSeconds = Math.max(0, endTime - dateUnix);
      decay = Math.pow(0.5, ageSeconds / (30 * 24 * 3600));
    }
    u.rawReplyBonus += ACTION_WEIGHTS.REPLY_RECEIVED * decay;
  }

  const leaderboard = [];
  for (const userId of Object.keys(stats)) {
    const u = stats[userId];
    const profile = userProfiles[userId] || { username: '', first_name: 'User ' + userId, join_date: 9999999999 };
    
    const Q = (u.engagedMsgs.size + 1) / (u.totalMsgs + 1);
    const rawTotal = u.rawReactionsKarma + u.rawMsgBonus + u.rawReplyBonus;
    
    const finalKarma = Math.max(0, parseFloat((rawTotal * Q).toFixed(2)));
    const finalGuru = Math.max(0, parseFloat((u.rawGuru * Q).toFixed(2)));
    const finalFlooder = Math.max(0, parseFloat((u.rawFlooder * Q).toFixed(2)));
    const finalSkeptic = Math.max(0, parseFloat((u.rawSkeptic * Q).toFixed(2)));
    
    leaderboard.push({
      id: parseInt(userId, 10),
      username: profile.username,
      first_name: profile.first_name,
      join_date: profile.join_date,
      karma: finalKarma,
      karma_flooder: finalFlooder,
      karma_guru: finalGuru,
      karma_skeptic: finalSkeptic,
      message_count: u.totalMsgs,
      engaged_message_count: u.engagedMsgs.size,
      replies_count: u.repliesReceivedCount,
      reactions_flooder_count: u.reactionsCountFlooder,
      reactions_guru_count: u.reactionsCountGuru,
      reactions_skeptic_count: u.reactionsCountSkeptic,
      reactions_negative_count: u.reactionsCountNegative
    });
  }

  leaderboard.sort((a, b) => {
    if (b.karma !== a.karma) return b.karma - a.karma;
    if (a.join_date !== b.join_date) return a.join_date - b.join_date;
    return a.id - b.id;
  });

  return leaderboard;
}

module.exports = {
  FLOODER_EMOJIS,
  GURU_EMOJIS,
  SKEPTIC_EMOJIS,
  NEGATIVE_EMOJIS,
  EMOJI_WEIGHTS,
  recalculateUserQRank,
  getLeaderboardForPeriod
};
