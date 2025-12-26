import React, { useState } from 'react';

export interface AnalyticsData {
  mau: number;
  mauChange: number;
  dau: number;
  dauChange: number;
  totalMessages: number;
  messagesChange: number;
  activeChannels: number;
  channelsChange: number;
  avgSessionDuration: number;
  sessionChange: number;
  messagesByDay: { date: string; count: number }[];
  usersByDay: { date: string; count: number }[];
  topChannels: { name: string; messages: number; members: number }[];
  userRetention: { week: string; percentage: number }[];
  messageTypes: { type: string; count: number; percentage: number }[];
  peakHours: { hour: number; messages: number }[];
}

export interface AnalyticsDashboardProps {
  data: AnalyticsData;
  dateRange?: { start: Date; end: Date };
  onDateRangeChange?: (range: { start: Date; end: Date }) => void;
  loading?: boolean;
}

export function AnalyticsDashboard({
  data,
  dateRange,
  onDateRangeChange,
  loading = false,
}: AnalyticsDashboardProps) {
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'engagement' | 'content'>('overview');

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getMaxValue = (arr: { count: number }[] | { messages: number }[]): number => {
    return Math.max(...arr.map((item: any) => item.count || item.messages || 0));
  };

  const styles: Record<string, React.CSSProperties> = {
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
      position: 'relative' as const,
    },
    barLabel: {
      position: 'absolute' as const,
      bottom: '-24px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '10px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      whiteSpace: 'nowrap' as const,
    },
    tableCard: {
      padding: '24px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '12px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    th: {
      textAlign: 'left' as const,
      padding: '12px 16px',
      fontSize: '12px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      textTransform: 'uppercase' as const,
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
      textAlign: 'center' as const,
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
      position: 'relative' as const,
    },
    donutCenter: {
      position: 'absolute' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      textAlign: 'center' as const,
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
      flexDirection: 'column' as const,
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

  const getHeatmapColor = (value: number, max: number): string => {
    const intensity = max > 0 ? value / max : 0;
    if (intensity > 0.8) return 'var(--chatsdk-accent-color, #6366f1)';
    if (intensity > 0.6) return 'rgba(99, 102, 241, 0.7)';
    if (intensity > 0.4) return 'rgba(99, 102, 241, 0.5)';
    if (intensity > 0.2) return 'rgba(99, 102, 241, 0.3)';
    return 'var(--chatsdk-bg-tertiary, #e5e7eb)';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ ...styles.skeleton, width: '200px', height: '32px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ ...styles.skeleton, width: '80px', height: '36px' }} />
            ))}
          </div>
        </div>
        <div style={styles.statsGrid}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ ...styles.statCard }}>
              <div style={{ ...styles.skeleton, width: '100px', height: '16px', marginBottom: '12px' }} />
              <div style={{ ...styles.skeleton, width: '80px', height: '32px', marginBottom: '8px' }} />
              <div style={{ ...styles.skeleton, width: '60px', height: '16px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Analytics</h1>
        <div style={styles.controls}>
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              style={{
                ...styles.rangeButton,
                ...(selectedRange === range ? styles.rangeButtonActive : {}),
              }}
              onClick={() => setSelectedRange(range)}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.tabs}>
        {(['overview', 'engagement', 'content'] as const).map((tab) => (
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

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Monthly Active Users</div>
          <div style={styles.statValue}>{formatNumber(data.mau)}</div>
          <div style={{ ...styles.statChange, ...(data.mauChange >= 0 ? styles.positive : styles.negative) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {data.mauChange >= 0 ? (
                <polyline points="18 15 12 9 6 15" />
              ) : (
                <polyline points="6 9 12 15 18 9" />
              )}
            </svg>
            {Math.abs(data.mauChange)}% vs last period
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Daily Active Users</div>
          <div style={styles.statValue}>{formatNumber(data.dau)}</div>
          <div style={{ ...styles.statChange, ...(data.dauChange >= 0 ? styles.positive : styles.negative) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {data.dauChange >= 0 ? (
                <polyline points="18 15 12 9 6 15" />
              ) : (
                <polyline points="6 9 12 15 18 9" />
              )}
            </svg>
            {Math.abs(data.dauChange)}% vs last period
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Messages</div>
          <div style={styles.statValue}>{formatNumber(data.totalMessages)}</div>
          <div style={{ ...styles.statChange, ...(data.messagesChange >= 0 ? styles.positive : styles.negative) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {data.messagesChange >= 0 ? (
                <polyline points="18 15 12 9 6 15" />
              ) : (
                <polyline points="6 9 12 15 18 9" />
              )}
            </svg>
            {Math.abs(data.messagesChange)}% vs last period
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Active Channels</div>
          <div style={styles.statValue}>{formatNumber(data.activeChannels)}</div>
          <div style={{ ...styles.statChange, ...(data.channelsChange >= 0 ? styles.positive : styles.negative) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {data.channelsChange >= 0 ? (
                <polyline points="18 15 12 9 6 15" />
              ) : (
                <polyline points="6 9 12 15 18 9" />
              )}
            </svg>
            {Math.abs(data.channelsChange)}% vs last period
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Avg Session Duration</div>
          <div style={styles.statValue}>{formatDuration(data.avgSessionDuration)}</div>
          <div style={{ ...styles.statChange, ...(data.sessionChange >= 0 ? styles.positive : styles.negative) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {data.sessionChange >= 0 ? (
                <polyline points="18 15 12 9 6 15" />
              ) : (
                <polyline points="6 9 12 15 18 9" />
              )}
            </svg>
            {Math.abs(data.sessionChange)}% vs last period
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          <div style={styles.chartsGrid}>
            <div style={styles.chartCard}>
              <div style={styles.chartTitle}>Messages Over Time</div>
              <div style={styles.chart}>
                {data.messagesByDay.slice(-14).map((day, i) => {
                  const maxVal = getMaxValue(data.messagesByDay);
                  const height = maxVal > 0 ? (day.count / maxVal) * 100 : 0;
                  return (
                    <div
                      key={i}
                      style={{
                        ...styles.bar,
                        height: `${Math.max(height, 2)}%`,
                      }}
                      title={`${day.date}: ${day.count.toLocaleString()} messages`}
                    >
                      <div style={styles.barLabel}>
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={styles.chartCard}>
              <div style={styles.chartTitle}>Active Users Over Time</div>
              <div style={styles.chart}>
                {data.usersByDay.slice(-14).map((day, i) => {
                  const maxVal = getMaxValue(data.usersByDay);
                  const height = maxVal > 0 ? (day.count / maxVal) * 100 : 0;
                  return (
                    <div
                      key={i}
                      style={{
                        ...styles.bar,
                        height: `${Math.max(height, 2)}%`,
                        backgroundColor: 'var(--chatsdk-success-color, #10b981)',
                      }}
                      title={`${day.date}: ${day.count.toLocaleString()} users`}
                    >
                      <div style={styles.barLabel}>
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={styles.tableCard}>
            <div style={styles.chartTitle}>Top Channels</div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Channel</th>
                  <th style={styles.th}>Messages</th>
                  <th style={styles.th}>Members</th>
                  <th style={styles.th}>Activity</th>
                </tr>
              </thead>
              <tbody>
                {data.topChannels.map((channel, i) => {
                  const maxMessages = Math.max(...data.topChannels.map((c) => c.messages));
                  return (
                    <tr key={i}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--chatsdk-text-tertiary, #9ca3af)' }}>#</span>
                          {channel.name}
                        </div>
                      </td>
                      <td style={styles.td}>{channel.messages.toLocaleString()}</td>
                      <td style={styles.td}>{channel.members.toLocaleString()}</td>
                      <td style={{ ...styles.td, width: '200px' }}>
                        <div style={styles.progressBar}>
                          <div
                            style={{
                              ...styles.progressFill,
                              width: `${(channel.messages / maxMessages) * 100}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'engagement' && (
        <>
          <div style={styles.chartsGrid}>
            <div style={styles.chartCard}>
              <div style={styles.chartTitle}>User Retention</div>
              <div style={styles.chart}>
                {data.userRetention.map((week, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.bar,
                      height: `${week.percentage}%`,
                      backgroundColor:
                        week.percentage > 50
                          ? 'var(--chatsdk-success-color, #10b981)'
                          : week.percentage > 25
                          ? 'var(--chatsdk-warning-color, #f59e0b)'
                          : 'var(--chatsdk-error-color, #ef4444)',
                    }}
                    title={`${week.week}: ${week.percentage}% retention`}
                  >
                    <div style={styles.barLabel}>{week.week}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.chartCard}>
              <div style={styles.chartTitle}>Peak Activity Hours</div>
              <div style={styles.heatmapContainer}>
                {data.peakHours.map((hour, i) => {
                  const maxMessages = Math.max(...data.peakHours.map((h) => h.messages));
                  return (
                    <div
                      key={i}
                      style={{
                        ...styles.heatmapCell,
                        backgroundColor: getHeatmapColor(hour.messages, maxMessages),
                      }}
                      title={`${hour.hour}:00 - ${hour.messages.toLocaleString()} messages`}
                    >
                      {hour.hour}
                    </div>
                  );
                })}
              </div>
              <div style={styles.heatmapLabel}>Hour of Day (UTC)</div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'content' && (
        <div style={styles.chartsGrid}>
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>Message Types</div>
            <div style={styles.donutContainer}>
              <div style={styles.donut}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                  {data.messageTypes.reduce(
                    (acc, type, i) => {
                      const circumference = 2 * Math.PI * 60;
                      const offset = circumference * (1 - type.percentage / 100);
                      const rotation = acc.rotation;
                      acc.elements.push(
                        <circle
                          key={type.type}
                          cx="80"
                          cy="80"
                          r="60"
                          fill="none"
                          stroke={typeColors[i % typeColors.length]}
                          strokeWidth="20"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          transform={`rotate(${rotation} 80 80)`}
                        />
                      );
                      acc.rotation += (type.percentage / 100) * 360;
                      return acc;
                    },
                    { elements: [] as React.ReactNode[], rotation: -90 }
                  ).elements}
                </svg>
                <div style={styles.donutCenter}>
                  <div style={styles.donutValue}>{formatNumber(data.totalMessages)}</div>
                  <div style={styles.donutLabel}>Total</div>
                </div>
              </div>
              <div style={styles.legend}>
                {data.messageTypes.map((type, i) => (
                  <div key={type.type} style={styles.legendItem}>
                    <div
                      style={{
                        ...styles.legendDot,
                        backgroundColor: typeColors[i % typeColors.length],
                      }}
                    />
                    <span style={styles.legendText}>{type.type}</span>
                    <span style={styles.legendValue}>{type.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
