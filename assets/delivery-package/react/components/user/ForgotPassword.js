import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
export function ForgotPassword({ onSubmit, onBack, loading = false, error, success = false, }) {
    const [email, setEmail] = useState('');
    const [validationError, setValidationError] = useState('');
    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        setValidationError('');
        if (!email.trim()) {
            setValidationError('Email is required');
            return;
        }
        if (!validateEmail(email)) {
            setValidationError('Please enter a valid email address');
            return;
        }
        onSubmit?.(email);
    };
    const styles = {
        container: {
            maxWidth: '400px',
            margin: '0 auto',
            padding: '40px',
        },
        backButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '0',
            marginBottom: '24px',
        },
        header: {
            textAlign: 'center',
            marginBottom: '32px',
        },
        iconWrapper: {
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
        },
        successIcon: {
            backgroundColor: 'var(--chatsdk-success-light, #d1fae5)',
        },
        title: {
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            margin: 0,
            marginBottom: '8px',
        },
        subtitle: {
            fontSize: '14px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            margin: 0,
            lineHeight: 1.6,
        },
        form: {
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
        },
        formGroup: {},
        label: {
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '8px',
        },
        input: {
            width: '100%',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            fontSize: '14px',
            color: 'var(--chatsdk-text-primary, #111827)',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            outline: 'none',
            transition: 'border-color 0.15s ease',
            boxSizing: 'border-box',
        },
        error: {
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'var(--chatsdk-error-light, #fee2e2)',
            color: 'var(--chatsdk-error-color, #ef4444)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        },
        submitButton: {
            padding: '14px 24px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
        },
        submitButtonDisabled: {
            opacity: 0.6,
            cursor: 'not-allowed',
        },
        spinner: {
            width: '18px',
            height: '18px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderTopColor: '#ffffff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
        },
        successContent: {
            textAlign: 'center',
        },
        successEmail: {
            padding: '12px 16px',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginTop: '20px',
            marginBottom: '24px',
        },
        successNote: {
            fontSize: '13px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            marginBottom: '24px',
        },
        resendButton: {
            background: 'none',
            border: 'none',
            color: 'var(--chatsdk-accent-color, #6366f1)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            textDecoration: 'underline',
        },
        tips: {
            marginTop: '24px',
            padding: '16px',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            borderRadius: '10px',
        },
        tipsTitle: {
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '12px',
        },
        tipsList: {
            margin: 0,
            padding: 0,
            paddingLeft: '20px',
        },
        tip: {
            fontSize: '13px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            marginBottom: '8px',
            lineHeight: 1.5,
        },
    };
    if (success) {
        return (_jsxs("div", { style: styles.container, children: [_jsxs("button", { style: styles.backButton, onClick: onBack, children: [_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "15 18 9 12 15 6" }) }), "Back to login"] }), _jsxs("div", { style: styles.header, children: [_jsx("div", { style: { ...styles.iconWrapper, ...styles.successIcon }, children: _jsxs("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", stroke: "var(--chatsdk-success-color, #10b981)", strokeWidth: "2", children: [_jsx("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }), _jsx("polyline", { points: "22 4 12 14.01 9 11.01" })] }) }), _jsx("h1", { style: styles.title, children: "Check your email" }), _jsx("p", { style: styles.subtitle, children: "We've sent password reset instructions to:" })] }), _jsxs("div", { style: styles.successContent, children: [_jsx("div", { style: styles.successEmail, children: email }), _jsx("p", { style: styles.successNote, children: "Didn't receive the email? Check your spam folder or try again." }), _jsx("button", { style: styles.resendButton, onClick: () => onSubmit?.(email), children: "Resend email" })] }), _jsxs("div", { style: styles.tips, children: [_jsx("div", { style: styles.tipsTitle, children: "Tips:" }), _jsxs("ul", { style: styles.tipsList, children: [_jsx("li", { style: styles.tip, children: "Check your spam or junk folder" }), _jsx("li", { style: styles.tip, children: "Make sure you entered the correct email" }), _jsx("li", { style: styles.tip, children: "The link expires in 24 hours" })] })] })] }));
    }
    return (_jsxs("div", { style: styles.container, children: [_jsxs("button", { style: styles.backButton, onClick: onBack, children: [_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "15 18 9 12 15 6" }) }), "Back to login"] }), _jsxs("div", { style: styles.header, children: [_jsx("div", { style: styles.iconWrapper, children: _jsxs("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", stroke: "var(--chatsdk-accent-color, #6366f1)", strokeWidth: "2", children: [_jsx("rect", { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }), _jsx("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })] }) }), _jsx("h1", { style: styles.title, children: "Forgot password?" }), _jsx("p", { style: styles.subtitle, children: "No worries! Enter your email address and we'll send you instructions to reset your password." })] }), _jsxs("form", { style: styles.form, onSubmit: handleSubmit, children: [(error || validationError) && (_jsxs("div", { style: styles.error, children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "15", y1: "9", x2: "9", y2: "15" }), _jsx("line", { x1: "9", y1: "9", x2: "15", y2: "15" })] }), error || validationError] })), _jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Email address" }), _jsx("input", { type: "email", style: styles.input, placeholder: "you@example.com", value: email, onChange: (e) => setEmail(e.target.value), disabled: loading, autoFocus: true })] }), _jsx("button", { type: "submit", style: {
                            ...styles.submitButton,
                            ...(loading ? styles.submitButtonDisabled : {}),
                        }, disabled: loading, children: loading ? (_jsxs(_Fragment, { children: [_jsx("div", { style: styles.spinner }), "Sending..."] })) : (_jsxs(_Fragment, { children: [_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" }), _jsx("polyline", { points: "22,6 12,13 2,6" })] }), "Send reset link"] })) })] })] }));
}
