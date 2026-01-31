import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { clsx } from 'clsx';
const StatCard = ({ title, value, change, changeLabel, icon, color, }) => {
    const colorClasses = {
        blue: 'chatsdk-stat-blue',
        green: 'chatsdk-stat-green',
        purple: 'chatsdk-stat-purple',
        orange: 'chatsdk-stat-orange',
    };
    return (_jsxs("div", { className: clsx('chatsdk-stat-card', colorClasses[color]), children: [_jsx("div", { className: "chatsdk-stat-icon", children: icon }), _jsxs("div", { className: "chatsdk-stat-content", children: [_jsx("span", { className: "chatsdk-stat-title", children: title }), _jsx("span", { className: "chatsdk-stat-value", children: value }), change !== undefined && (_jsxs("span", { className: clsx('chatsdk-stat-change', change >= 0 ? 'positive' : 'negative'), children: [change >= 0 ? '↑' : '↓', " ", Math.abs(change), "% ", changeLabel] }))] })] }));
};
export const Dashboard = ({ stats, messageChart, userChart, recentActivity, topChannels, }) => {
    const maxMessageValue = Math.max(...messageChart.map((d) => d.value), 1);
    const maxUserValue = Math.max(...userChart.map((d) => d.value), 1);
    return (_jsxs("div", { className: "chatsdk-dashboard", children: [_jsxs("div", { className: "chatsdk-dashboard-header", children: [_jsxs("div", { children: [_jsx("h1", { className: "chatsdk-dashboard-title", children: "Dashboard" }), _jsx("p", { className: "chatsdk-dashboard-subtitle", children: "Welcome back! Here's what's happening." })] }), _jsxs("div", { className: "chatsdk-dashboard-actions", children: [_jsxs("select", { className: "chatsdk-period-select", children: [_jsx("option", { value: "7d", children: "Last 7 days" }), _jsx("option", { value: "30d", children: "Last 30 days" }), _jsx("option", { value: "90d", children: "Last 90 days" })] }), _jsxs("button", { className: "chatsdk-export-btn", children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })] }), "Export"] })] })] }), _jsxs("div", { className: "chatsdk-stats-grid", children: [_jsx(StatCard, { title: "Total Users", value: stats.totalUsers.toLocaleString(), change: stats.userGrowth, changeLabel: "vs last month", color: "blue", icon: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }), _jsx("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })] }) }), _jsx(StatCard, { title: "Active Users (24h)", value: stats.activeUsers.toLocaleString(), color: "green", icon: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("polyline", { points: "12 6 12 12 16 14" })] }) }), _jsx(StatCard, { title: "Total Messages", value: stats.totalMessages.toLocaleString(), change: stats.messageGrowth, changeLabel: "vs last month", color: "purple", icon: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" }) }) }), _jsx(StatCard, { title: "Channels", value: stats.totalChannels.toLocaleString(), color: "orange", icon: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" }), _jsx("polyline", { points: "22,6 12,13 2,6" })] }) })] }), _jsxs("div", { className: "chatsdk-charts-row", children: [_jsxs("div", { className: "chatsdk-chart-card", children: [_jsxs("div", { className: "chatsdk-chart-header", children: [_jsx("h3", { children: "Messages" }), _jsxs("span", { className: "chatsdk-chart-total", children: [messageChart.reduce((a, b) => a + b.value, 0).toLocaleString(), " total"] })] }), _jsx("div", { className: "chatsdk-chart-container", children: _jsx("div", { className: "chatsdk-bar-chart", children: messageChart.map((point, i) => (_jsxs("div", { className: "chatsdk-bar-container", children: [_jsx("div", { className: "chatsdk-bar chatsdk-bar-purple", style: { height: `${(point.value / maxMessageValue) * 100}%` }, children: _jsx("span", { className: "chatsdk-bar-tooltip", children: point.value.toLocaleString() }) }), _jsx("span", { className: "chatsdk-bar-label", children: point.label })] }, i))) }) })] }), _jsxs("div", { className: "chatsdk-chart-card", children: [_jsxs("div", { className: "chatsdk-chart-header", children: [_jsx("h3", { children: "Active Users" }), _jsxs("span", { className: "chatsdk-chart-total", children: ["Peak: ", Math.max(...userChart.map((d) => d.value)).toLocaleString()] })] }), _jsx("div", { className: "chatsdk-chart-container", children: _jsx("div", { className: "chatsdk-bar-chart", children: userChart.map((point, i) => (_jsxs("div", { className: "chatsdk-bar-container", children: [_jsx("div", { className: "chatsdk-bar chatsdk-bar-blue", style: { height: `${(point.value / maxUserValue) * 100}%` }, children: _jsx("span", { className: "chatsdk-bar-tooltip", children: point.value.toLocaleString() }) }), _jsx("span", { className: "chatsdk-bar-label", children: point.label })] }, i))) }) })] })] }), _jsxs("div", { className: "chatsdk-bottom-row", children: [_jsxs("div", { className: "chatsdk-activity-card", children: [_jsxs("div", { className: "chatsdk-card-header", children: [_jsx("h3", { children: "Recent Activity" }), _jsx("button", { className: "chatsdk-view-all", children: "View all" })] }), _jsx("div", { className: "chatsdk-activity-list", children: recentActivity.map((item) => (_jsxs("div", { className: "chatsdk-activity-item", children: [_jsxs("div", { className: clsx('chatsdk-activity-icon', `chatsdk-activity-${item.type}`), children: [item.type === 'message' && (_jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" }) })), item.type === 'user' && (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "12", cy: "7", r: "4" })] })), item.type === 'channel' && (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "4", y1: "9", x2: "20", y2: "9" }), _jsx("line", { x1: "4", y1: "15", x2: "20", y2: "15" }), _jsx("line", { x1: "10", y1: "3", x2: "8", y2: "21" }), _jsx("line", { x1: "16", y1: "3", x2: "14", y2: "21" })] })), item.type === 'app' && (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" }), _jsx("line", { x1: "3", y1: "9", x2: "21", y2: "9" }), _jsx("line", { x1: "9", y1: "21", x2: "9", y2: "9" })] }))] }), _jsxs("div", { className: "chatsdk-activity-content", children: [_jsx("span", { className: "chatsdk-activity-title", children: item.title }), _jsx("span", { className: "chatsdk-activity-desc", children: item.description })] }), _jsx("span", { className: "chatsdk-activity-time", children: item.timestamp })] }, item.id))) })] }), _jsxs("div", { className: "chatsdk-channels-card", children: [_jsxs("div", { className: "chatsdk-card-header", children: [_jsx("h3", { children: "Top Channels" }), _jsx("button", { className: "chatsdk-view-all", children: "View all" })] }), _jsxs("div", { className: "chatsdk-channels-list", children: [_jsxs("div", { className: "chatsdk-channels-header-row", children: [_jsx("span", { children: "Channel" }), _jsx("span", { children: "Messages" }), _jsx("span", { children: "Members" })] }), topChannels.map((channel, i) => (_jsxs("div", { className: "chatsdk-channel-row", children: [_jsxs("span", { className: "chatsdk-channel-name", children: [_jsxs("span", { className: "chatsdk-channel-rank", children: ["#", i + 1] }), channel.name] }), _jsx("span", { className: "chatsdk-channel-stat", children: channel.messages.toLocaleString() }), _jsx("span", { className: "chatsdk-channel-stat", children: channel.members.toLocaleString() })] }, i)))] })] })] }), _jsx("style", { children: `
        .chatsdk-dashboard {
          padding: var(--chatsdk-space-6);
          background: var(--chatsdk-background-subtle);
          min-height: 100vh;
        }

        .chatsdk-dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--chatsdk-space-6);
        }

        .chatsdk-dashboard-title {
          margin: 0;
          font-size: var(--chatsdk-text-3xl);
          font-weight: 700;
          color: var(--chatsdk-foreground);
        }

        .chatsdk-dashboard-subtitle {
          margin: var(--chatsdk-space-1) 0 0;
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-dashboard-actions {
          display: flex;
          gap: var(--chatsdk-space-3);
        }

        .chatsdk-period-select {
          padding: var(--chatsdk-space-2) var(--chatsdk-space-3);
          background: var(--chatsdk-background);
          border: 1px solid var(--chatsdk-border);
          border-radius: var(--chatsdk-radius-md);
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-foreground);
          cursor: pointer;
        }

        .chatsdk-export-btn {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          padding: var(--chatsdk-space-2) var(--chatsdk-space-3);
          background: var(--chatsdk-primary);
          color: white;
          border: none;
          border-radius: var(--chatsdk-radius-md);
          font-size: var(--chatsdk-text-sm);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .chatsdk-export-btn:hover {
          background: var(--chatsdk-primary-hover);
        }

        .chatsdk-export-btn svg {
          width: 16px;
          height: 16px;
        }

        .chatsdk-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--chatsdk-space-4);
          margin-bottom: var(--chatsdk-space-6);
        }

        @media (max-width: 1200px) {
          .chatsdk-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .chatsdk-stat-card {
          display: flex;
          align-items: flex-start;
          gap: var(--chatsdk-space-4);
          padding: var(--chatsdk-space-5);
          background: var(--chatsdk-background);
          border-radius: var(--chatsdk-radius-xl);
          box-shadow: var(--chatsdk-shadow-sm);
          transition: all 0.2s ease;
        }

        .chatsdk-stat-card:hover {
          box-shadow: var(--chatsdk-shadow-md);
          transform: translateY(-2px);
        }

        .chatsdk-stat-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--chatsdk-radius-lg);
          flex-shrink: 0;
        }

        .chatsdk-stat-icon svg {
          width: 24px;
          height: 24px;
        }

        .chatsdk-stat-blue .chatsdk-stat-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .chatsdk-stat-green .chatsdk-stat-icon { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
        .chatsdk-stat-purple .chatsdk-stat-icon { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .chatsdk-stat-orange .chatsdk-stat-icon { background: rgba(249, 115, 22, 0.1); color: #f97316; }

        .chatsdk-stat-content {
          display: flex;
          flex-direction: column;
          gap: var(--chatsdk-space-1);
        }

        .chatsdk-stat-title {
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-stat-value {
          font-size: var(--chatsdk-text-2xl);
          font-weight: 700;
          color: var(--chatsdk-foreground);
        }

        .chatsdk-stat-change {
          font-size: var(--chatsdk-text-xs);
          font-weight: 500;
        }

        .chatsdk-stat-change.positive { color: #22c55e; }
        .chatsdk-stat-change.negative { color: #ef4444; }

        .chatsdk-charts-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--chatsdk-space-4);
          margin-bottom: var(--chatsdk-space-6);
        }

        @media (max-width: 1024px) {
          .chatsdk-charts-row {
            grid-template-columns: 1fr;
          }
        }

        .chatsdk-chart-card {
          padding: var(--chatsdk-space-5);
          background: var(--chatsdk-background);
          border-radius: var(--chatsdk-radius-xl);
          box-shadow: var(--chatsdk-shadow-sm);
        }

        .chatsdk-chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--chatsdk-space-4);
        }

        .chatsdk-chart-header h3 {
          margin: 0;
          font-size: var(--chatsdk-text-lg);
          font-weight: 600;
          color: var(--chatsdk-foreground);
        }

        .chatsdk-chart-total {
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-chart-container {
          height: 200px;
        }

        .chatsdk-bar-chart {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          height: 100%;
          gap: var(--chatsdk-space-2);
          padding-bottom: 24px;
        }

        .chatsdk-bar-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }

        .chatsdk-bar {
          width: 100%;
          max-width: 40px;
          border-radius: var(--chatsdk-radius-md) var(--chatsdk-radius-md) 0 0;
          transition: all 0.3s ease;
          position: relative;
          cursor: pointer;
        }

        .chatsdk-bar:hover {
          opacity: 0.8;
        }

        .chatsdk-bar-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 8px;
          background: var(--chatsdk-foreground);
          color: var(--chatsdk-background);
          font-size: 11px;
          border-radius: var(--chatsdk-radius-sm);
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease;
        }

        .chatsdk-bar:hover .chatsdk-bar-tooltip {
          opacity: 1;
        }

        .chatsdk-bar-purple { background: linear-gradient(180deg, #8b5cf6 0%, #6366f1 100%); }
        .chatsdk-bar-blue { background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%); }

        .chatsdk-bar-label {
          position: absolute;
          bottom: -24px;
          font-size: var(--chatsdk-text-xs);
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-bottom-row {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: var(--chatsdk-space-4);
        }

        @media (max-width: 1024px) {
          .chatsdk-bottom-row {
            grid-template-columns: 1fr;
          }
        }

        .chatsdk-activity-card,
        .chatsdk-channels-card {
          padding: var(--chatsdk-space-5);
          background: var(--chatsdk-background);
          border-radius: var(--chatsdk-radius-xl);
          box-shadow: var(--chatsdk-shadow-sm);
        }

        .chatsdk-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--chatsdk-space-4);
        }

        .chatsdk-card-header h3 {
          margin: 0;
          font-size: var(--chatsdk-text-lg);
          font-weight: 600;
          color: var(--chatsdk-foreground);
        }

        .chatsdk-view-all {
          background: none;
          border: none;
          color: var(--chatsdk-primary);
          font-size: var(--chatsdk-text-sm);
          font-weight: 500;
          cursor: pointer;
        }

        .chatsdk-view-all:hover {
          text-decoration: underline;
        }

        .chatsdk-activity-list {
          display: flex;
          flex-direction: column;
          gap: var(--chatsdk-space-3);
        }

        .chatsdk-activity-item {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          padding: var(--chatsdk-space-3);
          border-radius: var(--chatsdk-radius-lg);
          transition: background 0.15s ease;
        }

        .chatsdk-activity-item:hover {
          background: var(--chatsdk-muted);
        }

        .chatsdk-activity-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--chatsdk-radius-md);
          flex-shrink: 0;
        }

        .chatsdk-activity-icon svg {
          width: 18px;
          height: 18px;
        }

        .chatsdk-activity-message { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .chatsdk-activity-user { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .chatsdk-activity-channel { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
        .chatsdk-activity-app { background: rgba(249, 115, 22, 0.1); color: #f97316; }

        .chatsdk-activity-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .chatsdk-activity-title {
          font-size: var(--chatsdk-text-sm);
          font-weight: 500;
          color: var(--chatsdk-foreground);
        }

        .chatsdk-activity-desc {
          font-size: var(--chatsdk-text-xs);
          color: var(--chatsdk-muted-foreground);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chatsdk-activity-time {
          font-size: var(--chatsdk-text-xs);
          color: var(--chatsdk-muted-foreground);
          flex-shrink: 0;
        }

        .chatsdk-channels-list {
          display: flex;
          flex-direction: column;
          gap: var(--chatsdk-space-2);
        }

        .chatsdk-channels-header-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          padding: var(--chatsdk-space-2) var(--chatsdk-space-3);
          font-size: var(--chatsdk-text-xs);
          font-weight: 500;
          color: var(--chatsdk-muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .chatsdk-channel-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          padding: var(--chatsdk-space-3);
          border-radius: var(--chatsdk-radius-lg);
          transition: background 0.15s ease;
        }

        .chatsdk-channel-row:hover {
          background: var(--chatsdk-muted);
        }

        .chatsdk-channel-name {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          font-size: var(--chatsdk-text-sm);
          font-weight: 500;
          color: var(--chatsdk-foreground);
        }

        .chatsdk-channel-rank {
          color: var(--chatsdk-muted-foreground);
          font-weight: 400;
        }

        .chatsdk-channel-stat {
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
          font-variant-numeric: tabular-nums;
        }
      ` })] }));
};
export default Dashboard;
