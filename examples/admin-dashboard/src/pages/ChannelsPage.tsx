import { useState, useEffect } from 'react';
import { ChatProvider } from '@chatsdk/react';
import { ChannelsTable, Channel } from '@chatsdk/react';
import { api } from '../services/api';
import { handleApiError, showError, showSuccess } from '../utils/errorHandler';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const response = await api.getChannels({
        page: currentPage,
        pageSize,
      });
      setChannels(response.channels || []);
      setTotalCount(response.total || 0);
    } catch (error) {
      const message = handleApiError(error);
      console.error('Error fetching channels:', error);
      setChannels([]);
      setTotalCount(0);
      if (!(error instanceof TypeError && error.message.includes('fetch'))) {
        showError(`Failed to load channels: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleChannelClick = (channel: Channel) => {
    console.log('Channel clicked:', channel);
    // In a real app, this might open a channel details modal or navigate to channel
  };

  const handleEditChannel = async (channel: Channel) => {
    console.log('Edit channel:', channel);
    // In a real app, this would open an edit modal with ability to update
    alert(`Edit channel: ${channel.name}\n\nThis would open an edit dialog.`);
  };

  const handleFreezeChannel = async (channel: Channel) => {
    try {
      const isFrozen = channel.status === 'frozen';
      await api.updateChannel(channel.id, {
        status: isFrozen ? 'active' : 'frozen',
      });
      showSuccess(`Channel ${channel.name} has been ${isFrozen ? 'unfrozen' : 'frozen'}`);
      await fetchChannels();
    } catch (error) {
      const message = handleApiError(error);
      showError(`Failed to update channel: ${message}`);
      console.error('Error updating channel:', error);
    }
  };

  const handleArchiveChannel = async (channel: Channel) => {
    try {
      await api.updateChannel(channel.id, { status: 'archived' });
      showSuccess(`Channel ${channel.name} has been archived`);
      await fetchChannels();
    } catch (error) {
      const message = handleApiError(error);
      showError(`Failed to archive channel: ${message}`);
      console.error('Error archiving channel:', error);
    }
  };

  const handleDeleteChannel = async (channel: Channel) => {
    if (!confirm(`Are you sure you want to delete ${channel.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteChannel(channel.id);
      showSuccess(`Channel ${channel.name} has been deleted`);
      await fetchChannels();
    } catch (error) {
      const message = handleApiError(error);
      showError(`Failed to delete channel: ${message}`);
      console.error('Error deleting channel:', error);
    }
  };

  const handleExportChannels = (channelIds: string[]) => {
    console.log('Export channels:', channelIds);
    const selectedChannels = channels.filter(c => channelIds.includes(c.id));
    alert(`Exporting ${selectedChannels.length} channel(s)\n\nThis would generate a CSV/JSON export.`);
  };

  const handleBulkAction = async (action: string, channelIds: string[]) => {
    console.log('Bulk action:', action, channelIds);

    if (action === 'freeze') {
      try {
        await Promise.all(
          channelIds.map(id => api.updateChannel(id, { status: 'frozen' }))
        );
        showSuccess(`Frozen ${channelIds.length} channel(s)`);
        await fetchChannels();
      } catch (error) {
        const message = handleApiError(error);
        showError(`Failed to freeze channels: ${message}`);
      }
    } else if (action === 'archive') {
      try {
        await Promise.all(
          channelIds.map(id => api.updateChannel(id, { status: 'archived' }))
        );
        showSuccess(`Archived ${channelIds.length} channel(s)`);
        await fetchChannels();
      } catch (error) {
        const message = handleApiError(error);
        showError(`Failed to archive channels: ${message}`);
      }
    } else if (action === 'delete') {
      if (confirm(`Are you sure you want to delete ${channelIds.length} channel(s)? This action cannot be undone.`)) {
        try {
          await Promise.all(channelIds.map(id => api.deleteChannel(id)));
          showSuccess(`Deleted ${channelIds.length} channel(s)`);
          await fetchChannels();
        } catch (error) {
          const message = handleApiError(error);
          showError(`Failed to delete channels: ${message}`);
        }
      }
    }
  };

  return (
    <ChatProvider apiKey={API_KEY} apiUrl={API_URL}>
      <ChannelsTable
        channels={channels}
        loading={loading}
        totalCount={totalCount}
        page={currentPage}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onChannelClick={handleChannelClick}
        onEditChannel={handleEditChannel}
        onFreezeChannel={handleFreezeChannel}
        onArchiveChannel={handleArchiveChannel}
        onDeleteChannel={handleDeleteChannel}
        onExportChannels={handleExportChannels}
        onBulkAction={handleBulkAction}
      />
    </ChatProvider>
  );
}
