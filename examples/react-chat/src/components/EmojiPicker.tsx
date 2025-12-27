import { useState, useRef, useEffect } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤔', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😌', '😔', '😪', '😴', '😷', '🤒', '🤕'],
  'Gestures': ['👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤝', '🙏', '✍️', '💪', '🤳', '👀', '👁️', '👄', '💋'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❤️‍🔥', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'Objects': ['🎉', '🎊', '🎈', '🎁', '🏆', '🏅', '⚽', '🏀', '🎮', '🎲', '🎯', '🎳', '🎸', '🎹', '📱', '💻', '🔥', '⚡', '💡', '📌'],
  'Food': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍑', '🍕', '🍔', '🍟', '🌮', '🍣', '🍜', '🍩', '🍪', '🎂', '☕', '🍺', '🍷'],
  'Nature': ['🌸', '🌹', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵', '🍀', '🍁', '🍂', '🌈', '☀️', '🌙', '⭐', '🌊', '🔥', '❄️'],
};

export function EmojiPicker({ onSelect, onClose, position }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys');
  const [searchQuery, setSearchQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  const categories = Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>;

  const filteredEmojis = searchQuery
    ? Object.values(EMOJI_CATEGORIES).flat().filter(() => true) // In production, filter by emoji name
    : EMOJI_CATEGORIES[selectedCategory];

  return (
    <div
      ref={pickerRef}
      className="emoji-picker"
      style={position ? { top: position.top, left: position.left } : undefined}
    >
      {/* Header */}
      <div className="emoji-picker-header">
        <input
          type="text"
          placeholder="Search emoji..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
      </div>

      {/* Quick reactions */}
      <div className="quick-reactions">
        {['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏'].map((emoji) => (
          <button key={emoji} onClick={() => handleEmojiClick(emoji)}>
            {emoji}
          </button>
        ))}
      </div>

      {/* Category tabs */}
      {!searchQuery && (
        <div className="emoji-categories">
          {categories.map((category) => (
            <button
              key={category}
              className={selectedCategory === category ? 'active' : ''}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="emoji-grid">
        {filteredEmojis.map((emoji, index) => (
          <button key={`${emoji}-${index}`} onClick={() => handleEmojiClick(emoji)}>
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// Quick emoji reaction bar (inline)
export function QuickReactions({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <div className="quick-reactions-bar">
      {['👍', '❤️', '😂', '😮', '😢', '🔥'].map((emoji) => (
        <button key={emoji} onClick={() => onSelect(emoji)} title={emoji}>
          {emoji}
        </button>
      ))}
    </div>
  );
}
