import React, { useState } from 'react';

export interface SignupFormProps {
  onSubmit?: (data: {
    name: string;
    email: string;
    password: string;
  }) => void;
  onLogin?: () => void;
  onSocialLogin?: (provider: 'google' | 'github' | 'apple') => void;
  loading?: boolean;
  error?: string;
  showSocialLogin?: boolean;
  termsUrl?: string;
  privacyUrl?: string;
}

export function SignupForm({
  onSubmit,
  onLogin,
  onSocialLogin,
  loading = false,
  error,
  showSocialLogin = true,
  termsUrl = '#',
  privacyUrl = '#',
}: SignupFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pass)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(pass)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(pass)) return 'Password must contain a number';
    return null;
  };

  const getPasswordStrength = (pass: string): { level: number; label: string; color: string } => {
    if (pass.length === 0) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { level: 1, label: 'Weak', color: 'var(--chatsdk-error-color, #ef4444)' };
    if (score <= 4) return { level: 2, label: 'Medium', color: 'var(--chatsdk-warning-color, #f59e0b)' };
    return { level: 3, label: 'Strong', color: 'var(--chatsdk-success-color, #10b981)' };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!name.trim()) {
      setValidationError('Name is required');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setValidationError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      setValidationError('You must agree to the terms and conditions');
      return;
    }

    onSubmit?.({ name, email, password });
  };

  const passwordStrength = getPasswordStrength(password);

  const styles: Record<string, React.CSSProperties> = {
    container: {
      maxWidth: '400px',
      margin: '0 auto',
      padding: '40px',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '32px',
    },
    logo: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
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
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
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
    inputWrapper: {
      position: 'relative' as const,
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
      boxSizing: 'border-box' as const,
    },
    inputFocused: {
      borderColor: 'var(--chatsdk-accent-color, #6366f1)',
    },
    passwordToggle: {
      position: 'absolute' as const,
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      cursor: 'pointer',
      padding: '4px',
    },
    strengthBar: {
      display: 'flex',
      gap: '4px',
      marginTop: '8px',
    },
    strengthSegment: {
      flex: 1,
      height: '4px',
      borderRadius: '2px',
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
      transition: 'background-color 0.15s ease',
    },
    strengthLabel: {
      fontSize: '12px',
      marginTop: '6px',
      display: 'flex',
      justifyContent: 'flex-end',
    },
    checkboxWrapper: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
    },
    checkbox: {
      width: '18px',
      height: '18px',
      borderRadius: '4px',
      border: '2px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: '2px',
      transition: 'all 0.15s ease',
    },
    checkboxChecked: {
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      borderColor: 'var(--chatsdk-accent-color, #6366f1)',
    },
    checkboxLabel: {
      fontSize: '13px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      lineHeight: 1.5,
    },
    link: {
      color: 'var(--chatsdk-accent-color, #6366f1)',
      textDecoration: 'none',
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
    divider: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      margin: '8px 0',
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      backgroundColor: 'var(--chatsdk-border-color, #e5e7eb)',
    },
    dividerText: {
      fontSize: '12px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    socialButtons: {
      display: 'flex',
      gap: '12px',
    },
    socialButton: {
      flex: 1,
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 0.15s ease',
    },
    footer: {
      textAlign: 'center' as const,
      marginTop: '24px',
      fontSize: '14px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
    },
    spinner: {
      width: '18px',
      height: '18px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderTopColor: '#ffffff',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h1 style={styles.title}>Create your account</h1>
        <p style={styles.subtitle}>Start chatting in minutes</p>
      </div>

      <form style={styles.form} onSubmit={handleSubmit}>
        {(error || validationError) && (
          <div style={styles.error}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error || validationError}
          </div>
        )}

        <div style={styles.formGroup}>
          <label style={styles.label}>Full Name</label>
          <input
            type="text"
            style={styles.input}
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            style={styles.input}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Password</label>
          <div style={styles.inputWrapper}>
            <input
              type={showPassword ? 'text' : 'password'}
              style={{ ...styles.input, paddingRight: '44px' }}
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              style={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {password && (
            <>
              <div style={styles.strengthBar}>
                {[1, 2, 3].map((level) => (
                  <div
                    key={level}
                    style={{
                      ...styles.strengthSegment,
                      backgroundColor:
                        passwordStrength.level >= level
                          ? passwordStrength.color
                          : 'var(--chatsdk-bg-tertiary, #e5e7eb)',
                    }}
                  />
                ))}
              </div>
              <div style={{ ...styles.strengthLabel, color: passwordStrength.color }}>
                {passwordStrength.label}
              </div>
            </>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Confirm Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            style={styles.input}
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <div style={styles.checkboxWrapper}>
          <div
            style={{
              ...styles.checkbox,
              ...(agreedToTerms ? styles.checkboxChecked : {}),
            }}
            onClick={() => setAgreedToTerms(!agreedToTerms)}
          >
            {agreedToTerms && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <span style={styles.checkboxLabel}>
            I agree to the{' '}
            <a href={termsUrl} style={styles.link}>
              Terms of Service
            </a>{' '}
            and{' '}
            <a href={privacyUrl} style={styles.link}>
              Privacy Policy
            </a>
          </span>
        </div>

        <button
          type="submit"
          style={{
            ...styles.submitButton,
            ...(loading ? styles.submitButtonDisabled : {}),
          }}
          disabled={loading}
        >
          {loading ? (
            <>
              <div style={styles.spinner} />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </button>

        {showSocialLogin && (
          <>
            <div style={styles.divider}>
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>or</span>
              <div style={styles.dividerLine} />
            </div>

            <div style={styles.socialButtons}>
              <button
                type="button"
                style={styles.socialButton}
                onClick={() => onSocialLogin?.('google')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              </button>
              <button
                type="button"
                style={styles.socialButton}
                onClick={() => onSocialLogin?.('github')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#24292e">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </button>
              <button
                type="button"
                style={styles.socialButton}
                onClick={() => onSocialLogin?.('apple')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
              </button>
            </div>
          </>
        )}
      </form>

      <div style={styles.footer}>
        Already have an account?{' '}
        <a href="#" style={styles.link} onClick={(e) => { e.preventDefault(); onLogin?.(); }}>
          Sign in
        </a>
      </div>
    </div>
  );
}
