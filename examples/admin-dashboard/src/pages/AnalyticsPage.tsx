import { useState, useEffect } from 'react';
import { ChatProvider } from '@chatsdk/react';
import { AnalyticsDashboard, AnalyticsData } from '@chatsdk/react';
import { api } from '../services/api';
import { handleApiError } from '../utils/errorHandler';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await api.getAnalytics();
        setAnalyticsData(data);
      } catch (error) {
        const message = handleApiError(error);
        console.error('Error fetching analytics:', error);
        // Set default empty data on error
        setAnalyticsData({
          mau: 0,
          mauChange: 0,
          dau: 0,
          dauChange: 0,
          totalMessages: 0,
          messagesChange: 0,
          activeChannels: 0,
          channelsChange: 0,
          avgSessionDuration: 0,
          sessionChange: 0,
          messagesByDay: [],
          usersByDay: [],
          topChannels: [],
          userRetention: [],
          messageTypes: [],
          peakHours: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (!analyticsData) {
    return (
      <ChatProvider apiKey={API_KEY} apiUrl={API_URL}>
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </ChatProvider>
    );
  }

  return (
    <ChatProvider apiKey={API_KEY} apiUrl={API_URL}>
      <AnalyticsDashboard data={analyticsData} loading={loading} />
    </ChatProvider>
  );
}
