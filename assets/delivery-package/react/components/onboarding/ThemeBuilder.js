import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
const defaultTheme = {
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
const presetThemes = [
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
export function ThemeBuilder({ initialTheme, presets = presetThemes, onThemeChange, onExport, onSave, showPreview = true, }) {
    const [theme, setTheme] = useState(() => ({
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
    const [activeTab, setActiveTab] = useState('colors');
    const [exportFormat, setExportFormat] = useState('css');
    useEffect(() => {
        onThemeChange?.(theme);
    }, [theme, onThemeChange]);
    const updateColor = (key, value) => {
        setTheme({ ...theme, colors: { ...theme.colors, [key]: value } });
    };
    const updateTypography = (key, value) => {
        setTheme({ ...theme, typography: { ...theme.typography, [key]: value } });
    };
    const updateSpacing = (key, value) => {
        setTheme({ ...theme, spacing: { ...theme.spacing, [key]: value } });
    };
    const applyPreset = (preset) => {
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
    const styles = {
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
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '12px',
        },
        presetsGrid: {
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
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
            textAlign: 'center',
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
            overflowY: 'auto',
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
            textAlign: 'right',
        },
        slider: {
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            appearance: 'none',
            backgroundColor: 'var(--chatsdk-border-color, #e5e7eb)',
            cursor: 'pointer',
        },
        sectionTitle: {
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            textTransform: 'uppercase',
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
            overflowY: 'auto',
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
            flexDirection: 'column',
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
            alignSelf: 'flex-end',
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
    const renderColorInput = (key, label) => (_jsxs("div", { style: styles.formGroup, children: [_jsx("div", { style: styles.label, children: _jsx("span", { style: styles.labelText, children: label }) }), _jsxs("div", { style: styles.colorInput, children: [_jsx("input", { type: "color", style: styles.colorSwatch, value: theme.colors[key], onChange: (e) => updateColor(key, e.target.value) }), _jsx("input", { type: "text", style: styles.textInput, value: theme.colors[key], onChange: (e) => updateColor(key, e.target.value) })] })] }, key));
    const renderTabContent = () => {
        switch (activeTab) {
            case 'colors':
                return (_jsxs(_Fragment, { children: [_jsx("div", { style: styles.sectionTitle, children: "Brand Colors" }), _jsx("div", { style: styles.colorGrid, children: colorGroups.brand.map(({ key, label }) => renderColorInput(key, label)) }), _jsx("div", { style: styles.sectionTitle, children: "Backgrounds" }), _jsx("div", { style: styles.colorGrid, children: colorGroups.backgrounds.map(({ key, label }) => renderColorInput(key, label)) }), _jsx("div", { style: styles.sectionTitle, children: "Text & Borders" }), _jsx("div", { style: styles.colorGrid, children: colorGroups.text.map(({ key, label }) => renderColorInput(key, label)) }), _jsx("div", { style: styles.sectionTitle, children: "Status Colors" }), _jsx("div", { style: styles.colorGrid, children: colorGroups.status.map(({ key, label }) => renderColorInput(key, label)) })] }));
            case 'typography':
                return (_jsxs(_Fragment, { children: [_jsxs("div", { style: styles.formGroup, children: [_jsx("div", { style: styles.label, children: _jsx("span", { style: styles.labelText, children: "Font Family" }) }), _jsx("input", { type: "text", style: { ...styles.textInput, width: '100%' }, value: theme.typography.fontFamily, onChange: (e) => updateTypography('fontFamily', e.target.value) })] }), _jsxs("div", { style: styles.formGroup, children: [_jsxs("div", { style: styles.label, children: [_jsx("span", { style: styles.labelText, children: "Base Font Size" }), _jsxs("span", { style: { fontSize: '12px', color: theme.colors.textTertiary }, children: [theme.typography.fontSizeBase, "px"] })] }), _jsx("input", { type: "range", style: styles.slider, min: 12, max: 20, value: theme.typography.fontSizeBase, onChange: (e) => updateTypography('fontSizeBase', parseInt(e.target.value)) })] }), _jsxs("div", { style: styles.formGroup, children: [_jsxs("div", { style: styles.label, children: [_jsx("span", { style: styles.labelText, children: "Small Font Size" }), _jsxs("span", { style: { fontSize: '12px', color: theme.colors.textTertiary }, children: [theme.typography.fontSizeSmall, "px"] })] }), _jsx("input", { type: "range", style: styles.slider, min: 10, max: 16, value: theme.typography.fontSizeSmall, onChange: (e) => updateTypography('fontSizeSmall', parseInt(e.target.value)) })] }), _jsxs("div", { style: styles.formGroup, children: [_jsxs("div", { style: styles.label, children: [_jsx("span", { style: styles.labelText, children: "Large Font Size" }), _jsxs("span", { style: { fontSize: '12px', color: theme.colors.textTertiary }, children: [theme.typography.fontSizeLarge, "px"] })] }), _jsx("input", { type: "range", style: styles.slider, min: 14, max: 24, value: theme.typography.fontSizeLarge, onChange: (e) => updateTypography('fontSizeLarge', parseInt(e.target.value)) })] }), _jsxs("div", { style: styles.formGroup, children: [_jsxs("div", { style: styles.label, children: [_jsx("span", { style: styles.labelText, children: "Line Height" }), _jsx("span", { style: { fontSize: '12px', color: theme.colors.textTertiary }, children: theme.typography.lineHeight })] }), _jsx("input", { type: "range", style: styles.slider, min: 1, max: 2, step: 0.1, value: theme.typography.lineHeight, onChange: (e) => updateTypography('lineHeight', parseFloat(e.target.value)) })] })] }));
            case 'spacing':
                return (_jsxs(_Fragment, { children: [_jsxs("div", { style: styles.formGroup, children: [_jsxs("div", { style: styles.label, children: [_jsx("span", { style: styles.labelText, children: "Spacing Unit" }), _jsxs("span", { style: { fontSize: '12px', color: theme.colors.textTertiary }, children: [theme.spacing.unit, "px"] })] }), _jsx("input", { type: "range", style: styles.slider, min: 4, max: 16, value: theme.spacing.unit, onChange: (e) => updateSpacing('unit', parseInt(e.target.value)) })] }), _jsxs("div", { style: styles.formGroup, children: [_jsxs("div", { style: styles.label, children: [_jsx("span", { style: styles.labelText, children: "Border Radius" }), _jsxs("span", { style: { fontSize: '12px', color: theme.colors.textTertiary }, children: [theme.spacing.borderRadius, "px"] })] }), _jsx("input", { type: "range", style: styles.slider, min: 0, max: 24, value: theme.spacing.borderRadius, onChange: (e) => updateSpacing('borderRadius', parseInt(e.target.value)) })] }), _jsxs("div", { style: styles.formGroup, children: [_jsxs("div", { style: styles.label, children: [_jsx("span", { style: styles.labelText, children: "Large Border Radius" }), _jsxs("span", { style: { fontSize: '12px', color: theme.colors.textTertiary }, children: [theme.spacing.borderRadiusLarge, "px"] })] }), _jsx("input", { type: "range", style: styles.slider, min: 0, max: 32, value: theme.spacing.borderRadiusLarge, onChange: (e) => updateSpacing('borderRadiusLarge', parseInt(e.target.value)) })] })] }));
            case 'components':
                return (_jsxs(_Fragment, { children: [_jsx("div", { style: styles.sectionTitle, children: "Your Messages" }), _jsxs("div", { style: styles.colorGrid, children: [_jsxs("div", { style: styles.formGroup, children: [_jsx("div", { style: styles.label, children: _jsx("span", { style: styles.labelText, children: "Background" }) }), _jsxs("div", { style: styles.colorInput, children: [_jsx("input", { type: "color", style: styles.colorSwatch, value: theme.components.messageOwn.backgroundColor, onChange: (e) => setTheme({
                                                        ...theme,
                                                        components: {
                                                            ...theme.components,
                                                            messageOwn: { ...theme.components.messageOwn, backgroundColor: e.target.value },
                                                        },
                                                    }) }), _jsx("input", { type: "text", style: styles.textInput, value: theme.components.messageOwn.backgroundColor, onChange: (e) => setTheme({
                                                        ...theme,
                                                        components: {
                                                            ...theme.components,
                                                            messageOwn: { ...theme.components.messageOwn, backgroundColor: e.target.value },
                                                        },
                                                    }) })] })] }), _jsxs("div", { style: styles.formGroup, children: [_jsx("div", { style: styles.label, children: _jsx("span", { style: styles.labelText, children: "Text Color" }) }), _jsxs("div", { style: styles.colorInput, children: [_jsx("input", { type: "color", style: styles.colorSwatch, value: theme.components.messageOwn.textColor, onChange: (e) => setTheme({
                                                        ...theme,
                                                        components: {
                                                            ...theme.components,
                                                            messageOwn: { ...theme.components.messageOwn, textColor: e.target.value },
                                                        },
                                                    }) }), _jsx("input", { type: "text", style: styles.textInput, value: theme.components.messageOwn.textColor, onChange: (e) => setTheme({
                                                        ...theme,
                                                        components: {
                                                            ...theme.components,
                                                            messageOwn: { ...theme.components.messageOwn, textColor: e.target.value },
                                                        },
                                                    }) })] })] })] }), _jsx("div", { style: styles.sectionTitle, children: "Others' Messages" }), _jsxs("div", { style: styles.colorGrid, children: [_jsxs("div", { style: styles.formGroup, children: [_jsx("div", { style: styles.label, children: _jsx("span", { style: styles.labelText, children: "Background" }) }), _jsxs("div", { style: styles.colorInput, children: [_jsx("input", { type: "color", style: styles.colorSwatch, value: theme.components.messageOther.backgroundColor, onChange: (e) => setTheme({
                                                        ...theme,
                                                        components: {
                                                            ...theme.components,
                                                            messageOther: { ...theme.components.messageOther, backgroundColor: e.target.value },
                                                        },
                                                    }) }), _jsx("input", { type: "text", style: styles.textInput, value: theme.components.messageOther.backgroundColor, onChange: (e) => setTheme({
                                                        ...theme,
                                                        components: {
                                                            ...theme.components,
                                                            messageOther: { ...theme.components.messageOther, backgroundColor: e.target.value },
                                                        },
                                                    }) })] })] }), _jsxs("div", { style: styles.formGroup, children: [_jsx("div", { style: styles.label, children: _jsx("span", { style: styles.labelText, children: "Text Color" }) }), _jsxs("div", { style: styles.colorInput, children: [_jsx("input", { type: "color", style: styles.colorSwatch, value: theme.components.messageOther.textColor, onChange: (e) => setTheme({
                                                        ...theme,
                                                        components: {
                                                            ...theme.components,
                                                            messageOther: { ...theme.components.messageOther, textColor: e.target.value },
                                                        },
                                                    }) }), _jsx("input", { type: "text", style: styles.textInput, value: theme.components.messageOther.textColor, onChange: (e) => setTheme({
                                                        ...theme,
                                                        components: {
                                                            ...theme.components,
                                                            messageOther: { ...theme.components.messageOther, textColor: e.target.value },
                                                        },
                                                    }) })] })] })] }), _jsx("div", { style: styles.sectionTitle, children: "Avatar" }), _jsxs("div", { style: styles.formGroup, children: [_jsxs("div", { style: styles.label, children: [_jsx("span", { style: styles.labelText, children: "Size" }), _jsxs("span", { style: { fontSize: '12px', color: theme.colors.textTertiary }, children: [theme.components.avatar.size, "px"] })] }), _jsx("input", { type: "range", style: styles.slider, min: 24, max: 64, value: theme.components.avatar.size, onChange: (e) => setTheme({
                                        ...theme,
                                        components: {
                                            ...theme.components,
                                            avatar: { ...theme.components.avatar, size: parseInt(e.target.value) },
                                        },
                                    }) })] }), _jsxs("div", { style: styles.formGroup, children: [_jsxs("div", { style: styles.label, children: [_jsx("span", { style: styles.labelText, children: "Border Radius" }), _jsxs("span", { style: { fontSize: '12px', color: theme.colors.textTertiary }, children: [theme.components.avatar.borderRadius, "%"] })] }), _jsx("input", { type: "range", style: styles.slider, min: 0, max: 50, value: theme.components.avatar.borderRadius, onChange: (e) => setTheme({
                                        ...theme,
                                        components: {
                                            ...theme.components,
                                            avatar: { ...theme.components.avatar, borderRadius: parseInt(e.target.value) },
                                        },
                                    }) })] })] }));
            default:
                return null;
        }
    };
    return (_jsxs("div", { style: styles.container, children: [_jsxs("div", { style: styles.sidebar, children: [_jsxs("div", { style: styles.header, children: [_jsx("h3", { style: styles.headerTitle, children: "Theme Builder" }), _jsx("p", { style: styles.headerDescription, children: "Customize the look and feel of your chat" })] }), _jsxs("div", { style: styles.presetsSection, children: [_jsx("div", { style: styles.presetsLabel, children: "Presets" }), _jsx("div", { style: styles.presetsGrid, children: presets.map((preset) => (_jsxs("button", { style: styles.presetButton, onClick: () => applyPreset(preset.theme), children: [_jsx("div", { style: {
                                                ...styles.presetColor,
                                                backgroundColor: preset.theme.colors.primary,
                                            } }), preset.name] }, preset.name))) })] }), _jsx("div", { style: styles.tabs, children: ['colors', 'typography', 'spacing', 'components'].map((tab) => (_jsx("button", { style: {
                                ...styles.tab,
                                ...(activeTab === tab ? styles.tabActive : {}),
                            }, onClick: () => setActiveTab(tab), children: tab.charAt(0).toUpperCase() + tab.slice(1) }, tab))) }), _jsx("div", { style: styles.tabContent, children: renderTabContent() }), _jsxs("div", { style: styles.actions, children: [_jsxs("select", { style: styles.exportSelect, value: exportFormat, onChange: (e) => setExportFormat(e.target.value), children: [_jsx("option", { value: "css", children: "CSS" }), _jsx("option", { value: "json", children: "JSON" }), _jsx("option", { value: "js", children: "JavaScript" })] }), _jsx("button", { style: styles.exportButton, onClick: () => onExport?.(theme, exportFormat), children: "Export" }), _jsx("button", { style: styles.saveButton, onClick: () => onSave?.(theme), children: "Save Theme" })] })] }), showPreview && (_jsxs("div", { style: styles.preview, children: [_jsx("div", { style: styles.previewTitle, children: "Live Preview" }), _jsxs("div", { style: styles.previewChat, children: [_jsxs("div", { style: styles.previewHeader, children: [_jsx("div", { style: styles.previewAvatar, children: "JD" }), _jsxs("div", { children: [_jsx("div", { style: styles.previewName, children: "John Doe" }), _jsx("div", { style: styles.previewStatus, children: "Online" })] })] }), _jsxs("div", { style: styles.previewMessages, children: [_jsx("div", { style: styles.previewMessageOther, children: "Hey! How are you doing? I just finished reviewing the design specs you sent over." }), _jsx("div", { style: styles.previewMessageOwn, children: "That's great! What did you think about the color scheme?" }), _jsx("div", { style: styles.previewMessageOther, children: "I love it! The new accent colors really pop and the typography is much cleaner." }), _jsx("div", { style: styles.previewMessageOwn, children: "Perfect! I'll finalize the changes then." })] }), _jsxs("div", { style: styles.previewInput, children: [_jsx("input", { type: "text", style: styles.previewInputField, placeholder: "Type a message...", readOnly: true }), _jsx("button", { style: styles.previewSendButton, children: "Send" })] })] })] }))] }));
}
