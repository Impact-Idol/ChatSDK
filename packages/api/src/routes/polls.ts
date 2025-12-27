/**
 * Polls Routes
 * Polling and voting system for messages
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireUser } from '../middleware/auth';
import { db } from '../services/database';
import { centrifugo } from '../services/centrifugo';

export const pollRoutes = new Hono();

const pollOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(500),
});

const createPollSchema = z.object({
  question: z.string().min(1).max(1000),
  options: z.array(pollOptionSchema).min(2).max(10),
  isAnonymous: z.boolean().default(false),
  isMultiChoice: z.boolean().default(false),
  endsAt: z.string().datetime().optional(),
});

const voteSchema = z.object({
  optionIds: z.array(z.string()).min(1),
});

/**
 * Create poll for a message
 * POST /api/messages/:messageId/polls
 */
pollRoutes.post(
  '/',
  requireUser,
  zValidator('json', createPollSchema),
  async (c) => {
    const auth = c.get('auth');
    const messageId = c.req.param('messageId');
    const body = c.req.valid('json');

    // Verify message exists and user is author
    const messageCheck = await db.query(
      `SELECT m.id, m.channel_id FROM message m
       WHERE m.id = $1 AND m.app_id = $2 AND m.user_id = $3`,
      [messageId, auth.appId, auth.userId]
    );

    if (messageCheck.rows.length === 0) {
      return c.json({ error: { message: 'Message not found or not authorized' } }, 404);
    }

    const channelId = messageCheck.rows[0].channel_id;

    // Create poll
    const result = await db.query(
      `INSERT INTO poll (message_id, app_id, question, options, is_anonymous, is_multi_choice, ends_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        messageId,
        auth.appId,
        body.question,
        JSON.stringify(body.options),
        body.isAnonymous,
        body.isMultiChoice,
        body.endsAt,
        auth.userId,
      ]
    );

    const poll = result.rows[0];

    // Update message with poll_id
    await db.query(
      `UPDATE message SET poll_id = $1 WHERE id = $2`,
      [poll.id, messageId]
    );

    // Publish poll created event
    await centrifugo.getCentrifugo().publish(`chat:${auth.appId}:${channelId}`, {
      type: 'poll.created',
      payload: {
        channelId,
        messageId,
        poll: {
          id: poll.id,
          question: poll.question,
          options: poll.options,
          isAnonymous: poll.is_anonymous,
          isMultiChoice: poll.is_multi_choice,
          totalVotes: 0,
          endsAt: poll.ends_at,
        },
      },
    });

    return c.json({
      id: poll.id,
      question: poll.question,
      options: poll.options,
      isAnonymous: poll.is_anonymous,
      isMultiChoice: poll.is_multi_choice,
      totalVotes: 0,
      endsAt: poll.ends_at,
      createdAt: poll.created_at,
    });
  }
);

/**
 * Vote on a poll
 * POST /api/polls/:id/vote
 */
pollRoutes.post(
  '/:id/vote',
  requireUser,
  zValidator('json', voteSchema),
  async (c) => {
    const auth = c.get('auth');
    const pollId = c.req.param('id');
    const body = c.req.valid('json');

    // Get poll details
    const pollResult = await db.query(
      `SELECT p.*, m.channel_id
       FROM poll p
       JOIN message m ON p.message_id = m.id
       WHERE p.id = $1 AND p.app_id = $2`,
      [pollId, auth.appId]
    );

    if (pollResult.rows.length === 0) {
      return c.json({ error: { message: 'Poll not found' } }, 404);
    }

    const poll = pollResult.rows[0];
    const channelId = pollResult.rows[0].channel_id;

    // Check if poll has expired
    if (poll.ends_at && new Date(poll.ends_at) < new Date()) {
      return c.json({ error: { message: 'Poll has ended' } }, 400);
    }

    // Verify user is channel member
    const memberCheck = await db.query(
      `SELECT 1 FROM channel_member WHERE channel_id = $1 AND user_id = $2`,
      [channelId, auth.userId]
    );

    if (memberCheck.rows.length === 0) {
      return c.json({ error: { message: 'Not a channel member' } }, 403);
    }

    // Validate options
    const validOptions = poll.options.map((opt: any) => opt.id);
    const invalidOptions = body.optionIds.filter((id: string) => !validOptions.includes(id));

    if (invalidOptions.length > 0) {
      return c.json({ error: { message: 'Invalid option IDs' } }, 400);
    }

    // Check multi-choice constraint
    if (!poll.is_multi_choice && body.optionIds.length > 1) {
      return c.json({ error: { message: 'This poll allows only one choice' } }, 400);
    }

    // Remove existing votes if changing vote
    await db.query(
      `DELETE FROM poll_vote WHERE poll_id = $1 AND app_id = $2 AND user_id = $3`,
      [pollId, auth.appId, auth.userId]
    );

    // Insert new votes
    for (const optionId of body.optionIds) {
      await db.query(
        `INSERT INTO poll_vote (poll_id, app_id, user_id, option_id)
         VALUES ($1, $2, $3, $4)`,
        [pollId, auth.appId, auth.userId, optionId]
      );
    }

    // Update total votes count
    const voteCount = await db.query(
      `SELECT COUNT(DISTINCT user_id) as count FROM poll_vote WHERE poll_id = $1`,
      [pollId]
    );

    await db.query(
      `UPDATE poll SET total_votes = $1 WHERE id = $2`,
      [voteCount.rows[0].count, pollId]
    );

    // Publish vote event
    await centrifugo.getCentrifugo().publish(`chat:${auth.appId}:${channelId}`, {
      type: 'poll.voted',
      payload: {
        channelId,
        pollId,
        userId: poll.is_anonymous ? null : auth.userId,
        optionIds: body.optionIds,
        totalVotes: parseInt(voteCount.rows[0].count),
      },
    });

    return c.json({ success: true, totalVotes: parseInt(voteCount.rows[0].count) });
  }
);

/**
 * Get poll results
 * GET /api/polls/:id/results
 */
pollRoutes.get('/:id/results', requireUser, async (c) => {
  const auth = c.get('auth');
  const pollId = c.req.param('id');

  // Get poll
  const pollResult = await db.query(
    `SELECT p.*, m.channel_id
     FROM poll p
     JOIN message m ON p.message_id = m.id
     WHERE p.id = $1 AND p.app_id = $2`,
    [pollId, auth.appId]
  );

  if (pollResult.rows.length === 0) {
    return c.json({ error: { message: 'Poll not found' } }, 404);
  }

  const poll = pollResult.rows[0];
  const channelId = pollResult.rows[0].channel_id;

  // Verify user is channel member
  const memberCheck = await db.query(
    `SELECT 1 FROM channel_member WHERE channel_id = $1 AND user_id = $2`,
    [channelId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
    return c.json({ error: { message: 'Not a channel member' } }, 403);
  }

  // Get vote counts per option
  const votesResult = await db.query(
    `SELECT option_id, COUNT(*) as count
     FROM poll_vote
     WHERE poll_id = $1
     GROUP BY option_id`,
    [pollId]
  );

  const voteCounts: Record<string, number> = {};
  votesResult.rows.forEach((row) => {
    voteCounts[row.option_id] = parseInt(row.count);
  });

  // Get user's votes
  const userVotesResult = await db.query(
    `SELECT option_id FROM poll_vote
     WHERE poll_id = $1 AND app_id = $2 AND user_id = $3`,
    [pollId, auth.appId, auth.userId]
  );

  const userVotes = userVotesResult.rows.map((row) => row.option_id);

  // Get voters if not anonymous
  let voters: any = null;
  if (!poll.is_anonymous) {
    const votersResult = await db.query(
      `SELECT pv.option_id, pv.user_id, u.name, u.image_url
       FROM poll_vote pv
       JOIN app_user u ON pv.app_id = u.app_id AND pv.user_id = u.id
       WHERE pv.poll_id = $1
       ORDER BY pv.voted_at DESC`,
      [pollId]
    );

    voters = {};
    votersResult.rows.forEach((row) => {
      if (!voters[row.option_id]) {
        voters[row.option_id] = [];
      }
      voters[row.option_id].push({
        userId: row.user_id,
        name: row.name,
        image: row.image_url,
      });
    });
  }

  const results = poll.options.map((option: any) => ({
    id: option.id,
    text: option.text,
    voteCount: voteCounts[option.id] || 0,
    voters: voters ? voters[option.id] || [] : null,
  }));

  return c.json({
    id: poll.id,
    question: poll.question,
    options: results,
    isAnonymous: poll.is_anonymous,
    isMultiChoice: poll.is_multi_choice,
    totalVotes: poll.total_votes,
    userVotes,
    endsAt: poll.ends_at,
    createdAt: poll.created_at,
  });
});

/**
 * Remove vote from poll
 * DELETE /api/polls/:id/vote
 */
pollRoutes.delete('/:id/vote', requireUser, async (c) => {
  const auth = c.get('auth');
  const pollId = c.req.param('id');

  // Get poll and channel
  const pollResult = await db.query(
    `SELECT p.id, m.channel_id
     FROM poll p
     JOIN message m ON p.message_id = m.id
     WHERE p.id = $1 AND p.app_id = $2`,
    [pollId, auth.appId]
  );

  if (pollResult.rows.length === 0) {
    return c.json({ error: { message: 'Poll not found' } }, 404);
  }

  const channelId = pollResult.rows[0].channel_id;

  // Remove votes
  await db.query(
    `DELETE FROM poll_vote WHERE poll_id = $1 AND app_id = $2 AND user_id = $3`,
    [pollId, auth.appId, auth.userId]
  );

  // Update total votes count
  const voteCount = await db.query(
    `SELECT COUNT(DISTINCT user_id) as count FROM poll_vote WHERE poll_id = $1`,
    [pollId]
  );

  await db.query(
    `UPDATE poll SET total_votes = $1 WHERE id = $2`,
    [voteCount.rows[0].count, pollId]
  );

  // Publish event
  await centrifugo.getCentrifugo().publish(`chat:${auth.appId}:${channelId}`, {
    type: 'poll.vote_removed',
    payload: {
      channelId,
      pollId,
      userId: auth.userId,
      totalVotes: parseInt(voteCount.rows[0].count),
    },
  });

  return c.json({ success: true });
});
