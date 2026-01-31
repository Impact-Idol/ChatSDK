import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
export function WelcomeTour({ steps, isOpen = true, onComplete, onSkip, showProgress = true, showSkip = true, }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);
    const tooltipRef = useRef(null);
    const step = steps[currentStep];
    useEffect(() => {
        if (!isOpen || !step)
            return;
        const updatePosition = () => {
            const targetElement = document.querySelector(step.target);
            if (targetElement) {
                setTargetRect(targetElement.getBoundingClientRect());
            }
        };
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, step, currentStep]);
    if (!isOpen || !step || !targetRect)
        return null;
    const padding = step.spotlightPadding ?? 8;
    const spotlightRect = {
        top: targetRect.top - padding,
        left: targetRect.left - padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
    };
    const getTooltipPosition = () => {
        const position = step.position || 'bottom';
        const offset = 16;
        switch (position) {
            case 'top':
                return {
                    bottom: window.innerHeight - spotlightRect.top + offset,
                    left: spotlightRect.left + spotlightRect.width / 2,
                    transform: 'translateX(-50%)',
                };
            case 'bottom':
                return {
                    top: spotlightRect.top + spotlightRect.height + offset,
                    left: spotlightRect.left + spotlightRect.width / 2,
                    transform: 'translateX(-50%)',
                };
            case 'left':
                return {
                    top: spotlightRect.top + spotlightRect.height / 2,
                    right: window.innerWidth - spotlightRect.left + offset,
                    transform: 'translateY(-50%)',
                };
            case 'right':
                return {
                    top: spotlightRect.top + spotlightRect.height / 2,
                    left: spotlightRect.left + spotlightRect.width + offset,
                    transform: 'translateY(-50%)',
                };
            default:
                return {};
        }
    };
    const getArrowPosition = () => {
        const position = step.position || 'bottom';
        switch (position) {
            case 'top':
                return { bottom: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
            case 'bottom':
                return { top: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
            case 'left':
                return { right: '-6px', top: '50%', transform: 'translateY(-50%) rotate(45deg)' };
            case 'right':
                return { left: '-6px', top: '50%', transform: 'translateY(-50%) rotate(45deg)' };
            default:
                return {};
        }
    };
    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
        else {
            onComplete?.();
        }
    };
    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };
    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9998,
            pointerEvents: 'none',
        },
        backdrop: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            clipPath: `polygon(
        0% 0%,
        0% 100%,
        ${spotlightRect.left}px 100%,
        ${spotlightRect.left}px ${spotlightRect.top}px,
        ${spotlightRect.left + spotlightRect.width}px ${spotlightRect.top}px,
        ${spotlightRect.left + spotlightRect.width}px ${spotlightRect.top + spotlightRect.height}px,
        ${spotlightRect.left}px ${spotlightRect.top + spotlightRect.height}px,
        ${spotlightRect.left}px 100%,
        100% 100%,
        100% 0%
      )`,
            pointerEvents: 'auto',
        },
        spotlight: {
            position: 'absolute',
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
            borderRadius: '8px',
            boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.3)',
            animation: 'pulse 2s ease-in-out infinite',
        },
        tooltip: {
            position: 'fixed',
            ...getTooltipPosition(),
            width: '320px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            padding: '20px',
            zIndex: 9999,
            pointerEvents: 'auto',
            animation: 'fadeIn 0.2s ease',
        },
        arrow: {
            position: 'absolute',
            width: '12px',
            height: '12px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            ...getArrowPosition(),
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
        },
        stepIndicator: {
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 600,
            flexShrink: 0,
        },
        title: {
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            margin: 0,
        },
        content: {
            fontSize: '14px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            lineHeight: 1.6,
            marginBottom: '16px',
        },
        progress: {
            display: 'flex',
            gap: '4px',
            marginBottom: '16px',
        },
        progressDot: {
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
            transition: 'background-color 0.3s ease',
        },
        progressDotActive: {
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
        },
        progressDotComplete: {
            backgroundColor: 'var(--chatsdk-success-color, #10b981)',
        },
        actions: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        skipButton: {
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
        },
        navButtons: {
            display: 'flex',
            gap: '8px',
        },
        button: {
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
        },
        prevButton: {
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
        nextButton: {
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            color: '#ffffff',
        },
        completeButton: {
            backgroundColor: 'var(--chatsdk-success-color, #10b981)',
            color: '#ffffff',
        },
        actionButton: {
            marginTop: '12px',
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid var(--chatsdk-accent-color, #6366f1)',
            backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
            color: 'var(--chatsdk-accent-color, #6366f1)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
        },
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: styles.overlay, children: [_jsx("div", { style: styles.backdrop, onClick: onSkip }), _jsx("div", { style: styles.spotlight })] }), _jsxs("div", { ref: tooltipRef, style: styles.tooltip, children: [_jsx("div", { style: styles.arrow }), _jsxs("div", { style: styles.header, children: [_jsx("div", { style: styles.stepIndicator, children: currentStep + 1 }), _jsx("h3", { style: styles.title, children: step.title })] }), _jsx("p", { style: styles.content, children: step.content }), showProgress && (_jsx("div", { style: styles.progress, children: steps.map((_, index) => (_jsx("div", { style: {
                                ...styles.progressDot,
                                ...(index === currentStep ? styles.progressDotActive : {}),
                                ...(index < currentStep ? styles.progressDotComplete : {}),
                            } }, index))) })), step.action && (_jsx("button", { style: styles.actionButton, onClick: step.action.onClick, children: step.action.label })), _jsxs("div", { style: styles.actions, children: [showSkip && currentStep < steps.length - 1 ? (_jsx("button", { style: styles.skipButton, onClick: onSkip, children: "Skip tour" })) : (_jsx("div", {})), _jsxs("div", { style: styles.navButtons, children: [currentStep > 0 && (_jsxs("button", { style: { ...styles.button, ...styles.prevButton }, onClick: handlePrev, children: [_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "15 18 9 12 15 6" }) }), "Back"] })), _jsx("button", { style: {
                                            ...styles.button,
                                            ...(currentStep === steps.length - 1 ? styles.completeButton : styles.nextButton),
                                        }, onClick: handleNext, children: currentStep === steps.length - 1 ? (_jsxs(_Fragment, { children: ["Finish", _jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) })] })) : (_jsxs(_Fragment, { children: ["Next", _jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "9 18 15 12 9 6" }) })] })) })] })] })] })] }));
}
