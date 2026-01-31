import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx';
// =============================================================================
// EMOJI DATA (Subset for demo - in production, use a full emoji library)
// =============================================================================
const EMOJI_CATEGORIES = [
    {
        id: 'smileys',
        name: 'Smileys & Emotion',
        emojis: [
            { id: 'grinning', native: '😀', name: 'Grinning Face', shortcodes: [':grinning:'], keywords: ['happy', 'smile'] },
            { id: 'smiley', native: '😃', name: 'Grinning Face with Big Eyes', shortcodes: [':smiley:'], keywords: ['happy', 'joy'] },
            { id: 'smile', native: '😄', name: 'Grinning Face with Smiling Eyes', shortcodes: [':smile:'], keywords: ['happy', 'joy'] },
            { id: 'grin', native: '😁', name: 'Beaming Face with Smiling Eyes', shortcodes: [':grin:'], keywords: ['happy', 'smile'] },
            { id: 'laughing', native: '😆', name: 'Grinning Squinting Face', shortcodes: [':laughing:'], keywords: ['happy', 'laugh'] },
            { id: 'sweat_smile', native: '😅', name: 'Grinning Face with Sweat', shortcodes: [':sweat_smile:'], keywords: ['hot', 'happy'] },
            { id: 'joy', native: '😂', name: 'Face with Tears of Joy', shortcodes: [':joy:'], keywords: ['laugh', 'cry'] },
            { id: 'rofl', native: '🤣', name: 'Rolling on the Floor Laughing', shortcodes: [':rofl:'], keywords: ['laugh', 'floor'] },
            { id: 'relaxed', native: '☺️', name: 'Smiling Face', shortcodes: [':relaxed:'], keywords: ['blush', 'pleased'] },
            { id: 'blush', native: '😊', name: 'Smiling Face with Smiling Eyes', shortcodes: [':blush:'], keywords: ['smile', 'happy'] },
            { id: 'innocent', native: '😇', name: 'Smiling Face with Halo', shortcodes: [':innocent:'], keywords: ['angel', 'halo'] },
            { id: 'wink', native: '😉', name: 'Winking Face', shortcodes: [':wink:'], keywords: ['blink', 'flirt'] },
            { id: 'relieved', native: '😌', name: 'Relieved Face', shortcodes: [':relieved:'], keywords: ['whew', 'content'] },
            { id: 'heart_eyes', native: '😍', name: 'Smiling Face with Heart-Eyes', shortcodes: [':heart_eyes:'], keywords: ['love', 'crush'] },
            { id: 'star_struck', native: '🤩', name: 'Star-Struck', shortcodes: [':star_struck:'], keywords: ['wow', 'amazing'] },
            { id: 'kissing_heart', native: '😘', name: 'Face Blowing a Kiss', shortcodes: [':kissing_heart:'], keywords: ['kiss', 'love'] },
            { id: 'kissing', native: '😗', name: 'Kissing Face', shortcodes: [':kissing:'], keywords: ['kiss', 'love'] },
            { id: 'yum', native: '😋', name: 'Face Savoring Food', shortcodes: [':yum:'], keywords: ['delicious', 'tongue'] },
            { id: 'stuck_out_tongue', native: '😛', name: 'Face with Tongue', shortcodes: [':stuck_out_tongue:'], keywords: ['playful', 'silly'] },
            { id: 'stuck_out_tongue_winking_eye', native: '😜', name: 'Winking Face with Tongue', shortcodes: [':stuck_out_tongue_winking_eye:'], keywords: ['playful', 'joking'] },
            { id: 'zany_face', native: '🤪', name: 'Zany Face', shortcodes: [':zany_face:'], keywords: ['crazy', 'wild'] },
            { id: 'thinking', native: '🤔', name: 'Thinking Face', shortcodes: [':thinking:'], keywords: ['hmm', 'pondering'] },
            { id: 'shushing_face', native: '🤫', name: 'Shushing Face', shortcodes: [':shushing_face:'], keywords: ['quiet', 'secret'] },
            { id: 'hugging', native: '🤗', name: 'Hugging Face', shortcodes: [':hugging:'], keywords: ['hug', 'open'] },
        ],
    },
    {
        id: 'gestures',
        name: 'People & Body',
        emojis: [
            { id: 'wave', native: '👋', name: 'Waving Hand', shortcodes: [':wave:'], keywords: ['hello', 'goodbye'] },
            { id: 'raised_hand', native: '✋', name: 'Raised Hand', shortcodes: [':raised_hand:'], keywords: ['stop', 'high five'] },
            { id: 'ok_hand', native: '👌', name: 'OK Hand', shortcodes: [':ok_hand:'], keywords: ['perfect', 'okay'] },
            { id: 'thumbsup', native: '👍', name: 'Thumbs Up', shortcodes: [':thumbsup:', ':+1:'], keywords: ['yes', 'approve'] },
            { id: 'thumbsdown', native: '👎', name: 'Thumbs Down', shortcodes: [':thumbsdown:', ':-1:'], keywords: ['no', 'disapprove'] },
            { id: 'clap', native: '👏', name: 'Clapping Hands', shortcodes: [':clap:'], keywords: ['applause', 'bravo'] },
            { id: 'raised_hands', native: '🙌', name: 'Raising Hands', shortcodes: [':raised_hands:'], keywords: ['hooray', 'celebration'] },
            { id: 'pray', native: '🙏', name: 'Folded Hands', shortcodes: [':pray:'], keywords: ['please', 'thanks'] },
            { id: 'handshake', native: '🤝', name: 'Handshake', shortcodes: [':handshake:'], keywords: ['agreement', 'deal'] },
            { id: 'point_up', native: '☝️', name: 'Index Pointing Up', shortcodes: [':point_up:'], keywords: ['one', 'attention'] },
            { id: 'point_right', native: '👉', name: 'Backhand Index Pointing Right', shortcodes: [':point_right:'], keywords: ['direction', 'right'] },
            { id: 'point_left', native: '👈', name: 'Backhand Index Pointing Left', shortcodes: [':point_left:'], keywords: ['direction', 'left'] },
            { id: 'muscle', native: '💪', name: 'Flexed Biceps', shortcodes: [':muscle:'], keywords: ['strong', 'arm'] },
            { id: 'punch', native: '👊', name: 'Oncoming Fist', shortcodes: [':punch:', ':facepunch:'], keywords: ['punch', 'fist bump'] },
            { id: 'v', native: '✌️', name: 'Victory Hand', shortcodes: [':v:'], keywords: ['peace', 'two'] },
            { id: 'metal', native: '🤘', name: 'Sign of the Horns', shortcodes: [':metal:'], keywords: ['rock', 'devil'] },
        ],
    },
    {
        id: 'nature',
        name: 'Animals & Nature',
        emojis: [
            { id: 'dog', native: '🐶', name: 'Dog Face', shortcodes: [':dog:'], keywords: ['puppy', 'pet'] },
            { id: 'cat', native: '🐱', name: 'Cat Face', shortcodes: [':cat:'], keywords: ['kitten', 'pet'] },
            { id: 'mouse', native: '🐭', name: 'Mouse Face', shortcodes: [':mouse:'], keywords: ['rodent', 'animal'] },
            { id: 'hamster', native: '🐹', name: 'Hamster', shortcodes: [':hamster:'], keywords: ['pet', 'rodent'] },
            { id: 'rabbit', native: '🐰', name: 'Rabbit Face', shortcodes: [':rabbit:'], keywords: ['bunny', 'pet'] },
            { id: 'fox', native: '🦊', name: 'Fox', shortcodes: [':fox:'], keywords: ['animal', 'nature'] },
            { id: 'bear', native: '🐻', name: 'Bear', shortcodes: [':bear:'], keywords: ['animal', 'nature'] },
            { id: 'panda', native: '🐼', name: 'Panda', shortcodes: [':panda:'], keywords: ['animal', 'nature'] },
            { id: 'unicorn', native: '🦄', name: 'Unicorn', shortcodes: [':unicorn:'], keywords: ['magic', 'fantasy'] },
            { id: 'fire', native: '🔥', name: 'Fire', shortcodes: [':fire:'], keywords: ['hot', 'lit'] },
            { id: 'sparkles', native: '✨', name: 'Sparkles', shortcodes: [':sparkles:'], keywords: ['magic', 'clean'] },
            { id: 'star', native: '⭐', name: 'Star', shortcodes: [':star:'], keywords: ['night', 'favorite'] },
            { id: 'rainbow', native: '🌈', name: 'Rainbow', shortcodes: [':rainbow:'], keywords: ['pride', 'weather'] },
            { id: 'sun', native: '☀️', name: 'Sun', shortcodes: [':sun:'], keywords: ['sunny', 'weather'] },
            { id: 'moon', native: '🌙', name: 'Crescent Moon', shortcodes: [':moon:'], keywords: ['night', 'sleep'] },
            { id: 'cloud', native: '☁️', name: 'Cloud', shortcodes: [':cloud:'], keywords: ['weather', 'sky'] },
        ],
    },
    {
        id: 'food',
        name: 'Food & Drink',
        emojis: [
            { id: 'apple', native: '🍎', name: 'Red Apple', shortcodes: [':apple:'], keywords: ['fruit', 'healthy'] },
            { id: 'pizza', native: '🍕', name: 'Pizza', shortcodes: [':pizza:'], keywords: ['food', 'italian'] },
            { id: 'hamburger', native: '🍔', name: 'Hamburger', shortcodes: [':hamburger:'], keywords: ['food', 'fast food'] },
            { id: 'fries', native: '🍟', name: 'French Fries', shortcodes: [':fries:'], keywords: ['food', 'fast food'] },
            { id: 'hotdog', native: '🌭', name: 'Hot Dog', shortcodes: [':hotdog:'], keywords: ['food', 'fast food'] },
            { id: 'taco', native: '🌮', name: 'Taco', shortcodes: [':taco:'], keywords: ['food', 'mexican'] },
            { id: 'burrito', native: '🌯', name: 'Burrito', shortcodes: [':burrito:'], keywords: ['food', 'mexican'] },
            { id: 'sushi', native: '🍣', name: 'Sushi', shortcodes: [':sushi:'], keywords: ['food', 'japanese'] },
            { id: 'cookie', native: '🍪', name: 'Cookie', shortcodes: [':cookie:'], keywords: ['food', 'dessert'] },
            { id: 'cake', native: '🎂', name: 'Birthday Cake', shortcodes: [':cake:'], keywords: ['food', 'birthday'] },
            { id: 'coffee', native: '☕', name: 'Hot Beverage', shortcodes: [':coffee:'], keywords: ['drink', 'caffeine'] },
            { id: 'beer', native: '🍺', name: 'Beer Mug', shortcodes: [':beer:'], keywords: ['drink', 'alcohol'] },
            { id: 'wine', native: '🍷', name: 'Wine Glass', shortcodes: [':wine:'], keywords: ['drink', 'alcohol'] },
            { id: 'champagne', native: '🍾', name: 'Bottle with Popping Cork', shortcodes: [':champagne:'], keywords: ['celebrate', 'drink'] },
            { id: 'tropical_drink', native: '🍹', name: 'Tropical Drink', shortcodes: [':tropical_drink:'], keywords: ['drink', 'cocktail'] },
            { id: 'ice_cream', native: '🍨', name: 'Ice Cream', shortcodes: [':ice_cream:'], keywords: ['dessert', 'cold'] },
        ],
    },
    {
        id: 'objects',
        name: 'Objects',
        emojis: [
            { id: 'heart', native: '❤️', name: 'Red Heart', shortcodes: [':heart:'], keywords: ['love', 'like'] },
            { id: 'orange_heart', native: '🧡', name: 'Orange Heart', shortcodes: [':orange_heart:'], keywords: ['love', 'like'] },
            { id: 'yellow_heart', native: '💛', name: 'Yellow Heart', shortcodes: [':yellow_heart:'], keywords: ['love', 'like'] },
            { id: 'green_heart', native: '💚', name: 'Green Heart', shortcodes: [':green_heart:'], keywords: ['love', 'like'] },
            { id: 'blue_heart', native: '💙', name: 'Blue Heart', shortcodes: [':blue_heart:'], keywords: ['love', 'like'] },
            { id: 'purple_heart', native: '💜', name: 'Purple Heart', shortcodes: [':purple_heart:'], keywords: ['love', 'like'] },
            { id: 'broken_heart', native: '💔', name: 'Broken Heart', shortcodes: [':broken_heart:'], keywords: ['sad', 'sorry'] },
            { id: 'bulb', native: '💡', name: 'Light Bulb', shortcodes: [':bulb:'], keywords: ['idea', 'light'] },
            { id: 'bomb', native: '💣', name: 'Bomb', shortcodes: [':bomb:'], keywords: ['explode', 'danger'] },
            { id: 'gem', native: '💎', name: 'Gem Stone', shortcodes: [':gem:'], keywords: ['diamond', 'precious'] },
            { id: 'bell', native: '🔔', name: 'Bell', shortcodes: [':bell:'], keywords: ['notification', 'sound'] },
            { id: 'trophy', native: '🏆', name: 'Trophy', shortcodes: [':trophy:'], keywords: ['win', 'award'] },
            { id: 'medal', native: '🏅', name: 'Sports Medal', shortcodes: [':medal:'], keywords: ['award', 'first'] },
            { id: 'rocket', native: '🚀', name: 'Rocket', shortcodes: [':rocket:'], keywords: ['launch', 'space'] },
            { id: 'gift', native: '🎁', name: 'Wrapped Gift', shortcodes: [':gift:'], keywords: ['present', 'birthday'] },
            { id: 'tada', native: '🎉', name: 'Party Popper', shortcodes: [':tada:'], keywords: ['party', 'celebration'] },
        ],
    },
    {
        id: 'symbols',
        name: 'Symbols',
        emojis: [
            { id: 'check', native: '✅', name: 'Check Mark Button', shortcodes: [':check:', ':white_check_mark:'], keywords: ['yes', 'done'] },
            { id: 'x', native: '❌', name: 'Cross Mark', shortcodes: [':x:'], keywords: ['no', 'wrong'] },
            { id: 'question', native: '❓', name: 'Question Mark', shortcodes: [':question:'], keywords: ['what', 'confused'] },
            { id: 'exclamation', native: '❗', name: 'Exclamation Mark', shortcodes: [':exclamation:'], keywords: ['alert', 'warning'] },
            { id: 'warning', native: '⚠️', name: 'Warning', shortcodes: [':warning:'], keywords: ['caution', 'alert'] },
            { id: 'no_entry', native: '⛔', name: 'No Entry', shortcodes: [':no_entry:'], keywords: ['stop', 'forbidden'] },
            { id: '100', native: '💯', name: 'Hundred Points', shortcodes: [':100:'], keywords: ['perfect', 'score'] },
            { id: 'zzz', native: '💤', name: 'Zzz', shortcodes: [':zzz:'], keywords: ['sleep', 'tired'] },
            { id: 'eyes', native: '👀', name: 'Eyes', shortcodes: [':eyes:'], keywords: ['look', 'see'] },
            { id: 'speech_balloon', native: '💬', name: 'Speech Balloon', shortcodes: [':speech_balloon:'], keywords: ['comment', 'talk'] },
            { id: 'thought_balloon', native: '💭', name: 'Thought Balloon', shortcodes: [':thought_balloon:'], keywords: ['think', 'idea'] },
            { id: 'hash', native: '#️⃣', name: 'Keycap: #', shortcodes: [':hash:'], keywords: ['number', 'hashtag'] },
            { id: 'copyright', native: '©️', name: 'Copyright', shortcodes: [':copyright:'], keywords: ['ip', 'license'] },
            { id: 'tm', native: '™️', name: 'Trade Mark', shortcodes: [':tm:'], keywords: ['trademark', 'brand'] },
            { id: 'info', native: 'ℹ️', name: 'Information', shortcodes: [':info:'], keywords: ['help', 'details'] },
            { id: 'recycle', native: '♻️', name: 'Recycling Symbol', shortcodes: [':recycle:'], keywords: ['environment', 'green'] },
        ],
    },
];
const SKIN_TONES = ['🏻', '🏼', '🏽', '🏾', '🏿'];
// =============================================================================
// ICONS
// =============================================================================
const SearchIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("path", { d: "m21 21-4.35-4.35" })] }));
const ClockIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("polyline", { points: "12 6 12 12 16 14" })] }));
const SmileIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "M8 14s1.5 2 4 2 4-2 4-2" }), _jsx("line", { x1: "9", x2: "9.01", y1: "9", y2: "9" }), _jsx("line", { x1: "15", x2: "15.01", y1: "9", y2: "9" })] }));
const HandIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" }), _jsx("path", { d: "M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" }), _jsx("path", { d: "M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" }), _jsx("path", { d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" })] }));
const LeafIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" }), _jsx("path", { d: "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" })] }));
const UtensilsIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" }), _jsx("path", { d: "M7 2v20" }), _jsx("path", { d: "M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" })] }));
const LampIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M15 7V3c0-.6-.4-1-1-1h-4c-.6 0-1 .4-1 1v4" }), _jsx("path", { d: "M9 7v2.1a5 5 0 1 0 6 0V7" }), _jsx("rect", { width: "10", height: "3", x: "7", y: "19", rx: "1" }), _jsx("line", { x1: "12", x2: "12", y1: "15", y2: "19" })] }));
const HashIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "4", x2: "20", y1: "9", y2: "9" }), _jsx("line", { x1: "4", x2: "20", y1: "15", y2: "15" }), _jsx("line", { x1: "10", x2: "8", y1: "3", y2: "21" }), _jsx("line", { x1: "16", x2: "14", y1: "3", y2: "21" })] }));
const XIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }));
// =============================================================================
// STYLES
// =============================================================================
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        width: '352px',
        height: '420px',
        backgroundColor: 'var(--chatsdk-bg-primary)',
        borderRadius: '12px',
        border: '1px solid var(--chatsdk-border-light)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
    },
    searchContainer: {
        padding: '12px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
    },
    searchWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--chatsdk-border-light)',
    },
    searchIcon: {
        color: 'var(--chatsdk-text-tertiary)',
        flexShrink: 0,
    },
    searchInput: {
        flex: 1,
        border: 'none',
        background: 'none',
        fontSize: '14px',
        color: 'var(--chatsdk-text-primary)',
        outline: 'none',
    },
    clearButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        border: 'none',
        borderRadius: '50%',
        color: 'var(--chatsdk-text-tertiary)',
        cursor: 'pointer',
    },
    categoryNav: {
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '8px 12px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
        overflowX: 'auto',
    },
    categoryButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: 'var(--chatsdk-text-tertiary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        flexShrink: 0,
    },
    categoryButtonActive: {
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        color: 'var(--chatsdk-primary)',
    },
    emojiGrid: {
        flex: 1,
        overflowY: 'auto',
        padding: '8px 12px',
    },
    section: {
        marginBottom: '16px',
    },
    sectionHeader: {
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-tertiary)',
        marginBottom: '8px',
        position: 'sticky',
        top: 0,
        backgroundColor: 'var(--chatsdk-bg-primary)',
        padding: '4px 0',
        zIndex: 5,
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '4px',
    },
    emojiButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '8px',
        fontSize: '24px',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
    },
    emojiButtonHover: {
        backgroundColor: 'var(--chatsdk-bg-secondary)',
    },
    preview: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        borderTop: '1px solid var(--chatsdk-border-light)',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        minHeight: '60px',
    },
    previewEmoji: {
        fontSize: '36px',
        lineHeight: 1,
    },
    previewInfo: {
        flex: 1,
        minWidth: 0,
    },
    previewName: {
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    previewShortcode: {
        fontSize: '12px',
        color: 'var(--chatsdk-text-tertiary)',
        fontFamily: 'var(--chatsdk-font-mono)',
    },
    skinTones: {
        display: 'flex',
        gap: '2px',
    },
    skinToneButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '4px',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
    },
    skinToneButtonActive: {
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        boxShadow: 'inset 0 0 0 2px var(--chatsdk-primary)',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center',
    },
    emptyText: {
        fontSize: '14px',
        color: 'var(--chatsdk-text-tertiary)',
        marginTop: '8px',
    },
    frequentSection: {
        paddingBottom: '8px',
        marginBottom: '8px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
    },
};
// =============================================================================
// COMPONENT
// =============================================================================
export const EmojiPicker = ({ onSelect, onClose, recentEmojis = [], frequentEmojis = [], customEmojis = [], skinTone = 1, onSkinToneChange, maxRecentEmojis = 20, showPreview = true, showSkinTones = true, showSearch = true, autoFocus = true, className, }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredEmoji, setHoveredEmoji] = useState(null);
    const [activeCategory, setActiveCategory] = useState('smileys');
    const searchInputRef = useRef(null);
    const gridRef = useRef(null);
    useEffect(() => {
        if (autoFocus && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [autoFocus]);
    const filteredEmojis = useMemo(() => {
        if (!searchQuery.trim())
            return null;
        const query = searchQuery.toLowerCase();
        const results = [];
        EMOJI_CATEGORIES.forEach(category => {
            category.emojis.forEach(emoji => {
                if (emoji.name.toLowerCase().includes(query) ||
                    emoji.shortcodes.some(s => s.toLowerCase().includes(query)) ||
                    emoji.keywords.some(k => k.toLowerCase().includes(query))) {
                    results.push(emoji);
                }
            });
        });
        return results;
    }, [searchQuery]);
    const handleEmojiClick = useCallback((emoji) => {
        onSelect(emoji);
    }, [onSelect]);
    const handleCategoryClick = useCallback((categoryId) => {
        setActiveCategory(categoryId);
        setSearchQuery('');
        // Scroll to category
        if (gridRef.current) {
            const section = gridRef.current.querySelector(`[data-category="${categoryId}"]`);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, []);
    const categoryIcons = {
        recent: _jsx(ClockIcon, {}),
        smileys: _jsx(SmileIcon, {}),
        gestures: _jsx(HandIcon, {}),
        nature: _jsx(LeafIcon, {}),
        food: _jsx(UtensilsIcon, {}),
        objects: _jsx(LampIcon, {}),
        symbols: _jsx(HashIcon, {}),
    };
    const displayedRecent = recentEmojis.slice(0, maxRecentEmojis);
    return (_jsxs("div", { style: styles.container, className: clsx('chatsdk-emoji-picker', className), children: [showSearch && (_jsx("div", { style: styles.searchContainer, children: _jsxs("div", { style: styles.searchWrapper, children: [_jsx("div", { style: styles.searchIcon, children: _jsx(SearchIcon, {}) }), _jsx("input", { ref: searchInputRef, type: "text", placeholder: "Search emoji...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), style: styles.searchInput }), searchQuery && (_jsx("button", { style: styles.clearButton, onClick: () => setSearchQuery(''), children: _jsx(XIcon, {}) }))] }) })), _jsxs("div", { style: styles.categoryNav, children: [displayedRecent.length > 0 && (_jsx("button", { style: {
                            ...styles.categoryButton,
                            ...(activeCategory === 'recent' ? styles.categoryButtonActive : {}),
                        }, onClick: () => handleCategoryClick('recent'), title: "Recent", children: categoryIcons.recent })), EMOJI_CATEGORIES.map(category => (_jsx("button", { style: {
                            ...styles.categoryButton,
                            ...(activeCategory === category.id ? styles.categoryButtonActive : {}),
                        }, onClick: () => handleCategoryClick(category.id), title: category.name, children: categoryIcons[category.id] || category.emojis[0]?.native }, category.id)))] }), _jsx("div", { style: styles.emojiGrid, ref: gridRef, children: filteredEmojis ? (
                // Search results
                filteredEmojis.length > 0 ? (_jsxs("div", { style: styles.section, children: [_jsxs("div", { style: styles.sectionHeader, children: ["Search results (", filteredEmojis.length, ")"] }), _jsx("div", { style: styles.grid, children: filteredEmojis.map(emoji => (_jsx("button", { style: {
                                    ...styles.emojiButton,
                                    ...(hoveredEmoji?.id === emoji.id ? styles.emojiButtonHover : {}),
                                }, onClick: () => handleEmojiClick(emoji), onMouseEnter: () => setHoveredEmoji(emoji), onMouseLeave: () => setHoveredEmoji(null), title: emoji.name, children: emoji.native }, emoji.id))) })] })) : (_jsxs("div", { style: styles.emptyState, children: [_jsx("div", { style: { fontSize: '32px' }, children: "\uD83D\uDD0D" }), _jsxs("div", { style: styles.emptyText, children: ["No emoji found for \"", searchQuery, "\""] })] }))) : (
                // Category view
                _jsxs(_Fragment, { children: [displayedRecent.length > 0 && (_jsxs("div", { style: { ...styles.section, ...styles.frequentSection }, "data-category": "recent", children: [_jsx("div", { style: styles.sectionHeader, children: "Recently Used" }), _jsx("div", { style: styles.grid, children: displayedRecent.map(emoji => (_jsx("button", { style: {
                                            ...styles.emojiButton,
                                            ...(hoveredEmoji?.id === emoji.id ? styles.emojiButtonHover : {}),
                                        }, onClick: () => handleEmojiClick(emoji), onMouseEnter: () => setHoveredEmoji(emoji), onMouseLeave: () => setHoveredEmoji(null), title: emoji.name, children: emoji.native }, `recent-${emoji.id}`))) })] })), EMOJI_CATEGORIES.map(category => (_jsxs("div", { style: styles.section, "data-category": category.id, children: [_jsx("div", { style: styles.sectionHeader, children: category.name }), _jsx("div", { style: styles.grid, children: category.emojis.map(emoji => (_jsx("button", { style: {
                                            ...styles.emojiButton,
                                            ...(hoveredEmoji?.id === emoji.id ? styles.emojiButtonHover : {}),
                                        }, onClick: () => handleEmojiClick(emoji), onMouseEnter: () => setHoveredEmoji(emoji), onMouseLeave: () => setHoveredEmoji(null), title: emoji.name, children: emoji.native }, emoji.id))) })] }, category.id)))] })) }), showPreview && (_jsx("div", { style: styles.preview, children: hoveredEmoji ? (_jsxs(_Fragment, { children: [_jsx("span", { style: styles.previewEmoji, children: hoveredEmoji.native }), _jsxs("div", { style: styles.previewInfo, children: [_jsx("div", { style: styles.previewName, children: hoveredEmoji.name }), _jsx("div", { style: styles.previewShortcode, children: hoveredEmoji.shortcodes[0] })] }), showSkinTones && (_jsxs("div", { style: styles.skinTones, children: [_jsx("button", { style: {
                                        ...styles.skinToneButton,
                                        ...(skinTone === 1 ? styles.skinToneButtonActive : {}),
                                    }, onClick: () => onSkinToneChange?.(1), title: "Default", children: "\uD83D\uDC4B" }), SKIN_TONES.map((tone, i) => (_jsxs("button", { style: {
                                        ...styles.skinToneButton,
                                        ...(skinTone === (i + 2) ? styles.skinToneButtonActive : {}),
                                    }, onClick: () => onSkinToneChange?.((i + 2)), title: `Skin tone ${i + 2}`, children: ["\uD83D\uDC4B", tone] }, i)))] }))] })) : (_jsx("span", { style: { ...styles.previewName, color: 'var(--chatsdk-text-tertiary)' }, children: "Hover over an emoji to preview" })) }))] }));
};
export default EmojiPicker;
