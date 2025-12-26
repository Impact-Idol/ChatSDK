import React, { useState } from 'react';

export interface PushProvider {
  id: string;
  name: 'fcm' | 'apns' | 'onesignal' | 'expo';
  enabled: boolean;
  configured: boolean;
  credentials?: Record<string, string>;
  lastTestAt?: string;
  testStatus?: 'success' | 'failed' | 'pending';
}

export interface PushTemplate {
  id: string;
  name: string;
  event: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  enabled: boolean;
}

export interface PushSettingsProps {
  providers: PushProvider[];
  templates: PushTemplate[];
  onProviderToggle?: (providerId: string, enabled: boolean) => void;
  onProviderConfigure?: (providerId: string, credentials: Record<string, string>) => void;
  onProviderTest?: (providerId: string) => void;
  onTemplateUpdate?: (template: PushTemplate) => void;
  onTemplateToggle?: (templateId: string, enabled: boolean) => void;
  loading?: boolean;
}

export function PushSettings({
  providers,
  templates,
  onProviderToggle,
  onProviderConfigure,
  onProviderTest,
  onTemplateUpdate,
  onTemplateToggle,
  loading = false,
}: PushSettingsProps) {
  const [activeTab, setActiveTab] = useState<'providers' | 'templates'>('providers');
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const providerInfo: Record<string, { label: string; icon: React.ReactNode; fields: { key: string; label: string; type: string; placeholder?: string }[] }> = {
    fcm: {
      label: 'Firebase Cloud Messaging',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4.5 2.5L8 12L4.5 21.5L19.5 12L4.5 2.5Z" fill="#FFCA28" />
          <path d="M4.5 2.5L12 8.5L8 12L4.5 2.5Z" fill="#FFA000" />
          <path d="M4.5 21.5L12 15.5L8 12L4.5 21.5Z" fill="#F57C00" />
        </svg>
      ),
      fields: [
        { key: 'project_id', label: 'Project ID', type: 'text', placeholder: 'my-project-123' },
        { key: 'service_account_json', label: 'Service Account JSON', type: 'textarea', placeholder: '{ "type": "service_account", ... }' },
      ],
    },
    apns: {
      label: 'Apple Push Notification Service',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" fill="#000000" />
        </svg>
      ),
      fields: [
        { key: 'bundle_id', label: 'Bundle ID', type: 'text', placeholder: 'com.example.app' },
        { key: 'key_id', label: 'Key ID', type: 'text', placeholder: 'ABC123DEFG' },
        { key: 'team_id', label: 'Team ID', type: 'text', placeholder: 'TEAM123456' },
        { key: 'auth_key', label: 'Auth Key (.p8)', type: 'textarea', placeholder: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----' },
      ],
    },
    onesignal: {
      label: 'OneSignal',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#E54B4D" />
          <path d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16Z" fill="#FFFFFF" />
          <circle cx="12" cy="12" r="2" fill="#FFFFFF" />
        </svg>
      ),
      fields: [
        { key: 'app_id', label: 'App ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
        { key: 'api_key', label: 'REST API Key', type: 'password', placeholder: 'Your REST API Key' },
      ],
    },
    expo: {
      label: 'Expo Push Notifications',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#000020" />
          <path d="M2 17L12 22L22 17" stroke="#000020" strokeWidth="2" />
          <path d="M2 12L12 17L22 12" stroke="#000020" strokeWidth="2" />
        </svg>
      ),
      fields: [
        { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'ExponentPushToken[...]' },
      ],
    },
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      padding: '24px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      minHeight: '100vh',
    },
    header: {
      marginBottom: '24px',
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
    tabs: {
      display: 'flex',
      gap: '4px',
      padding: '4px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderRadius: '10px',
      marginBottom: '24px',
      width: 'fit-content',
    },
    tab: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'transparent',
      fontSize: '14px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    tabActive: {
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      color: 'var(--chatsdk-text-primary, #111827)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
      gap: '16px',
    },
    card: {
      padding: '20px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '12px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px',
    },
    providerIcon: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    providerInfo: {
      flex: 1,
    },
    providerName: {
      fontSize: '16px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '2px',
    },
    providerStatus: {
      fontSize: '13px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    toggle: {
      position: 'relative' as const,
      width: '44px',
      height: '24px',
      borderRadius: '12px',
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    },
    toggleActive: {
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
    },
    toggleKnob: {
      position: 'absolute' as const,
      top: '2px',
      left: '2px',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
      transition: 'transform 0.2s ease',
    },
    toggleKnobActive: {
      transform: 'translateX(20px)',
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 500,
    },
    configured: {
      backgroundColor: 'var(--chatsdk-success-light, #d1fae5)',
      color: 'var(--chatsdk-success-color, #10b981)',
    },
    notConfigured: {
      backgroundColor: 'var(--chatsdk-warning-light, #fef3c7)',
      color: 'var(--chatsdk-warning-color, #f59e0b)',
    },
    actions: {
      display: 'flex',
      gap: '8px',
      marginTop: '16px',
    },
    button: {
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    buttonPrimary: {
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      color: '#ffffff',
    },
    buttonSecondary: {
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    form: {
      marginTop: '16px',
      padding: '16px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderRadius: '8px',
    },
    formGroup: {
      marginBottom: '12px',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '6px',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      fontSize: '14px',
      color: 'var(--chatsdk-text-primary, #111827)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      fontSize: '14px',
      fontFamily: 'monospace',
      color: 'var(--chatsdk-text-primary, #111827)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      outline: 'none',
      minHeight: '100px',
      resize: 'vertical' as const,
      boxSizing: 'border-box' as const,
    },
    templateCard: {
      padding: '16px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '12px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      marginBottom: '12px',
    },
    templateHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px',
    },
    templateName: {
      fontSize: '15px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
    },
    templateEvent: {
      fontSize: '12px',
      fontWeight: 500,
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
    },
    templatePreview: {
      padding: '12px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderRadius: '8px',
    },
    previewTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '4px',
    },
    previewBody: {
      fontSize: '13px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
    },
    testResult: {
      marginTop: '12px',
      padding: '12px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    testSuccess: {
      backgroundColor: 'var(--chatsdk-success-light, #d1fae5)',
      color: 'var(--chatsdk-success-color, #10b981)',
    },
    testFailed: {
      backgroundColor: 'var(--chatsdk-error-light, #fee2e2)',
      color: 'var(--chatsdk-error-color, #ef4444)',
    },
  };

  const handleSaveCredentials = (providerId: string) => {
    onProviderConfigure?.(providerId, credentials);
    setEditingProvider(null);
    setCredentials({});
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Push Notifications</h1>
        <p style={styles.subtitle}>Configure push notification providers and message templates</p>
      </div>

      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'providers' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('providers')}
        >
          Providers
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'templates' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('templates')}
        >
          Templates
        </button>
      </div>

      {activeTab === 'providers' && (
        <div style={styles.grid}>
          {providers.map((provider) => {
            const info = providerInfo[provider.name];
            return (
              <div key={provider.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.providerIcon}>{info?.icon}</div>
                  <div style={styles.providerInfo}>
                    <div style={styles.providerName}>{info?.label || provider.name}</div>
                    <div style={styles.providerStatus}>
                      {provider.configured ? 'Configured' : 'Not configured'}
                    </div>
                  </div>
                  <div
                    style={{ ...styles.toggle, ...(provider.enabled ? styles.toggleActive : {}) }}
                    onClick={() => onProviderToggle?.(provider.id, !provider.enabled)}
                  >
                    <div
                      style={{
                        ...styles.toggleKnob,
                        ...(provider.enabled ? styles.toggleKnobActive : {}),
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    ...styles.statusBadge,
                    ...(provider.configured ? styles.configured : styles.notConfigured),
                  }}
                >
                  {provider.configured ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Configured
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      Setup Required
                    </>
                  )}
                </div>

                {editingProvider === provider.id && info && (
                  <div style={styles.form}>
                    {info.fields.map((field) => (
                      <div key={field.key} style={styles.formGroup}>
                        <label style={styles.label}>{field.label}</label>
                        {field.type === 'textarea' ? (
                          <textarea
                            style={styles.textarea}
                            placeholder={field.placeholder}
                            value={credentials[field.key] || ''}
                            onChange={(e) =>
                              setCredentials({ ...credentials, [field.key]: e.target.value })
                            }
                          />
                        ) : (
                          <input
                            type={field.type}
                            style={styles.input}
                            placeholder={field.placeholder}
                            value={credentials[field.key] || ''}
                            onChange={(e) =>
                              setCredentials({ ...credentials, [field.key]: e.target.value })
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {provider.testStatus && (
                  <div
                    style={{
                      ...styles.testResult,
                      ...(provider.testStatus === 'success' ? styles.testSuccess : styles.testFailed),
                    }}
                  >
                    {provider.testStatus === 'success' ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Test notification sent successfully
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        Test failed - check credentials
                      </>
                    )}
                  </div>
                )}

                <div style={styles.actions}>
                  {editingProvider === provider.id ? (
                    <>
                      <button
                        style={{ ...styles.button, ...styles.buttonPrimary }}
                        onClick={() => handleSaveCredentials(provider.id)}
                      >
                        Save
                      </button>
                      <button
                        style={{ ...styles.button, ...styles.buttonSecondary }}
                        onClick={() => {
                          setEditingProvider(null);
                          setCredentials({});
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        style={{ ...styles.button, ...styles.buttonSecondary }}
                        onClick={() => setEditingProvider(provider.id)}
                      >
                        Configure
                      </button>
                      {provider.configured && (
                        <button
                          style={{ ...styles.button, ...styles.buttonSecondary }}
                          onClick={() => onProviderTest?.(provider.id)}
                        >
                          Send Test
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'templates' && (
        <div>
          {templates.map((template) => (
            <div key={template.id} style={styles.templateCard}>
              <div style={styles.templateHeader}>
                <div>
                  <div style={styles.templateName}>{template.name}</div>
                  <span style={styles.templateEvent}>{template.event}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{ ...styles.toggle, ...(template.enabled ? styles.toggleActive : {}) }}
                    onClick={() => onTemplateToggle?.(template.id, !template.enabled)}
                  >
                    <div
                      style={{
                        ...styles.toggleKnob,
                        ...(template.enabled ? styles.toggleKnobActive : {}),
                      }}
                    />
                  </div>
                </div>
              </div>

              {editingTemplate === template.id ? (
                <div style={styles.form}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Title</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={template.title}
                      onChange={(e) =>
                        onTemplateUpdate?.({ ...template, title: e.target.value })
                      }
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Body</label>
                    <textarea
                      style={styles.textarea}
                      value={template.body}
                      onChange={(e) =>
                        onTemplateUpdate?.({ ...template, body: e.target.value })
                      }
                    />
                  </div>
                  <div style={styles.actions}>
                    <button
                      style={{ ...styles.button, ...styles.buttonPrimary }}
                      onClick={() => setEditingTemplate(null)}
                    >
                      Save
                    </button>
                    <button
                      style={{ ...styles.button, ...styles.buttonSecondary }}
                      onClick={() => setEditingTemplate(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={styles.templatePreview}>
                    <div style={styles.previewTitle}>{template.title}</div>
                    <div style={styles.previewBody}>{template.body}</div>
                  </div>
                  <div style={styles.actions}>
                    <button
                      style={{ ...styles.button, ...styles.buttonSecondary }}
                      onClick={() => setEditingTemplate(template.id)}
                    >
                      Edit Template
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
