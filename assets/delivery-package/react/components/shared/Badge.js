import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { clsx } from 'clsx';
export const Badge = ({ variant = 'default', size = 'md', children, className, }) => {
    return (_jsxs("span", { className: clsx('chatsdk-badge', `chatsdk-badge-${variant}`, `chatsdk-badge-${size}`, className), children: [children, _jsx("style", { children: `
        .chatsdk-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: var(--chatsdk-font-sans);
          font-weight: 500;
          border-radius: var(--chatsdk-radius-full);
          white-space: nowrap;
        }
        .chatsdk-badge-sm { height: 20px; padding: 0 8px; font-size: 11px; }
        .chatsdk-badge-md { height: 24px; padding: 0 10px; font-size: 12px; }

        .chatsdk-badge-default {
          background: var(--chatsdk-muted);
          color: var(--chatsdk-muted-foreground);
        }
        .chatsdk-badge-primary {
          background: var(--chatsdk-primary);
          color: var(--chatsdk-primary-foreground);
        }
        .chatsdk-badge-secondary {
          background: var(--chatsdk-secondary);
          color: var(--chatsdk-secondary-foreground);
        }
        .chatsdk-badge-success {
          background: var(--chatsdk-success);
          color: var(--chatsdk-success-foreground);
        }
        .chatsdk-badge-warning {
          background: var(--chatsdk-warning);
          color: var(--chatsdk-warning-foreground);
        }
        .chatsdk-badge-destructive {
          background: var(--chatsdk-destructive);
          color: var(--chatsdk-destructive-foreground);
        }
      ` })] }));
};
export default Badge;
