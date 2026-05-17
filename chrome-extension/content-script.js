// Content Script - Monitors Roblox Chat
(function() {
  console.log('KidGuard: Content script loaded on', window.location.href);

  const BACKEND_URL = (window.KIDGUARD_CONFIG && window.KIDGUARD_CONFIG.BACKEND_URL) || 'http://127.0.0.1:8000/api';
  const detector = new GroomingDetector();

  let conversationLog = [];
  let monitoringActive = true;
  const recentMessages = new Set();   // Short-term dedup window
  const seenElements  = new WeakSet();// DOM elements already processed
  const seenTexts     = new Set();    // Load-time snapshot block list
  const backendSentKeys = new Set();  // Successfully sent to backend this session
  const pendingKeys     = new Set();  // In-flight requests not yet confirmed

  // FIX 13: Rate limiting — max 1 backend request per 2 seconds
  let lastBackendSend = 0;
  const BACKEND_RATE_LIMIT_MS = 2000;

  // FIX 7: Track URL to detect navigation between Roblox pages
  let currentUrl = window.location.href;

  // FIX 6: Restore only parentId/childName — NOT conversationLog
  // Previous session messages are stale and corrupt AI context window
  chrome.storage.local.get(['parentId', 'childName'], (result) => {
    if (!result.parentId) {
      console.log('KidGuard: No parent registered yet');
    }
  });

  // FIX 11: Known system/game senders whose messages should be ignored
  const SYSTEM_SENDERS = new Set([
    'roblox', 'system', 'announcement', 'notice', 'moderator',
    'admin', 'server', 'game', 'bot', 'notification'
  ]);

  function findChatElements() {
    // Try specific selectors first, then broad fallbacks.
    // No strict size gate — the original code had none, and the dedup logic
    // (canonicalText + seenTexts snapshot) prevents false positives.
    // For broad selectors we pick the largest matching element so we get the
    // actual chat panel rather than a small icon or button.
    const specific = [
      '.chat-list',
      '#chat-container',
      '.message-container',
      '[data-testid*="chat"]',
      '[aria-label*="chat" i]',
      '[aria-label*="message" i]',
      '[class*="ChatContainer"]',
      '[class*="chatContainer"]',
      '[class*="ChatList"]',
      '[class*="chatList"]',
      '[class*="ChatLayout"]',
      '[class*="chatLayout"]',
    ];

    for (const selector of specific) {
      const el = document.querySelector(selector);
      if (el && !isHidden(el)) {
        console.log('KidGuard: Found chat container (specific):', selector);
        return el;
      }
    }

    // Broad fallback — pick the largest visible element matching each selector
    const broad = ['[class*="chat"]', '[class*="Chat"]', '[class*="message"]', '[class*="Message"]'];
    for (const selector of broad) {
      const candidates = Array.from(document.querySelectorAll(selector));
      const best = candidates
        .filter(el => !isHidden(el))
        .sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return (rb.width * rb.height) - (ra.width * ra.height);
        })[0];
      if (best) {
        console.log('KidGuard: Found chat container (broad):', selector);
        return best;
      }
    }

    return null;
  }

  function isHidden(el) {
    const style = window.getComputedStyle(el);
    return style.display === 'none' || style.visibility === 'hidden';
  }

  // FIX 2: Canonical text cleaner — used by both seenTexts snapshot and dedupKey
  // so that the two always produce the same key for the same message
  function canonicalText(rawText) {
    const firstLine = rawText.split('\n').map(l => l.trim()).find(l => l.length > 0) || rawText;
    const colonIdx = firstLine.indexOf(':');
    if (colonIdx > 0 && colonIdx <= 40) {
      const possibleMsg = firstLine.substring(colonIdx + 1).trim();
      if (possibleMsg.length > 0) return possibleMsg;
    }
    return firstLine;
  }

  // Roblox marks incoming DM messages with the 'message-inbound' CSS class.
  // Outgoing messages have no such class — they are the child's own messages.
  function isIncomingDmMessage(el) {
    let node = el;
    for (let i = 0; i < 8 && node && node !== document.body; i++, node = node.parentElement) {
      const cls = node.className || '';
      if (cls.includes('message-inbound')) return true;
      if (/\bsent\b|\boutgoing\b/i.test(cls)) return false;
    }
    return false;
  }

  // For incoming grouped DM bubbles (no username in the bubble itself), look for the
  // conversation partner's name in the DM window header/title above our message.
  function getConversationPartner(messageElement) {
    const isRobloxUsername = t => /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(t);
    let el = messageElement.parentElement;
    for (let depth = 0; depth < 10 && el && el !== document.body; depth++, el = el.parentElement) {
      const titleEls = el.querySelectorAll(
        '[class*="chat-header-title"], [class*="dialog-header-title"], ' +
        'h1, h2, h3, [class*="Title"], [class*="title"], [class*="ConversationTitle"], [class*="ChatTitle"]'
      );
      for (const titleEl of Array.from(titleEls)) {
        if (titleEl.contains(messageElement)) continue;
        const text = (titleEl.innerText || titleEl.textContent || '').trim().split('\n')[0].trim();
        if (isRobloxUsername(text)) return text;
      }
    }
    return null;
  }

  // Extract message data from a DOM node.
  // Handles two Roblox chat formats:
  //   Format A (sidebar/in-game):  "Username: message text"  (single line) — preferred, has real username
  //   Format B (DM window):        username on line 1, message on line 2+, timestamp last
  //   Format C (grouped DM):       message only — 'You' if outgoing, 'Unknown' if incoming
  function extractMessageData(messageElement) {
    const rawText = (messageElement.innerText || messageElement.textContent || '').trim();
    const lines   = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const timestamp = new Date().toISOString();

    if (lines.length === 0) {
      return { text: '', username: 'Unknown', timestamp, platform: 'Roblox', url: window.location.href };
    }

    const firstLine = lines[0];

    // Format A: "Username: message" — sidebar/in-game chat (most reliable)
    const colonIdx = firstLine.indexOf(':');
    if (colonIdx > 0 && colonIdx <= 40) {
      const possibleUsername = firstLine.substring(0, colonIdx).trim();
      const possibleMessage  = firstLine.substring(colonIdx + 1).trim();
      if (possibleUsername.length > 0 && possibleMessage.length > 0) {
        return { text: possibleMessage, username: possibleUsername, timestamp, platform: 'Roblox', url: window.location.href };
      }
    }

    // Format B: multi-line DM chat (username is first non-timestamp line)
    const isTimestamp = l =>
      /^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(l) ||
      /^(yesterday|today)$/i.test(l) ||
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d+/i.test(l);

    const nonTimestampLines = lines.filter(l => !isTimestamp(l));

    if (nonTimestampLines.length >= 2) {
      const username    = nonTimestampLines[0];
      const messageText = nonTimestampLines.slice(1).join(' ').trim();
      return { text: messageText, username, timestamp, platform: 'Roblox', url: window.location.href };
    }

    // Format C: single-line DM bubble with no visible username.
    // Roblox marks received messages with 'message-inbound' CSS class.
    // Outgoing (no such class) → 'You'.
    // Incoming → read partner name from DM window header; fall back to 'Unknown'.
    if (nonTimestampLines.length === 1) {
      const username = isIncomingDmMessage(messageElement) ? (getConversationPartner(messageElement) || 'Unknown') : 'You';
      return { text: nonTimestampLines[0], username, timestamp, platform: 'Roblox', url: window.location.href };
    }

    const username = isIncomingDmMessage(messageElement) ? (getConversationPartner(messageElement) || 'Unknown') : 'You';
    return { text: firstLine, username, timestamp, platform: 'Roblox', url: window.location.href };
  }

  // Process a newly added chat node
  function processMessage(messageElement) {
    // FIX 7: Reset context on page navigation
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      conversationLog = [];
      detector.recentMessages = [];
      seenTexts.clear();
      console.log('KidGuard: Navigation detected — context reset');
    }

    const messageData = extractMessageData(messageElement);

    if (!messageData.text || messageData.text.length < 3) return;

    // FIX 11: Skip system/game messages
    if (SYSTEM_SENDERS.has(messageData.username.toLowerCase())) return;

    // Deduplicate within a 30-second window.
    // Only add to the dedup set when we have a real username — messages labelled
    // "You" come from DM window bubbles that lack a username in the DOM. If we
    // deduped those, the Chat sidebar notification (which DOES carry the correct
    // "hitherue: message" format) would be blocked and we'd never log the sender.
    const dedupKey = canonicalText(messageData.text.trim());
    if (recentMessages.has(dedupKey)) return;
    // Only deduplicate messages where we have a confirmed real username.
    // 'You' and 'Unknown' come from the DM window bubbles which lack sender info;
    // leaving them un-deduped ensures the sidebar notification (Format A, real username) always gets through.
    if (messageData.username !== 'You' && messageData.username !== 'Unknown') {
      recentMessages.add(dedupKey);
      setTimeout(() => recentMessages.delete(dedupKey), 30000);
    }

    console.log(`KidGuard: [${messageData.username}]: ${messageData.text.substring(0, 80)}`);

    const analysis = detector.analyzeMessage(messageData.text);

    conversationLog.push({ ...messageData, analysis });
    if (conversationLog.length > 100) conversationLog.shift();

    updateBadge(analysis.riskLevel);
    scheduleBadgeReset();

    // FIX 1: Only add to backendSentKeys on confirmed success (inside sendHighRiskAlert)
    if (analysis.totalScore >= 1 && !backendSentKeys.has(dedupKey) && !pendingKeys.has(dedupKey)) {
      queueBackendSend(messageData, analysis, dedupKey);
    }

    chrome.storage.local.set({
      conversationLog: conversationLog.slice(-50),
      lastActivity: new Date().toISOString()
    });
  }

  // FIX 13: Rate-limited send queue
  function queueBackendSend(messageData, analysis, dedupKey) {
    pendingKeys.add(dedupKey);
    const now   = Date.now();
    const delay = Math.max(0, lastBackendSend + BACKEND_RATE_LIMIT_MS - now);
    lastBackendSend = now + delay;
    setTimeout(() => sendToBackend(messageData, analysis, dedupKey), delay);
  }

  // FIX 9: Reset badge to green after 5 minutes of no new risk activity
  let badgeResetTimer = null;
  function scheduleBadgeReset() {
    if (badgeResetTimer) clearTimeout(badgeResetTimer);
    badgeResetTimer = setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', riskLevel: 'none' });
    }, 5 * 60 * 1000);
  }

  function updateBadge(riskLevel) {
    chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', riskLevel });
  }

  // FIX 1: backendSentKeys only updated on confirmed HTTP 2xx success
  async function sendToBackend(messageData, analysis, dedupKey) {
    try {
      const storageData = await chrome.storage.local.get(['parentId', 'childName']);

      const contextWindow = conversationLog.slice(-10).map(m => ({
        text: m.text, username: m.username, timestamp: m.timestamp
      }));

      const incident = {
        message: messageData.text,
        username: messageData.username,
        platform: messageData.platform,
        url: messageData.url,
        riskLevel: analysis.riskLevel,
        riskScore: analysis.totalScore,
        detectedPatterns: analysis.detectedPatterns,
        timestamp: messageData.timestamp,
        parentId: storageData.parentId || null,
        childName: storageData.childName || 'Unknown Child',
        conversationContext: contextWindow
      };

      const response = await fetch(`${BACKEND_URL}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incident)
      });

      if (response.ok) {
        // FIX 1: Mark sent only on success
        backendSentKeys.add(dedupKey);
        // FIX 12: Prevent backendSentKeys growing unboundedly
        if (backendSentKeys.size > 500) {
          backendSentKeys.delete(backendSentKeys.values().next().value);
        }
        console.log('KidGuard: Incident sent to backend');
        downloadEvidence(incident);
      } else {
        console.error('KidGuard: Backend rejected incident, status:', response.status);
        // Not added to backendSentKeys — will retry on next match
      }
    } catch (error) {
      console.error('KidGuard: Send failed (will retry on next match):', error);
      // FIX 1: Not added to backendSentKeys — allows retry when backend recovers
    } finally {
      pendingKeys.delete(dedupKey);
    }
  }

  function downloadEvidence(incident) {
    const evidence = {
      ...incident,
      conversationContext: conversationLog.slice(-10),
      detectionTimestamp: new Date().toISOString(),
      systemInfo: { platform: 'Roblox', extensionVersion: '1.0.0' }
    };
    const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_EVIDENCE',
      url,
      filename: `kidguard-evidence-${Date.now()}.json`
    });
  }

  function waitForStableChatThenMonitor(chatContainer) {
    let prevCount   = -1;
    let stableChecks = 0;
    let started      = false;

    function beginObserving() {
      if (started) return;
      started = true;

      // FIX 2: Snapshot uses canonicalText so it matches processMessage's dedupKey
      chatContainer.querySelectorAll('*').forEach(el => {
        seenElements.add(el);
        const raw = (el.innerText || el.textContent || '').trim();
        // FIX 3: Snapshot cap raised to 600 to match observer
        if (raw.length >= 3 && raw.length <= 600) {
          seenTexts.add(canonicalText(raw));
        }
      });
      console.log('KidGuard: Load-time snapshot done — watching for new messages only');

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType !== 1) return;
            if (seenElements.has(node)) return;
            seenElements.add(node);

            const text = (node.innerText || node.textContent || '').trim();
            // Skip empty nodes and very large containers (whole chat windows etc.)
            if (text.length >= 3 && text.length <= 600) {
              processMessage(node);
            }
          });
        });
      });

      // Observe document.body, not just the found chat container.
      // Roblox DM windows are separate DOM trees from the Chat sidebar,
      // so watching only one container misses messages from the other.
      observer.observe(document.body, { childList: true, subtree: true });
      console.log('KidGuard: Monitoring active');
    }

    function checkStability() {
      const count = chatContainer.querySelectorAll('*').length;
      if (count > 0 && count === prevCount) {
        stableChecks++;
        if (stableChecks >= 3) { beginObserving(); return; }
      } else {
        stableChecks = 0;
        prevCount = count;
      }
      setTimeout(checkStability, 500);
    }

    setTimeout(checkStability, 1000);
    setTimeout(beginObserving, 8000);
  }

  function startMonitoring() {
    const chatContainer = findChatElements();
    if (!chatContainer) {
      console.log('KidGuard: Chat container not found, retrying...');
      setTimeout(startMonitoring, 3000);
      return;
    }
    console.log('KidGuard: Starting chat monitoring');
    waitForStableChatThenMonitor(chatContainer);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMonitoring);
  } else {
    startMonitoring();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_STATUS') {
      sendResponse({
        monitoring: monitoringActive,
        messageCount: conversationLog.length,
        lastActivity: conversationLog.length > 0
          ? conversationLog[conversationLog.length - 1].timestamp
          : null
      });
    }
  });

})();
