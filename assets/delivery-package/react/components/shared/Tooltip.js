import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
export function Tooltip({ content, children, position = 'top', delay = 200, disabled = false, }) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);
    const timeoutRef = useRef();
    const calculatePosition = () => {
        if (!triggerRef.current || !tooltipRef.current)
            return;
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const offset = 8;
        let top = 0;
        let left = 0;
        switch (position) {
            case 'top':
                top = triggerRect.top - tooltipRect.height - offset;
                left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = triggerRect.bottom + offset;
                left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
                left = triggerRect.left - tooltipRect.width - offset;
                break;
            case 'right':
                top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
                left = triggerRect.right + offset;
                break;
        }
        // Keep tooltip within viewport
        const padding = 8;
        left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
        top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
        setCoords({ top, left });
    };
    useEffect(() => {
        if (isVisible) {
            calculatePosition();
            window.addEventListener('scroll', calculatePosition, true);
            window.addEventListener('resize', calculatePosition);
        }
        return () => {
            window.removeEventListener('scroll', calculatePosition, true);
            window.removeEventListener('resize', calculatePosition);
        };
    }, [isVisible]);
    const handleMouseEnter = () => {
        if (disabled)
            return;
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };
    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };
    const arrowPositions = {
        top: {
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
        },
        bottom: {
            top: '-4px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
        },
        left: {
            right: '-4px',
            top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
        },
        right: {
            left: '-4px',
            top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
        },
    };
    const styles = {
        trigger: {
            display: 'inline-block',
        },
        tooltip: {
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            padding: '8px 12px',
            backgroundColor: 'var(--chatsdk-text-primary, #111827)',
            color: '#ffffff',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            zIndex: 9999,
            pointerEvents: 'none',
            maxWidth: '250px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            animation: 'fadeIn 0.15s ease',
        },
        arrow: {
            position: 'absolute',
            width: '8px',
            height: '8px',
            backgroundColor: 'var(--chatsdk-text-primary, #111827)',
            ...arrowPositions[position],
        },
    };
    return (_jsxs(_Fragment, { children: [_jsx("div", { ref: triggerRef, style: styles.trigger, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, onFocus: handleMouseEnter, onBlur: handleMouseLeave, children: children }), isVisible && (_jsxs("div", { ref: tooltipRef, style: styles.tooltip, children: [content, _jsx("div", { style: styles.arrow })] }))] }));
}
