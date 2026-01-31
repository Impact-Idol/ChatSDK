import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export function TabPanel({ tabId, activeTab, children }) {
    if (tabId !== activeTab)
        return null;
    return _jsx("div", { role: "tabpanel", children: children });
}
export function Tabs({ tabs, activeTab: controlledActiveTab, onChange, variant = 'default', size = 'md', fullWidth = false, }) {
    const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id);
    const activeTab = controlledActiveTab ?? internalActiveTab;
    const handleTabClick = (tabId) => {
        if (controlledActiveTab === undefined) {
            setInternalActiveTab(tabId);
        }
        onChange?.(tabId);
    };
    const sizeStyles = {
        sm: { padding: '8px 12px', fontSize: '13px', gap: '6px' },
        md: { padding: '10px 16px', fontSize: '14px', gap: '8px' },
        lg: { padding: '12px 20px', fontSize: '15px', gap: '10px' },
    };
    const variantStyles = {
        default: {
            container: {
                backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
                borderRadius: '10px',
                padding: '4px',
            },
            tab: {
                backgroundColor: 'transparent',
                borderRadius: '8px',
                color: 'var(--chatsdk-text-secondary, #6b7280)',
                border: 'none',
            },
            activeTab: {
                backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
                color: 'var(--chatsdk-text-primary, #111827)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            },
        },
        pills: {
            container: {
                gap: '8px',
            },
            tab: {
                backgroundColor: 'transparent',
                borderRadius: '20px',
                color: 'var(--chatsdk-text-secondary, #6b7280)',
                border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            },
            activeTab: {
                backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
                color: '#ffffff',
                borderColor: 'var(--chatsdk-accent-color, #6366f1)',
            },
        },
        underline: {
            container: {
                borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
                gap: '24px',
            },
            tab: {
                backgroundColor: 'transparent',
                borderRadius: '0',
                color: 'var(--chatsdk-text-secondary, #6b7280)',
                border: 'none',
                paddingBottom: '12px',
                marginBottom: '-1px',
                borderBottom: '2px solid transparent',
            },
            activeTab: {
                color: 'var(--chatsdk-accent-color, #6366f1)',
                borderBottom: '2px solid var(--chatsdk-accent-color, #6366f1)',
            },
        },
    };
    const currentVariant = variantStyles[variant];
    const styles = {
        container: {
            display: 'flex',
            alignItems: 'center',
            ...(fullWidth ? { width: '100%' } : {}),
            ...currentVariant.container,
        },
        tab: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.15s ease',
            flexShrink: 0,
            ...sizeStyles[size],
            ...currentVariant.tab,
            ...(fullWidth ? { flex: 1 } : {}),
        },
        activeTab: {
            ...currentVariant.activeTab,
        },
        disabledTab: {
            opacity: 0.5,
            cursor: 'not-allowed',
        },
        icon: {
            display: 'flex',
            alignItems: 'center',
        },
        badge: {
            padding: '2px 6px',
            borderRadius: '10px',
            backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            fontSize: '11px',
            fontWeight: 600,
            marginLeft: '6px',
        },
        activeBadge: {
            backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
            color: 'var(--chatsdk-accent-color, #6366f1)',
        },
        pillActiveBadge: {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
        },
    };
    return (_jsx("div", { style: styles.container, role: "tablist", children: tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const isDisabled = tab.disabled;
            return (_jsxs("button", { role: "tab", "aria-selected": isActive, "aria-disabled": isDisabled, style: {
                    ...styles.tab,
                    ...(isActive ? styles.activeTab : {}),
                    ...(isDisabled ? styles.disabledTab : {}),
                }, onClick: () => !isDisabled && handleTabClick(tab.id), disabled: isDisabled, children: [tab.icon && _jsx("span", { style: styles.icon, children: tab.icon }), tab.label, tab.badge !== undefined && (_jsx("span", { style: {
                            ...styles.badge,
                            ...(isActive ? (variant === 'pills' ? styles.pillActiveBadge : styles.activeBadge) : {}),
                        }, children: tab.badge }))] }, tab.id));
        }) }));
}
