import { useState, useEffect } from 'react';
import { ChatProvider } from '@chatsdk/react';
import { AuditLog, AuditLogEntry } from '@chatsdk/react';
import { api } from '../services/api';
import { handleApiError, showError } from '../utils/errorHandler';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await api.getAuditLogs({
        page: currentPage,
        pageSize,
      });
      setEntries(response.entries || []);
      setTotalCount(response.total || 0);
    } catch (error) {
      const message = handleApiError(error);
      console.error('Error fetching audit logs:', error);
      setEntries([]);
      setTotalCount(0);
      if (!(error instanceof TypeError && error.message.includes('fetch'))) {
        showError(`Failed to load audit logs: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleEntryClick = (entry: AuditLogEntry) => {
    console.log('Entry clicked:', entry);
    alert(`Audit Entry Details:\n\nAction: ${entry.action}\nActor: ${entry.actor.name}\nTimestamp: ${new Date(entry.timestamp).toLocaleString()}\nIP: ${entry.ipAddress}\nLocation: ${entry.location}\n\nClick OK to view full details in a modal.`);
  };

  const handleExport = async () => {
    console.log('Export audit log');
    try {
      // In a real app, this would trigger a file download
      alert('Audit log export\n\nExporting events as CSV...\n\nFormat:\n• Timestamp\n• Action\n• Actor\n• Target\n• Severity\n• IP Address\n• Location\n\nDownload would start automatically.');
    } catch (error) {
      const message = handleApiError(error);
      showError(`Failed to export audit logs: ${message}`);
    }
  };

  return (
    <ChatProvider apiKey={API_KEY} apiUrl={API_URL}>
      <AuditLog
        entries={entries}
        loading={loading}
        totalCount={totalCount}
        page={currentPage}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onEntryClick={handleEntryClick}
        onExport={handleExport}
      />
    </ChatProvider>
  );
}
