import React, { useState } from 'react';

export interface AppConfig {
  name: string;
  description?: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    messaging: boolean;
    threads: boolean;
    reactions: boolean;
    attachments: boolean;
    typing: boolean;
    readReceipts: boolean;
    presence: boolean;
    search: boolean;
    moderation: boolean;
    push: boolean;
  };
  webhookUrl?: string;
  allowedOrigins?: string[];
  rateLimiting?: {
    enabled: boolean;
    requestsPerMinute: number;
  };
}

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface AppSetupWizardProps {
  onComplete?: (config: AppConfig) => void;
  onCancel?: () => void;
  initialConfig?: Partial<AppConfig>;
  loading?: boolean;
}

export function AppSetupWizard({
  onComplete,
  onCancel,
  initialConfig,
  loading = false,
}: AppSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<AppConfig>({
    name: initialConfig?.name || '',
    description: initialConfig?.description || '',
    environment: initialConfig?.environment || 'development',
    features: initialConfig?.features || {
      messaging: true,
      threads: true,
      reactions: true,
      attachments: true,
      typing: true,
      readReceipts: true,
      presence: true,
      search: true,
      moderation: true,
      push: false,
    },
    webhookUrl: initialConfig?.webhookUrl || '',
    allowedOrigins: initialConfig?.allowedOrigins || [],
    rateLimiting: initialConfig?.rateLimiting || {
      enabled: true,
      requestsPerMinute: 100,
    },
  });
  const [originInput, setOriginInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps: WizardStep[] = [
    { id: 'basic', title: 'Basic Info', description: 'App name and environment', completed: !!config.name },
    { id: 'features', title: 'Features', description: 'Enable chat features', completed: true },
    { id: 'security', title: 'Security', description: 'Origins and rate limits', completed: true },
    { id: 'integrations', title: 'Integrations', description: 'Webhooks and push', completed: true },
    { id: 'review', title: 'Review', description: 'Confirm settings', completed: false },
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!config.name.trim()) {
        newErrors.name = 'App name is required';
      } else if (config.name.length < 3) {
        newErrors.name = 'App name must be at least 3 characters';
      }
    }

    if (step === 2) {
      if (config.allowedOrigins?.length === 0 && config.environment === 'production') {
        newErrors.origins = 'At least one allowed origin is required for production';
      }
    }

    if (step === 3) {
      if (config.webhookUrl && !isValidUrl(config.webhookUrl)) {
        newErrors.webhookUrl = 'Please enter a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        onComplete?.(config);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addOrigin = () => {
    if (originInput.trim() && isValidUrl(originInput.trim())) {
      setConfig({
        ...config,
        allowedOrigins: [...(config.allowedOrigins || []), originInput.trim()],
      });
      setOriginInput('');
      setErrors({ ...errors, origins: '' });
    }
  };

  const removeOrigin = (index: number) => {
    setConfig({
      ...config,
      allowedOrigins: config.allowedOrigins?.filter((_, i) => i !== index),
    });
  };

  const toggleFeature = (feature: keyof AppConfig['features']) => {
    setConfig({
      ...config,
      features: {
        ...config.features,
        [feature]: !config.features[feature],
      },
    });
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '12px',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
    },
    header: {
      padding: '24px 32px',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
    },
    headerTitle: {
      fontSize: '24px',
      fontWeight: 700,
      color: 'var(--chatsdk-text-primary, #111827)',
      margin: '0 0 8px 0',
    },
    headerDescription: {
      fontSize: '14px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      margin: 0,
    },
    progressContainer: {
      padding: '24px 32px',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    progressSteps: {
      display: 'flex',
      justifyContent: 'space-between',
      position: 'relative' as const,
    },
    progressLine: {
      position: 'absolute' as const,
      top: '16px',
      left: '32px',
      right: '32px',
      height: '2px',
      backgroundColor: 'var(--chatsdk-border-color, #e5e7eb)',
      zIndex: 0,
    },
    progressLineFilled: {
      position: 'absolute' as const,
      top: '0',
      left: '0',
      height: '100%',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      transition: 'width 0.3s ease',
    },
    step: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      position: 'relative' as const,
      zIndex: 1,
    },
    stepCircle: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: 600,
      marginBottom: '8px',
      transition: 'all 0.2s ease',
    },
    stepCircleActive: {
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      color: '#ffffff',
    },
    stepCircleCompleted: {
      backgroundColor: 'var(--chatsdk-success-color, #10b981)',
      color: '#ffffff',
    },
    stepCircleInactive: {
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      border: '2px solid var(--chatsdk-border-color, #e5e7eb)',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    stepTitle: {
      fontSize: '12px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
      textAlign: 'center' as const,
    },
    stepDescription: {
      fontSize: '11px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      textAlign: 'center' as const,
    },
    content: {
      padding: '32px',
      minHeight: '400px',
    },
    formGroup: {
      marginBottom: '24px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '8px',
    },
    labelHint: {
      fontSize: '12px',
      fontWeight: 400,
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      marginLeft: '4px',
    },
    input: {
      width: '100%',
      padding: '12px 14px',
      fontSize: '14px',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      outline: 'none',
      transition: 'border-color 0.2s ease',
      boxSizing: 'border-box' as const,
    },
    inputError: {
      borderColor: 'var(--chatsdk-error-color, #ef4444)',
    },
    textarea: {
      resize: 'vertical' as const,
      minHeight: '80px',
      fontFamily: 'inherit',
    },
    errorText: {
      fontSize: '12px',
      color: 'var(--chatsdk-error-color, #ef4444)',
      marginTop: '4px',
    },
    radioGroup: {
      display: 'flex',
      gap: '12px',
    },
    radioOption: {
      flex: 1,
      padding: '16px',
      borderRadius: '8px',
      border: '2px solid var(--chatsdk-border-color, #e5e7eb)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    radioOptionSelected: {
      borderColor: 'var(--chatsdk-accent-color, #6366f1)',
      backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
    },
    radioLabel: {
      fontSize: '14px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '4px',
    },
    radioDescription: {
      fontSize: '12px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
    },
    featuresGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px',
    },
    featureCard: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    featureCardEnabled: {
      borderColor: 'var(--chatsdk-accent-color, #6366f1)',
      backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
    },
    featureCheckbox: {
      width: '20px',
      height: '20px',
      borderRadius: '4px',
      border: '2px solid var(--chatsdk-border-color, #e5e7eb)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    featureCheckboxChecked: {
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      borderColor: 'var(--chatsdk-accent-color, #6366f1)',
    },
    featureInfo: {
      flex: 1,
    },
    featureName: {
      fontSize: '14px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '2px',
    },
    featureDescription: {
      fontSize: '12px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
    },
    originsList: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '8px',
      marginTop: '12px',
    },
    originTag: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderRadius: '6px',
      fontSize: '13px',
    },
    originRemove: {
      padding: '2px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      display: 'flex',
    },
    addOriginRow: {
      display: 'flex',
      gap: '8px',
    },
    addButton: {
      padding: '12px 16px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
    },
    toggle: {
      position: 'relative' as const,
      width: '44px',
      height: '24px',
      backgroundColor: 'var(--chatsdk-border-color, #e5e7eb)',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    },
    toggleEnabled: {
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
    },
    toggleKnob: {
      position: 'absolute' as const,
      top: '2px',
      left: '2px',
      width: '20px',
      height: '20px',
      backgroundColor: '#ffffff',
      borderRadius: '50%',
      transition: 'transform 0.2s ease',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    },
    toggleKnobEnabled: {
      transform: 'translateX(20px)',
    },
    toggleRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderRadius: '8px',
      marginBottom: '12px',
    },
    reviewSection: {
      marginBottom: '24px',
    },
    reviewTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '12px',
    },
    reviewCard: {
      padding: '16px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderRadius: '8px',
    },
    reviewRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    reviewLabel: {
      fontSize: '13px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
    },
    reviewValue: {
      fontSize: '13px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
    },
    featureBadges: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '6px',
    },
    featureBadge: {
      padding: '4px 8px',
      backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
      color: 'var(--chatsdk-accent-color, #6366f1)',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 500,
    },
    footer: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '20px 32px',
      borderTop: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
    },
    cancelButton: {
      padding: '12px 24px',
      backgroundColor: 'transparent',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      color: 'var(--chatsdk-text-primary, #111827)',
    },
    navigationButtons: {
      display: 'flex',
      gap: '12px',
    },
    backButton: {
      padding: '12px 24px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      color: 'var(--chatsdk-text-primary, #111827)',
    },
    nextButton: {
      padding: '12px 24px',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    nextButtonDisabled: {
      backgroundColor: 'var(--chatsdk-border-color, #e5e7eb)',
      cursor: 'not-allowed',
    },
  };

  const features = [
    { key: 'messaging', name: 'Messaging', description: 'Send and receive messages' },
    { key: 'threads', name: 'Threads', description: 'Reply to messages in threads' },
    { key: 'reactions', name: 'Reactions', description: 'React to messages with emoji' },
    { key: 'attachments', name: 'Attachments', description: 'Share files and images' },
    { key: 'typing', name: 'Typing Indicators', description: 'Show when users are typing' },
    { key: 'readReceipts', name: 'Read Receipts', description: 'Show message read status' },
    { key: 'presence', name: 'Presence', description: 'Show online/offline status' },
    { key: 'search', name: 'Search', description: 'Full-text message search' },
    { key: 'moderation', name: 'Moderation', description: 'Content moderation tools' },
    { key: 'push', name: 'Push Notifications', description: 'Mobile push notifications' },
  ] as const;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                App Name <span style={{ color: 'var(--chatsdk-error-color, #ef4444)' }}>*</span>
              </label>
              <input
                type="text"
                style={{ ...styles.input, ...(errors.name ? styles.inputError : {}) }}
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="My Chat App"
              />
              {errors.name && <p style={styles.errorText}>{errors.name}</p>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Description <span style={styles.labelHint}>(optional)</span>
              </label>
              <textarea
                style={{ ...styles.input, ...styles.textarea }}
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="A brief description of your app"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Environment</label>
              <div style={styles.radioGroup}>
                {(['development', 'staging', 'production'] as const).map((env) => (
                  <div
                    key={env}
                    style={{
                      ...styles.radioOption,
                      ...(config.environment === env ? styles.radioOptionSelected : {}),
                    }}
                    onClick={() => setConfig({ ...config, environment: env })}
                  >
                    <div style={styles.radioLabel}>
                      {env.charAt(0).toUpperCase() + env.slice(1)}
                    </div>
                    <div style={styles.radioDescription}>
                      {env === 'development' && 'Local testing and development'}
                      {env === 'staging' && 'Pre-production testing'}
                      {env === 'production' && 'Live production environment'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        );

      case 1:
        return (
          <div style={styles.formGroup}>
            <label style={styles.label}>Enable Features</label>
            <p style={{ ...styles.labelHint, marginBottom: '16px', marginLeft: 0 }}>
              Select the features you want to enable for your app
            </p>
            <div style={styles.featuresGrid}>
              {features.map((feature) => (
                <div
                  key={feature.key}
                  style={{
                    ...styles.featureCard,
                    ...(config.features[feature.key] ? styles.featureCardEnabled : {}),
                  }}
                  onClick={() => toggleFeature(feature.key)}
                >
                  <div
                    style={{
                      ...styles.featureCheckbox,
                      ...(config.features[feature.key] ? styles.featureCheckboxChecked : {}),
                    }}
                  >
                    {config.features[feature.key] && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div style={styles.featureInfo}>
                    <div style={styles.featureName}>{feature.name}</div>
                    <div style={styles.featureDescription}>{feature.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Allowed Origins
                {config.environment === 'production' && (
                  <span style={{ color: 'var(--chatsdk-error-color, #ef4444)' }}> *</span>
                )}
              </label>
              <p style={{ ...styles.labelHint, marginBottom: '12px', marginLeft: 0 }}>
                Add domains that are allowed to use your API
              </p>
              <div style={styles.addOriginRow}>
                <input
                  type="text"
                  style={{ ...styles.input, flex: 1 }}
                  value={originInput}
                  onChange={(e) => setOriginInput(e.target.value)}
                  placeholder="https://example.com"
                  onKeyDown={(e) => e.key === 'Enter' && addOrigin()}
                />
                <button style={styles.addButton} onClick={addOrigin}>
                  Add
                </button>
              </div>
              {errors.origins && <p style={styles.errorText}>{errors.origins}</p>}
              {config.allowedOrigins && config.allowedOrigins.length > 0 && (
                <div style={styles.originsList}>
                  {config.allowedOrigins.map((origin, i) => (
                    <div key={i} style={styles.originTag}>
                      <span>{origin}</span>
                      <button style={styles.originRemove} onClick={() => removeOrigin(i)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Rate Limiting</label>
              <div style={styles.toggleRow}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--chatsdk-text-primary, #111827)' }}>
                    Enable Rate Limiting
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--chatsdk-text-secondary, #6b7280)' }}>
                    Protect your API from abuse
                  </div>
                </div>
                <div
                  style={{
                    ...styles.toggle,
                    ...(config.rateLimiting?.enabled ? styles.toggleEnabled : {}),
                  }}
                  onClick={() => setConfig({
                    ...config,
                    rateLimiting: {
                      ...config.rateLimiting!,
                      enabled: !config.rateLimiting?.enabled,
                    },
                  })}
                >
                  <div
                    style={{
                      ...styles.toggleKnob,
                      ...(config.rateLimiting?.enabled ? styles.toggleKnobEnabled : {}),
                    }}
                  />
                </div>
              </div>

              {config.rateLimiting?.enabled && (
                <div style={{ marginTop: '12px' }}>
                  <label style={{ ...styles.label, fontSize: '13px' }}>
                    Requests per minute
                  </label>
                  <input
                    type="number"
                    style={{ ...styles.input, maxWidth: '200px' }}
                    value={config.rateLimiting.requestsPerMinute}
                    onChange={(e) => setConfig({
                      ...config,
                      rateLimiting: {
                        ...config.rateLimiting!,
                        requestsPerMinute: parseInt(e.target.value) || 100,
                      },
                    })}
                    min={10}
                    max={10000}
                  />
                </div>
              )}
            </div>
          </>
        );

      case 3:
        return (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Webhook URL <span style={styles.labelHint}>(optional)</span>
              </label>
              <p style={{ ...styles.labelHint, marginBottom: '12px', marginLeft: 0 }}>
                Receive real-time events via HTTP webhooks
              </p>
              <input
                type="text"
                style={{ ...styles.input, ...(errors.webhookUrl ? styles.inputError : {}) }}
                value={config.webhookUrl}
                onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                placeholder="https://api.example.com/webhooks/chat"
              />
              {errors.webhookUrl && <p style={styles.errorText}>{errors.webhookUrl}</p>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Push Notifications</label>
              <div style={styles.toggleRow}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--chatsdk-text-primary, #111827)' }}>
                    Enable Push Notifications
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--chatsdk-text-secondary, #6b7280)' }}>
                    Send push notifications to mobile devices
                  </div>
                </div>
                <div
                  style={{
                    ...styles.toggle,
                    ...(config.features.push ? styles.toggleEnabled : {}),
                  }}
                  onClick={() => toggleFeature('push')}
                >
                  <div
                    style={{
                      ...styles.toggleKnob,
                      ...(config.features.push ? styles.toggleKnobEnabled : {}),
                    }}
                  />
                </div>
              </div>
              {config.features.push && (
                <p style={{ fontSize: '12px', color: 'var(--chatsdk-text-secondary, #6b7280)', marginTop: '8px' }}>
                  You'll need to configure push credentials after creating the app.
                </p>
              )}
            </div>
          </>
        );

      case 4:
        const enabledFeatures = Object.entries(config.features)
          .filter(([, enabled]) => enabled)
          .map(([key]) => features.find(f => f.key === key)?.name || key);

        return (
          <>
            <div style={styles.reviewSection}>
              <h4 style={styles.reviewTitle}>Basic Information</h4>
              <div style={styles.reviewCard}>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>App Name</span>
                  <span style={styles.reviewValue}>{config.name}</span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Environment</span>
                  <span style={styles.reviewValue}>
                    {config.environment.charAt(0).toUpperCase() + config.environment.slice(1)}
                  </span>
                </div>
                {config.description && (
                  <div style={{ ...styles.reviewRow, borderBottom: 'none' }}>
                    <span style={styles.reviewLabel}>Description</span>
                    <span style={styles.reviewValue}>{config.description}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.reviewSection}>
              <h4 style={styles.reviewTitle}>Enabled Features</h4>
              <div style={styles.reviewCard}>
                <div style={styles.featureBadges}>
                  {enabledFeatures.map((name) => (
                    <span key={name} style={styles.featureBadge}>{name}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.reviewSection}>
              <h4 style={styles.reviewTitle}>Security</h4>
              <div style={styles.reviewCard}>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Allowed Origins</span>
                  <span style={styles.reviewValue}>
                    {config.allowedOrigins?.length || 0} configured
                  </span>
                </div>
                <div style={{ ...styles.reviewRow, borderBottom: 'none' }}>
                  <span style={styles.reviewLabel}>Rate Limiting</span>
                  <span style={styles.reviewValue}>
                    {config.rateLimiting?.enabled
                      ? `${config.rateLimiting.requestsPerMinute} req/min`
                      : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {(config.webhookUrl || config.features.push) && (
              <div style={styles.reviewSection}>
                <h4 style={styles.reviewTitle}>Integrations</h4>
                <div style={styles.reviewCard}>
                  {config.webhookUrl && (
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Webhook URL</span>
                      <span style={styles.reviewValue}>{config.webhookUrl}</span>
                    </div>
                  )}
                  <div style={{ ...styles.reviewRow, borderBottom: 'none' }}>
                    <span style={styles.reviewLabel}>Push Notifications</span>
                    <span style={styles.reviewValue}>
                      {config.features.push ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>Create New App</h2>
        <p style={styles.headerDescription}>
          Set up a new chat application in just a few steps
        </p>
      </div>

      <div style={styles.progressContainer}>
        <div style={styles.progressSteps}>
          <div style={styles.progressLine}>
            <div
              style={{
                ...styles.progressLineFilled,
                width: `${(currentStep / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>
          {steps.map((step, index) => (
            <div key={step.id} style={styles.step}>
              <div
                style={{
                  ...styles.stepCircle,
                  ...(index < currentStep
                    ? styles.stepCircleCompleted
                    : index === currentStep
                      ? styles.stepCircleActive
                      : styles.stepCircleInactive),
                }}
              >
                {index < currentStep ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <div style={styles.stepTitle}>{step.title}</div>
              <div style={styles.stepDescription}>{step.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.content}>
        {renderStepContent()}
      </div>

      <div style={styles.footer}>
        <button style={styles.cancelButton} onClick={onCancel}>
          Cancel
        </button>
        <div style={styles.navigationButtons}>
          {currentStep > 0 && (
            <button style={styles.backButton} onClick={handleBack}>
              Back
            </button>
          )}
          <button
            style={{
              ...styles.nextButton,
              ...(loading ? styles.nextButtonDisabled : {}),
            }}
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? (
              'Creating...'
            ) : currentStep === steps.length - 1 ? (
              <>
                Create App
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </>
            ) : (
              <>
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
