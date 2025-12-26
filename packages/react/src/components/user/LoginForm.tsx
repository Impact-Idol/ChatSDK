import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';

interface LoginFormProps {
  onLogin?: (email: string, password: string) => Promise<void>;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
  onSocialLogin?: (provider: 'google' | 'github' | 'apple') => void;
  loading?: boolean;
  error?: string;
  showSocialLogins?: boolean;
  showRememberMe?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onForgotPassword,
  onSignUp,
  onSocialLogin,
  loading = false,
  error,
  showSocialLogins = true,
  showRememberMe = true,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin?.(email, password);
  };

  return (
    <form className="chatsdk-login-form" onSubmit={handleSubmit}>
      {/* Social Logins */}
      {showSocialLogins && (
        <>
          <div className="chatsdk-social-logins">
            <button
              type="button"
              className="chatsdk-social-btn"
              onClick={() => onSocialLogin?.('google')}
            >
              <svg viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              className="chatsdk-social-btn"
              onClick={() => onSocialLogin?.('github')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>
          </div>

          <div className="chatsdk-divider">
            <span>or continue with email</span>
          </div>
        </>
      )}

      {/* Error Message */}
      {error && (
        <div className="chatsdk-auth-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Email Field */}
      <Input
        type="email"
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        leftIcon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        }
      />

      {/* Password Field */}
      <div className="chatsdk-password-field">
        <Input
          type={showPassword ? 'text' : 'password'}
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          leftIcon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          }
          rightIcon={
            <button
              type="button"
              className="chatsdk-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          }
        />
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="chatsdk-login-options">
        {showRememberMe && (
          <label className="chatsdk-checkbox-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="chatsdk-checkbox"
            />
            <span className="chatsdk-checkbox-custom" />
            Remember me
          </label>
        )}
        <button
          type="button"
          className="chatsdk-forgot-link"
          onClick={onForgotPassword}
        >
          Forgot password?
        </button>
      </div>

      {/* Submit Button */}
      <Button type="submit" loading={loading} className="chatsdk-submit-btn">
        Sign in
      </Button>

      {/* Sign Up Link */}
      <p className="chatsdk-signup-prompt">
        Don't have an account?{' '}
        <button type="button" className="chatsdk-signup-link" onClick={onSignUp}>
          Sign up
        </button>
      </p>

      <style>{`
        .chatsdk-login-form {
          display: flex;
          flex-direction: column;
          gap: var(--chatsdk-space-4);
        }

        .chatsdk-social-logins {
          display: flex;
          flex-direction: column;
          gap: var(--chatsdk-space-3);
        }

        .chatsdk-social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--chatsdk-space-3);
          width: 100%;
          height: 44px;
          padding: 0 var(--chatsdk-space-4);
          background: var(--chatsdk-background);
          border: 1px solid var(--chatsdk-border);
          border-radius: var(--chatsdk-radius-lg);
          font-size: var(--chatsdk-text-sm);
          font-weight: 500;
          color: var(--chatsdk-foreground);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .chatsdk-social-btn:hover {
          background: var(--chatsdk-muted);
          border-color: var(--chatsdk-border-strong);
        }

        .chatsdk-social-btn svg {
          width: 20px;
          height: 20px;
        }

        .chatsdk-divider {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-divider::before,
        .chatsdk-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--chatsdk-border);
        }

        .chatsdk-divider span {
          font-size: var(--chatsdk-text-xs);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .chatsdk-auth-error {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          padding: var(--chatsdk-space-3);
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--chatsdk-radius-lg);
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-destructive);
        }

        .chatsdk-auth-error svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        .chatsdk-password-field {
          position: relative;
        }

        .chatsdk-password-toggle {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          color: var(--chatsdk-muted-foreground);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chatsdk-password-toggle:hover {
          color: var(--chatsdk-foreground);
        }

        .chatsdk-password-toggle svg {
          width: 18px;
          height: 18px;
        }

        .chatsdk-login-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .chatsdk-checkbox-label {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
          cursor: pointer;
        }

        .chatsdk-checkbox {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .chatsdk-checkbox-custom {
          width: 18px;
          height: 18px;
          border: 2px solid var(--chatsdk-border-strong);
          border-radius: var(--chatsdk-radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .chatsdk-checkbox:checked + .chatsdk-checkbox-custom {
          background: var(--chatsdk-primary);
          border-color: var(--chatsdk-primary);
        }

        .chatsdk-checkbox:checked + .chatsdk-checkbox-custom::after {
          content: '';
          width: 10px;
          height: 10px;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E") no-repeat center;
          background-size: contain;
        }

        .chatsdk-forgot-link {
          background: none;
          border: none;
          padding: 0;
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-primary);
          cursor: pointer;
        }

        .chatsdk-forgot-link:hover {
          text-decoration: underline;
        }

        .chatsdk-submit-btn {
          width: 100%;
          height: 44px;
          margin-top: var(--chatsdk-space-2);
        }

        .chatsdk-signup-prompt {
          text-align: center;
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
          margin: 0;
        }

        .chatsdk-signup-link {
          background: none;
          border: none;
          padding: 0;
          color: var(--chatsdk-primary);
          font-weight: 500;
          cursor: pointer;
        }

        .chatsdk-signup-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </form>
  );
};

export default LoginForm;
