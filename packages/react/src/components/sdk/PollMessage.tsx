/**
 * PollMessage - Display and interact with polls in messages
 */

import React from 'react';
import { usePolls, type Poll, type PollOption } from '../../hooks/usePolls';

export interface PollMessageProps {
  messageId: string;
  className?: string;
}

/**
 * PollMessage - Display a poll with voting functionality
 *
 * @example
 * ```tsx
 * <PollMessage messageId="msg-123" />
 * ```
 */
export function PollMessage({ messageId, className = '' }: PollMessageProps) {
  const { poll, loading, vote, removeVote } = usePolls(messageId);

  if (loading && !poll) {
    return (
      <div className={`poll-container ${className}`}>
        <div className="poll-loading">Loading poll...</div>
      </div>
    );
  }

  if (!poll) {
    return null;
  }

  const hasEnded = poll.endsAt && new Date(poll.endsAt) < new Date();
  const hasVoted = poll.userVotes.length > 0;
  const showResults = hasVoted || hasEnded;

  const handleVote = (optionId: string) => {
    if (hasEnded || loading) return;

    if (poll.isMultiChoice) {
      // Toggle option in multi-choice
      const newVotes = hasVoted && poll.userVotes.includes(optionId)
        ? poll.userVotes.filter((id) => id !== optionId)
        : [...poll.userVotes, optionId];
      vote(newVotes);
    } else {
      // Single choice
      vote([optionId]);
    }
  };

  return (
    <div className={`poll-container bg-gray-50 rounded-lg p-4 my-2 ${className}`}>
      {/* Poll Question */}
      <div className="poll-question font-semibold text-lg mb-4">{poll.question}</div>

      {/* Poll Options */}
      <div className="poll-options space-y-2">
        {poll.options.map((option: PollOption) => {
          const percentage =
            poll.totalVotes > 0
              ? ((option.voteCount || 0) / poll.totalVotes) * 100
              : 0;

          const isSelected = poll.userVotes.includes(option.id);

          return (
            <div
              key={option.id}
              className={`poll-option relative cursor-pointer rounded-md border transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white hover:bg-gray-100'
              } ${hasEnded ? 'cursor-not-allowed opacity-75' : ''}`}
              onClick={() => handleVote(option.id)}
            >
              {/* Option Content */}
              <div className="relative z-10 p-3">
                <div className="flex items-center justify-between">
                  <div className="poll-option-text flex items-center gap-2">
                    {poll.isMultiChoice && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleVote(option.id)}
                        className="rounded"
                        disabled={hasEnded ? true : undefined}
                      />
                    )}
                    {!poll.isMultiChoice && showResults && (
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => handleVote(option.id)}
                        className="rounded-full"
                        disabled={hasEnded ? true : undefined}
                      />
                    )}
                    <span className="font-medium">{option.text}</span>
                  </div>

                  {showResults && (
                    <div className="poll-option-stats text-sm text-gray-600 font-medium">
                      {percentage.toFixed(0)}% ({option.voteCount || 0})
                    </div>
                  )}
                </div>

                {/* Voter Avatars (if not anonymous) */}
                {!poll.isAnonymous && option.voters && option.voters.length > 0 && (
                  <div className="poll-voters flex gap-1 mt-2">
                    {option.voters.slice(0, 3).map((voter) => (
                      <img
                        key={voter.userId}
                        src={voter.image || `https://ui-avatars.com/api/?name=${voter.name}`}
                        alt={voter.name}
                        title={voter.name}
                        className="poll-voter-avatar w-6 h-6 rounded-full border border-white"
                      />
                    ))}
                    {option.voters.length > 3 && (
                      <div className="text-xs text-gray-500 ml-1 flex items-center">
                        +{option.voters.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Results Bar */}
              {showResults && (
                <div
                  className="poll-option-bar absolute top-0 left-0 h-full rounded-md bg-blue-200 opacity-20 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Poll Footer */}
      <div className="poll-footer flex items-center justify-between mt-4 pt-3 border-t border-gray-200 text-sm text-gray-600">
        <div className="flex items-center gap-3">
          <span>{poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}</span>
          {poll.isAnonymous && (
            <span className="poll-anonymous-badge px-2 py-0.5 bg-gray-200 rounded text-xs">
              Anonymous
            </span>
          )}
          {hasEnded && (
            <span className="poll-ended-badge px-2 py-0.5 bg-red-200 rounded text-xs text-red-800">
              Poll ended
            </span>
          )}
          {!hasEnded && poll.endsAt && (
            <span className="text-xs">
              Ends {new Date(poll.endsAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {hasVoted && !hasEnded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeVote();
            }}
            className="poll-remove-vote text-blue-600 hover:text-blue-800 text-xs font-medium"
            disabled={loading}
          >
            Remove vote
          </button>
        )}
      </div>
    </div>
  );
}
