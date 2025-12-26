import React from 'react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  color,
}) => {
  const colorClasses = {
    blue: 'chatsdk-stat-blue',
    green: 'chatsdk-stat-green',
    purple: 'chatsdk-stat-purple',
    orange: 'chatsdk-stat-orange',
  };

  return (
    <div className={clsx('chatsdk-stat-card', colorClasses[color])}>
      <div className="chatsdk-stat-icon">{icon}</div>
      <div className="chatsdk-stat-content">
        <span className="chatsdk-stat-title">{title}</span>
        <span className="chatsdk-stat-value">{value}</span>
        {change !== undefined && (
          <span className={clsx('chatsdk-stat-change', change >= 0 ? 'positive' : 'negative')}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% {changeLabel}
          </span>
        )}
      </div>
    </div>
  );
};

interface ActivityItem {
  id: string;
  type: 'message' | 'user' | 'channel' | 'app';
  title: string;
  description: string;
  timestamp: string;
}

interface ChartDataPoint {
  label: string;
  value: number;
}

export interface DashboardProps {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalMessages: number;
    totalChannels: number;
    userGrowth: number;
    messageGrowth: number;
  };
  messageChart: ChartDataPoint[];
  userChart: ChartDataPoint[];
  recentActivity: ActivityItem[];
  topChannels: { name: string; messages: number; members: number }[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  messageChart,
  userChart,
  recentActivity,
  topChannels,
}) => {
  const maxMessageValue = Math.max(...messageChart.map((d) => d.value), 1);
  const maxUserValue = Math.max(...userChart.map((d) => d.value), 1);

  return (
    <div className="chatsdk-dashboard">
      {/* Header */}
      <div className="chatsdk-dashboard-header">
        <div>
          <h1 className="chatsdk-dashboard-title">Dashboard</h1>
          <p className="chatsdk-dashboard-subtitle">Welcome back! Here's what's happening.</p>
        </div>
        <div className="chatsdk-dashboard-actions">
          <select className="chatsdk-period-select">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="chatsdk-export-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="chatsdk-stats-grid">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          change={stats.userGrowth}
          changeLabel="vs last month"
          color="blue"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          title="Active Users (24h)"
          value={stats.activeUsers.toLocaleString()}
          color="green"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <StatCard
          title="Total Messages"
          value={stats.totalMessages.toLocaleString()}
          change={stats.messageGrowth}
          changeLabel="vs last month"
          color="purple"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
            </svg>
          }
        />
        <StatCard
          title="Channels"
          value={stats.totalChannels.toLocaleString()}
          color="orange"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          }
        />
      </div>

      {/* Charts Row */}
      <div className="chatsdk-charts-row">
        {/* Messages Chart */}
        <div className="chatsdk-chart-card">
          <div className="chatsdk-chart-header">
            <h3>Messages</h3>
            <span className="chatsdk-chart-total">
              {messageChart.reduce((a, b) => a + b.value, 0).toLocaleString()} total
            </span>
          </div>
          <div className="chatsdk-chart-container">
            <div className="chatsdk-bar-chart">
              {messageChart.map((point, i) => (
                <div key={i} className="chatsdk-bar-container">
                  <div
                    className="chatsdk-bar chatsdk-bar-purple"
                    style={{ height: `${(point.value / maxMessageValue) * 100}%` }}
                  >
                    <span className="chatsdk-bar-tooltip">{point.value.toLocaleString()}</span>
                  </div>
                  <span className="chatsdk-bar-label">{point.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Users Chart */}
        <div className="chatsdk-chart-card">
          <div className="chatsdk-chart-header">
            <h3>Active Users</h3>
            <span className="chatsdk-chart-total">
              Peak: {Math.max(...userChart.map((d) => d.value)).toLocaleString()}
            </span>
          </div>
          <div className="chatsdk-chart-container">
            <div className="chatsdk-bar-chart">
              {userChart.map((point, i) => (
                <div key={i} className="chatsdk-bar-container">
                  <div
                    className="chatsdk-bar chatsdk-bar-blue"
                    style={{ height: `${(point.value / maxUserValue) * 100}%` }}
                  >
                    <span className="chatsdk-bar-tooltip">{point.value.toLocaleString()}</span>
                  </div>
                  <span className="chatsdk-bar-label">{point.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="chatsdk-bottom-row">
        {/* Recent Activity */}
        <div className="chatsdk-activity-card">
          <div className="chatsdk-card-header">
            <h3>Recent Activity</h3>
            <button className="chatsdk-view-all">View all</button>
          </div>
          <div className="chatsdk-activity-list">
            {recentActivity.map((item) => (
              <div key={item.id} className="chatsdk-activity-item">
                <div className={clsx('chatsdk-activity-icon', `chatsdk-activity-${item.type}`)}>
                  {item.type === 'message' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
                    </svg>
                  )}
                  {item.type === 'user' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                  {item.type === 'channel' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="4" y1="9" x2="20" y2="9" />
                      <line x1="4" y1="15" x2="20" y2="15" />
                      <line x1="10" y1="3" x2="8" y2="21" />
                      <line x1="16" y1="3" x2="14" y2="21" />
                    </svg>
                  )}
                  {item.type === 'app' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                  )}
                </div>
                <div className="chatsdk-activity-content">
                  <span className="chatsdk-activity-title">{item.title}</span>
                  <span className="chatsdk-activity-desc">{item.description}</span>
                </div>
                <span className="chatsdk-activity-time">{item.timestamp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Channels */}
        <div className="chatsdk-channels-card">
          <div className="chatsdk-card-header">
            <h3>Top Channels</h3>
            <button className="chatsdk-view-all">View all</button>
          </div>
          <div className="chatsdk-channels-list">
            <div className="chatsdk-channels-header-row">
              <span>Channel</span>
              <span>Messages</span>
              <span>Members</span>
            </div>
            {topChannels.map((channel, i) => (
              <div key={i} className="chatsdk-channel-row">
                <span className="chatsdk-channel-name">
                  <span className="chatsdk-channel-rank">#{i + 1}</span>
                  {channel.name}
                </span>
                <span className="chatsdk-channel-stat">{channel.messages.toLocaleString()}</span>
                <span className="chatsdk-channel-stat">{channel.members.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
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
      `}</style>
    </div>
  );
};

export default Dashboard;
