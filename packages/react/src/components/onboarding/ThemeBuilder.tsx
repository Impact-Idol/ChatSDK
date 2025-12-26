import React, { useState, useEffect } from 'react';

export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    primaryHover: string;
    secondary: string;
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    surface: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    fontSizeBase: number;
    fontSizeSmall: number;
    fontSizeLarge: number;
    lineHeight: number;
  };
  spacing: {
    unit: number;
    borderRadius: number;
    borderRadiusLarge: number;
  };
  components: {
    messageOwn: {
      backgroundColor: string;
      textColor: string;
    };
    messageOther: {
      backgroundColor: string;
      textColor: string;
    };
    avatar: {
      size: number;
      borderRadius: number;
    };
    input: {
      backgroundColor: string;
      borderColor: string;
      focusBorderColor: string;
    };
  };
}

export interface ThemeBuilderProps {
  initialTheme?: Partial<ThemeConfig>;
  presets?: { name: string; theme: ThemeConfig }[];
  onThemeChange?: (theme: ThemeConfig) => void;
  onExport?: (theme: ThemeConfig, format: 'css' | 'json' | 'js') => void;
  onSave?: (theme: ThemeConfig) => void;
  showPreview?: boolean;
}

const defaultTheme: ThemeConfig = {
  name: 'Custom Theme',
  colors: {
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    secondary: '#8b5cf6',
    background: '#ffffff',
    backgroundSecondary: '#f9fafb',
    backgroundTertiary: '#f3f4f6',
    surface: '#ffffff',
    text: '#111827',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    border: '#e5e7eb',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSizeBase: 14,
    fontSizeSmall: 12,
    fontSizeLarge: 16,
    lineHeight: 1.5,
  },
  spacing: {
    unit: 8,
    borderRadius: 8,
    borderRadiusLarge: 12,
  },
  components: {
    messageOwn: {
      backgroundColor: '#6366f1',
      textColor: '#ffffff',
    },
    messageOther: {
      backgroundColor: '#f3f4f6',
      textColor: '#111827',
    },
    avatar: {
      size: 40,
      borderRadius: 50,
    },
    input: {
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      focusBorderColor: '#6366f1',
    },
  },
};

const presetThemes: { name: string; theme: ThemeConfig }[] = [
  { name: 'Default', theme: defaultTheme },
  {
    name: 'Dark Mode',
    theme: {
      ...defaultTheme,
      name: 'Dark Mode',
      colors: {
        primary: '#818cf8',
        primaryHover: '#6366f1',
        secondary: '#a78bfa',
        background: '#111827',
        backgroundSecondary: '#1f2937',
        backgroundTertiary: '#374151',
        surface: '#1f2937',
        text: '#f9fafb',
        textSecondary: '#d1d5db',
        textTertiary: '#9ca3af',
        border: '#374151',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa',
      },
      components: {
        ...defaultTheme.components,
        messageOwn: {
          backgroundColor: '#6366f1',
          textColor: '#ffffff',
        },
        messageOther: {
          backgroundColor: '#374151',
          textColor: '#f9fafb',
        },
        input: {
          backgroundColor: '#1f2937',
          borderColor: '#374151',
          focusBorderColor: '#818cf8',
        },
      },
    },
  },
  {
    name: 'Ocean Blue',
    theme: {
      ...defaultTheme,
      name: 'Ocean Blue',
      colors: {
        ...defaultTheme.colors,
        primary: '#0ea5e9',
        primaryHover: '#0284c7',
        secondary: '#06b6d4',
      },
      components: {
        ...defaultTheme.components,
        messageOwn: {
          backgroundColor: '#0ea5e9',
          textColor: '#ffffff',
        },
      },
    },
  },
  {
    name: 'Forest Green',
    theme: {
      ...defaultTheme,
      name: 'Forest Green',
      colors: {
        ...defaultTheme.colors,
        primary: '#10b981',
        primaryHover: '#059669',
        secondary: '#14b8a6',
      },
      components: {
        ...defaultTheme.components,
        messageOwn: {
          backgroundColor: '#10b981',
          textColor: '#ffffff',
        },
      },
    },
  },
  {
    name: 'Sunset Orange',
    theme: {
      ...defaultTheme,
      name: 'Sunset Orange',
      colors: {
        ...defaultTheme.colors,
        primary: '#f97316',
        primaryHover: '#ea580c',
        secondary: '#fb923c',
      },
      components: {
        ...defaultTheme.components,
        messageOwn: {
          backgroundColor: '#f97316',
          textColor: '#ffffff',
        },
      },
    },
  },
];

export function ThemeBuilder({
  initialTheme,
  presets = presetThemes,
  onThemeChange,
  onExport,
  onSave,
  showPreview = true,
}: ThemeBuilderProps) {
  const [theme, setTheme] = useState<ThemeConfig>(() => ({
    ...defaultTheme,
    ...initialTheme,
    colors: { ...defaultTheme.colors, ...initialTheme?.colors },
    typography: { ...defaultTheme.typography, ...initialTheme?.typography },
    spacing: { ...defaultTheme.spacing, ...initialTheme?.spacing },
    components: {
      ...defaultTheme.components,
      ...initialTheme?.components,
      messageOwn: { ...defaultTheme.components.messageOwn, ...initialTheme?.components?.messageOwn },
      messageOther: { ...defaultTheme.components.messageOther, ...initialTheme?.components?.messageOther },
      avatar: { ...defaultTheme.components.avatar, ...initialTheme?.components?.avatar },
      input: { ...defaultTheme.components.input, ...initialTheme?.components?.input },
    },
  }));
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'spacing' | 'components'>('colors');
  const [exportFormat, setExportFormat] = useState<'css' | 'json' | 'js'>('css');

  useEffect(() => {
    onThemeChange?.(theme);
  }, [theme, onThemeChange]);

  const updateColor = (key: keyof ThemeConfig['colors'], value: string) => {
    setTheme({ ...theme, colors: { ...theme.colors, [key]: value } });
  };

  const updateTypography = (key: keyof ThemeConfig['typography'], value: string | number) => {
    setTheme({ ...theme, typography: { ...theme.typography, [key]: value } });
  };

  const updateSpacing = (key: keyof ThemeConfig['spacing'], value: number) => {
    setTheme({ ...theme, spacing: { ...theme.spacing, [key]: value } });
  };

  const applyPreset = (preset: ThemeConfig) => {
    setTheme(preset);
  };

  const generateCSS = () => {
    return `:root {
  /* Colors */
  --chatsdk-accent-color: ${theme.colors.primary};
  --chatsdk-accent-hover: ${theme.colors.primaryHover};
  --chatsdk-secondary-color: ${theme.colors.secondary};
  --chatsdk-bg-primary: ${theme.colors.background};
  --chatsdk-bg-secondary: ${theme.colors.backgroundSecondary};
  --chatsdk-bg-tertiary: ${theme.colors.backgroundTertiary};
  --chatsdk-surface: ${theme.colors.surface};
  --chatsdk-text-primary: ${theme.colors.text};
  --chatsdk-text-secondary: ${theme.colors.textSecondary};
  --chatsdk-text-tertiary: ${theme.colors.textTertiary};
  --chatsdk-border-color: ${theme.colors.border};
  --chatsdk-success-color: ${theme.colors.success};
  --chatsdk-warning-color: ${theme.colors.warning};
  --chatsdk-error-color: ${theme.colors.error};
  --chatsdk-info-color: ${theme.colors.info};

  /* Typography */
  --chatsdk-font-family: ${theme.typography.fontFamily};
  --chatsdk-font-size-base: ${theme.typography.fontSizeBase}px;
  --chatsdk-font-size-small: ${theme.typography.fontSizeSmall}px;
  --chatsdk-font-size-large: ${theme.typography.fontSizeLarge}px;
  --chatsdk-line-height: ${theme.typography.lineHeight};

  /* Spacing */
  --chatsdk-spacing-unit: ${theme.spacing.unit}px;
  --chatsdk-border-radius: ${theme.spacing.borderRadius}px;
  --chatsdk-border-radius-large: ${theme.spacing.borderRadiusLarge}px;

  /* Components */
  --chatsdk-message-own-bg: ${theme.components.messageOwn.backgroundColor};
  --chatsdk-message-own-text: ${theme.components.messageOwn.textColor};
  --chatsdk-message-other-bg: ${theme.components.messageOther.backgroundColor};
  --chatsdk-message-other-text: ${theme.components.messageOther.textColor};
  --chatsdk-avatar-size: ${theme.components.avatar.size}px;
  --chatsdk-avatar-radius: ${theme.components.avatar.borderRadius}%;
  --chatsdk-input-bg: ${theme.components.input.backgroundColor};
  --chatsdk-input-border: ${theme.components.input.borderColor};
  --chatsdk-input-focus-border: ${theme.components.input.focusBorderColor};
}`;
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      height: '100%',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
    },
    sidebar: {
      width: '400px',
      borderRight: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    header: {
      padding: '20px 24px',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    headerTitle: {
      fontSize: '18px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      margin: '0 0 4px 0',
    },
    headerDescription: {
      fontSize: '13px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      margin: 0,
    },
    presetsSection: {
      padding: '16px 24px',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    presetsLabel: {
      fontSize: '12px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      marginBottom: '12px',
    },
    presetsGrid: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap' as const,
    },
    presetButton: {
      padding: '8px 14px',
      borderRadius: '6px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      fontSize: '13px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    presetColor: {
      width: '12px',
      height: '12px',
      borderRadius: '3px',
    },
    tabs: {
      display: 'flex',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    tab: {
      flex: 1,
      padding: '12px',
      fontSize: '13px',
      fontWeight: 500,
      textAlign: 'center' as const,
      cursor: 'pointer',
      border: 'none',
      backgroundColor: 'transparent',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      borderBottom: '2px solid transparent',
    },
    tabActive: {
      color: 'var(--chatsdk-accent-color, #6366f1)',
      borderBottomColor: 'var(--chatsdk-accent-color, #6366f1)',
    },
    tabContent: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '20px 24px',
    },
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '8px',
    },
    labelText: {
      fontSize: '13px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
    },
    colorInput: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    colorSwatch: {
      width: '32px',
      height: '32px',
      borderRadius: '6px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      cursor: 'pointer',
    },
    textInput: {
      flex: 1,
      padding: '8px 12px',
      fontSize: '13px',
      borderRadius: '6px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      fontFamily: 'monospace',
    },
    numberInput: {
      width: '80px',
      padding: '8px 12px',
      fontSize: '13px',
      borderRadius: '6px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      textAlign: 'right' as const,
    },
    slider: {
      width: '100%',
      height: '6px',
      borderRadius: '3px',
      appearance: 'none' as const,
      backgroundColor: 'var(--chatsdk-border-color, #e5e7eb)',
      cursor: 'pointer',
    },
    sectionTitle: {
      fontSize: '11px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      marginBottom: '16px',
      marginTop: '24px',
    },
    actions: {
      padding: '16px 24px',
      borderTop: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      display: 'flex',
      gap: '8px',
    },
    exportSelect: {
      padding: '10px 12px',
      fontSize: '13px',
      borderRadius: '6px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
    },
    exportButton: {
      padding: '10px 16px',
      fontSize: '13px',
      fontWeight: 500,
      borderRadius: '6px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      cursor: 'pointer',
    },
    saveButton: {
      flex: 1,
      padding: '10px 16px',
      fontSize: '13px',
      fontWeight: 500,
      borderRadius: '6px',
      border: 'none',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      color: '#ffffff',
      cursor: 'pointer',
    },
    preview: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: '24px',
      overflowY: 'auto' as const,
    },
    previewTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: theme.colors.text,
      marginBottom: '16px',
    },
    previewChat: {
      maxWidth: '480px',
      margin: '0 auto',
      backgroundColor: theme.colors.surface,
      borderRadius: `${theme.spacing.borderRadiusLarge}px`,
      border: `1px solid ${theme.colors.border}`,
      overflow: 'hidden',
    },
    previewHeader: {
      padding: '16px',
      borderBottom: `1px solid ${theme.colors.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    previewAvatar: {
      width: `${theme.components.avatar.size}px`,
      height: `${theme.components.avatar.size}px`,
      borderRadius: `${theme.components.avatar.borderRadius}%`,
      backgroundColor: theme.colors.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: `${theme.typography.fontSizeSmall}px`,
      fontWeight: 600,
    },
    previewName: {
      fontSize: `${theme.typography.fontSizeBase}px`,
      fontWeight: 600,
      color: theme.colors.text,
    },
    previewStatus: {
      fontSize: `${theme.typography.fontSizeSmall}px`,
      color: theme.colors.success,
    },
    previewMessages: {
      padding: '16px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
    },
    previewMessageOther: {
      maxWidth: '75%',
      padding: '12px 16px',
      borderRadius: `${theme.spacing.borderRadius}px`,
      backgroundColor: theme.components.messageOther.backgroundColor,
      color: theme.components.messageOther.textColor,
      fontSize: `${theme.typography.fontSizeBase}px`,
      lineHeight: theme.typography.lineHeight,
      fontFamily: theme.typography.fontFamily,
    },
    previewMessageOwn: {
      maxWidth: '75%',
      padding: '12px 16px',
      borderRadius: `${theme.spacing.borderRadius}px`,
      backgroundColor: theme.components.messageOwn.backgroundColor,
      color: theme.components.messageOwn.textColor,
      fontSize: `${theme.typography.fontSizeBase}px`,
      lineHeight: theme.typography.lineHeight,
      fontFamily: theme.typography.fontFamily,
      alignSelf: 'flex-end' as const,
    },
    previewInput: {
      padding: '12px 16px',
      borderTop: `1px solid ${theme.colors.border}`,
      display: 'flex',
      gap: '12px',
    },
    previewInputField: {
      flex: 1,
      padding: '12px 16px',
      borderRadius: `${theme.spacing.borderRadius}px`,
      border: `1px solid ${theme.components.input.borderColor}`,
      backgroundColor: theme.components.input.backgroundColor,
      fontSize: `${theme.typography.fontSizeBase}px`,
      fontFamily: theme.typography.fontFamily,
      color: theme.colors.text,
    },
    previewSendButton: {
      padding: '12px 20px',
      borderRadius: `${theme.spacing.borderRadius}px`,
      border: 'none',
      backgroundColor: theme.colors.primary,
      color: '#ffffff',
      fontSize: `${theme.typography.fontSizeBase}px`,
      fontWeight: 500,
      cursor: 'pointer',
    },
    colorGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
    },
  };

  const colorGroups = {
    brand: [
      { key: 'primary', label: 'Primary' },
      { key: 'primaryHover', label: 'Primary Hover' },
      { key: 'secondary', label: 'Secondary' },
    ],
    backgrounds: [
      { key: 'background', label: 'Background' },
      { key: 'backgroundSecondary', label: 'Background Secondary' },
      { key: 'backgroundTertiary', label: 'Background Tertiary' },
      { key: 'surface', label: 'Surface' },
    ],
    text: [
      { key: 'text', label: 'Text Primary' },
      { key: 'textSecondary', label: 'Text Secondary' },
      { key: 'textTertiary', label: 'Text Tertiary' },
      { key: 'border', label: 'Border' },
    ],
    status: [
      { key: 'success', label: 'Success' },
      { key: 'warning', label: 'Warning' },
      { key: 'error', label: 'Error' },
      { key: 'info', label: 'Info' },
    ],
  };

  const renderColorInput = (key: keyof ThemeConfig['colors'], label: string) => (
    <div style={styles.formGroup} key={key}>
      <div style={styles.label}>
        <span style={styles.labelText}>{label}</span>
      </div>
      <div style={styles.colorInput}>
        <input
          type="color"
          style={styles.colorSwatch}
          value={theme.colors[key]}
          onChange={(e) => updateColor(key, e.target.value)}
        />
        <input
          type="text"
          style={styles.textInput}
          value={theme.colors[key]}
          onChange={(e) => updateColor(key, e.target.value)}
        />
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'colors':
        return (
          <>
            <div style={styles.sectionTitle}>Brand Colors</div>
            <div style={styles.colorGrid}>
              {colorGroups.brand.map(({ key, label }) =>
                renderColorInput(key as keyof ThemeConfig['colors'], label)
              )}
            </div>

            <div style={styles.sectionTitle}>Backgrounds</div>
            <div style={styles.colorGrid}>
              {colorGroups.backgrounds.map(({ key, label }) =>
                renderColorInput(key as keyof ThemeConfig['colors'], label)
              )}
            </div>

            <div style={styles.sectionTitle}>Text & Borders</div>
            <div style={styles.colorGrid}>
              {colorGroups.text.map(({ key, label }) =>
                renderColorInput(key as keyof ThemeConfig['colors'], label)
              )}
            </div>

            <div style={styles.sectionTitle}>Status Colors</div>
            <div style={styles.colorGrid}>
              {colorGroups.status.map(({ key, label }) =>
                renderColorInput(key as keyof ThemeConfig['colors'], label)
              )}
            </div>
          </>
        );

      case 'typography':
        return (
          <>
            <div style={styles.formGroup}>
              <div style={styles.label}>
                <span style={styles.labelText}>Font Family</span>
              </div>
              <input
                type="text"
                style={{ ...styles.textInput, width: '100%' }}
                value={theme.typography.fontFamily}
                onChange={(e) => updateTypography('fontFamily', e.target.value)}
              />
            </div>

            <div style={styles.formGroup}>
              <div style={styles.label}>
                <span style={styles.labelText}>Base Font Size</span>
                <span style={{ fontSize: '12px', color: theme.colors.textTertiary }}>
                  {theme.typography.fontSizeBase}px
                </span>
              </div>
              <input
                type="range"
                style={styles.slider}
                min={12}
                max={20}
                value={theme.typography.fontSizeBase}
                onChange={(e) => updateTypography('fontSizeBase', parseInt(e.target.value))}
              />
            </div>

            <div style={styles.formGroup}>
              <div style={styles.label}>
                <span style={styles.labelText}>Small Font Size</span>
                <span style={{ fontSize: '12px', color: theme.colors.textTertiary }}>
                  {theme.typography.fontSizeSmall}px
                </span>
              </div>
              <input
                type="range"
                style={styles.slider}
                min={10}
                max={16}
                value={theme.typography.fontSizeSmall}
                onChange={(e) => updateTypography('fontSizeSmall', parseInt(e.target.value))}
              />
            </div>

            <div style={styles.formGroup}>
              <div style={styles.label}>
                <span style={styles.labelText}>Large Font Size</span>
                <span style={{ fontSize: '12px', color: theme.colors.textTertiary }}>
                  {theme.typography.fontSizeLarge}px
                </span>
              </div>
              <input
                type="range"
                style={styles.slider}
                min={14}
                max={24}
                value={theme.typography.fontSizeLarge}
                onChange={(e) => updateTypography('fontSizeLarge', parseInt(e.target.value))}
              />
            </div>

            <div style={styles.formGroup}>
              <div style={styles.label}>
                <span style={styles.labelText}>Line Height</span>
                <span style={{ fontSize: '12px', color: theme.colors.textTertiary }}>
                  {theme.typography.lineHeight}
                </span>
              </div>
              <input
                type="range"
                style={styles.slider}
                min={1}
                max={2}
                step={0.1}
                value={theme.typography.lineHeight}
                onChange={(e) => updateTypography('lineHeight', parseFloat(e.target.value))}
              />
            </div>
          </>
        );

      case 'spacing':
        return (
          <>
            <div style={styles.formGroup}>
              <div style={styles.label}>
                <span style={styles.labelText}>Spacing Unit</span>
                <span style={{ fontSize: '12px', color: theme.colors.textTertiary }}>
                  {theme.spacing.unit}px
                </span>
              </div>
              <input
                type="range"
                style={styles.slider}
                min={4}
                max={16}
                value={theme.spacing.unit}
                onChange={(e) => updateSpacing('unit', parseInt(e.target.value))}
              />
            </div>

            <div style={styles.formGroup}>
              <div style={styles.label}>
                <span style={styles.labelText}>Border Radius</span>
                <span style={{ fontSize: '12px', color: theme.colors.textTertiary }}>
                  {theme.spacing.borderRadius}px
                </span>
              </div>
              <input
                type="range"
                style={styles.slider}
                min={0}
                max={24}
                value={theme.spacing.borderRadius}
                onChange={(e) => updateSpacing('borderRadius', parseInt(e.target.value))}
              />
            </div>

            <div style={styles.formGroup}>
              <div style={styles.label}>
                <span style={styles.labelText}>Large Border Radius</span>
                <span style={{ fontSize: '12px', color: theme.colors.textTertiary }}>
                  {theme.spacing.borderRadiusLarge}px
                </span>
              </div>
              <input
                type="range"
                style={styles.slider}
                min={0}
                max={32}
                value={theme.spacing.borderRadiusLarge}
                onChange={(e) => updateSpacing('borderRadiusLarge', parseInt(e.target.value))}
              />
            </div>
          </>
        );

      case 'components':
        return (
          <>
            <div style={styles.sectionTitle}>Your Messages</div>
            <div style={styles.colorGrid}>
              <div style={styles.formGroup}>
                <div style={styles.label}>
                  <span style={styles.labelText}>Background</span>
                </div>
                <div style={styles.colorInput}>
                  <input
                    type="color"
                    style={styles.colorSwatch}
                    value={theme.components.messageOwn.backgroundColor}
                    onChange={(e) => setTheme({
                      ...theme,
                      components: {
                        ...theme.components,
                        messageOwn: { ...theme.components.messageOwn, backgroundColor: e.target.value },
                      },
                    })}
                  />
                  <input
                    type="text"
                    style={styles.textInput}
                    value={theme.components.messageOwn.backgroundColor}
                    onChange={(e) => setTheme({
                      ...theme,
                      components: {
                        ...theme.components,
                        messageOwn: { ...theme.components.messageOwn, backgroundColor: e.target.value },
                      },
                    })}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <div style={styles.label}>
                  <span style={styles.labelText}>Text Color</span>
                </div>
                <div style={styles.colorInput}>
                  <input
                    type="color"
                    style={styles.colorSwatch}
                    value={theme.components.messageOwn.textColor}
                    onChange={(e) => setTheme({
                      ...theme,
                      components: {
                        ...theme.components,
                        messageOwn: { ...theme.components.messageOwn, textColor: e.target.value },
                      },
                    })}
                  />
                  <input
                    type="text"
                    style={styles.textInput}
                    value={theme.components.messageOwn.textColor}
                    onChange={(e) => setTheme({
                      ...theme,
                      components: {
                        ...theme.components,
                        messageOwn: { ...theme.components.messageOwn, textColor: e.target.value },
                      },
                    })}
                  />
                </div>
              </div>
            </div>

            <div style={styles.sectionTitle}>Others' Messages</div>
            <div style={styles.colorGrid}>
              <div style={styles.formGroup}>
                <div style={styles.label}>
                  <span style={styles.labelText}>Background</span>
                </div>
                <div style={styles.colorInput}>
                  <input
                    type="color"
                    style={styles.colorSwatch}
                    value={theme.components.messageOther.backgroundColor}
                    onChange={(e) => setTheme({
                      ...theme,
                      components: {
                        ...theme.components,
                        messageOther: { ...theme.components.messageOther, backgroundColor: e.target.value },
                      },
                    })}
                  />
                  <input
                    type="text"
                    style={styles.textInput}
                    value={theme.components.messageOther.backgroundColor}
                    onChange={(e) => setTheme({
                      ...theme,
                      components: {
                        ...theme.components,
                        messageOther: { ...theme.components.messageOther, backgroundColor: e.target.value },
                      },
                    })}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <div style={styles.label}>
                  <span style={styles.labelText}>Text Color</span>
                </div>
                <div style={styles.colorInput}>
                  <input
                    type="color"
                    style={styles.colorSwatch}
                    value={theme.components.messageOther.textColor}
                    onChange={(e) => setTheme({
                      ...theme,
                      components: {
                        ...theme.components,
                        messageOther: { ...theme.components.messageOther, textColor: e.target.value },
                      },
                    })}
                  />
                  <input
                    type="text"
                    style={styles.textInput}
                    value={theme.components.messageOther.textColor}
                    onChange={(e) => setTheme({
                      ...theme,
                      components: {
                        ...theme.components,
                        messageOther: { ...theme.components.messageOther, textColor: e.target.value },
                      },
                    })}
                  />
                </div>
              </div>
            </div>

            <div style={styles.sectionTitle}>Avatar</div>
            <div style={styles.formGroup}>
              <div style={styles.label}>
                <span style={styles.labelText}>Size</span>
                <span style={{ fontSize: '12px', color: theme.colors.textTertiary }}>
                  {theme.components.avatar.size}px
                </span>
              </div>
              <input
                type="range"
                style={styles.slider}
                min={24}
                max={64}
                value={theme.components.avatar.size}
                onChange={(e) => setTheme({
                  ...theme,
                  components: {
                    ...theme.components,
                    avatar: { ...theme.components.avatar, size: parseInt(e.target.value) },
                  },
                })}
              />
            </div>
            <div style={styles.formGroup}>
              <div style={styles.label}>
                <span style={styles.labelText}>Border Radius</span>
                <span style={{ fontSize: '12px', color: theme.colors.textTertiary }}>
                  {theme.components.avatar.borderRadius}%
                </span>
              </div>
              <input
                type="range"
                style={styles.slider}
                min={0}
                max={50}
                value={theme.components.avatar.borderRadius}
                onChange={(e) => setTheme({
                  ...theme,
                  components: {
                    ...theme.components,
                    avatar: { ...theme.components.avatar, borderRadius: parseInt(e.target.value) },
                  },
                })}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <h3 style={styles.headerTitle}>Theme Builder</h3>
          <p style={styles.headerDescription}>Customize the look and feel of your chat</p>
        </div>

        <div style={styles.presetsSection}>
          <div style={styles.presetsLabel}>Presets</div>
          <div style={styles.presetsGrid}>
            {presets.map((preset) => (
              <button
                key={preset.name}
                style={styles.presetButton}
                onClick={() => applyPreset(preset.theme)}
              >
                <div
                  style={{
                    ...styles.presetColor,
                    backgroundColor: preset.theme.colors.primary,
                  }}
                />
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.tabs}>
          {(['colors', 'typography', 'spacing', 'components'] as const).map((tab) => (
            <button
              key={tab}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div style={styles.tabContent}>
          {renderTabContent()}
        </div>

        <div style={styles.actions}>
          <select
            style={styles.exportSelect}
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'css' | 'json' | 'js')}
          >
            <option value="css">CSS</option>
            <option value="json">JSON</option>
            <option value="js">JavaScript</option>
          </select>
          <button
            style={styles.exportButton}
            onClick={() => onExport?.(theme, exportFormat)}
          >
            Export
          </button>
          <button
            style={styles.saveButton}
            onClick={() => onSave?.(theme)}
          >
            Save Theme
          </button>
        </div>
      </div>

      {showPreview && (
        <div style={styles.preview}>
          <div style={styles.previewTitle}>Live Preview</div>
          <div style={styles.previewChat}>
            <div style={styles.previewHeader}>
              <div style={styles.previewAvatar}>JD</div>
              <div>
                <div style={styles.previewName}>John Doe</div>
                <div style={styles.previewStatus}>Online</div>
              </div>
            </div>
            <div style={styles.previewMessages}>
              <div style={styles.previewMessageOther}>
                Hey! How are you doing? I just finished reviewing the design specs you sent over.
              </div>
              <div style={styles.previewMessageOwn}>
                That's great! What did you think about the color scheme?
              </div>
              <div style={styles.previewMessageOther}>
                I love it! The new accent colors really pop and the typography is much cleaner.
              </div>
              <div style={styles.previewMessageOwn}>
                Perfect! I'll finalize the changes then.
              </div>
            </div>
            <div style={styles.previewInput}>
              <input
                type="text"
                style={styles.previewInputField}
                placeholder="Type a message..."
                readOnly
              />
              <button style={styles.previewSendButton}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
