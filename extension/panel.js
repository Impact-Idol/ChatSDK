// ChatSDK DevTools Panel Logic

let logs = [];
let messages = [];
let networkRequests = [];

// Tab switching
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;

    // Update active tab
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    // Show content
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Load tab data
    loadTabData(tabName);
  });
});

// Listen for logs from content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CHATSDK_LOG') {
    logs.push(message.payload);
    addLogEntry(message.payload);
    updateStatus();
  } else if (message.type === 'CHATSDK_NETWORK') {
    networkRequests.push(message.payload);
    addNetworkEntry(message.payload);
  }
});

function addLogEntry(log) {
  const logsList = document.getElementById('logs-list');
  const entry = document.createElement('div');
  entry.className = `log-entry ${log.level.toLowerCase()}`;

  const timestamp = new Date(log.timestamp).toLocaleTimeString();
  const module = log.module || 'core';
  const action = log.action ? ` → ${log.action}` : '';

  entry.innerHTML = `
    <div>
      <span class="log-timestamp">[${timestamp}]</span>
      <strong>${module}${action}</strong>: ${log.message}
    </div>
  `;

  if (log.metadata) {
    const meta = document.createElement('pre');
    meta.className = 'log-metadata';
    meta.textContent = JSON.stringify(log.metadata, null, 2);
    entry.appendChild(meta);
  }

  if (log.error) {
    const error = document.createElement('div');
    error.className = 'log-metadata';
    error.style.color = '#d32f2f';
    error.textContent = `Error: ${log.error.message}\n${log.error.stack || ''}`;
    entry.appendChild(error);
  }

  logsList.appendChild(entry);

  // Auto-scroll
  if (document.getElementById('autoscroll').checked) {
    logsList.scrollTop = logsList.scrollHeight;
  }
}

function addNetworkEntry(request) {
  const networkList = document.getElementById('network-list');
  const entry = document.createElement('div');
  entry.className = 'network-entry';

  const method = request.method || 'GET';
  const status = request.status || 'pending';
  const duration = request.duration ? `${request.duration.toFixed(2)}ms` : '...';

  entry.innerHTML = `
    <div>
      <span class="network-method ${method.toLowerCase()}">${method}</span>
      <span class="network-status ${status >= 200 && status < 300 ? 'success' : 'error'}">${status}</span>
      <strong>${request.url}</strong>
      <span style="color: #666; margin-left: 8px;">${duration}</span>
    </div>
  `;

  networkList.insertBefore(entry, networkList.firstChild);
}

function loadTabData(tabName) {
  updateStatus('Loading...');

  // Execute script in inspected window to get data
  const commands = {
    messages: 'window.__CHATSDK_DEVTOOLS__?.getMessages?.()',
    state: 'window.__CHATSDK_DEVTOOLS__?.getState?.()',
    performance: 'window.__CHATSDK_DEVTOOLS__?.getMetrics?.()',
    logs: 'window.__CHATSDK_DEVTOOLS__?.getLogs?.()',
  };

  const command = commands[tabName];
  if (!command) {
    updateStatus('Ready');
    return;
  }

  chrome.devtools.inspectedWindow.eval(command, (result, error) => {
    if (error) {
      console.error('Failed to load data:', error);
      updateStatus('Error loading data');
      showEmptyState(tabName, 'Error loading data. Make sure ChatSDK is initialized.');
      return;
    }

    if (!result) {
      showEmptyState(tabName, 'ChatSDK not detected. Ensure debug mode is enabled.');
      updateStatus('ChatSDK not detected');
      return;
    }

    updateStatus('Ready');

    if (tabName === 'messages') {
      renderMessages(result);
    } else if (tabName === 'state') {
      renderState(result);
    } else if (tabName === 'performance') {
      renderPerformance(result);
    } else if (tabName === 'logs') {
      renderLogs(result);
    }
  });
}

function renderMessages(messages) {
  const list = document.getElementById('messages-list');

  if (!messages || messages.length === 0) {
    showEmptyState('messages', 'No messages yet');
    return;
  }

  list.innerHTML = messages
    .reverse()
    .map(
      (msg) => `
    <div class="message-item">
      <div class="message-header">
        <span class="message-user">${msg.user?.displayName || msg.sendID || 'Unknown'}</span>
        <span class="message-time">${new Date(msg.createdAt || msg.sendTime).toLocaleString()}</span>
      </div>
      <div class="message-text">${msg.text || msg.content || '(no text)'}</div>
      <details>
        <summary>View JSON</summary>
        <pre class="message-json">${JSON.stringify(msg, null, 2)}</pre>
      </details>
    </div>
  `
    )
    .join('');
}

function renderState(state) {
  const tree = document.getElementById('state-tree');

  if (!state) {
    tree.textContent = 'ChatSDK state not available';
    return;
  }

  tree.textContent = JSON.stringify(state, null, 2);
}

function renderPerformance(metricsMap) {
  const tbody = document.getElementById('performance-body');

  if (!metricsMap || typeof metricsMap !== 'object') {
    showEmptyState('performance', 'No performance data available');
    return;
  }

  // Convert Map-like object to array
  const metrics = Object.entries(metricsMap);

  if (metrics.length === 0) {
    showEmptyState('performance', 'No performance metrics collected yet');
    return;
  }

  tbody.innerHTML = metrics
    .map(
      ([label, stats]) => `
    <tr>
      <td>${label}</td>
      <td>${stats.count}</td>
      <td>${stats.min.toFixed(2)}ms</td>
      <td>${stats.max.toFixed(2)}ms</td>
      <td>${stats.avg.toFixed(2)}ms</td>
      <td>${stats.p50.toFixed(2)}ms</td>
      <td>${stats.p95.toFixed(2)}ms</td>
      <td>${stats.p99.toFixed(2)}ms</td>
    </tr>
  `
    )
    .join('');
}

function renderLogs(logsData) {
  const logsList = document.getElementById('logs-list');

  if (!logsData || logsData.length === 0) {
    showEmptyState('logs', 'No logs yet. Enable debug mode: ?chatsdk_debug=true');
    return;
  }

  logsList.innerHTML = '';
  logsData.forEach((log) => addLogEntry(log));
}

function showEmptyState(tabId, message) {
  const container = document.getElementById(`${tabId}-list`) || document.getElementById(`${tabId}-table`);
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div>${message}</div>
      </div>
    `;
  }
}

function updateStatus(text) {
  const status = document.getElementById('status');
  if (text) {
    status.textContent = text;
  } else {
    status.textContent = `${logs.length} logs`;
  }
}

// Toolbar actions
document.getElementById('refresh').addEventListener('click', () => {
  const activeTab = document.querySelector('.tab.active').dataset.tab;
  loadTabData(activeTab);
});

document.getElementById('clear').addEventListener('click', () => {
  if (confirm('Clear all logs?')) {
    logs = [];
    document.getElementById('logs-list').innerHTML = '';
    chrome.devtools.inspectedWindow.eval('window.__CHATSDK_DEVTOOLS__?.clearLogs?.()');
    updateStatus('Logs cleared');
  }
});

document.getElementById('export').addEventListener('click', () => {
  chrome.devtools.inspectedWindow.eval('window.__CHATSDK_DEVTOOLS__?.exportLogs?.()', (logsJson) => {
    if (!logsJson) {
      alert('No logs to export');
      return;
    }

    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatsdk-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

// Initial load
loadTabData('logs');
updateStatus();

// Refresh every 2 seconds when performance tab is active
setInterval(() => {
  const activeTab = document.querySelector('.tab.active').dataset.tab;
  if (activeTab === 'performance' || activeTab === 'state') {
    loadTabData(activeTab);
  }
}, 2000);
