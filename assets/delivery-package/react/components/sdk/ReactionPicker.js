import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
const defaultCategories = [
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
export function ReactionPicker({ onSelect, onClose, recentReactions = [], frequentReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'], customReactions = [], categories = defaultCategories, maxRecent = 8, showSearch = true, showCategories = true, position = 'top', }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(null);
    const containerRef = useRef(null);
    const searchRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                onClose?.();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);
    const handleSelect = (emoji) => {
        onSelect?.(emoji);
        onClose?.();
    };
    const getFilteredEmojis = () => {
        if (!searchQuery.trim())
            return null;
        const query = searchQuery.toLowerCase();
        const results = [];
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
    const styles = {
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
            boxSizing: 'border-box',
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
            overflowX: 'auto',
        },
        categoryButton: {
            padding: '6px 10px',
            background: 'none',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            whiteSpace: 'nowrap',
        },
        categoryButtonActive: {
            backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
            color: 'var(--chatsdk-accent-color, #6366f1)',
        },
        content: {
            maxHeight: '280px',
            overflowY: 'auto',
            padding: '8px',
        },
        section: {
            marginBottom: '16px',
        },
        sectionTitle: {
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            textTransform: 'uppercase',
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
            textAlign: 'center',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            fontSize: '14px',
        },
    };
    const categoryIcons = {
        smileys: '😀',
        gestures: '👋',
        hearts: '❤️',
        objects: '🎉',
        food: '🍎',
        nature: '🌸',
    };
    return (_jsxs("div", { ref: containerRef, style: styles.container, children: [showSearch && (_jsx("div", { style: styles.header, children: _jsx("input", { ref: searchRef, type: "text", style: styles.searchInput, placeholder: "Search reactions...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), autoFocus: true }) })), _jsx("div", { style: styles.quickBar, children: frequentReactions.map((emoji) => (_jsx("button", { style: styles.quickEmoji, onClick: () => handleSelect(emoji), onMouseEnter: (e) => {
                        e.target.style.backgroundColor = 'var(--chatsdk-bg-tertiary, #e5e7eb)';
                        e.target.style.transform = 'scale(1.2)';
                    }, onMouseLeave: (e) => {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.transform = 'scale(1)';
                    }, children: emoji }, emoji))) }), showCategories && !searchQuery && (_jsx("div", { style: styles.categoryNav, children: categories.map((cat) => (_jsx("button", { style: {
                        ...styles.categoryButton,
                        ...(activeCategory === cat.id ? styles.categoryButtonActive : {}),
                    }, onClick: () => setActiveCategory(activeCategory === cat.id ? null : cat.id), title: cat.name, children: categoryIcons[cat.id] || cat.emojis[0] }, cat.id))) })), _jsx("div", { style: styles.content, children: searchQuery ? (filteredEmojis && filteredEmojis.length > 0 ? (_jsxs("div", { style: styles.section, children: [_jsx("div", { style: styles.sectionTitle, children: "Search Results" }), _jsx("div", { style: styles.emojiGrid, children: filteredEmojis.map((emoji, i) => (_jsx("button", { style: styles.emojiButton, onClick: () => handleSelect(emoji), onMouseEnter: (e) => {
                                    e.target.style.backgroundColor = 'var(--chatsdk-bg-tertiary, #e5e7eb)';
                                }, onMouseLeave: (e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                }, children: emoji }, i))) })] })) : (_jsx("div", { style: styles.noResults, children: "No reactions found" }))) : (_jsxs(_Fragment, { children: [recentReactions.length > 0 && (_jsxs("div", { style: styles.section, children: [_jsx("div", { style: styles.sectionTitle, children: "Recently Used" }), _jsx("div", { style: styles.emojiGrid, children: recentReactions.slice(0, maxRecent).map((emoji, i) => (_jsx("button", { style: styles.emojiButton, onClick: () => handleSelect(emoji), onMouseEnter: (e) => {
                                            e.target.style.backgroundColor = 'var(--chatsdk-bg-tertiary, #e5e7eb)';
                                        }, onMouseLeave: (e) => {
                                            e.target.style.backgroundColor = 'transparent';
                                        }, children: emoji }, i))) })] })), customReactions.length > 0 && (_jsxs("div", { style: styles.section, children: [_jsx("div", { style: styles.sectionTitle, children: "Custom" }), _jsx("div", { style: styles.emojiGrid, children: customReactions.map((emoji, i) => (_jsx("button", { style: styles.emojiButton, onClick: () => handleSelect(emoji), onMouseEnter: (e) => {
                                            e.target.style.backgroundColor = 'var(--chatsdk-bg-tertiary, #e5e7eb)';
                                        }, onMouseLeave: (e) => {
                                            e.target.style.backgroundColor = 'transparent';
                                        }, children: emoji }, i))) })] })), categories
                            .filter(cat => !activeCategory || cat.id === activeCategory)
                            .map((cat) => (_jsxs("div", { style: styles.section, children: [_jsx("div", { style: styles.sectionTitle, children: cat.name }), _jsx("div", { style: styles.emojiGrid, children: cat.emojis.slice(0, activeCategory === cat.id ? undefined : 16).map((emoji, i) => (_jsx("button", { style: styles.emojiButton, onClick: () => handleSelect(emoji), onMouseEnter: (e) => {
                                            e.target.style.backgroundColor = 'var(--chatsdk-bg-tertiary, #e5e7eb)';
                                        }, onMouseLeave: (e) => {
                                            e.target.style.backgroundColor = 'transparent';
                                        }, children: emoji }, i))) })] }, cat.id)))] })) })] }));
}
