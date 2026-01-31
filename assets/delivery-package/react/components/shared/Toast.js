import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
function ToastItem({ id, type = 'info', title, message, duration = 5000, action, onClose, }) {
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration]);
    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            onClose?.(id);
        }, 200);
    };
    if (!isVisible)
        return null;
    const typeConfig = {
        success: {
            bg: 'var(--chatsdk-success-light, #d1fae5)',
            border: 'var(--chatsdk-success-color, #10b981)',
            icon: (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }), _jsx("polyline", { points: "22 4 12 14.01 9 11.01" })] })),
        },
        error: {
            bg: 'var(--chatsdk-error-light, #fee2e2)',
            border: 'var(--chatsdk-error-color, #ef4444)',
            icon: (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "15", y1: "9", x2: "9", y2: "15" }), _jsx("line", { x1: "9", y1: "9", x2: "15", y2: "15" })] })),
        },
        warning: {
            bg: 'var(--chatsdk-warning-light, #fef3c7)',
            border: 'var(--chatsdk-warning-color, #f59e0b)',
            icon: (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }), _jsx("line", { x1: "12", y1: "9", x2: "12", y2: "13" }), _jsx("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })] })),
        },
        info: {
            bg: 'var(--chatsdk-accent-light, #eef2ff)',
            border: 'var(--chatsdk-accent-color, #6366f1)',
            icon: (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "12", y1: "16", x2: "12", y2: "12" }), _jsx("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" })] })),
        },
    };
    const config = typeConfig[type];
    const styles = {
        toast: {
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '14px 16px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
            borderLeft: `4px solid ${config.border}`,
            minWidth: '320px',
            maxWidth: '400px',
            animation: isExiting ? 'slideOut 0.2s ease forwards' : 'slideIn 0.2s ease',
        },
        iconWrapper: {
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: config.bg,
            color: config.border,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
        },
        content: {
            flex: 1,
            minWidth: 0,
        },
        title: {
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '4px',
        },
        message: {
            fontSize: '13px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            lineHeight: 1.5,
        },
        actions: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '10px',
        },
        actionButton: {
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: config.bg,
            color: config.border,
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
        },
        closeButton: {
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
        },
    };
    return (_jsxs("div", { style: styles.toast, children: [_jsx("div", { style: styles.iconWrapper, children: config.icon }), _jsxs("div", { style: styles.content, children: [title && _jsx("div", { style: styles.title, children: title }), _jsx("div", { style: styles.message, children: message }), action && (_jsx("div", { style: styles.actions, children: _jsx("button", { style: styles.actionButton, onClick: action.onClick, children: action.label }) }))] }), _jsx("button", { style: styles.closeButton, onClick: handleClose, children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }));
}
export function ToastContainer({ toasts, position = 'top-right', onClose, }) {
    const positionStyles = {
        'top-right': { top: '20px', right: '20px' },
        'top-left': { top: '20px', left: '20px' },
        'bottom-right': { bottom: '20px', right: '20px' },
        'bottom-left': { bottom: '20px', left: '20px' },
        'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
        'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' },
    };
    const styles = {
        container: {
            position: 'fixed',
            ...positionStyles[position],
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
        },
    };
    return (_jsx("div", { style: styles.container, children: toasts.map((toast) => (_jsx(ToastItem, { ...toast, onClose: onClose }, toast.id))) }));
}
export { ToastItem as Toast };
