/**
 * CreatePollDialog - Dialog for creating polls in messages
 */

import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { useChatClient } from '../../hooks/ChatProvider';

export interface CreatePollDialogProps {
  messageId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

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
export function CreatePollDialog({
  messageId,
  isOpen,
  onClose,
  onSuccess,
}: CreatePollDialogProps) {
  const client = useChatClient();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isMultiChoice, setIsMultiChoice] = useState(false);
  const [endsAt, setEndsAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
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
    } catch (err) {
      console.error('Failed to create poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to create poll');
    } finally {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Poll"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Poll'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Question */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Question
          </label>
          <Input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What's your question?"
            maxLength={1000}
            disabled={loading}
          />
        </div>

        {/* Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Options
          </label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  maxLength={500}
                  disabled={loading}
                  className="flex-1"
                />
                {options.length > 2 && (
                  <Button
                    variant="destructive"
                    onClick={() => removeOption(index)}
                    disabled={loading}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button
                variant="secondary"
                onClick={addOption}
                disabled={loading}
                className="w-full"
              >
                + Add option
              </Button>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-3 pt-2 border-t">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              disabled={loading}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Anonymous voting</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isMultiChoice}
              onChange={(e) => setIsMultiChoice(e.target.checked)}
              disabled={loading}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Allow multiple choices
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Poll end date (optional)
            </label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
