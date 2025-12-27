/**
 * Poll Server Actions for Next.js
 */

'use server';

import { z } from 'zod';

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
 */
export async function createPoll(
  token: string,
  apiUrl: string,
  messageId: string,
  data: z.infer<typeof createPollSchema>
) {
  const validated = createPollSchema.parse(data);

  const response = await fetch(
    `${apiUrl}/api/messages/${messageId}/polls`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validated),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create poll: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Vote on a poll
 */
export async function votePoll(
  token: string,
  apiUrl: string,
  pollId: string,
  data: z.infer<typeof voteSchema>
) {
  const validated = voteSchema.parse(data);

  const response = await fetch(
    `${apiUrl}/api/polls/${pollId}/vote`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validated),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to vote on poll: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get poll results
 */
export async function getPollResults(
  token: string,
  apiUrl: string,
  pollId: string
) {
  const response = await fetch(
    `${apiUrl}/api/polls/${pollId}/results`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch poll results: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Remove vote from poll
 */
export async function removeVote(
  token: string,
  apiUrl: string,
  pollId: string
) {
  const response = await fetch(
    `${apiUrl}/api/polls/${pollId}/vote`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to remove vote: ${response.statusText}`);
  }

  return response.json();
}
