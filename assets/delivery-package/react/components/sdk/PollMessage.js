import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { usePolls } from '../../hooks/usePolls';
/**
 * PollMessage - Display a poll with voting functionality
 *
 * @example
 * ```tsx
 * <PollMessage messageId="msg-123" />
 * ```
 */
export function PollMessage({ messageId, className = '' }) {
    const { poll, loading, vote, removeVote } = usePolls(messageId);
    if (loading && !poll) {
        return (_jsx("div", { className: `poll-container ${className}`, children: _jsx("div", { className: "poll-loading", children: "Loading poll..." }) }));
    }
    if (!poll) {
        return null;
    }
    const hasEnded = poll.endsAt && new Date(poll.endsAt) < new Date();
    const hasVoted = poll.userVotes.length > 0;
    const showResults = hasVoted || hasEnded;
    const handleVote = (optionId) => {
        if (hasEnded || loading)
            return;
        if (poll.isMultiChoice) {
            // Toggle option in multi-choice
            const newVotes = hasVoted && poll.userVotes.includes(optionId)
                ? poll.userVotes.filter((id) => id !== optionId)
                : [...poll.userVotes, optionId];
            vote(newVotes);
        }
        else {
            // Single choice
            vote([optionId]);
        }
    };
    return (_jsxs("div", { className: `poll-container bg-gray-50 rounded-lg p-4 my-2 ${className}`, children: [_jsx("div", { className: "poll-question font-semibold text-lg mb-4", children: poll.question }), _jsx("div", { className: "poll-options space-y-2", children: poll.options.map((option) => {
                    const percentage = poll.totalVotes > 0
                        ? ((option.voteCount || 0) / poll.totalVotes) * 100
                        : 0;
                    const isSelected = poll.userVotes.includes(option.id);
                    return (_jsxs("div", { className: `poll-option relative cursor-pointer rounded-md border transition-all ${isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 bg-white hover:bg-gray-100'} ${hasEnded ? 'cursor-not-allowed opacity-75' : ''}`, onClick: () => handleVote(option.id), children: [_jsxs("div", { className: "relative z-10 p-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "poll-option-text flex items-center gap-2", children: [poll.isMultiChoice && (_jsx("input", { type: "checkbox", checked: isSelected, onChange: () => handleVote(option.id), className: "rounded", disabled: hasEnded ? true : undefined })), !poll.isMultiChoice && showResults && (_jsx("input", { type: "radio", checked: isSelected, onChange: () => handleVote(option.id), className: "rounded-full", disabled: hasEnded ? true : undefined })), _jsx("span", { className: "font-medium", children: option.text })] }), showResults && (_jsxs("div", { className: "poll-option-stats text-sm text-gray-600 font-medium", children: [percentage.toFixed(0), "% (", option.voteCount || 0, ")"] }))] }), !poll.isAnonymous && option.voters && option.voters.length > 0 && (_jsxs("div", { className: "poll-voters flex gap-1 mt-2", children: [option.voters.slice(0, 3).map((voter) => (_jsx("img", { src: voter.image || `https://ui-avatars.com/api/?name=${voter.name}`, alt: voter.name, title: voter.name, className: "poll-voter-avatar w-6 h-6 rounded-full border border-white" }, voter.userId))), option.voters.length > 3 && (_jsxs("div", { className: "text-xs text-gray-500 ml-1 flex items-center", children: ["+", option.voters.length - 3] }))] }))] }), showResults && (_jsx("div", { className: "poll-option-bar absolute top-0 left-0 h-full rounded-md bg-blue-200 opacity-20 transition-all", style: { width: `${percentage}%` } }))] }, option.id));
                }) }), _jsxs("div", { className: "poll-footer flex items-center justify-between mt-4 pt-3 border-t border-gray-200 text-sm text-gray-600", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { children: [poll.totalVotes, " ", poll.totalVotes === 1 ? 'vote' : 'votes'] }), poll.isAnonymous && (_jsx("span", { className: "poll-anonymous-badge px-2 py-0.5 bg-gray-200 rounded text-xs", children: "Anonymous" })), hasEnded && (_jsx("span", { className: "poll-ended-badge px-2 py-0.5 bg-red-200 rounded text-xs text-red-800", children: "Poll ended" })), !hasEnded && poll.endsAt && (_jsxs("span", { className: "text-xs", children: ["Ends ", new Date(poll.endsAt).toLocaleDateString()] }))] }), hasVoted && !hasEnded && (_jsx("button", { onClick: (e) => {
                            e.stopPropagation();
                            removeVote();
                        }, className: "poll-remove-vote text-blue-600 hover:text-blue-800 text-xs font-medium", disabled: loading, children: "Remove vote" }))] })] }));
}
