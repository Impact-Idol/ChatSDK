import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export function ExportTools({ jobs, onCreateExport, onDownload, onDelete, loading = false, }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newExport, setNewExport] = useState({
        type: 'messages',
        format: 'json',
        dateStart: '',
        dateEnd: '',
    });
    const exportTypes = [
        {
            value: 'messages',
            label: 'Messages',
            description: 'Export all messages with metadata',
            icon: (_jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) })),
        },
        {
            value: 'users',
            label: 'Users',
            description: 'Export user profiles and settings',
            icon: (_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }), _jsx("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })] })),
        },
        {
            value: 'channels',
            label: 'Channels',
            description: 'Export channel configurations',
            icon: (_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "4", y1: "9", x2: "20", y2: "9" }), _jsx("line", { x1: "4", y1: "15", x2: "20", y2: "15" }), _jsx("line", { x1: "10", y1: "3", x2: "8", y2: "21" }), _jsx("line", { x1: "16", y1: "3", x2: "14", y2: "21" })] })),
        },
        {
            value: 'analytics',
            label: 'Analytics',
            description: 'Export usage metrics and stats',
            icon: (_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "20", x2: "18", y2: "10" }), _jsx("line", { x1: "12", y1: "20", x2: "12", y2: "4" }), _jsx("line", { x1: "6", y1: "20", x2: "6", y2: "14" })] })),
        },
        {
            value: 'full_backup',
            label: 'Full Backup',
            description: 'Complete data export for backup',
            icon: (_jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" }), _jsx("polyline", { points: "3.27 6.96 12 12.01 20.73 6.96" }), _jsx("line", { x1: "12", y1: "22.08", x2: "12", y2: "12" })] })),
        },
    ];
    const formatSize = (bytes) => {
        if (!bytes)
            return '-';
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024)
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return { bg: 'var(--chatsdk-success-light, #d1fae5)', text: 'var(--chatsdk-success-color, #10b981)' };
            case 'processing':
            case 'pending':
                return { bg: 'var(--chatsdk-accent-light, #eef2ff)', text: 'var(--chatsdk-accent-color, #6366f1)' };
            case 'failed':
                return { bg: 'var(--chatsdk-error-light, #fee2e2)', text: 'var(--chatsdk-error-color, #ef4444)' };
            default:
                return { bg: 'var(--chatsdk-bg-tertiary, #e5e7eb)', text: 'var(--chatsdk-text-secondary, #6b7280)' };
        }
    };
    const styles = {
        container: {
            padding: '24px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            minHeight: '100vh',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
        },
        titleSection: {},
        title: {
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            margin: 0,
            marginBottom: '4px',
        },
        subtitle: {
            fontSize: '14px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            margin: 0,
        },
        createButton: {
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        },
        quickExports: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
        },
        quickCard: {
            padding: '20px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
        },
        quickCardIcon: {
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
            color: 'var(--chatsdk-accent-color, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
        },
        quickCardTitle: {
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '4px',
        },
        quickCardDesc: {
            fontSize: '13px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
        },
        section: {
            marginBottom: '24px',
        },
        sectionTitle: {
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '16px',
        },
        jobsList: {},
        jobCard: {
            padding: '16px 20px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
        },
        jobIcon: {
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
        },
        jobInfo: {
            flex: 1,
        },
        jobTitle: {
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        },
        jobMeta: {
            fontSize: '13px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        },
        badge: {
            display: 'inline-block',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
        },
        progressBar: {
            width: '200px',
            height: '8px',
            backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
            borderRadius: '4px',
            overflow: 'hidden',
        },
        progressFill: {
            height: '100%',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
        },
        jobActions: {
            display: 'flex',
            gap: '8px',
        },
        iconButton: {
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
        },
        downloadButton: {
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        },
        emptyState: {
            padding: '60px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            borderRadius: '12px',
        },
        emptyIcon: {
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            margin: '0 auto 16px',
        },
        emptyTitle: {
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '4px',
        },
        emptyText: {
            fontSize: '14px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        modal: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        },
        modalContent: {
            width: '560px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        },
        modalHeader: {
            padding: '20px 24px',
            borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
        modalTitle: {
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            margin: 0,
        },
        modalBody: {
            padding: '24px',
        },
        formGroup: {
            marginBottom: '20px',
        },
        label: {
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '8px',
        },
        typeGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
        },
        typeOption: {
            padding: '16px',
            borderRadius: '10px',
            border: '2px solid var(--chatsdk-border-color, #e5e7eb)',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.15s ease',
        },
        typeOptionActive: {
            borderColor: 'var(--chatsdk-accent-color, #6366f1)',
            backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
        },
        typeOptionIcon: {
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            marginBottom: '8px',
        },
        typeOptionLabel: {
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--chatsdk-text-primary, #111827)',
        },
        formatGrid: {
            display: 'flex',
            gap: '12px',
        },
        formatOption: {
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: '2px solid var(--chatsdk-border-color, #e5e7eb)',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.15s ease',
        },
        formatOptionActive: {
            borderColor: 'var(--chatsdk-accent-color, #6366f1)',
            backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
        },
        formatLabel: {
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
        },
        dateRow: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
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
            boxSizing: 'border-box',
        },
        modalFooter: {
            padding: '16px 24px',
            borderTop: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
        },
        button: {
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
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
    };
    const getTypeIcon = (type) => {
        return exportTypes.find((t) => t.value === type)?.icon;
    };
    const handleQuickExport = (type) => {
        setNewExport({ ...newExport, type });
        setShowCreateModal(true);
    };
    const handleCreateExport = () => {
        onCreateExport?.({
            type: newExport.type,
            format: newExport.format,
            filters: newExport.dateStart || newExport.dateEnd
                ? {
                    dateRange: {
                        start: newExport.dateStart,
                        end: newExport.dateEnd,
                    },
                }
                : undefined,
        });
        setShowCreateModal(false);
        setNewExport({ type: 'messages', format: 'json', dateStart: '', dateEnd: '' });
    };
    return (_jsxs("div", { style: styles.container, children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.titleSection, children: [_jsx("h1", { style: styles.title, children: "Export Tools" }), _jsx("p", { style: styles.subtitle, children: "Export your data in various formats" })] }), _jsxs("button", { style: styles.createButton, onClick: () => setShowCreateModal(true), children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })] }), "New Export"] })] }), _jsx("div", { style: styles.quickExports, children: exportTypes.map((type) => (_jsxs("div", { style: styles.quickCard, onClick: () => handleQuickExport(type.value), children: [_jsx("div", { style: styles.quickCardIcon, children: type.icon }), _jsx("div", { style: styles.quickCardTitle, children: type.label }), _jsx("div", { style: styles.quickCardDesc, children: type.description })] }, type.value))) }), _jsxs("div", { style: styles.section, children: [_jsx("div", { style: styles.sectionTitle, children: "Recent Exports" }), _jsx("div", { style: styles.jobsList, children: jobs.length === 0 ? (_jsxs("div", { style: styles.emptyState, children: [_jsx("div", { style: styles.emptyIcon, children: _jsxs("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })] }) }), _jsx("div", { style: styles.emptyTitle, children: "No exports yet" }), _jsx("div", { style: styles.emptyText, children: "Create your first export using the options above" })] })) : (jobs.map((job) => {
                            const statusColor = getStatusColor(job.status);
                            return (_jsxs("div", { style: styles.jobCard, children: [_jsx("div", { style: styles.jobIcon, children: getTypeIcon(job.type) }), _jsxs("div", { style: styles.jobInfo, children: [_jsxs("div", { style: styles.jobTitle, children: [exportTypes.find((t) => t.value === job.type)?.label, " Export", _jsx("span", { style: {
                                                            ...styles.badge,
                                                            backgroundColor: statusColor.bg,
                                                            color: statusColor.text,
                                                        }, children: job.status })] }), _jsxs("div", { style: styles.jobMeta, children: [_jsx("span", { children: job.format.toUpperCase() }), job.fileSize && _jsx("span", { children: formatSize(job.fileSize) }), _jsx("span", { children: formatDate(job.createdAt) })] })] }), job.status === 'processing' && (_jsx("div", { style: styles.progressBar, children: _jsx("div", { style: { ...styles.progressFill, width: `${job.progress}%` } }) })), _jsxs("div", { style: styles.jobActions, children: [job.status === 'completed' && (_jsxs("button", { style: styles.downloadButton, onClick: () => onDownload?.(job.id), children: [_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })] }), "Download"] })), _jsx("button", { style: styles.iconButton, onClick: () => onDelete?.(job.id), children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })] }) })] })] }, job.id));
                        })) })] }), showCreateModal && (_jsx("div", { style: styles.modal, onClick: () => setShowCreateModal(false), children: _jsxs("div", { style: styles.modalContent, onClick: (e) => e.stopPropagation(), children: [_jsx("div", { style: styles.modalHeader, children: _jsx("h2", { style: styles.modalTitle, children: "Create Export" }) }), _jsxs("div", { style: styles.modalBody, children: [_jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Data Type" }), _jsx("div", { style: styles.typeGrid, children: exportTypes.slice(0, 3).map((type) => (_jsxs("div", { style: {
                                                    ...styles.typeOption,
                                                    ...(newExport.type === type.value ? styles.typeOptionActive : {}),
                                                }, onClick: () => setNewExport({ ...newExport, type: type.value }), children: [_jsx("div", { style: styles.typeOptionIcon, children: type.icon }), _jsx("div", { style: styles.typeOptionLabel, children: type.label })] }, type.value))) })] }), _jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Format" }), _jsx("div", { style: styles.formatGrid, children: ['json', 'csv', 'xlsx'].map((format) => (_jsx("div", { style: {
                                                    ...styles.formatOption,
                                                    ...(newExport.format === format ? styles.formatOptionActive : {}),
                                                }, onClick: () => setNewExport({ ...newExport, format }), children: _jsx("div", { style: styles.formatLabel, children: format.toUpperCase() }) }, format))) })] }), _jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Date Range (optional)" }), _jsxs("div", { style: styles.dateRow, children: [_jsx("input", { type: "date", style: styles.input, value: newExport.dateStart, onChange: (e) => setNewExport({ ...newExport, dateStart: e.target.value }) }), _jsx("input", { type: "date", style: styles.input, value: newExport.dateEnd, onChange: (e) => setNewExport({ ...newExport, dateEnd: e.target.value }) })] })] })] }), _jsxs("div", { style: styles.modalFooter, children: [_jsx("button", { style: { ...styles.button, ...styles.buttonSecondary }, onClick: () => setShowCreateModal(false), children: "Cancel" }), _jsx("button", { style: { ...styles.button, ...styles.buttonPrimary }, onClick: handleCreateExport, children: "Start Export" })] })] }) }))] }));
}
