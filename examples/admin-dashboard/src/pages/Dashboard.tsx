import { useState, useEffect } from 'react';
import { ChatProvider } from '@chatsdk/react';
import { Dashboard as DashboardComponent } from '@chatsdk/react';
import { api } from '../services/api';
import { handleApiError } from '../utils/errorHandler';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const data = await api.getDashboardStats();
        setDashboardData(data);
      } catch (error) {
        const message = handleApiError(error);
        console.error('Error fetching dashboard data:', error);
        // Set default empty data on error
        setDashboardData({
          stats: {
            totalUsers: 0,
            activeUsers: 0,
            totalMessages: 0,
            totalChannels: 0,
            userGrowth: 0,
            messageGrowth: 0,
          },
          messageChart: [],
          userChart: [],
          recentActivity: [],
          topChannels: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading || !dashboardData) {
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
      <DashboardComponent
        stats={dashboardData.stats}
        messageChart={dashboardData.messageChart}
        userChart={dashboardData.userChart}
        recentActivity={dashboardData.recentActivity}
        topChannels={dashboardData.topChannels}
      />
    </ChatProvider>
  );
}
