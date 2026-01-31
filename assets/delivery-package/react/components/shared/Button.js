import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { clsx } from 'clsx';
export const Button = ({ variant = 'primary', size = 'md', loading = false, disabled, className, children, ...props }) => {
    return (_jsxs("button", { className: clsx('chatsdk-button', `chatsdk-button-${variant}`, `chatsdk-button-${size}`, loading && 'chatsdk-button-loading', className), disabled: disabled || loading, ...props, children: [loading && (_jsx("svg", { className: "chatsdk-button-spinner", viewBox: "0 0 24 24", children: _jsx("circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "3", fill: "none", strokeDasharray: "32", strokeLinecap: "round" }) })), _jsx("span", { className: loading ? 'chatsdk-button-content-hidden' : '', children: children }), _jsx("style", { children: `
        .chatsdk-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--chatsdk-space-2);
          font-family: var(--chatsdk-font-sans);
          font-weight: 500;
          border: none;
          border-radius: var(--chatsdk-radius-md);
          cursor: pointer;
          transition: all var(--chatsdk-transition-fast);
          position: relative;
        }
        .chatsdk-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .chatsdk-button-sm { height: 32px; padding: 0 12px; font-size: 13px; }
        .chatsdk-button-md { height: 40px; padding: 0 16px; font-size: 14px; }
        .chatsdk-button-lg { height: 48px; padding: 0 24px; font-size: 16px; }
        .chatsdk-button-icon { width: 40px; height: 40px; padding: 0; }
        .chatsdk-button-icon.chatsdk-button-sm { width: 32px; height: 32px; }
        .chatsdk-button-icon.chatsdk-button-lg { width: 48px; height: 48px; }

        .chatsdk-button-primary {
          background: var(--chatsdk-primary);
          color: var(--chatsdk-primary-foreground);
        }
        .chatsdk-button-primary:hover:not(:disabled) {
          background: var(--chatsdk-primary-hover);
        }

        .chatsdk-button-secondary {
          background: var(--chatsdk-secondary);
          color: var(--chatsdk-secondary-foreground);
        }
        .chatsdk-button-secondary:hover:not(:disabled) {
          background: var(--chatsdk-secondary-hover);
        }

        .chatsdk-button-ghost {
          background: transparent;
          color: var(--chatsdk-foreground);
        }
        .chatsdk-button-ghost:hover:not(:disabled) {
          background: var(--chatsdk-muted);
        }

        .chatsdk-button-destructive {
          background: var(--chatsdk-destructive);
          color: var(--chatsdk-destructive-foreground);
        }
        .chatsdk-button-destructive:hover:not(:disabled) {
          opacity: 0.9;
        }

        .chatsdk-button-outline {
          background: transparent;
          color: var(--chatsdk-foreground);
          border: 1px solid var(--chatsdk-border);
        }
        .chatsdk-button-outline:hover:not(:disabled) {
          background: var(--chatsdk-muted);
        }

        .chatsdk-button-spinner {
          position: absolute;
          width: 20px;
          height: 20px;
          animation: chatsdk-spin 1s linear infinite;
        }
        .chatsdk-button-content-hidden {
          visibility: hidden;
        }
        @keyframes chatsdk-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      ` })] }));
};
export default Button;
