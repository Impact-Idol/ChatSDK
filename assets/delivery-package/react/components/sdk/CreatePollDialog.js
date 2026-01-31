import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * CreatePollDialog - Dialog for creating polls in messages
 */
import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { useChatClient } from '../../hooks/ChatProvider';
/**
 * CreatePollDialog - Dialog for creating a poll attached to a message
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <CreatePollDialog
 *   messageId="msg-123"
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 * />
 * ```
 */
export function CreatePollDialog({ messageId, isOpen, onClose, onSuccess, }) {
    const client = useChatClient();
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isMultiChoice, setIsMultiChoice] = useState(false);
    const [endsAt, setEndsAt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const addOption = () => {
        if (options.length < 10) {
            setOptions([...options, '']);
        }
    };
    const removeOption = (index) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };
    const updateOption = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };
    const handleCreate = async () => {
        // Validate
        if (!question.trim()) {
            setError('Please provide a question');
            return;
        }
        const validOptions = options.filter((o) => o.trim());
        if (validOptions.length < 2) {
            setError('Please provide at least 2 options');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await client.fetch(`/api/messages/${messageId}/polls`, {
                method: 'POST',
                body: JSON.stringify({
                    question,
                    options: validOptions.map((text, index) => ({
                        id: `opt${index + 1}`,
                        text,
                    })),
                    isAnonymous,
                    isMultiChoice,
                    endsAt: endsAt || undefined,
                }),
            });
            // Reset form
            setQuestion('');
            setOptions(['', '']);
            setIsAnonymous(false);
            setIsMultiChoice(false);
            setEndsAt('');
            onSuccess?.();
            onClose();
        }
        catch (err) {
            console.error('Failed to create poll:', err);
            setError(err instanceof Error ? err.message : 'Failed to create poll');
        }
        finally {
            setLoading(false);
        }
    };
    const handleClose = () => {
        if (!loading) {
            onClose();
            // Reset error on close
            setError(null);
        }
    };
    return (_jsx(Modal, { isOpen: isOpen, onClose: handleClose, title: "Create Poll", size: "md", footer: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: handleClose, disabled: loading, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleCreate, disabled: loading, children: loading ? 'Creating...' : 'Create Poll' })] }), children: _jsxs("div", { className: "space-y-4", children: [error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-md text-sm", children: error })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Question" }), _jsx(Input, { type: "text", value: question, onChange: (e) => setQuestion(e.target.value), placeholder: "What's your question?", maxLength: 1000, disabled: loading })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Options" }), _jsxs("div", { className: "space-y-2", children: [options.map((option, index) => (_jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { type: "text", value: option, onChange: (e) => updateOption(index, e.target.value), placeholder: `Option ${index + 1}`, maxLength: 500, disabled: loading, className: "flex-1" }), options.length > 2 && (_jsx(Button, { variant: "destructive", onClick: () => removeOption(index), disabled: loading, children: "Remove" }))] }, index))), options.length < 10 && (_jsx(Button, { variant: "secondary", onClick: addOption, disabled: loading, className: "w-full", children: "+ Add option" }))] })] }), _jsxs("div", { className: "space-y-3 pt-2 border-t", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: isAnonymous, onChange: (e) => setIsAnonymous(e.target.checked), disabled: loading, className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500" }), _jsx("span", { className: "text-sm text-gray-700", children: "Anonymous voting" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: isMultiChoice, onChange: (e) => setIsMultiChoice(e.target.checked), disabled: loading, className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500" }), _jsx("span", { className: "text-sm text-gray-700", children: "Allow multiple choices" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Poll end date (optional)" }), _jsx(Input, { type: "datetime-local", value: endsAt, onChange: (e) => setEndsAt(e.target.value), disabled: loading })] })] })] }) }));
}
