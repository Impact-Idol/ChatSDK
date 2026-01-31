import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
export function Modal({ isOpen, onClose, title, children, size = 'md', showCloseButton = true, closeOnOverlayClick = true, closeOnEscape = true, footer, }) {
    const modalRef = useRef(null);
    useEffect(() => {
        if (!closeOnEscape)
            return;
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose, closeOnEscape]);
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);
    if (!isOpen)
        return null;
    const sizeWidths = {
        sm: '400px',
        md: '500px',
        lg: '680px',
        xl: '900px',
        full: 'calc(100vw - 48px)',
    };
    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
            animation: 'fadeIn 0.15s ease',
        },
        modal: {
            width: '100%',
            maxWidth: sizeWidths[size],
            maxHeight: size === 'full' ? 'calc(100vh - 48px)' : 'calc(100vh - 96px)',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideUp 0.2s ease',
        },
        header: {
            padding: '20px 24px',
            borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
        },
        title: {
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            margin: 0,
        },
        closeButton: {
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
        },
        content: {
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
        },
        footer: {
            padding: '16px 24px',
            borderTop: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            flexShrink: 0,
        },
    };
    return (_jsx("div", { style: styles.overlay, onClick: closeOnOverlayClick ? onClose : undefined, children: _jsxs("div", { ref: modalRef, style: styles.modal, onClick: (e) => e.stopPropagation(), role: "dialog", "aria-modal": "true", "aria-labelledby": title ? 'modal-title' : undefined, children: [(title || showCloseButton) && (_jsxs("div", { style: styles.header, children: [title && _jsx("h2", { id: "modal-title", style: styles.title, children: title }), showCloseButton && (_jsx("button", { style: styles.closeButton, onClick: onClose, "aria-label": "Close modal", children: _jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) }))] })), _jsx("div", { style: styles.content, children: children }), footer && _jsx("div", { style: styles.footer, children: footer })] }) }));
}
