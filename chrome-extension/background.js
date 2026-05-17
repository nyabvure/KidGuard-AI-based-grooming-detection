// Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('KidGuard extension installed');
  
  // Set default badge
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_BADGE') {
    updateBadge(message.riskLevel);
  } else if (message.type === 'DOWNLOAD_EVIDENCE') {
    downloadFile(message.url, message.filename);
  }
  // Do NOT return true — none of these handlers send an async response,
  // and returning true would cause "message channel closed" errors.
});

// Update badge based on risk level
function updateBadge(riskLevel) {
  const badgeConfig = {
    none: { text: '', color: '#4CAF50' },
    low: { text: '!', color: '#FCD34D' },
    medium: { text: '⚠', color: '#FF9800' },
    high: { text: '🚨', color: '#F44336' }
  };

  const config = badgeConfig[riskLevel] || badgeConfig.none;
  
  chrome.action.setBadgeText({ text: config.text });
  chrome.action.setBadgeBackgroundColor({ color: config.color });
}

// Download evidence file
function downloadFile(url, filename) {
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: false
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Download failed:', chrome.runtime.lastError);
    } else {
      console.log('Evidence file downloaded:', downloadId);
    }
  });
}

// Periodic check for updates
chrome.alarms.create('checkStatus', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkStatus') {
    console.log('KidGuard: Periodic status check');
  }
});
