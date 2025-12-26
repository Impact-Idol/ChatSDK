import React, { useState, useEffect, useRef } from 'react';

export interface ReactionCategory {
  id: string;
  name: string;
  emojis: string[];
}

export interface ReactionPickerProps {
  onSelect?: (emoji: string) => void;
  onClose?: () => void;
  recentReactions?: string[];
  frequentReactions?: string[];
  customReactions?: string[];
  categories?: ReactionCategory[];
  maxRecent?: number;
  showSearch?: boolean;
  showCategories?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const defaultCategories: ReactionCategory[] = [
  {
    id: 'smileys',
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😛', '🤪', '😜', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺'],
  },
  {
    id: 'gestures',
    name: 'Gestures',
    emojis: ['👍', '👎', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦵', '🦶', '👂', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '👶', '👧', '🧒', '👦', '👩', '🧑', '👨'],
  },
  {
    id: 'hearts',
    name: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '🫶', '💌', '💒', '💍', '👰', '🤵'],
  },
  {
    id: 'objects',
    name: 'Objects',
    emojis: ['🎉', '🎊', '🎁', '🎀', '🎗️', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🔥', '✨', '💫', '⭐', '🌟', '💥', '💢', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '🎵', '🎶', '🔔', '🔕', '📢', '📣'],
  },
  {
    id: 'food',
    name: 'Food',
    emojis: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓'],
  },
  {
    id: 'nature',
    name: 'Nature',
    emojis: ['🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🌰', '🦀', '🦞', '🦐', '🦑', '🐙', '🐚', '🐌', '🦋', '🐛', '🐜', '🐝', '🐞', '🦗', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐊', '🐅', '🐆'],
  },
];

export function ReactionPicker({
  onSelect,
  onClose,
  recentReactions = [],
  frequentReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'],
  customReactions = [],
  categories = defaultCategories,
  maxRecent = 8,
  showSearch = true,
  showCategories = true,
  position = 'top',
}: ReactionPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSelect = (emoji: string) => {
    onSelect?.(emoji);
    onClose?.();
  };

  const getFilteredEmojis = () => {
    if (!searchQuery.trim()) return null;

    const query = searchQuery.toLowerCase();
    const results: string[] = [];

    categories.forEach(cat => {
      cat.emojis.forEach(emoji => {
        if (cat.name.toLowerCase().includes(query)) {
          results.push(emoji);
        }
      });
    });

    return results.slice(0, 40);
  };

  const filteredEmojis = getFilteredEmojis();

  const styles: Record<string, React.CSSProperties> = {
    container: {
      width: '320px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      overflow: 'hidden',
    },
    header: {
      padding: '12px',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    searchInput: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    quickBar: {
      display: 'flex',
      gap: '4px',
      padding: '8px 12px',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
    },
    quickEmoji: {
      padding: '6px 8px',
      background: 'none',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '20px',
      transition: 'background-color 0.15s ease, transform 0.1s ease',
    },
    categoryNav: {
      display: 'flex',
      gap: '2px',
      padding: '6px 8px',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      overflowX: 'auto' as const,
    },
    categoryButton: {
      padding: '6px 10px',
      background: 'none',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '16px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      whiteSpace: 'nowrap' as const,
    },
    categoryButtonActive: {
      backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
      color: 'var(--chatsdk-accent-color, #6366f1)',
    },
    content: {
      maxHeight: '280px',
      overflowY: 'auto' as const,
      padding: '8px',
    },
    section: {
      marginBottom: '16px',
    },
    sectionTitle: {
      fontSize: '11px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      padding: '4px 8px',
      marginBottom: '4px',
    },
    emojiGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(8, 1fr)',
      gap: '2px',
    },
    emojiButton: {
      padding: '8px',
      background: 'none',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '20px',
      transition: 'background-color 0.15s ease, transform 0.1s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    noResults: {
      padding: '24px',
      textAlign: 'center' as const,
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      fontSize: '14px',
    },
  };

  const categoryIcons: Record<string, string> = {
    smileys: '😀',
    gestures: '👋',
    hearts: '❤️',
    objects: '🎉',
    food: '🍎',
    nature: '🌸',
  };

  return (
    <div ref={containerRef} style={styles.container}>
      {showSearch && (
        <div style={styles.header}>
          <input
            ref={searchRef}
            type="text"
            style={styles.searchInput}
            placeholder="Search reactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
      )}

      <div style={styles.quickBar}>
        {frequentReactions.map((emoji) => (
          <button
            key={emoji}
            style={styles.quickEmoji}
            onClick={() => handleSelect(emoji)}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'var(--chatsdk-bg-tertiary, #e5e7eb)';
              (e.target as HTMLElement).style.transform = 'scale(1.2)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
              (e.target as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {showCategories && !searchQuery && (
        <div style={styles.categoryNav}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              style={{
                ...styles.categoryButton,
                ...(activeCategory === cat.id ? styles.categoryButtonActive : {}),
              }}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              title={cat.name}
            >
              {categoryIcons[cat.id] || cat.emojis[0]}
            </button>
          ))}
        </div>
      )}

      <div style={styles.content}>
        {searchQuery ? (
          filteredEmojis && filteredEmojis.length > 0 ? (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Search Results</div>
              <div style={styles.emojiGrid}>
                {filteredEmojis.map((emoji, i) => (
                  <button
                    key={i}
                    style={styles.emojiButton}
                    onClick={() => handleSelect(emoji)}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.backgroundColor = 'var(--chatsdk-bg-tertiary, #e5e7eb)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={styles.noResults}>No reactions found</div>
          )
        ) : (
          <>
            {recentReactions.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Recently Used</div>
                <div style={styles.emojiGrid}>
                  {recentReactions.slice(0, maxRecent).map((emoji, i) => (
                    <button
                      key={i}
                      style={styles.emojiButton}
                      onClick={() => handleSelect(emoji)}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = 'var(--chatsdk-bg-tertiary, #e5e7eb)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {customReactions.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Custom</div>
                <div style={styles.emojiGrid}>
                  {customReactions.map((emoji, i) => (
                    <button
                      key={i}
                      style={styles.emojiButton}
                      onClick={() => handleSelect(emoji)}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = 'var(--chatsdk-bg-tertiary, #e5e7eb)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {categories
              .filter(cat => !activeCategory || cat.id === activeCategory)
              .map((cat) => (
                <div key={cat.id} style={styles.section}>
                  <div style={styles.sectionTitle}>{cat.name}</div>
                  <div style={styles.emojiGrid}>
                    {cat.emojis.slice(0, activeCategory === cat.id ? undefined : 16).map((emoji, i) => (
                      <button
                        key={i}
                        style={styles.emojiButton}
                        onClick={() => handleSelect(emoji)}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = 'var(--chatsdk-bg-tertiary, #e5e7eb)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = 'transparent';
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
