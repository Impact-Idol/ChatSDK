import React, { useState } from 'react';

export interface UsageMetric {
  name: string;
  current: number;
  limit: number;
  unit: string;
  overage?: number;
  price?: number;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'draft';
  downloadUrl?: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  limits: {
    mau: number;
    messages: number;
    storage: number;
    channels: number;
  };
}

export interface BillingUsageProps {
  currentPlan: Plan;
  usage: UsageMetric[];
  invoices: Invoice[];
  usageHistory: { date: string; mau: number; messages: number }[];
  nextBillingDate?: string;
  onUpgrade?: () => void;
  onDownloadInvoice?: (invoiceId: string) => void;
  loading?: boolean;
}

export function BillingUsage({
  currentPlan,
  usage,
  invoices,
  usageHistory,
  nextBillingDate,
  onUpgrade,
  onDownloadInvoice,
  loading = false,
}: BillingUsageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices'>('overview');

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getUsagePercentage = (current: number, limit: number): number => {
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'var(--chatsdk-error-color, #ef4444)';
    if (percentage >= 75) return 'var(--chatsdk-warning-color, #f59e0b)';
    return 'var(--chatsdk-accent-color, #6366f1)';
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return { bg: 'var(--chatsdk-success-light, #d1fae5)', text: 'var(--chatsdk-success-color, #10b981)' };
      case 'pending':
        return { bg: 'var(--chatsdk-warning-light, #fef3c7)', text: 'var(--chatsdk-warning-color, #f59e0b)' };
      case 'failed':
        return { bg: 'var(--chatsdk-error-light, #fee2e2)', text: 'var(--chatsdk-error-color, #ef4444)' };
      default:
        return { bg: 'var(--chatsdk-bg-tertiary, #e5e7eb)', text: 'var(--chatsdk-text-secondary, #6b7280)' };
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      padding: '24px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      minHeight: '100vh',
    },
    header: {
      marginBottom: '24px',
    },
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
    tabs: {
      display: 'flex',
      gap: '4px',
      padding: '4px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderRadius: '10px',
      marginBottom: '24px',
      width: 'fit-content',
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
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 340px',
      gap: '24px',
    },
    mainSection: {},
    sideSection: {},
    card: {
      padding: '24px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '12px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      marginBottom: '24px',
    },
    cardTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '20px',
    },
    planCard: {
      padding: '24px',
      background: 'linear-gradient(135deg, var(--chatsdk-accent-color, #6366f1) 0%, #8b5cf6 100%)',
      borderRadius: '12px',
      color: '#ffffff',
      marginBottom: '24px',
    },
    planHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '20px',
    },
    planName: {
      fontSize: '20px',
      fontWeight: 600,
      marginBottom: '4px',
    },
    planPrice: {
      fontSize: '32px',
      fontWeight: 700,
    },
    planInterval: {
      fontSize: '14px',
      opacity: 0.8,
    },
    upgradeButton: {
      padding: '8px 16px',
      borderRadius: '8px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: '#ffffff',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
    },
    planFeatures: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '8px',
    },
    planFeature: {
      padding: '6px 12px',
      borderRadius: '6px',
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      fontSize: '12px',
      fontWeight: 500,
    },
    usageItem: {
      marginBottom: '20px',
    },
    usageHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
    },
    usageName: {
      fontSize: '14px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
    },
    usageValue: {
      fontSize: '14px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
    },
    usageBar: {
      height: '8px',
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
      borderRadius: '4px',
      overflow: 'hidden',
    },
    usageFill: {
      height: '100%',
      borderRadius: '4px',
      transition: 'width 0.3s ease',
    },
    usageWarning: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginTop: '6px',
      fontSize: '12px',
      color: 'var(--chatsdk-warning-color, #f59e0b)',
    },
    chartContainer: {
      height: '200px',
      display: 'flex',
      alignItems: 'flex-end',
      gap: '8px',
      paddingTop: '20px',
    },
    chartBar: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '8px',
    },
    chartBarFill: {
      width: '100%',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      borderRadius: '4px 4px 0 0',
      transition: 'height 0.3s ease',
    },
    chartLabel: {
      fontSize: '10px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    billingInfo: {
      padding: '16px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderRadius: '8px',
      marginBottom: '16px',
    },
    billingRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
    },
    billingLabel: {
      fontSize: '13px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
    },
    billingValue: {
      fontSize: '14px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
    },
    invoiceTable: {
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
    badge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'capitalize' as const,
    },
    downloadLink: {
      color: 'var(--chatsdk-accent-color, #6366f1)',
      textDecoration: 'none',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    emptyState: {
      padding: '40px 24px',
      textAlign: 'center' as const,
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    summaryCard: {
      padding: '16px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderRadius: '10px',
      marginBottom: '12px',
    },
    summaryLabel: {
      fontSize: '12px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      marginBottom: '4px',
    },
    summaryValue: {
      fontSize: '24px',
      fontWeight: 700,
      color: 'var(--chatsdk-text-primary, #111827)',
    },
    summarySubtext: {
      fontSize: '12px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      marginTop: '4px',
    },
  };

  const maxUsageValue = Math.max(...usageHistory.map((h) => Math.max(h.mau, h.messages)));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Billing & Usage</h1>
        <p style={styles.subtitle}>Monitor your usage and manage billing</p>
      </div>

      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'overview' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'invoices' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('invoices')}
        >
          Invoices
        </button>
      </div>

      {activeTab === 'overview' && (
        <div style={styles.grid}>
          <div style={styles.mainSection}>
            <div style={styles.card}>
              <div style={styles.cardTitle}>Current Usage</div>
              {usage.map((metric) => {
                const percentage = getUsagePercentage(metric.current, metric.limit);
                const color = getUsageColor(percentage);
                return (
                  <div key={metric.name} style={styles.usageItem}>
                    <div style={styles.usageHeader}>
                      <span style={styles.usageName}>{metric.name}</span>
                      <span style={styles.usageValue}>
                        {formatNumber(metric.current)} / {formatNumber(metric.limit)} {metric.unit}
                      </span>
                    </div>
                    <div style={styles.usageBar}>
                      <div
                        style={{
                          ...styles.usageFill,
                          width: `${percentage}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    {percentage >= 80 && (
                      <div style={styles.usageWarning}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {percentage >= 100 ? 'Limit reached' : 'Approaching limit'}
                        {metric.overage && ` - ${formatCurrency(metric.overage)} overage`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}>Usage History (Last 14 Days)</div>
              <div style={styles.chartContainer}>
                {usageHistory.slice(-14).map((day, i) => (
                  <div key={i} style={styles.chartBar}>
                    <div
                      style={{
                        ...styles.chartBarFill,
                        height: `${maxUsageValue > 0 ? (day.messages / maxUsageValue) * 100 : 0}%`,
                        minHeight: '4px',
                      }}
                      title={`${day.messages.toLocaleString()} messages`}
                    />
                    <span style={styles.chartLabel}>
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={styles.sideSection}>
            <div style={styles.planCard}>
              <div style={styles.planHeader}>
                <div>
                  <div style={styles.planName}>{currentPlan.name}</div>
                  <div style={styles.planPrice}>
                    {formatCurrency(currentPlan.price)}
                    <span style={styles.planInterval}>/{currentPlan.interval === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                </div>
                <button style={styles.upgradeButton} onClick={onUpgrade}>
                  Upgrade
                </button>
              </div>
              <div style={styles.planFeatures}>
                {currentPlan.features.slice(0, 4).map((feature, i) => (
                  <span key={i} style={styles.planFeature}>
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Current Period Usage</div>
              <div style={styles.summaryValue}>
                {formatCurrency(
                  usage.reduce((sum, m) => sum + (m.overage || 0), currentPlan.price)
                )}
              </div>
              {nextBillingDate && (
                <div style={styles.summarySubtext}>Next billing on {formatDate(nextBillingDate)}</div>
              )}
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}>Plan Limits</div>
              <div style={styles.billingInfo}>
                <div style={styles.billingRow}>
                  <span style={styles.billingLabel}>Monthly Active Users</span>
                  <span style={styles.billingValue}>{formatNumber(currentPlan.limits.mau)}</span>
                </div>
                <div style={styles.billingRow}>
                  <span style={styles.billingLabel}>Messages/month</span>
                  <span style={styles.billingValue}>{formatNumber(currentPlan.limits.messages)}</span>
                </div>
                <div style={styles.billingRow}>
                  <span style={styles.billingLabel}>Storage</span>
                  <span style={styles.billingValue}>{currentPlan.limits.storage} GB</span>
                </div>
                <div style={{ ...styles.billingRow, marginBottom: 0 }}>
                  <span style={styles.billingLabel}>Channels</span>
                  <span style={styles.billingValue}>{formatNumber(currentPlan.limits.channels)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Invoice History</div>
          {invoices.length === 0 ? (
            <div style={styles.emptyState}>No invoices yet</div>
          ) : (
            <table style={styles.invoiceTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Invoice</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const statusColor = getStatusColor(invoice.status);
                  return (
                    <tr key={invoice.id}>
                      <td style={styles.td}>#{invoice.id}</td>
                      <td style={styles.td}>{formatDate(invoice.date)}</td>
                      <td style={styles.td}>{formatCurrency(invoice.amount)}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor: statusColor.bg,
                            color: statusColor.text,
                          }}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {invoice.downloadUrl && (
                          <span
                            style={styles.downloadLink}
                            onClick={() => onDownloadInvoice?.(invoice.id)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
