/**
 * AUTUS Layer v2.0 — Background Service Worker
 * Handles commands, alarms, and cross-tab communication
 */

// ============================================
// Installation
// ============================================

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[AUTUS] Extension installed:', details.reason);
  
  // Set default settings
  chrome.storage.local.set({
    enabled: true,
    entityId: 'company_abc',
    autoExpand: false,
    apiBase: 'https://solar.autus-ai.com'
  });
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'autus-toggle',
    title: 'Toggle AUTUS Layer',
    contexts: ['all']
  });
});

// ============================================
// Keyboard Commands
// ============================================

chrome.commands.onCommand.addListener(async (command) => {
  console.log('[AUTUS] Command received:', command);
  
  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  
  // Send command to content script
  try {
    await chrome.tabs.sendMessage(tab.id, { command });
  } catch (error) {
    console.warn('[AUTUS] Failed to send command:', error.message);
  }
});

// ============================================
// Context Menu
// ============================================

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'autus-toggle' && tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { command: 'toggle-panel' });
    } catch (error) {
      console.warn('[AUTUS] Failed to toggle:', error.message);
    }
  }
});

// ============================================
// Message Handling
// ============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Get config
  if (message.type === 'GET_CONFIG') {
    chrome.storage.local.get(['enabled', 'entityId', 'apiBase', 'autoExpand'], (result) => {
      sendResponse(result);
    });
    return true;
  }
  
  // Set entity
  if (message.type === 'SET_ENTITY') {
    chrome.storage.local.set({ entityId: message.entityId });
    
    // Broadcast to all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { 
            type: 'ENTITY_CHANGED', 
            entityId: message.entityId 
          }).catch(() => {});
        }
      });
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  // Update status (from content script)
  if (message.type === 'UPDATE_STATUS') {
    updateBadge(message.status);
    sendResponse({ success: true });
    return true;
  }
  
  // Toggle enabled
  if (message.type === 'TOGGLE_ENABLED') {
    chrome.storage.local.get(['enabled'], (result) => {
      const newEnabled = !result.enabled;
      chrome.storage.local.set({ enabled: newEnabled });
      sendResponse({ enabled: newEnabled });
    });
    return true;
  }
});

// ============================================
// Badge Update
// ============================================

function updateBadge(status) {
  const colors = {
    GREEN: '#00ff88',
    YELLOW: '#ffaa00',
    RED: '#ff4444'
  };
  
  const color = colors[status] || colors.GREEN;
  
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ 
    text: status === 'GREEN' ? '' : '!' 
  });
}

// ============================================
// Alarms (for background polling if needed)
// ============================================

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autus-heartbeat') {
    // Could be used for background status checks
    console.log('[AUTUS] Heartbeat');
  }
});

// Create heartbeat alarm (every 5 minutes)
chrome.alarms.create('autus-heartbeat', { periodInMinutes: 5 });

// ============================================
// Tab Updates
// ============================================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Could trigger entity detection based on URL
    console.log('[AUTUS] Tab updated:', tab.url);
  }
});

console.log('[AUTUS] Background service worker started');
