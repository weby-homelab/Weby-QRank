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
  const nowUnix = Math.floor(Date.now() / 1000);

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

module.exports = {
  FLOODER_EMOJIS,
  GURU_EMOJIS,
  SKEPTIC_EMOJIS,
  NEGATIVE_EMOJIS,
  EMOJI_WEIGHTS,
  recalculateUserQRank
};
