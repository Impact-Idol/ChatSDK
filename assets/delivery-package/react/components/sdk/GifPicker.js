import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from 'react';
const defaultCategories = [
    { id: 'reactions', name: 'Reactions', query: 'reaction' },
    { id: 'celebrate', name: 'Celebrate', query: 'celebration' },
    { id: 'love', name: 'Love', query: 'love heart' },
    { id: 'sad', name: 'Sad', query: 'sad cry' },
    { id: 'funny', name: 'Funny', query: 'funny lol' },
    { id: 'animals', name: 'Animals', query: 'cute animals' },
    { id: 'sports', name: 'Sports', query: 'sports' },
    { id: 'movies', name: 'Movies', query: 'movie tv' },
];
// Mock GIF data for demo (replace with actual API calls)
const mockTrendingGifs = [
    { id: '1', title: 'Happy Dance', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', previewUrl: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/200w.gif', width: 480, height: 270, source: 'giphy' },
    { id: '2', title: 'Thumbs Up', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', previewUrl: 'https://media.giphy.com/media/111ebonMs90YLu/200w.gif', width: 498, height: 278, source: 'giphy' },
    { id: '3', title: 'Mind Blown', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', previewUrl: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/200w.gif', width: 480, height: 480, source: 'giphy' },
    { id: '4', title: 'Celebration', url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', previewUrl: 'https://media.giphy.com/media/g9582DNuQppxC/200w.gif', width: 498, height: 278, source: 'giphy' },
    { id: '5', title: 'Love It', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', previewUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/200w.gif', width: 480, height: 270, source: 'giphy' },
    { id: '6', title: 'Applause', url: 'https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif', previewUrl: 'https://media.giphy.com/media/7rj2ZgttvgomY/200w.gif', width: 500, height: 281, source: 'giphy' },
    { id: '7', title: 'Excited', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', previewUrl: 'https://media.giphy.com/media/5GoVLqeAOo6PK/200w.gif', width: 400, height: 225, source: 'giphy' },
    { id: '8', title: 'Cool', url: 'https://media.giphy.com/media/62PP2yEIAZF6g/giphy.gif', previewUrl: 'https://media.giphy.com/media/62PP2yEIAZF6g/200w.gif', width: 480, height: 270, source: 'giphy' },
];
export function GifPicker({ onSelect, onClose, columns = 2, maxHeight = 400, placeholder = 'Search GIFs...', showTrending = true, showCategories = true, }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [gifs, setGifs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);
    const containerRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const loadGifs = useCallback(async (query) => {
        setLoading(true);
        // Simulate API call - replace with actual API integration
        await new Promise(resolve => setTimeout(resolve, 500));
        if (query) {
            // Filter mock data based on query (in real app, call API)
            const filtered = mockTrendingGifs.filter(gif => gif.title.toLowerCase().includes(query.toLowerCase()));
            setGifs(filtered.length > 0 ? filtered : mockTrendingGifs);
        }
        else {
            setGifs(mockTrendingGifs);
        }
        setLoading(false);
    }, []);
    useEffect(() => {
        loadGifs();
    }, [loadGifs]);
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        if (searchQuery.trim()) {
            searchTimeoutRef.current = setTimeout(() => {
                loadGifs(searchQuery);
            }, 300);
        }
        else if (activeCategory) {
            loadGifs(activeCategory);
        }
        else {
            loadGifs();
        }
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, activeCategory, loadGifs]);
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
    const handleCategoryClick = (category) => {
        setActiveCategory(category.query);
        setSearchQuery('');
    };
    const handleSelect = (gif) => {
        onSelect?.(gif);
        onClose?.();
    };
    const styles = {
        container: {
            width: '340px',
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
        searchContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            borderRadius: '8px',
        },
        searchIcon: {
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            flexShrink: 0,
        },
        searchInput: {
            flex: 1,
            border: 'none',
            background: 'none',
            fontSize: '14px',
            color: 'var(--chatsdk-text-primary, #111827)',
            outline: 'none',
        },
        clearButton: {
            padding: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            display: 'flex',
        },
        categories: {
            display: 'flex',
            gap: '6px',
            padding: '10px 12px',
            overflowX: 'auto',
            borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
        categoryButton: {
            padding: '6px 12px',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            border: 'none',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
        },
        categoryButtonActive: {
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            color: '#ffffff',
        },
        content: {
            maxHeight: `${maxHeight}px`,
            overflowY: 'auto',
            padding: '8px',
        },
        sectionTitle: {
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '8px 6px',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '6px',
        },
        gifItem: {
            position: 'relative',
            borderRadius: '8px',
            overflow: 'hidden',
            cursor: 'pointer',
            backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
            aspectRatio: '16/9',
        },
        gifImage: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.15s ease',
        },
        gifOverlay: {
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
            opacity: 0,
            transition: 'opacity 0.15s ease',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '8px',
        },
        gifTitle: {
            fontSize: '11px',
            fontWeight: 500,
            color: '#ffffff',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        },
        loading: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px',
        },
        loadingSpinner: {
            width: '24px',
            height: '24px',
            border: '2px solid var(--chatsdk-border-color, #e5e7eb)',
            borderTopColor: 'var(--chatsdk-accent-color, #6366f1)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
        },
        empty: {
            padding: '40px 20px',
            textAlign: 'center',
        },
        emptyIcon: {
            width: '48px',
            height: '48px',
            margin: '0 auto 12px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        emptyText: {
            fontSize: '14px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
        },
        footer: {
            padding: '8px 12px',
            borderTop: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
        },
        footerText: {
            fontSize: '11px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        footerLogo: {
            height: '14px',
        },
    };
    // Inject animation keyframes
    useEffect(() => {
        const styleId = 'chatsdk-gif-picker-styles';
        if (!document.getElementById(styleId)) {
            const styleSheet = document.createElement('style');
            styleSheet.id = styleId;
            styleSheet.textContent = `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
            document.head.appendChild(styleSheet);
        }
    }, []);
    return (_jsxs("div", { ref: containerRef, style: styles.container, children: [_jsx("div", { style: styles.header, children: _jsxs("div", { style: styles.searchContainer, children: [_jsxs("svg", { style: styles.searchIcon, width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), _jsx("input", { type: "text", style: styles.searchInput, placeholder: placeholder, value: searchQuery, onChange: (e) => {
                                setSearchQuery(e.target.value);
                                setActiveCategory(null);
                            }, autoFocus: true }), searchQuery && (_jsx("button", { style: styles.clearButton, onClick: () => setSearchQuery(''), children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) }))] }) }), showCategories && (_jsx("div", { style: styles.categories, children: defaultCategories.map((cat) => (_jsx("button", { style: {
                        ...styles.categoryButton,
                        ...(activeCategory === cat.query ? styles.categoryButtonActive : {}),
                    }, onClick: () => handleCategoryClick(cat), children: cat.name }, cat.id))) })), _jsx("div", { style: styles.content, children: loading ? (_jsx("div", { style: styles.loading, children: _jsx("div", { style: styles.loadingSpinner }) })) : gifs.length === 0 ? (_jsxs("div", { style: styles.empty, children: [_jsxs("svg", { style: styles.emptyIcon, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: [_jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" }), _jsx("circle", { cx: "8.5", cy: "8.5", r: "1.5" }), _jsx("polyline", { points: "21 15 16 10 5 21" })] }), _jsx("p", { style: styles.emptyText, children: searchQuery ? `No GIFs found for "${searchQuery}"` : 'No GIFs to display' })] })) : (_jsxs(_Fragment, { children: [showTrending && !searchQuery && !activeCategory && (_jsx("div", { style: styles.sectionTitle, children: "Trending" })), searchQuery && (_jsxs("div", { style: styles.sectionTitle, children: ["Results for \"", searchQuery, "\""] })), activeCategory && (_jsx("div", { style: styles.sectionTitle, children: defaultCategories.find(c => c.query === activeCategory)?.name || 'Results' })), _jsx("div", { style: styles.grid, children: gifs.map((gif) => (_jsxs("div", { style: styles.gifItem, onClick: () => handleSelect(gif), onMouseEnter: (e) => {
                                    const overlay = e.currentTarget.querySelector('[data-overlay]');
                                    const img = e.currentTarget.querySelector('img');
                                    if (overlay)
                                        overlay.style.opacity = '1';
                                    if (img)
                                        img.style.transform = 'scale(1.05)';
                                }, onMouseLeave: (e) => {
                                    const overlay = e.currentTarget.querySelector('[data-overlay]');
                                    const img = e.currentTarget.querySelector('img');
                                    if (overlay)
                                        overlay.style.opacity = '0';
                                    if (img)
                                        img.style.transform = 'scale(1)';
                                }, children: [_jsx("img", { src: gif.previewUrl, alt: gif.title, style: styles.gifImage, loading: "lazy" }), _jsx("div", { style: styles.gifOverlay, "data-overlay": true, children: _jsx("span", { style: styles.gifTitle, children: gif.title }) })] }, gif.id))) })] })) }), _jsxs("div", { style: styles.footer, children: [_jsx("span", { style: styles.footerText, children: "Powered by" }), _jsx("svg", { style: styles.footerLogo, viewBox: "0 0 163 35", fill: "none", children: _jsx("path", { d: "M8.56 34.2H0.52V8.36h8.04v25.84zm51.2 0h-7.32l-1.04-3.2c-1.76 2.48-4.96 3.84-8.64 3.84-6.68 0-11.28-4.24-11.28-11.52 0-7.52 5.08-12.08 12.52-12.08 3.2 0 5.96 0.88 7.72 2.68V8.36h8.04v25.84zm-8.04-12.48c0-3.12-2.24-4.84-5.4-4.84-3.16 0-5.32 1.88-5.32 5.12 0 3.24 2.08 5.04 5.32 5.04 3.12 0 5.4-1.64 5.4-5.32zm52.48 12.48h-7.28l-9.68-13.92v13.92h-8.04V0h8.04v18.68l9.52-10.32h8.04l-10.16 11.32 9.56 14.52zm11.8 0h-8.04V8.36h8.04v25.84zm51.2 0h-7.32l-1.04-3.2c-1.76 2.48-4.96 3.84-8.64 3.84-6.68 0-11.28-4.24-11.28-11.52 0-7.52 5.08-12.08 12.52-12.08 3.2 0 5.96 0.88 7.72 2.68V8.36h8.04v25.84zm-8.04-12.48c0-3.12-2.24-4.84-5.4-4.84-3.16 0-5.32 1.88-5.32 5.12 0 3.24 2.08 5.04 5.32 5.04 3.12 0 5.4-1.64 5.4-5.32z", fill: "var(--chatsdk-text-primary, #111827)" }) })] })] }));
}
