import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import clsx from 'clsx';
// =============================================================================
// ICONS
// =============================================================================
const KeyIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "7.5", cy: "15.5", r: "5.5" }), _jsx("path", { d: "m21 2-9.6 9.6" }), _jsx("path", { d: "m15.5 7.5 3 3L22 7l-3-3" })] }));
const PlusIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "12", x2: "12", y1: "5", y2: "19" }), _jsx("line", { x1: "5", x2: "19", y1: "12", y2: "12" })] }));
const CopyIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }), _jsx("path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" })] }));
const RefreshCwIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }), _jsx("path", { d: "M21 3v5h-5" }), _jsx("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }), _jsx("path", { d: "M8 16H3v5" })] }));
const TrashIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M3 6h18" }), _jsx("path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }), _jsx("path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" })] }));
const EditIcon = () => (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" }) }));
const MoreVerticalIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "1" }), _jsx("circle", { cx: "12", cy: "5", r: "1" }), _jsx("circle", { cx: "12", cy: "19", r: "1" })] }));
const EyeIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }));
const BarChartIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "12", x2: "12", y1: "20", y2: "10" }), _jsx("line", { x1: "18", x2: "18", y1: "20", y2: "4" }), _jsx("line", { x1: "6", x2: "6", y1: "20", y2: "14" })] }));
const AlertTriangleIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }), _jsx("path", { d: "M12 9v4" }), _jsx("path", { d: "M12 17h.01" })] }));
const ClockIcon = () => (_jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("polyline", { points: "12 6 12 12 16 14" })] }));
const ShieldIcon = () => (_jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" }) }));
const ServerIcon = () => (_jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { width: "20", height: "8", x: "2", y: "2", rx: "2", ry: "2" }), _jsx("rect", { width: "20", height: "8", x: "2", y: "14", rx: "2", ry: "2" }), _jsx("line", { x1: "6", x2: "6.01", y1: "6", y2: "6" }), _jsx("line", { x1: "6", x2: "6.01", y1: "18", y2: "18" })] }));
const FilterIcon = () => (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" }) }));
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};
const formatRelativeTime = (dateString) => {
    if (!dateString)
        return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)
        return 'Just now';
    if (diffMins < 60)
        return `${diffMins}m ago`;
    if (diffHours < 24)
        return `${diffHours}h ago`;
    if (diffDays < 7)
        return `${diffDays}d ago`;
    if (diffDays < 30)
        return `${Math.floor(diffDays / 7)}w ago`;
    return formatDate(dateString);
};
const formatNumber = (num) => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
};
const getScopeLabel = (scope) => {
    const labels = {
        read: 'Read',
        write: 'Write',
        admin: 'Admin',
        full: 'Full Access',
    };
    return labels[scope];
};
const getScopeColor = (scope) => {
    switch (scope) {
        case 'read': return 'var(--chatsdk-success)';
        case 'write': return 'var(--chatsdk-warning)';
        case 'admin': return 'var(--chatsdk-error)';
        case 'full': return 'var(--chatsdk-primary)';
        default: return 'var(--chatsdk-text-tertiary)';
    }
};
const getStatusColor = (status) => {
    switch (status) {
        case 'active': return 'var(--chatsdk-success)';
        case 'expired': return 'var(--chatsdk-warning)';
        case 'revoked': return 'var(--chatsdk-error)';
        default: return 'var(--chatsdk-text-tertiary)';
    }
};
const getEnvironmentColor = (env) => {
    switch (env) {
        case 'production': return 'var(--chatsdk-error)';
        case 'staging': return 'var(--chatsdk-warning)';
        case 'development': return 'var(--chatsdk-success)';
        default: return 'var(--chatsdk-text-tertiary)';
    }
};
// =============================================================================
// STYLES
// =============================================================================
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--chatsdk-bg-primary)',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
        gap: '16px',
        flexWrap: 'wrap',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    headerIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        backgroundColor: 'var(--chatsdk-primary)',
        borderRadius: '10px',
        color: 'white',
    },
    headerInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    title: {
        fontSize: '18px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
        margin: 0,
    },
    subtitle: {
        fontSize: '13px',
        color: 'var(--chatsdk-text-tertiary)',
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    filterButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        border: '1px solid var(--chatsdk-border-light)',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    primaryButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: 'var(--chatsdk-primary)',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        color: 'white',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    warning: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 24px',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderBottom: '1px solid var(--chatsdk-border-light)',
    },
    warningIcon: {
        color: 'var(--chatsdk-warning)',
    },
    warningText: {
        fontSize: '13px',
        color: 'var(--chatsdk-warning)',
    },
    keysList: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    keyCard: {
        backgroundColor: 'var(--chatsdk-bg-primary)',
        borderRadius: '12px',
        border: '1px solid var(--chatsdk-border-light)',
        overflow: 'hidden',
        transition: 'box-shadow 0.15s ease',
    },
    keyCardHover: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    },
    keyHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '16px 20px',
        gap: '12px',
    },
    keyInfo: {
        flex: 1,
        minWidth: 0,
    },
    keyNameRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4px',
    },
    keyName: {
        fontSize: '15px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
    },
    envBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 500,
        textTransform: 'uppercase',
    },
    keyValue: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '8px',
    },
    keyDisplay: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding: '6px 10px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        borderRadius: '6px',
        fontFamily: 'var(--chatsdk-font-mono)',
        fontSize: '13px',
        color: 'var(--chatsdk-text-secondary)',
        letterSpacing: '0.02em',
    },
    keyHidden: {
        color: 'var(--chatsdk-text-tertiary)',
        letterSpacing: '0.1em',
    },
    copyButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        border: 'none',
        borderRadius: '6px',
        color: 'var(--chatsdk-text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    keyMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginTop: '12px',
        flexWrap: 'wrap',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: 'var(--chatsdk-text-tertiary)',
    },
    keyActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    actionButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '6px',
        color: 'var(--chatsdk-text-tertiary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    dropdown: {
        position: 'absolute',
        right: 0,
        top: '100%',
        marginTop: '4px',
        backgroundColor: 'var(--chatsdk-bg-primary)',
        borderRadius: '8px',
        border: '1px solid var(--chatsdk-border-light)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        minWidth: '180px',
        zIndex: 100,
        overflow: 'hidden',
    },
    dropdownItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '10px 14px',
        backgroundColor: 'transparent',
        border: 'none',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-primary)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 0.15s ease',
    },
    dropdownItemDanger: {
        color: 'var(--chatsdk-error)',
    },
    dropdownDivider: {
        height: '1px',
        backgroundColor: 'var(--chatsdk-border-light)',
        margin: '4px 0',
    },
    scopesList: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 20px',
        borderTop: '1px solid var(--chatsdk-border-light)',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
    },
    scopesLabel: {
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-tertiary)',
    },
    scopes: {
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
    },
    scopeBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 500,
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
    },
    emptyIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '64px',
        height: '64px',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        borderRadius: '50%',
        marginBottom: '16px',
        color: 'var(--chatsdk-text-tertiary)',
    },
    emptyTitle: {
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
        marginBottom: '8px',
    },
    emptyDescription: {
        fontSize: '14px',
        color: 'var(--chatsdk-text-tertiary)',
        maxWidth: '300px',
        marginBottom: '20px',
    },
    skeleton: {
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        borderRadius: '4px',
        animation: 'pulse 1.5s ease-in-out infinite',
    },
};
// =============================================================================
// COMPONENT
// =============================================================================
export const APIKeysManager = ({ apiKeys, loading = false, onCreateKey, onEditKey, onRevokeKey, onRegenerateKey, onCopyKey, onViewUsage, className, }) => {
    const [hoveredKey, setHoveredKey] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [showKeyId, setShowKeyId] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [activeEnvFilter, setActiveEnvFilter] = useState('all');
    const filteredKeys = useMemo(() => {
        return apiKeys.filter(key => {
            const matchesStatus = activeFilter === 'all' || key.status === activeFilter;
            const matchesEnv = activeEnvFilter === 'all' || key.environment === activeEnvFilter;
            return matchesStatus && matchesEnv;
        });
    }, [apiKeys, activeFilter, activeEnvFilter]);
    const stats = useMemo(() => ({
        active: apiKeys.filter(k => k.status === 'active').length,
        production: apiKeys.filter(k => k.environment === 'production').length,
    }), [apiKeys]);
    const renderKeyCard = (apiKey) => (_jsxs("div", { style: {
            ...styles.keyCard,
            ...(hoveredKey === apiKey.id ? styles.keyCardHover : {}),
        }, onMouseEnter: () => setHoveredKey(apiKey.id), onMouseLeave: () => setHoveredKey(null), children: [_jsxs("div", { style: styles.keyHeader, children: [_jsxs("div", { style: styles.keyInfo, children: [_jsxs("div", { style: styles.keyNameRow, children: [_jsx("span", { style: styles.keyName, children: apiKey.name }), _jsx("span", { style: {
                                            ...styles.statusBadge,
                                            backgroundColor: `${getStatusColor(apiKey.status)}15`,
                                            color: getStatusColor(apiKey.status),
                                        }, children: apiKey.status }), _jsxs("span", { style: {
                                            ...styles.envBadge,
                                            backgroundColor: `${getEnvironmentColor(apiKey.environment)}15`,
                                            color: getEnvironmentColor(apiKey.environment),
                                        }, children: [_jsx(ServerIcon, {}), apiKey.environment] })] }), _jsxs("div", { style: styles.keyValue, children: [_jsxs("div", { style: styles.keyDisplay, children: [_jsx("span", { children: apiKey.keyPrefix }), _jsx("span", { style: styles.keyHidden, children: showKeyId === apiKey.id ? apiKey.keyHint : '••••••••••••••••' })] }), _jsx("button", { style: styles.copyButton, onClick: () => onCopyKey?.(apiKey), title: "Copy API key", children: _jsx(CopyIcon, {}) }), _jsx("button", { style: styles.copyButton, onClick: () => setShowKeyId(showKeyId === apiKey.id ? null : apiKey.id), title: showKeyId === apiKey.id ? 'Hide key' : 'Show key hint', children: _jsx(EyeIcon, {}) })] }), _jsxs("div", { style: styles.keyMeta, children: [_jsxs("span", { style: styles.metaItem, children: [_jsx(ClockIcon, {}), "Created ", formatDate(apiKey.createdAt)] }), apiKey.expiresAt && (_jsxs("span", { style: styles.metaItem, children: ["Expires ", formatDate(apiKey.expiresAt)] })), _jsxs("span", { style: styles.metaItem, children: ["Last used ", formatRelativeTime(apiKey.lastUsedAt)] }), _jsxs("span", { style: styles.metaItem, children: [_jsx(BarChartIcon, {}), formatNumber(apiKey.usageCount), " requests"] })] })] }), _jsxs("div", { style: { ...styles.keyActions, position: 'relative' }, children: [_jsx("button", { style: {
                                    ...styles.actionButton,
                                    backgroundColor: openMenuId === apiKey.id ? 'var(--chatsdk-bg-tertiary)' : undefined,
                                }, onClick: () => setOpenMenuId(openMenuId === apiKey.id ? null : apiKey.id), children: _jsx(MoreVerticalIcon, {}) }), openMenuId === apiKey.id && (_jsxs("div", { style: styles.dropdown, children: [_jsxs("button", { style: styles.dropdownItem, onClick: () => {
                                            onEditKey?.(apiKey);
                                            setOpenMenuId(null);
                                        }, children: [_jsx(EditIcon, {}), "Edit Key"] }), _jsxs("button", { style: styles.dropdownItem, onClick: () => {
                                            onViewUsage?.(apiKey);
                                            setOpenMenuId(null);
                                        }, children: [_jsx(BarChartIcon, {}), "View Usage"] }), _jsxs("button", { style: styles.dropdownItem, onClick: () => {
                                            onCopyKey?.(apiKey);
                                            setOpenMenuId(null);
                                        }, children: [_jsx(CopyIcon, {}), "Copy Key"] }), _jsx("div", { style: styles.dropdownDivider }), _jsxs("button", { style: styles.dropdownItem, onClick: () => {
                                            onRegenerateKey?.(apiKey);
                                            setOpenMenuId(null);
                                        }, children: [_jsx(RefreshCwIcon, {}), "Regenerate Key"] }), _jsxs("button", { style: { ...styles.dropdownItem, ...styles.dropdownItemDanger }, onClick: () => {
                                            onRevokeKey?.(apiKey);
                                            setOpenMenuId(null);
                                        }, children: [_jsx(TrashIcon, {}), "Revoke Key"] })] }))] })] }), _jsxs("div", { style: styles.scopesList, children: [_jsxs("span", { style: styles.scopesLabel, children: [_jsx(ShieldIcon, {}), " Scopes:"] }), _jsx("div", { style: styles.scopes, children: apiKey.scopes.map(scope => (_jsx("span", { style: {
                                ...styles.scopeBadge,
                                backgroundColor: `${getScopeColor(scope)}15`,
                                color: getScopeColor(scope),
                            }, children: getScopeLabel(scope) }, scope))) }), apiKey.rateLimit && (_jsxs("span", { style: styles.metaItem, children: ["Rate limit: ", formatNumber(apiKey.rateLimit), "/min"] }))] })] }, apiKey.id));
    const renderSkeletonCard = (index) => (_jsxs("div", { style: styles.keyCard, children: [_jsx("div", { style: styles.keyHeader, children: _jsxs("div", { style: styles.keyInfo, children: [_jsx("div", { style: { ...styles.skeleton, width: 180, height: 18, marginBottom: 12 } }), _jsx("div", { style: { ...styles.skeleton, width: 280, height: 32, marginBottom: 12 } }), _jsx("div", { style: { ...styles.skeleton, width: 320, height: 14 } })] }) }), _jsx("div", { style: styles.scopesList, children: _jsx("div", { style: { ...styles.skeleton, width: 200, height: 20 } }) })] }, `skeleton-${index}`));
    return (_jsxs("div", { style: styles.container, className: clsx('chatsdk-api-keys-manager', className), children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.headerLeft, children: [_jsx("div", { style: styles.headerIcon, children: _jsx(KeyIcon, {}) }), _jsxs("div", { style: styles.headerInfo, children: [_jsx("h2", { style: styles.title, children: "API Keys" }), _jsxs("div", { style: styles.subtitle, children: [stats.active, " active keys \u2022 ", stats.production, " production"] })] })] }), _jsxs("div", { style: styles.headerRight, children: [_jsxs("button", { style: styles.filterButton, children: [_jsx(FilterIcon, {}), "Filter"] }), _jsxs("button", { style: styles.primaryButton, onClick: onCreateKey, children: [_jsx(PlusIcon, {}), "Create API Key"] })] })] }), _jsxs("div", { style: styles.warning, children: [_jsx("div", { style: styles.warningIcon, children: _jsx(AlertTriangleIcon, {}) }), _jsx("span", { style: styles.warningText, children: "API keys provide full access to your account. Keep them secure and never share them publicly." })] }), _jsx("div", { style: styles.keysList, children: loading ? (Array.from({ length: 3 }).map((_, i) => renderSkeletonCard(i))) : filteredKeys.length === 0 ? (_jsxs("div", { style: styles.emptyState, children: [_jsx("div", { style: styles.emptyIcon, children: _jsx(KeyIcon, {}) }), _jsx("div", { style: styles.emptyTitle, children: "No API keys" }), _jsx("div", { style: styles.emptyDescription, children: "Create an API key to start integrating with the ChatSDK API" }), _jsxs("button", { style: styles.primaryButton, onClick: onCreateKey, children: [_jsx(PlusIcon, {}), "Create your first API key"] })] })) : (filteredKeys.map(renderKeyCard)) }), openMenuId && (_jsx("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 50,
                }, onClick: () => setOpenMenuId(null) }))] }));
};
export default APIKeysManager;
