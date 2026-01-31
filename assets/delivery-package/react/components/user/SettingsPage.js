import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import clsx from 'clsx';
// =============================================================================
// ICONS
// =============================================================================
const UserIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "12", cy: "7", r: "4" })] }));
const BellIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" }), _jsx("path", { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0" })] }));
const PaletteIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "13.5", cy: "6.5", r: ".5" }), _jsx("circle", { cx: "17.5", cy: "10.5", r: ".5" }), _jsx("circle", { cx: "8.5", cy: "7.5", r: ".5" }), _jsx("circle", { cx: "6.5", cy: "12.5", r: ".5" }), _jsx("path", { d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" })] }));
const ShieldIcon = () => (_jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" }) }));
const LockIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }), _jsx("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })] }));
const CameraIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" }), _jsx("circle", { cx: "12", cy: "13", r: "3" })] }));
const SunIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "4" }), _jsx("path", { d: "M12 2v2" }), _jsx("path", { d: "M12 20v2" }), _jsx("path", { d: "m4.93 4.93 1.41 1.41" }), _jsx("path", { d: "m17.66 17.66 1.41 1.41" }), _jsx("path", { d: "M2 12h2" }), _jsx("path", { d: "M20 12h2" }), _jsx("path", { d: "m6.34 17.66-1.41 1.41" }), _jsx("path", { d: "m19.07 4.93-1.41 1.41" })] }));
const MoonIcon = () => (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" }) }));
const MonitorIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { width: "20", height: "14", x: "2", y: "3", rx: "2" }), _jsx("line", { x1: "8", x2: "16", y1: "21", y2: "21" }), _jsx("line", { x1: "12", x2: "12", y1: "17", y2: "21" })] }));
const LogOutIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }), _jsx("polyline", { points: "16 17 21 12 16 7" }), _jsx("line", { x1: "21", x2: "9", y1: "12", y2: "12" })] }));
const TrashIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M3 6h18" }), _jsx("path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }), _jsx("path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" })] }));
const DownloadIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", x2: "12", y1: "15", y2: "3" })] }));
const ChevronRightIcon = () => (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "m9 18 6-6-6-6" }) }));
const CheckIcon = () => (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) }));
const SmartphoneIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { width: "14", height: "20", x: "5", y: "2", rx: "2", ry: "2" }), _jsx("path", { d: "M12 18h.01" })] }));
// =============================================================================
// STYLES
// =============================================================================
const styles = {
    container: {
        display: 'flex',
        height: '100%',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
    },
    sidebar: {
        width: '240px',
        backgroundColor: 'var(--chatsdk-bg-primary)',
        borderRight: '1px solid var(--chatsdk-border-light)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
    },
    sidebarHeader: {
        padding: '20px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
    },
    sidebarTitle: {
        fontSize: '18px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
        margin: 0,
    },
    nav: {
        flex: 1,
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        textAlign: 'left',
        width: '100%',
    },
    navItemActive: {
        backgroundColor: 'var(--chatsdk-primary-light)',
        color: 'var(--chatsdk-primary)',
    },
    navIcon: {
        flexShrink: 0,
    },
    sidebarFooter: {
        padding: '12px',
        borderTop: '1px solid var(--chatsdk-border-light)',
    },
    logoutButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '10px 12px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--chatsdk-error)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        textAlign: 'left',
    },
    content: {
        flex: 1,
        overflowY: 'auto',
        padding: '32px 48px',
    },
    contentHeader: {
        marginBottom: '32px',
    },
    contentTitle: {
        fontSize: '24px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
        margin: 0,
        marginBottom: '8px',
    },
    contentDescription: {
        fontSize: '14px',
        color: 'var(--chatsdk-text-tertiary)',
        margin: 0,
    },
    section: {
        backgroundColor: 'var(--chatsdk-bg-primary)',
        borderRadius: '12px',
        border: '1px solid var(--chatsdk-border-light)',
        marginBottom: '24px',
        overflow: 'hidden',
    },
    sectionHeader: {
        padding: '16px 20px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
    },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
        margin: 0,
    },
    sectionDescription: {
        fontSize: '13px',
        color: 'var(--chatsdk-text-tertiary)',
        margin: 0,
        marginTop: '4px',
    },
    sectionContent: {
        padding: '20px',
    },
    profileHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '24px',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        objectFit: 'cover',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
    },
    avatarFallback: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        fontSize: '32px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-secondary)',
    },
    avatarEditButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        backgroundColor: 'var(--chatsdk-primary)',
        border: '2px solid var(--chatsdk-bg-primary)',
        borderRadius: '50%',
        color: 'white',
        cursor: 'pointer',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: '20px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
        margin: 0,
    },
    profileEmail: {
        fontSize: '14px',
        color: 'var(--chatsdk-text-tertiary)',
        margin: 0,
        marginTop: '4px',
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    formGroupFullWidth: {
        gridColumn: '1 / -1',
    },
    label: {
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-secondary)',
    },
    input: {
        padding: '10px 12px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        border: '1px solid var(--chatsdk-border-light)',
        borderRadius: '8px',
        fontSize: '14px',
        color: 'var(--chatsdk-text-primary)',
        outline: 'none',
        transition: 'border-color 0.15s ease',
    },
    textarea: {
        padding: '10px 12px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        border: '1px solid var(--chatsdk-border-light)',
        borderRadius: '8px',
        fontSize: '14px',
        color: 'var(--chatsdk-text-primary)',
        outline: 'none',
        resize: 'vertical',
        minHeight: '80px',
        fontFamily: 'inherit',
    },
    select: {
        padding: '10px 12px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        border: '1px solid var(--chatsdk-border-light)',
        borderRadius: '8px',
        fontSize: '14px',
        color: 'var(--chatsdk-text-primary)',
        outline: 'none',
        cursor: 'pointer',
    },
    settingRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
        borderBottom: '1px solid var(--chatsdk-border-light)',
    },
    settingRowLast: {
        borderBottom: 'none',
    },
    settingInfo: {
        flex: 1,
    },
    settingLabel: {
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-primary)',
    },
    settingDescription: {
        fontSize: '13px',
        color: 'var(--chatsdk-text-tertiary)',
        marginTop: '2px',
    },
    toggle: {
        position: 'relative',
        width: '44px',
        height: '24px',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
    },
    toggleActive: {
        backgroundColor: 'var(--chatsdk-primary)',
    },
    toggleKnob: {
        position: 'absolute',
        top: '2px',
        left: '2px',
        width: '20px',
        height: '20px',
        backgroundColor: 'white',
        borderRadius: '50%',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
        transition: 'transform 0.2s ease',
    },
    toggleKnobActive: {
        transform: 'translateX(20px)',
    },
    themeOptions: {
        display: 'flex',
        gap: '12px',
    },
    themeOption: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '16px 24px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        border: '2px solid var(--chatsdk-border-light)',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        minWidth: '100px',
    },
    themeOptionActive: {
        borderColor: 'var(--chatsdk-primary)',
        backgroundColor: 'var(--chatsdk-primary-light)',
    },
    themeIcon: {
        color: 'var(--chatsdk-text-secondary)',
    },
    themeLabel: {
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-primary)',
    },
    checkBadge: {
        position: 'absolute',
        top: '-6px',
        right: '-6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        backgroundColor: 'var(--chatsdk-primary)',
        borderRadius: '50%',
        color: 'white',
    },
    dangerZone: {
        border: '1px solid var(--chatsdk-error)',
    },
    dangerButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: 'transparent',
        border: '1px solid var(--chatsdk-error)',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--chatsdk-error)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    primaryButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: 'var(--chatsdk-primary)',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        color: 'white',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    secondaryButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        border: '1px solid var(--chatsdk-border-light)',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    buttonGroup: {
        display: 'flex',
        gap: '12px',
        marginTop: '24px',
        paddingTop: '20px',
        borderTop: '1px solid var(--chatsdk-border-light)',
    },
    twoFactorRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        borderRadius: '8px',
        marginBottom: '16px',
    },
    twoFactorStatus: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 500,
    },
    statusBadgeEnabled: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        color: 'var(--chatsdk-success)',
    },
    statusBadgeDisabled: {
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        color: 'var(--chatsdk-text-tertiary)',
    },
};
const Toggle = ({ checked, onChange }) => (_jsx("div", { style: {
        ...styles.toggle,
        ...(checked ? styles.toggleActive : {}),
    }, onClick: () => onChange(!checked), role: "switch", "aria-checked": checked, children: _jsx("div", { style: {
            ...styles.toggleKnob,
            ...(checked ? styles.toggleKnobActive : {}),
        } }) }));
// =============================================================================
// COMPONENT
// =============================================================================
export const SettingsPage = ({ profile, notifications, appearance, privacy, onProfileUpdate, onNotificationsUpdate, onAppearanceUpdate, onPrivacyUpdate, onPasswordChange, onDeleteAccount, onExportData, onLogout, className, }) => {
    const [activeSection, setActiveSection] = useState('profile');
    const [localProfile, setLocalProfile] = useState(profile);
    const navItems = [
        { id: 'profile', label: 'Profile', icon: _jsx(UserIcon, {}) },
        { id: 'notifications', label: 'Notifications', icon: _jsx(BellIcon, {}) },
        { id: 'appearance', label: 'Appearance', icon: _jsx(PaletteIcon, {}) },
        { id: 'privacy', label: 'Privacy', icon: _jsx(ShieldIcon, {}) },
        { id: 'security', label: 'Security', icon: _jsx(LockIcon, {}) },
    ];
    const sectionInfo = {
        profile: { title: 'Profile', description: 'Manage your personal information and how others see you' },
        notifications: { title: 'Notifications', description: 'Control how and when you receive notifications' },
        appearance: { title: 'Appearance', description: 'Customize the look and feel of the app' },
        privacy: { title: 'Privacy', description: 'Control your privacy settings and data' },
        security: { title: 'Security', description: 'Manage your account security and authentication' },
    };
    const renderProfileSection = () => (_jsx(_Fragment, { children: _jsx("div", { style: styles.section, children: _jsxs("div", { style: styles.sectionContent, children: [_jsxs("div", { style: styles.profileHeader, children: [_jsxs("div", { style: styles.avatarContainer, children: [profile.imageUrl ? (_jsx("img", { src: profile.imageUrl, alt: "", style: styles.avatar })) : (_jsx("div", { style: styles.avatarFallback, children: profile.name.charAt(0).toUpperCase() })), _jsx("button", { style: styles.avatarEditButton, children: _jsx(CameraIcon, {}) })] }), _jsxs("div", { style: styles.profileInfo, children: [_jsx("h3", { style: styles.profileName, children: profile.name }), _jsx("p", { style: styles.profileEmail, children: profile.email })] })] }), _jsxs("div", { style: styles.formGrid, children: [_jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Display Name" }), _jsx("input", { type: "text", value: localProfile.name, onChange: (e) => setLocalProfile({ ...localProfile, name: e.target.value }), style: styles.input })] }), _jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Email" }), _jsx("input", { type: "email", value: localProfile.email, onChange: (e) => setLocalProfile({ ...localProfile, email: e.target.value }), style: styles.input })] }), _jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Phone Number" }), _jsx("input", { type: "tel", value: localProfile.phone || '', onChange: (e) => setLocalProfile({ ...localProfile, phone: e.target.value }), style: styles.input, placeholder: "+1 (555) 000-0000" })] }), _jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Timezone" }), _jsxs("select", { value: localProfile.timezone || '', onChange: (e) => setLocalProfile({ ...localProfile, timezone: e.target.value }), style: styles.select, children: [_jsx("option", { value: "America/New_York", children: "Eastern Time (ET)" }), _jsx("option", { value: "America/Chicago", children: "Central Time (CT)" }), _jsx("option", { value: "America/Denver", children: "Mountain Time (MT)" }), _jsx("option", { value: "America/Los_Angeles", children: "Pacific Time (PT)" }), _jsx("option", { value: "Europe/London", children: "London (GMT)" }), _jsx("option", { value: "Europe/Paris", children: "Paris (CET)" }), _jsx("option", { value: "Asia/Tokyo", children: "Tokyo (JST)" })] })] }), _jsxs("div", { style: { ...styles.formGroup, ...styles.formGroupFullWidth }, children: [_jsx("label", { style: styles.label, children: "Bio" }), _jsx("textarea", { value: localProfile.bio || '', onChange: (e) => setLocalProfile({ ...localProfile, bio: e.target.value }), style: styles.textarea, placeholder: "Tell others a bit about yourself..." })] })] }), _jsx("div", { style: styles.buttonGroup, children: _jsx("button", { style: styles.primaryButton, onClick: () => onProfileUpdate?.(localProfile), children: "Save Changes" }) })] }) }) }));
    const renderNotificationsSection = () => (_jsxs(_Fragment, { children: [_jsxs("div", { style: styles.section, children: [_jsxs("div", { style: styles.sectionHeader, children: [_jsx("h4", { style: styles.sectionTitle, children: "Push Notifications" }), _jsx("p", { style: styles.sectionDescription, children: "Receive notifications on your devices" })] }), _jsxs("div", { style: styles.sectionContent, children: [_jsxs("div", { style: styles.settingRow, children: [_jsxs("div", { style: styles.settingInfo, children: [_jsx("div", { style: styles.settingLabel, children: "Enable push notifications" }), _jsx("div", { style: styles.settingDescription, children: "Get notified about new messages and activity" })] }), _jsx(Toggle, { checked: notifications.pushEnabled, onChange: (checked) => onNotificationsUpdate?.({ pushEnabled: checked }) })] }), _jsxs("div", { style: styles.settingRow, children: [_jsxs("div", { style: styles.settingInfo, children: [_jsx("div", { style: styles.settingLabel, children: "Desktop notifications" }), _jsx("div", { style: styles.settingDescription, children: "Show notifications on your desktop" })] }), _jsx(Toggle, { checked: notifications.desktopEnabled, onChange: (checked) => onNotificationsUpdate?.({ desktopEnabled: checked }) })] }), _jsxs("div", { style: styles.settingRow, children: [_jsxs("div", { style: styles.settingInfo, children: [_jsx("div", { style: styles.settingLabel, children: "Sound" }), _jsx("div", { style: styles.settingDescription, children: "Play a sound when receiving notifications" })] }), _jsx(Toggle, { checked: notifications.soundEnabled, onChange: (checked) => onNotificationsUpdate?.({ soundEnabled: checked }) })] }), _jsxs("div", { style: { ...styles.settingRow, ...styles.settingRowLast }, children: [_jsxs("div", { style: styles.settingInfo, children: [_jsx("div", { style: styles.settingLabel, children: "Mentions only" }), _jsx("div", { style: styles.settingDescription, children: "Only notify when you're directly mentioned" })] }), _jsx(Toggle, { checked: notifications.mentionsOnly, onChange: (checked) => onNotificationsUpdate?.({ mentionsOnly: checked }) })] })] })] }), _jsxs("div", { style: styles.section, children: [_jsx("div", { style: styles.sectionHeader, children: _jsx("h4", { style: styles.sectionTitle, children: "Email Notifications" }) }), _jsxs("div", { style: styles.sectionContent, children: [_jsxs("div", { style: styles.settingRow, children: [_jsxs("div", { style: styles.settingInfo, children: [_jsx("div", { style: styles.settingLabel, children: "Email notifications" }), _jsx("div", { style: styles.settingDescription, children: "Receive updates via email" })] }), _jsx(Toggle, { checked: notifications.emailEnabled, onChange: (checked) => onNotificationsUpdate?.({ emailEnabled: checked }) })] }), _jsxs("div", { style: { ...styles.settingRow, ...styles.settingRowLast }, children: [_jsxs("div", { style: styles.settingInfo, children: [_jsx("div", { style: styles.settingLabel, children: "Digest frequency" }), _jsx("div", { style: styles.settingDescription, children: "How often to send email digests" })] }), _jsxs("select", { value: notifications.digestFrequency, onChange: (e) => onNotificationsUpdate?.({ digestFrequency: e.target.value }), style: { ...styles.select, width: '120px' }, children: [_jsx("option", { value: "never", children: "Never" }), _jsx("option", { value: "daily", children: "Daily" }), _jsx("option", { value: "weekly", children: "Weekly" })] })] })] })] })] }));
    const renderAppearanceSection = () => (_jsxs(_Fragment, { children: [_jsxs("div", { style: styles.section, children: [_jsxs("div", { style: styles.sectionHeader, children: [_jsx("h4", { style: styles.sectionTitle, children: "Theme" }), _jsx("p", { style: styles.sectionDescription, children: "Choose your preferred color scheme" })] }), _jsx("div", { style: styles.sectionContent, children: _jsx("div", { style: styles.themeOptions, children: [
                                { id: 'light', label: 'Light', icon: _jsx(SunIcon, {}) },
                                { id: 'dark', label: 'Dark', icon: _jsx(MoonIcon, {}) },
                                { id: 'system', label: 'System', icon: _jsx(MonitorIcon, {}) },
                            ].map((theme) => (_jsxs("div", { style: {
                                    ...styles.themeOption,
                                    ...(appearance.theme === theme.id ? styles.themeOptionActive : {}),
                                    position: 'relative',
                                }, onClick: () => onAppearanceUpdate?.({ theme: theme.id }), children: [_jsx("div", { style: styles.themeIcon, children: theme.icon }), _jsx("span", { style: styles.themeLabel, children: theme.label }), appearance.theme === theme.id && (_jsx("div", { style: styles.checkBadge, children: _jsx(CheckIcon, {}) }))] }, theme.id))) }) })] }), _jsxs("div", { style: styles.section, children: [_jsx("div", { style: styles.sectionHeader, children: _jsx("h4", { style: styles.sectionTitle, children: "Display" }) }), _jsxs("div", { style: styles.sectionContent, children: [_jsxs("div", { style: styles.settingRow, children: [_jsxs("div", { style: styles.settingInfo, children: [_jsx("div", { style: styles.settingLabel, children: "Font size" }), _jsx("div", { style: styles.settingDescription, children: "Adjust the text size throughout the app" })] }), _jsxs("select", { value: appearance.fontSize, onChange: (e) => onAppearanceUpdate?.({ fontSize: e.target.value }), style: { ...styles.select, width: '120px' }, children: [_jsx("option", { value: "small", children: "Small" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "large", children: "Large" })] })] }), _jsxs("div", { style: styles.settingRow, children: [_jsxs("div", { style: styles.settingInfo, children: [_jsx("div", { style: styles.settingLabel, children: "Compact mode" }), _jsx("div", { style: styles.settingDescription, children: "Reduce spacing for a more compact view" })] }), _jsx(Toggle, { checked: appearance.compactMode, onChange: (checked) => onAppearanceUpdate?.({ compactMode: checked }) })] }), _jsxs("div", { style: styles.settingRow, children: [_jsxs("div", { style: styles.settingInfo, children: [_jsx("div", { style: styles.settingLabel, children: "Animations" }), _jsx("div", { style: styles.settingDescription, children: "Enable motion and transitions" })] }), _jsx(Toggle, { checked: appearance.animationsEnabled, onChange: (checked) => onAppearanceUpdate?.({ animationsEnabled: checked }) })] }), _jsxs("div", { style: { ...styles.settingRow, ...styles.settingRowLast }, children: [_jsxs("div", { style: styles.settingInfo, children: [_jsx("div", { style: styles.settingLabel, children: "High contrast" }), _jsx("div", { style: styles.settingDescription, children: "Increase contrast for better visibility" })] }), _jsx(Toggle, { checked: appearance.highContrastMode, onChange: (checked) => onAppearanceUpdate?.({ highContrastMode: checked }) })] })] })] })] }));
    const renderPrivacySection = () => (_jsxs(_Fragment, { children: [_jsxs("div", { style: styles.section, children: [_jsx("div", { style: styles.sectionHeader, children: _jsx("h4", { style: styles.sectionTitle, children: "Activity Status" }) }), _jsxs("div", { style: styles.sectionContent, children: [_jsxs("div", { style: styles.settingRow, children: [_jsxs("div", { style: styles.settingInfo, children: [_jsx("div", { style: styles.settingLabel, children: "Show online status" }), _jsx("div", { style: styles.settingDescription, children: "Let others see when you're online" })] }), _jsx(Toggle, { checked: privacy.showOnlineStatus, onChange: (checked) => onPrivacyUpdate?.({ showOnlineStatus: checked }) })] }), _jsxs("div", { style: styles.settingRow, children: [_jsxs("div", { style: styles.settingInfo, children: [_jsx("div", { style: styles.settingLabel, children: "Read receipts" }), _jsx("div", { style: styles.settingDescription, children: "Show when you've read messages" })] }), _jsx(Toggle, { checked: privacy.showReadReceipts, onChange: (checked) => onPrivacyUpdate?.({ showReadReceipts: checked }) })] }), _jsxs("div", { style: { ...styles.settingRow, ...styles.settingRowLast }, children: [_jsxs("div", { style: styles.settingInfo, children: [_jsx("div", { style: styles.settingLabel, children: "Typing indicator" }), _jsx("div", { style: styles.settingDescription, children: "Show when you're typing a message" })] }), _jsx(Toggle, { checked: privacy.showTypingIndicator, onChange: (checked) => onPrivacyUpdate?.({ showTypingIndicator: checked }) })] })] })] }), _jsxs("div", { style: styles.section, children: [_jsx("div", { style: styles.sectionHeader, children: _jsx("h4", { style: styles.sectionTitle, children: "Messaging" }) }), _jsxs("div", { style: styles.sectionContent, children: [_jsxs("div", { style: styles.settingRow, children: [_jsxs("div", { style: styles.settingInfo, children: [_jsx("div", { style: styles.settingLabel, children: "Allow direct messages" }), _jsx("div", { style: styles.settingDescription, children: "Let anyone start a conversation with you" })] }), _jsx(Toggle, { checked: privacy.allowDirectMessages, onChange: (checked) => onPrivacyUpdate?.({ allowDirectMessages: checked }) })] }), _jsxs("div", { style: { ...styles.settingRow, ...styles.settingRowLast }, children: [_jsxs("div", { style: styles.settingInfo, children: [_jsx("div", { style: styles.settingLabel, children: "Allow channel invites" }), _jsx("div", { style: styles.settingDescription, children: "Let others add you to channels" })] }), _jsx(Toggle, { checked: privacy.allowChannelInvites, onChange: (checked) => onPrivacyUpdate?.({ allowChannelInvites: checked }) })] })] })] }), _jsxs("div", { style: styles.section, children: [_jsx("div", { style: styles.sectionHeader, children: _jsx("h4", { style: styles.sectionTitle, children: "Data" }) }), _jsx("div", { style: styles.sectionContent, children: _jsxs("button", { style: styles.secondaryButton, onClick: onExportData, children: [_jsx(DownloadIcon, {}), "Export my data"] }) })] })] }));
    const renderSecuritySection = () => (_jsxs(_Fragment, { children: [_jsxs("div", { style: styles.section, children: [_jsxs("div", { style: styles.sectionHeader, children: [_jsx("h4", { style: styles.sectionTitle, children: "Two-Factor Authentication" }), _jsx("p", { style: styles.sectionDescription, children: "Add an extra layer of security to your account" })] }), _jsx("div", { style: styles.sectionContent, children: _jsxs("div", { style: styles.twoFactorRow, children: [_jsxs("div", { style: styles.twoFactorStatus, children: [_jsx(SmartphoneIcon, {}), _jsx("span", { style: styles.settingLabel, children: "Authenticator app" }), _jsx("span", { style: {
                                                ...styles.statusBadge,
                                                ...(privacy.twoFactorEnabled ? styles.statusBadgeEnabled : styles.statusBadgeDisabled),
                                            }, children: privacy.twoFactorEnabled ? 'Enabled' : 'Disabled' })] }), _jsxs("button", { style: styles.secondaryButton, children: [privacy.twoFactorEnabled ? 'Manage' : 'Enable', _jsx(ChevronRightIcon, {})] })] }) })] }), _jsxs("div", { style: styles.section, children: [_jsx("div", { style: styles.sectionHeader, children: _jsx("h4", { style: styles.sectionTitle, children: "Password" }) }), _jsx("div", { style: styles.sectionContent, children: _jsxs("button", { style: styles.secondaryButton, onClick: onPasswordChange, children: ["Change password", _jsx(ChevronRightIcon, {})] }) })] }), _jsxs("div", { style: { ...styles.section, ...styles.dangerZone }, children: [_jsxs("div", { style: styles.sectionHeader, children: [_jsx("h4", { style: { ...styles.sectionTitle, color: 'var(--chatsdk-error)' }, children: "Danger Zone" }), _jsx("p", { style: styles.sectionDescription, children: "Irreversible and destructive actions" })] }), _jsx("div", { style: styles.sectionContent, children: _jsxs("button", { style: styles.dangerButton, onClick: onDeleteAccount, children: [_jsx(TrashIcon, {}), "Delete my account"] }) })] })] }));
    const renderSectionContent = () => {
        switch (activeSection) {
            case 'profile': return renderProfileSection();
            case 'notifications': return renderNotificationsSection();
            case 'appearance': return renderAppearanceSection();
            case 'privacy': return renderPrivacySection();
            case 'security': return renderSecuritySection();
            default: return null;
        }
    };
    return (_jsxs("div", { style: styles.container, className: clsx('chatsdk-settings-page', className), children: [_jsxs("div", { style: styles.sidebar, children: [_jsx("div", { style: styles.sidebarHeader, children: _jsx("h2", { style: styles.sidebarTitle, children: "Settings" }) }), _jsx("nav", { style: styles.nav, children: navItems.map((item) => (_jsxs("button", { style: {
                                ...styles.navItem,
                                ...(activeSection === item.id ? styles.navItemActive : {}),
                            }, onClick: () => setActiveSection(item.id), children: [_jsx("span", { style: styles.navIcon, children: item.icon }), item.label] }, item.id))) }), _jsx("div", { style: styles.sidebarFooter, children: _jsxs("button", { style: styles.logoutButton, onClick: onLogout, children: [_jsx(LogOutIcon, {}), "Log out"] }) })] }), _jsxs("div", { style: styles.content, children: [_jsxs("div", { style: styles.contentHeader, children: [_jsx("h1", { style: styles.contentTitle, children: sectionInfo[activeSection].title }), _jsx("p", { style: styles.contentDescription, children: sectionInfo[activeSection].description })] }), renderSectionContent()] })] }));
};
export default SettingsPage;
