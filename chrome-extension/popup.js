// Popup Script
document.addEventListener('DOMContentLoaded', async () => {
  const DASHBOARD_URL = (window.KIDGUARD_CONFIG && window.KIDGUARD_CONFIG.DASHBOARD_URL) || 'http://localhost:3000';

  // Load saved configuration
  chrome.storage.local.get(['parentId', 'childName', 'conversationLog'], (result) => {
    if (result.parentId) {
      document.getElementById('parent-id').value = result.parentId;
    }
    if (result.childName) {
      document.getElementById('child-name').value = result.childName;
    }

    // Display conversation stats
    if (result.conversationLog && result.conversationLog.length > 0) {
      document.getElementById('message-count').textContent = result.conversationLog.length;

      const lastMessage = result.conversationLog[result.conversationLog.length - 1];
      const lastTime = new Date(lastMessage.timestamp);
      document.getElementById('last-activity').textContent = formatTimeAgo(lastTime);

      // FIX 10: Status based only on messages in the last 30 minutes,
      // so stale high-risk alerts from hours ago don't keep the badge red.
      const cutoff = Date.now() - 30 * 60 * 1000;
      const recentMessages = result.conversationLog.filter(
        msg => new Date(msg.timestamp).getTime() >= cutoff
      );

      const highestRisk = recentMessages.reduce((max, msg) => {
        const level = msg.analysis && msg.analysis.riskLevel;
        if (level === 'high') return 'high';
        if (level === 'medium' && max !== 'high') return 'medium';
        return max;
      }, 'monitoring');

      updateStatus(highestRisk);
    } else {
      updateStatus('monitoring');
    }
  });

  // Save configuration
  document.getElementById('save-config').addEventListener('click', () => {
    const parentId = document.getElementById('parent-id').value.trim();
    const childName = document.getElementById('child-name').value.trim();

    if (parentId && childName) {
      chrome.storage.local.set({ parentId, childName }, () => {
        showNotification('Settings saved successfully!', 'success');
      });
    } else {
      showNotification('Please fill in all fields', 'error');
    }
  });

  // Open dashboard
  document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: DASHBOARD_URL });
  });

  // View logs
  document.getElementById('view-logs').addEventListener('click', () => {
    chrome.storage.local.get(['conversationLog'], (result) => {
      if (result.conversationLog && result.conversationLog.length > 0) {
        downloadLogs(result.conversationLog);
      } else {
        showNotification('No logs available yet', 'info');
      }
    });
  });

  // Query active tab for status
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab && tab.url && tab.url.includes('roblox.com')) {
    chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' }, (response) => {
      if (response) {
        document.getElementById('status-text').textContent = 'Monitoring Active';
        document.getElementById('status-detail').textContent = `Watching Roblox chat`;
      }
    });
  }
});

function updateStatus(riskLevel) {
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const statusDetail = document.getElementById('status-detail');

  const statusConfig = {
    monitoring: {
      class: 'status-monitoring',
      text: 'Monitoring Active',
      detail: 'No risks detected'
    },
    low: {
      class: 'status-low',
      text: 'Low Risk',
      detail: 'Low risk patterns detected'
    },
    medium: {
      class: 'status-warning',
      text: 'Caution',
      detail: 'Medium risk patterns detected'
    },
    high: {
      class: 'status-danger',
      text: 'Alert!',
      detail: 'High risk - Parent notified'
    }
  };

  const config = statusConfig[riskLevel] || statusConfig.monitoring;
  
  statusIndicator.className = `status-indicator ${config.class}`;
  statusText.textContent = config.text;
  statusDetail.textContent = config.detail;
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function showNotification(message, type) {
  const statusDetail = document.getElementById('status-detail');
  statusDetail.textContent = message;
  statusDetail.style.color = type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3';
  
  setTimeout(() => {
    statusDetail.style.color = '';
  }, 3000);
}

function downloadLogs(logs) {
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download({
    url: url,
    filename: `kidguard-logs-${Date.now()}.json`,
    saveAs: false
  }, () => {
    URL.revokeObjectURL(url);
    showNotification('Logs downloaded', 'success');
  });
}
