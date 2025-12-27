import { useState, useEffect } from 'react';
import { ChatProvider } from '@chatsdk/react';
import { ModerationQueue, ReportedContent, ModerationAction } from '@chatsdk/react';
import { api } from '../services/api';
import { handleApiError, showError, showSuccess } from '../utils/errorHandler';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export default function MessagesPage() {
  const [reports, setReports] = useState<ReportedContent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.getReportedMessages();
      setReports(response.reports || []);
    } catch (error) {
      const message = handleApiError(error);
      console.error('Error fetching reports:', error);
      setReports([]);
      if (!(error instanceof TypeError && error.message.includes('fetch'))) {
        showError(`Failed to load reports: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleReviewReport = (report: ReportedContent) => {
    console.log('Review report:', report);
    // In a real app, this would open a detailed view of the report
    alert(`Reviewing report ${report.id} from ${report.reporter.name}\n\nThis would open a detailed review modal.`);
  };

  const handleTakeAction = async (report: ReportedContent, action: ModerationAction, note?: string) => {
    try {
      await api.moderateMessage(report.id, action, note);

      const actionLabels: Record<ModerationAction, string> = {
        none: 'No action',
        warn: 'Warned',
        mute: 'Muted',
        ban: 'Banned',
        delete_message: 'Message deleted',
        shadow_ban: 'Shadow banned',
      };

      showSuccess(`Action taken: ${actionLabels[action]} for user ${report.reportedUser.name}`);
      await fetchReports();
    } catch (error) {
      const message = handleApiError(error);
      showError(`Failed to take action: ${message}`);
      console.error('Error taking action:', error);
    }
  };

  const handleDismissReport = async (report: ReportedContent) => {
    try {
      await api.dismissReport(report.id);
      showSuccess(`Report ${report.id} has been dismissed`);
      await fetchReports();
    } catch (error) {
      const message = handleApiError(error);
      showError(`Failed to dismiss report: ${message}`);
      console.error('Error dismissing report:', error);
    }
  };

  const handleViewUser = (userId: string) => {
    console.log('View user:', userId);
    alert(`Viewing user profile: ${userId}\n\nThis would navigate to the user detail page.`);
  };

  const handleViewChannel = (channelId: string) => {
    console.log('View channel:', channelId);
    alert(`Viewing channel: ${channelId}\n\nThis would navigate to the channel detail page.`);
  };

  const handleViewMessage = (messageId: string, channelId: string) => {
    console.log('View message:', messageId, channelId);
    alert(`Viewing message ${messageId} in channel ${channelId}\n\nThis would show the message in context.`);
  };

  return (
    <ChatProvider apiKey={API_KEY} apiUrl={API_URL}>
      <ModerationQueue
        reports={reports}
        loading={loading}
        onReviewReport={handleReviewReport}
        onTakeAction={handleTakeAction}
        onDismissReport={handleDismissReport}
        onViewUser={handleViewUser}
        onViewChannel={handleViewChannel}
        onViewMessage={handleViewMessage}
      />
    </ChatProvider>
  );
}
