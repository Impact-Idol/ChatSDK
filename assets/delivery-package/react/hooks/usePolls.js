/**
 * usePolls - Hook for querying and interacting with polls
 */
import { useState, useEffect, useCallback } from 'react';
import { useChatClient } from './ChatProvider';
/**
 * usePolls - Query and interact with a poll in a message
 *
 * @example
 * ```tsx
 * const { poll, loading, vote, removeVote } = usePolls(messageId);
 *
 * if (!poll) return null;
 *
 * return (
 *   <PollMessage
 *     poll={poll}
 *     onVote={vote}
 *     onRemoveVote={removeVote}
 *   />
 * );
 * ```
 */
export function usePolls(messageId) {
    const client = useChatClient();
    const [poll, setPoll] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Fetch poll results
    const fetchPoll = useCallback(async () => {
        if (!messageId)
            return;
        setLoading(true);
        try {
            // Get poll ID from message
            const message = await client.fetch(`/api/messages/${messageId}`);
            if (!message.poll_id) {
                setPoll(null);
                return;
            }
            // Fetch poll results
            const response = await client.fetch(`/api/polls/${message.poll_id}/results`);
            // Transform API response to hook interface
            const transformedPoll = {
                id: response.id,
                question: response.question,
                options: response.options.map((opt) => ({
                    id: opt.id,
                    text: opt.text,
                    voteCount: opt.vote_count || 0,
                    voters: opt.voters || [],
                })),
                isAnonymous: response.is_anonymous,
                isMultiChoice: response.is_multi_choice,
                totalVotes: response.total_votes || 0,
                userVotes: response.user_votes || [],
                endsAt: response.ends_at,
                createdAt: response.created_at,
            };
            setPoll(transformedPoll);
            setError(null);
        }
        catch (err) {
            console.error('Failed to fetch poll:', err);
            setError(err);
        }
        finally {
            setLoading(false);
        }
    }, [client, messageId]);
    // Vote on poll
    const vote = useCallback(async (optionIds) => {
        if (!poll) {
            throw new Error('No poll loaded');
        }
        setLoading(true);
        try {
            await client.fetch(`/api/polls/${poll.id}/vote`, {
                method: 'POST',
                body: JSON.stringify({ optionIds }),
            });
            await fetchPoll(); // Refresh results
        }
        catch (err) {
            console.error('Failed to vote:', err);
            setError(err);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, [client, poll, fetchPoll]);
    // Remove vote
    const removeVote = useCallback(async () => {
        if (!poll) {
            throw new Error('No poll loaded');
        }
        setLoading(true);
        try {
            await client.fetch(`/api/polls/${poll.id}/vote`, {
                method: 'DELETE',
            });
            await fetchPoll(); // Refresh results
        }
        catch (err) {
            console.error('Failed to remove vote:', err);
            setError(err);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, [client, poll, fetchPoll]);
    // Initial load
    useEffect(() => {
        fetchPoll();
    }, [messageId, fetchPoll]);
    return {
        poll,
        loading,
        error,
        vote,
        removeVote,
        refresh: fetchPoll,
    };
}
