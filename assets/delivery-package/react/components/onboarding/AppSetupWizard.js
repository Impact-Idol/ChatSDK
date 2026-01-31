import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
export function AppSetupWizard({ onComplete, onCancel, initialConfig, loading = false, }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [config, setConfig] = useState({
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
    const [errors, setErrors] = useState({});
    const steps = [
        { id: 'basic', title: 'Basic Info', description: 'App name and environment', completed: !!config.name },
        { id: 'features', title: 'Features', description: 'Enable chat features', completed: true },
        { id: 'security', title: 'Security', description: 'Origins and rate limits', completed: true },
        { id: 'integrations', title: 'Integrations', description: 'Webhooks and push', completed: true },
        { id: 'review', title: 'Review', description: 'Confirm settings', completed: false },
    ];
    const validateStep = (step) => {
        const newErrors = {};
        if (step === 0) {
            if (!config.name.trim()) {
                newErrors.name = 'App name is required';
            }
            else if (config.name.length < 3) {
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
    const isValidUrl = (url) => {
        try {
            new URL(url);
            return true;
        }
        catch {
            return false;
        }
    };
    const handleNext = () => {
        if (validateStep(currentStep)) {
            if (currentStep < steps.length - 1) {
                setCurrentStep(currentStep + 1);
            }
            else {
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
    const removeOrigin = (index) => {
        setConfig({
            ...config,
            allowedOrigins: config.allowedOrigins?.filter((_, i) => i !== index),
        });
    };
    const toggleFeature = (feature) => {
        setConfig({
            ...config,
            features: {
                ...config.features,
                [feature]: !config.features[feature],
            },
        });
    };
    const styles = {
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
            position: 'relative',
        },
        progressLine: {
            position: 'absolute',
            top: '16px',
            left: '32px',
            right: '32px',
            height: '2px',
            backgroundColor: 'var(--chatsdk-border-color, #e5e7eb)',
            zIndex: 0,
        },
        progressLineFilled: {
            position: 'absolute',
            top: '0',
            left: '0',
            height: '100%',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            transition: 'width 0.3s ease',
        },
        step: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
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
            textAlign: 'center',
        },
        stepDescription: {
            fontSize: '11px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            textAlign: 'center',
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
            boxSizing: 'border-box',
        },
        inputError: {
            borderColor: 'var(--chatsdk-error-color, #ef4444)',
        },
        textarea: {
            resize: 'vertical',
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
            flexWrap: 'wrap',
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
            position: 'relative',
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
            position: 'absolute',
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
            flexWrap: 'wrap',
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
    ];
    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (_jsxs(_Fragment, { children: [_jsxs("div", { style: styles.formGroup, children: [_jsxs("label", { style: styles.label, children: ["App Name ", _jsx("span", { style: { color: 'var(--chatsdk-error-color, #ef4444)' }, children: "*" })] }), _jsx("input", { type: "text", style: { ...styles.input, ...(errors.name ? styles.inputError : {}) }, value: config.name, onChange: (e) => setConfig({ ...config, name: e.target.value }), placeholder: "My Chat App" }), errors.name && _jsx("p", { style: styles.errorText, children: errors.name })] }), _jsxs("div", { style: styles.formGroup, children: [_jsxs("label", { style: styles.label, children: ["Description ", _jsx("span", { style: styles.labelHint, children: "(optional)" })] }), _jsx("textarea", { style: { ...styles.input, ...styles.textarea }, value: config.description, onChange: (e) => setConfig({ ...config, description: e.target.value }), placeholder: "A brief description of your app" })] }), _jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Environment" }), _jsx("div", { style: styles.radioGroup, children: ['development', 'staging', 'production'].map((env) => (_jsxs("div", { style: {
                                            ...styles.radioOption,
                                            ...(config.environment === env ? styles.radioOptionSelected : {}),
                                        }, onClick: () => setConfig({ ...config, environment: env }), children: [_jsx("div", { style: styles.radioLabel, children: env.charAt(0).toUpperCase() + env.slice(1) }), _jsxs("div", { style: styles.radioDescription, children: [env === 'development' && 'Local testing and development', env === 'staging' && 'Pre-production testing', env === 'production' && 'Live production environment'] })] }, env))) })] })] }));
            case 1:
                return (_jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Enable Features" }), _jsx("p", { style: { ...styles.labelHint, marginBottom: '16px', marginLeft: 0 }, children: "Select the features you want to enable for your app" }), _jsx("div", { style: styles.featuresGrid, children: features.map((feature) => (_jsxs("div", { style: {
                                    ...styles.featureCard,
                                    ...(config.features[feature.key] ? styles.featureCardEnabled : {}),
                                }, onClick: () => toggleFeature(feature.key), children: [_jsx("div", { style: {
                                            ...styles.featureCheckbox,
                                            ...(config.features[feature.key] ? styles.featureCheckboxChecked : {}),
                                        }, children: config.features[feature.key] && (_jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "#ffffff", strokeWidth: "3", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) })) }), _jsxs("div", { style: styles.featureInfo, children: [_jsx("div", { style: styles.featureName, children: feature.name }), _jsx("div", { style: styles.featureDescription, children: feature.description })] })] }, feature.key))) })] }));
            case 2:
                return (_jsxs(_Fragment, { children: [_jsxs("div", { style: styles.formGroup, children: [_jsxs("label", { style: styles.label, children: ["Allowed Origins", config.environment === 'production' && (_jsx("span", { style: { color: 'var(--chatsdk-error-color, #ef4444)' }, children: " *" }))] }), _jsx("p", { style: { ...styles.labelHint, marginBottom: '12px', marginLeft: 0 }, children: "Add domains that are allowed to use your API" }), _jsxs("div", { style: styles.addOriginRow, children: [_jsx("input", { type: "text", style: { ...styles.input, flex: 1 }, value: originInput, onChange: (e) => setOriginInput(e.target.value), placeholder: "https://example.com", onKeyDown: (e) => e.key === 'Enter' && addOrigin() }), _jsx("button", { style: styles.addButton, onClick: addOrigin, children: "Add" })] }), errors.origins && _jsx("p", { style: styles.errorText, children: errors.origins }), config.allowedOrigins && config.allowedOrigins.length > 0 && (_jsx("div", { style: styles.originsList, children: config.allowedOrigins.map((origin, i) => (_jsxs("div", { style: styles.originTag, children: [_jsx("span", { children: origin }), _jsx("button", { style: styles.originRemove, onClick: () => removeOrigin(i), children: _jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }, i))) }))] }), _jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Rate Limiting" }), _jsxs("div", { style: styles.toggleRow, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: '14px', fontWeight: 500, color: 'var(--chatsdk-text-primary, #111827)' }, children: "Enable Rate Limiting" }), _jsx("div", { style: { fontSize: '12px', color: 'var(--chatsdk-text-secondary, #6b7280)' }, children: "Protect your API from abuse" })] }), _jsx("div", { style: {
                                                ...styles.toggle,
                                                ...(config.rateLimiting?.enabled ? styles.toggleEnabled : {}),
                                            }, onClick: () => setConfig({
                                                ...config,
                                                rateLimiting: {
                                                    ...config.rateLimiting,
                                                    enabled: !config.rateLimiting?.enabled,
                                                },
                                            }), children: _jsx("div", { style: {
                                                    ...styles.toggleKnob,
                                                    ...(config.rateLimiting?.enabled ? styles.toggleKnobEnabled : {}),
                                                } }) })] }), config.rateLimiting?.enabled && (_jsxs("div", { style: { marginTop: '12px' }, children: [_jsx("label", { style: { ...styles.label, fontSize: '13px' }, children: "Requests per minute" }), _jsx("input", { type: "number", style: { ...styles.input, maxWidth: '200px' }, value: config.rateLimiting.requestsPerMinute, onChange: (e) => setConfig({
                                                ...config,
                                                rateLimiting: {
                                                    ...config.rateLimiting,
                                                    requestsPerMinute: parseInt(e.target.value) || 100,
                                                },
                                            }), min: 10, max: 10000 })] }))] })] }));
            case 3:
                return (_jsxs(_Fragment, { children: [_jsxs("div", { style: styles.formGroup, children: [_jsxs("label", { style: styles.label, children: ["Webhook URL ", _jsx("span", { style: styles.labelHint, children: "(optional)" })] }), _jsx("p", { style: { ...styles.labelHint, marginBottom: '12px', marginLeft: 0 }, children: "Receive real-time events via HTTP webhooks" }), _jsx("input", { type: "text", style: { ...styles.input, ...(errors.webhookUrl ? styles.inputError : {}) }, value: config.webhookUrl, onChange: (e) => setConfig({ ...config, webhookUrl: e.target.value }), placeholder: "https://api.example.com/webhooks/chat" }), errors.webhookUrl && _jsx("p", { style: styles.errorText, children: errors.webhookUrl })] }), _jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Push Notifications" }), _jsxs("div", { style: styles.toggleRow, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: '14px', fontWeight: 500, color: 'var(--chatsdk-text-primary, #111827)' }, children: "Enable Push Notifications" }), _jsx("div", { style: { fontSize: '12px', color: 'var(--chatsdk-text-secondary, #6b7280)' }, children: "Send push notifications to mobile devices" })] }), _jsx("div", { style: {
                                                ...styles.toggle,
                                                ...(config.features.push ? styles.toggleEnabled : {}),
                                            }, onClick: () => toggleFeature('push'), children: _jsx("div", { style: {
                                                    ...styles.toggleKnob,
                                                    ...(config.features.push ? styles.toggleKnobEnabled : {}),
                                                } }) })] }), config.features.push && (_jsx("p", { style: { fontSize: '12px', color: 'var(--chatsdk-text-secondary, #6b7280)', marginTop: '8px' }, children: "You'll need to configure push credentials after creating the app." }))] })] }));
            case 4:
                const enabledFeatures = Object.entries(config.features)
                    .filter(([, enabled]) => enabled)
                    .map(([key]) => features.find(f => f.key === key)?.name || key);
                return (_jsxs(_Fragment, { children: [_jsxs("div", { style: styles.reviewSection, children: [_jsx("h4", { style: styles.reviewTitle, children: "Basic Information" }), _jsxs("div", { style: styles.reviewCard, children: [_jsxs("div", { style: styles.reviewRow, children: [_jsx("span", { style: styles.reviewLabel, children: "App Name" }), _jsx("span", { style: styles.reviewValue, children: config.name })] }), _jsxs("div", { style: styles.reviewRow, children: [_jsx("span", { style: styles.reviewLabel, children: "Environment" }), _jsx("span", { style: styles.reviewValue, children: config.environment.charAt(0).toUpperCase() + config.environment.slice(1) })] }), config.description && (_jsxs("div", { style: { ...styles.reviewRow, borderBottom: 'none' }, children: [_jsx("span", { style: styles.reviewLabel, children: "Description" }), _jsx("span", { style: styles.reviewValue, children: config.description })] }))] })] }), _jsxs("div", { style: styles.reviewSection, children: [_jsx("h4", { style: styles.reviewTitle, children: "Enabled Features" }), _jsx("div", { style: styles.reviewCard, children: _jsx("div", { style: styles.featureBadges, children: enabledFeatures.map((name) => (_jsx("span", { style: styles.featureBadge, children: name }, name))) }) })] }), _jsxs("div", { style: styles.reviewSection, children: [_jsx("h4", { style: styles.reviewTitle, children: "Security" }), _jsxs("div", { style: styles.reviewCard, children: [_jsxs("div", { style: styles.reviewRow, children: [_jsx("span", { style: styles.reviewLabel, children: "Allowed Origins" }), _jsxs("span", { style: styles.reviewValue, children: [config.allowedOrigins?.length || 0, " configured"] })] }), _jsxs("div", { style: { ...styles.reviewRow, borderBottom: 'none' }, children: [_jsx("span", { style: styles.reviewLabel, children: "Rate Limiting" }), _jsx("span", { style: styles.reviewValue, children: config.rateLimiting?.enabled
                                                        ? `${config.rateLimiting.requestsPerMinute} req/min`
                                                        : 'Disabled' })] })] })] }), (config.webhookUrl || config.features.push) && (_jsxs("div", { style: styles.reviewSection, children: [_jsx("h4", { style: styles.reviewTitle, children: "Integrations" }), _jsxs("div", { style: styles.reviewCard, children: [config.webhookUrl && (_jsxs("div", { style: styles.reviewRow, children: [_jsx("span", { style: styles.reviewLabel, children: "Webhook URL" }), _jsx("span", { style: styles.reviewValue, children: config.webhookUrl })] })), _jsxs("div", { style: { ...styles.reviewRow, borderBottom: 'none' }, children: [_jsx("span", { style: styles.reviewLabel, children: "Push Notifications" }), _jsx("span", { style: styles.reviewValue, children: config.features.push ? 'Enabled' : 'Disabled' })] })] })] }))] }));
            default:
                return null;
        }
    };
    return (_jsxs("div", { style: styles.container, children: [_jsxs("div", { style: styles.header, children: [_jsx("h2", { style: styles.headerTitle, children: "Create New App" }), _jsx("p", { style: styles.headerDescription, children: "Set up a new chat application in just a few steps" })] }), _jsx("div", { style: styles.progressContainer, children: _jsxs("div", { style: styles.progressSteps, children: [_jsx("div", { style: styles.progressLine, children: _jsx("div", { style: {
                                    ...styles.progressLineFilled,
                                    width: `${(currentStep / (steps.length - 1)) * 100}%`,
                                } }) }), steps.map((step, index) => (_jsxs("div", { style: styles.step, children: [_jsx("div", { style: {
                                        ...styles.stepCircle,
                                        ...(index < currentStep
                                            ? styles.stepCircleCompleted
                                            : index === currentStep
                                                ? styles.stepCircleActive
                                                : styles.stepCircleInactive),
                                    }, children: index < currentStep ? (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) })) : (index + 1) }), _jsx("div", { style: styles.stepTitle, children: step.title }), _jsx("div", { style: styles.stepDescription, children: step.description })] }, step.id)))] }) }), _jsx("div", { style: styles.content, children: renderStepContent() }), _jsxs("div", { style: styles.footer, children: [_jsx("button", { style: styles.cancelButton, onClick: onCancel, children: "Cancel" }), _jsxs("div", { style: styles.navigationButtons, children: [currentStep > 0 && (_jsx("button", { style: styles.backButton, onClick: handleBack, children: "Back" })), _jsx("button", { style: {
                                    ...styles.nextButton,
                                    ...(loading ? styles.nextButtonDisabled : {}),
                                }, onClick: handleNext, disabled: loading, children: loading ? ('Creating...') : currentStep === steps.length - 1 ? (_jsxs(_Fragment, { children: ["Create App", _jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) })] })) : (_jsxs(_Fragment, { children: ["Next", _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "5", y1: "12", x2: "19", y2: "12" }), _jsx("polyline", { points: "12 5 19 12 12 19" })] })] })) })] })] })] }));
}
