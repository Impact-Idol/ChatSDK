import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
export function AnalyticsDashboard({ data, dateRange, onDateRangeChange, loading = false, }) {
    const [selectedRange, setSelectedRange] = useState('30d');
    const [activeTab, setActiveTab] = useState('overview');
    const formatNumber = (num) => {
        if (num >= 1000000)
            return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000)
            return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };
    const getMaxValue = (arr) => {
        return Math.max(...arr.map((item) => item.count || item.messages || 0));
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
        title: {
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            margin: 0,
        },
        controls: {
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
        },
        rangeButton: {
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
        },
        rangeButtonActive: {
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            color: '#ffffff',
            borderColor: 'var(--chatsdk-accent-color, #6366f1)',
        },
        tabs: {
            display: 'flex',
            gap: '4px',
            padding: '4px',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            borderRadius: '10px',
            marginBottom: '24px',
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
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
        },
        statCard: {
            padding: '20px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
        statLabel: {
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            marginBottom: '8px',
        },
        statValue: {
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '8px',
        },
        statChange: {
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
        },
        positive: {
            color: 'var(--chatsdk-success-color, #10b981)',
        },
        negative: {
            color: 'var(--chatsdk-error-color, #ef4444)',
        },
        chartsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '24px',
            marginBottom: '24px',
        },
        chartCard: {
            padding: '24px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
        chartTitle: {
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '20px',
        },
        chart: {
            height: '200px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '4px',
        },
        bar: {
            flex: 1,
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            borderRadius: '4px 4px 0 0',
            minHeight: '4px',
            transition: 'height 0.3s ease',
            position: 'relative',
        },
        barLabel: {
            position: 'absolute',
            bottom: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '10px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            whiteSpace: 'nowrap',
        },
        tableCard: {
            padding: '24px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
        },
        th: {
            textAlign: 'left',
            padding: '12px 16px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
        td: {
            padding: '14px 16px',
            fontSize: '14px',
            color: 'var(--chatsdk-text-primary, #111827)',
            borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
        progressBar: {
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
        heatmapContainer: {
            display: 'grid',
            gridTemplateColumns: 'repeat(24, 1fr)',
            gap: '4px',
        },
        heatmapCell: {
            aspectRatio: '1',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        heatmapLabel: {
            textAlign: 'center',
            marginTop: '8px',
            fontSize: '11px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        skeleton: {
            backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
            borderRadius: '4px',
            animation: 'pulse 2s ease-in-out infinite',
        },
        donutContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
        },
        donut: {
            width: '160px',
            height: '160px',
            position: 'relative',
        },
        donutCenter: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
        },
        donutValue: {
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--chatsdk-text-primary, #111827)',
        },
        donutLabel: {
            fontSize: '12px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        legend: {
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
        },
        legendItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        },
        legendDot: {
            width: '12px',
            height: '12px',
            borderRadius: '4px',
        },
        legendText: {
            fontSize: '14px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
        },
        legendValue: {
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginLeft: 'auto',
        },
    };
    const typeColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
    const getHeatmapColor = (value, max) => {
        const intensity = max > 0 ? value / max : 0;
        if (intensity > 0.8)
            return 'var(--chatsdk-accent-color, #6366f1)';
        if (intensity > 0.6)
            return 'rgba(99, 102, 241, 0.7)';
        if (intensity > 0.4)
            return 'rgba(99, 102, 241, 0.5)';
        if (intensity > 0.2)
            return 'rgba(99, 102, 241, 0.3)';
        return 'var(--chatsdk-bg-tertiary, #e5e7eb)';
    };
    if (loading) {
        return (_jsxs("div", { style: styles.container, children: [_jsxs("div", { style: styles.header, children: [_jsx("div", { style: { ...styles.skeleton, width: '200px', height: '32px' } }), _jsx("div", { style: { display: 'flex', gap: '8px' }, children: [1, 2, 3].map((i) => (_jsx("div", { style: { ...styles.skeleton, width: '80px', height: '36px' } }, i))) })] }), _jsx("div", { style: styles.statsGrid, children: [1, 2, 3, 4, 5].map((i) => (_jsxs("div", { style: { ...styles.statCard }, children: [_jsx("div", { style: { ...styles.skeleton, width: '100px', height: '16px', marginBottom: '12px' } }), _jsx("div", { style: { ...styles.skeleton, width: '80px', height: '32px', marginBottom: '8px' } }), _jsx("div", { style: { ...styles.skeleton, width: '60px', height: '16px' } })] }, i))) })] }));
    }
    return (_jsxs("div", { style: styles.container, children: [_jsxs("div", { style: styles.header, children: [_jsx("h1", { style: styles.title, children: "Analytics" }), _jsx("div", { style: styles.controls, children: ['7d', '30d', '90d'].map((range) => (_jsx("button", { style: {
                                ...styles.rangeButton,
                                ...(selectedRange === range ? styles.rangeButtonActive : {}),
                            }, onClick: () => setSelectedRange(range), children: range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days' }, range))) })] }), _jsx("div", { style: styles.tabs, children: ['overview', 'engagement', 'content'].map((tab) => (_jsx("button", { style: {
                        ...styles.tab,
                        ...(activeTab === tab ? styles.tabActive : {}),
                    }, onClick: () => setActiveTab(tab), children: tab.charAt(0).toUpperCase() + tab.slice(1) }, tab))) }), _jsxs("div", { style: styles.statsGrid, children: [_jsxs("div", { style: styles.statCard, children: [_jsx("div", { style: styles.statLabel, children: "Monthly Active Users" }), _jsx("div", { style: styles.statValue, children: formatNumber(data.mau) }), _jsxs("div", { style: { ...styles.statChange, ...(data.mauChange >= 0 ? styles.positive : styles.negative) }, children: [_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: data.mauChange >= 0 ? (_jsx("polyline", { points: "18 15 12 9 6 15" })) : (_jsx("polyline", { points: "6 9 12 15 18 9" })) }), Math.abs(data.mauChange), "% vs last period"] })] }), _jsxs("div", { style: styles.statCard, children: [_jsx("div", { style: styles.statLabel, children: "Daily Active Users" }), _jsx("div", { style: styles.statValue, children: formatNumber(data.dau) }), _jsxs("div", { style: { ...styles.statChange, ...(data.dauChange >= 0 ? styles.positive : styles.negative) }, children: [_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: data.dauChange >= 0 ? (_jsx("polyline", { points: "18 15 12 9 6 15" })) : (_jsx("polyline", { points: "6 9 12 15 18 9" })) }), Math.abs(data.dauChange), "% vs last period"] })] }), _jsxs("div", { style: styles.statCard, children: [_jsx("div", { style: styles.statLabel, children: "Total Messages" }), _jsx("div", { style: styles.statValue, children: formatNumber(data.totalMessages) }), _jsxs("div", { style: { ...styles.statChange, ...(data.messagesChange >= 0 ? styles.positive : styles.negative) }, children: [_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: data.messagesChange >= 0 ? (_jsx("polyline", { points: "18 15 12 9 6 15" })) : (_jsx("polyline", { points: "6 9 12 15 18 9" })) }), Math.abs(data.messagesChange), "% vs last period"] })] }), _jsxs("div", { style: styles.statCard, children: [_jsx("div", { style: styles.statLabel, children: "Active Channels" }), _jsx("div", { style: styles.statValue, children: formatNumber(data.activeChannels) }), _jsxs("div", { style: { ...styles.statChange, ...(data.channelsChange >= 0 ? styles.positive : styles.negative) }, children: [_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: data.channelsChange >= 0 ? (_jsx("polyline", { points: "18 15 12 9 6 15" })) : (_jsx("polyline", { points: "6 9 12 15 18 9" })) }), Math.abs(data.channelsChange), "% vs last period"] })] }), _jsxs("div", { style: styles.statCard, children: [_jsx("div", { style: styles.statLabel, children: "Avg Session Duration" }), _jsx("div", { style: styles.statValue, children: formatDuration(data.avgSessionDuration) }), _jsxs("div", { style: { ...styles.statChange, ...(data.sessionChange >= 0 ? styles.positive : styles.negative) }, children: [_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: data.sessionChange >= 0 ? (_jsx("polyline", { points: "18 15 12 9 6 15" })) : (_jsx("polyline", { points: "6 9 12 15 18 9" })) }), Math.abs(data.sessionChange), "% vs last period"] })] })] }), activeTab === 'overview' && (_jsxs(_Fragment, { children: [_jsxs("div", { style: styles.chartsGrid, children: [_jsxs("div", { style: styles.chartCard, children: [_jsx("div", { style: styles.chartTitle, children: "Messages Over Time" }), _jsx("div", { style: styles.chart, children: data.messagesByDay.slice(-14).map((day, i) => {
                                            const maxVal = getMaxValue(data.messagesByDay);
                                            const height = maxVal > 0 ? (day.count / maxVal) * 100 : 0;
                                            return (_jsx("div", { style: {
                                                    ...styles.bar,
                                                    height: `${Math.max(height, 2)}%`,
                                                }, title: `${day.date}: ${day.count.toLocaleString()} messages`, children: _jsx("div", { style: styles.barLabel, children: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }) }) }, i));
                                        }) })] }), _jsxs("div", { style: styles.chartCard, children: [_jsx("div", { style: styles.chartTitle, children: "Active Users Over Time" }), _jsx("div", { style: styles.chart, children: data.usersByDay.slice(-14).map((day, i) => {
                                            const maxVal = getMaxValue(data.usersByDay);
                                            const height = maxVal > 0 ? (day.count / maxVal) * 100 : 0;
                                            return (_jsx("div", { style: {
                                                    ...styles.bar,
                                                    height: `${Math.max(height, 2)}%`,
                                                    backgroundColor: 'var(--chatsdk-success-color, #10b981)',
                                                }, title: `${day.date}: ${day.count.toLocaleString()} users`, children: _jsx("div", { style: styles.barLabel, children: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }) }) }, i));
                                        }) })] })] }), _jsxs("div", { style: styles.tableCard, children: [_jsx("div", { style: styles.chartTitle, children: "Top Channels" }), _jsxs("table", { style: styles.table, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: styles.th, children: "Channel" }), _jsx("th", { style: styles.th, children: "Messages" }), _jsx("th", { style: styles.th, children: "Members" }), _jsx("th", { style: styles.th, children: "Activity" })] }) }), _jsx("tbody", { children: data.topChannels.map((channel, i) => {
                                            const maxMessages = Math.max(...data.topChannels.map((c) => c.messages));
                                            return (_jsxs("tr", { children: [_jsx("td", { style: styles.td, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { color: 'var(--chatsdk-text-tertiary, #9ca3af)' }, children: "#" }), channel.name] }) }), _jsx("td", { style: styles.td, children: channel.messages.toLocaleString() }), _jsx("td", { style: styles.td, children: channel.members.toLocaleString() }), _jsx("td", { style: { ...styles.td, width: '200px' }, children: _jsx("div", { style: styles.progressBar, children: _jsx("div", { style: {
                                                                    ...styles.progressFill,
                                                                    width: `${(channel.messages / maxMessages) * 100}%`,
                                                                } }) }) })] }, i));
                                        }) })] })] })] })), activeTab === 'engagement' && (_jsx(_Fragment, { children: _jsxs("div", { style: styles.chartsGrid, children: [_jsxs("div", { style: styles.chartCard, children: [_jsx("div", { style: styles.chartTitle, children: "User Retention" }), _jsx("div", { style: styles.chart, children: data.userRetention.map((week, i) => (_jsx("div", { style: {
                                            ...styles.bar,
                                            height: `${week.percentage}%`,
                                            backgroundColor: week.percentage > 50
                                                ? 'var(--chatsdk-success-color, #10b981)'
                                                : week.percentage > 25
                                                    ? 'var(--chatsdk-warning-color, #f59e0b)'
                                                    : 'var(--chatsdk-error-color, #ef4444)',
                                        }, title: `${week.week}: ${week.percentage}% retention`, children: _jsx("div", { style: styles.barLabel, children: week.week }) }, i))) })] }), _jsxs("div", { style: styles.chartCard, children: [_jsx("div", { style: styles.chartTitle, children: "Peak Activity Hours" }), _jsx("div", { style: styles.heatmapContainer, children: data.peakHours.map((hour, i) => {
                                        const maxMessages = Math.max(...data.peakHours.map((h) => h.messages));
                                        return (_jsx("div", { style: {
                                                ...styles.heatmapCell,
                                                backgroundColor: getHeatmapColor(hour.messages, maxMessages),
                                            }, title: `${hour.hour}:00 - ${hour.messages.toLocaleString()} messages`, children: hour.hour }, i));
                                    }) }), _jsx("div", { style: styles.heatmapLabel, children: "Hour of Day (UTC)" })] })] }) })), activeTab === 'content' && (_jsx("div", { style: styles.chartsGrid, children: _jsxs("div", { style: styles.chartCard, children: [_jsx("div", { style: styles.chartTitle, children: "Message Types" }), _jsxs("div", { style: styles.donutContainer, children: [_jsxs("div", { style: styles.donut, children: [_jsx("svg", { width: "160", height: "160", viewBox: "0 0 160 160", children: data.messageTypes.reduce((acc, type, i) => {
                                                const circumference = 2 * Math.PI * 60;
                                                const offset = circumference * (1 - type.percentage / 100);
                                                const rotation = acc.rotation;
                                                acc.elements.push(_jsx("circle", { cx: "80", cy: "80", r: "60", fill: "none", stroke: typeColors[i % typeColors.length], strokeWidth: "20", strokeDasharray: circumference, strokeDashoffset: offset, transform: `rotate(${rotation} 80 80)` }, type.type));
                                                acc.rotation += (type.percentage / 100) * 360;
                                                return acc;
                                            }, { elements: [], rotation: -90 }).elements }), _jsxs("div", { style: styles.donutCenter, children: [_jsx("div", { style: styles.donutValue, children: formatNumber(data.totalMessages) }), _jsx("div", { style: styles.donutLabel, children: "Total" })] })] }), _jsx("div", { style: styles.legend, children: data.messageTypes.map((type, i) => (_jsxs("div", { style: styles.legendItem, children: [_jsx("div", { style: {
                                                    ...styles.legendDot,
                                                    backgroundColor: typeColors[i % typeColors.length],
                                                } }), _jsx("span", { style: styles.legendText, children: type.type }), _jsxs("span", { style: styles.legendValue, children: [type.percentage, "%"] })] }, type.type))) })] })] }) }))] }));
}
