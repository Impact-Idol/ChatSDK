import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { clsx } from 'clsx';
export const Input = forwardRef(({ label, error, helperText, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2)}`;
    return (_jsxs("div", { className: clsx('chatsdk-input-wrapper', className), children: [label && (_jsx("label", { htmlFor: inputId, className: "chatsdk-input-label", children: label })), _jsxs("div", { className: clsx('chatsdk-input-container', error && 'chatsdk-input-error'), children: [leftIcon && _jsx("span", { className: "chatsdk-input-icon-left", children: leftIcon }), _jsx("input", { ref: ref, id: inputId, className: "chatsdk-input", ...props }), rightIcon && _jsx("span", { className: "chatsdk-input-icon-right", children: rightIcon })] }), (error || helperText) && (_jsx("p", { className: clsx('chatsdk-input-helper', error && 'chatsdk-input-helper-error'), children: error || helperText })), _jsx("style", { children: `
        .chatsdk-input-wrapper {
          display: flex;
          flex-direction: column;
          gap: var(--chatsdk-space-1);
          width: 100%;
        }
        .chatsdk-input-label {
          font-size: var(--chatsdk-text-sm);
          font-weight: 500;
          color: var(--chatsdk-foreground);
        }
        .chatsdk-input-container {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          background: var(--chatsdk-input-bg);
          border: 1px solid var(--chatsdk-input-border);
          border-radius: var(--chatsdk-radius-md);
          padding: 0 var(--chatsdk-space-3);
          transition: all var(--chatsdk-transition-fast);
        }
        .chatsdk-input-container:focus-within {
          border-color: var(--chatsdk-input-focus);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .chatsdk-input-container.chatsdk-input-error {
          border-color: var(--chatsdk-destructive);
        }
        .chatsdk-input-container.chatsdk-input-error:focus-within {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }
        .chatsdk-input {
          flex: 1;
          height: 40px;
          border: none;
          background: transparent;
          font-family: var(--chatsdk-font-sans);
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-foreground);
          outline: none;
        }
        .chatsdk-input::placeholder {
          color: var(--chatsdk-input-placeholder);
        }
        .chatsdk-input-icon-left,
        .chatsdk-input-icon-right {
          display: flex;
          align-items: center;
          color: var(--chatsdk-muted-foreground);
        }
        .chatsdk-input-helper {
          font-size: var(--chatsdk-text-xs);
          color: var(--chatsdk-muted-foreground);
          margin-top: var(--chatsdk-space-1);
        }
        .chatsdk-input-helper-error {
          color: var(--chatsdk-destructive);
        }
      ` })] }));
});
Input.displayName = 'Input';
export default Input;
