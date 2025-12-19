/**
 * AUTUS Layer v2.0 — Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  // ============================================
  // Load Saved Settings
  // ============================================
  
  chrome.storage.local.get(['enabled', 'autoExpand', 'entityId'], (result) => {
    // Enabled toggle
    const enabledToggle = document.getElementById('toggle-enabled');
    if (result.enabled !== false) {
      enabledToggle.classList.add('active');
    } else {
      enabledToggle.classList.remove('active');
    }
    
    // Auto-expand toggle
    const autoExpandToggle = document.getElementById('toggle-autoexpand');
    if (result.autoExpand) {
      autoExpandToggle.classList.add('active');
    }
    
    // Entity select
    const entitySelect = document.getElementById('entity-select');
    if (result.entityId) {
      entitySelect.value = result.entityId;
    }
  });
  
  // ============================================
  // Toggle Handlers
  // ============================================
  
  document.getElementById('toggle-enabled').addEventListener('click', function() {
    const isActive = this.classList.toggle('active');
    chrome.storage.local.set({ enabled: isActive });
    
    // Notify all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { 
            type: 'ENABLED_CHANGED', 
            enabled: isActive 
          }).catch(() => {});
        }
      });
    });
  });
  
  document.getElementById('toggle-autoexpand').addEventListener('click', function() {
    const isActive = this.classList.toggle('active');
    chrome.storage.local.set({ autoExpand: isActive });
  });
  
  // ============================================
  // Entity Select Handler
  // ============================================
  
  document.getElementById('entity-select').addEventListener('change', function() {
    const entityId = this.value;
    chrome.storage.local.set({ entityId });
    
    // Notify background and all tabs
    chrome.runtime.sendMessage({ type: 'SET_ENTITY', entityId });
    
    // Refresh status
    fetchStatus(entityId);
  });
  
  // ============================================
  // Fetch Status
  // ============================================
  
  async function fetchStatus(entityId = 'company_abc') {
    const statusEl = document.getElementById('status');
    
    try {
      // Get entity from storage if not provided
      if (!entityId) {
        const result = await chrome.storage.local.get(['entityId']);
        entityId = result.entityId || 'company_abc';
      }
      
      const response = await fetch(
        `https://solar.autus-ai.com/api/v1/shadow/snapshot/${entityId}`,
        { signal: AbortSignal.timeout(5000) }
      );
      
      if (!response.ok) throw new Error('API error');
      
      const data = await response.json();
      const shadow = data.shadow;
      
      // Calculate values
      const energy = ((shadow.output || 0) + (shadow.quality || 0) + (shadow.stability || 0)) / 3;
      const flow = shadow.transfer || 0;
      const risk = Math.min(1, (shadow.shock || 0) * 1.5 + (shadow.friction || 0) * 0.5);
      
      // Determine status
      const status = risk > 0.7 ? 'RED' : risk > 0.4 ? 'YELLOW' : 'GREEN';
      const statusText = status === 'GREEN' ? 'STABLE' : status === 'YELLOW' ? 'CAUTION' : 'ALERT';
      
      // Update UI
      statusEl.textContent = statusText;
      statusEl.className = `status-value ${status.toLowerCase()}`;
      
      document.getElementById('stat-energy').textContent = energy.toFixed(2);
      document.getElementById('stat-flow').textContent = flow.toFixed(2);
      document.getElementById('stat-risk').textContent = risk.toFixed(2);
      
      // Update badge
      chrome.runtime.sendMessage({ type: 'UPDATE_STATUS', status });
      
    } catch (error) {
      console.warn('[AUTUS Popup] Fetch failed:', error.message);
      
      statusEl.textContent = 'OFFLINE';
      statusEl.className = 'status-value offline';
      
      document.getElementById('stat-energy').textContent = '—';
      document.getElementById('stat-flow').textContent = '—';
      document.getElementById('stat-risk').textContent = '—';
    }
  }
  
  // ============================================
  // Initial Fetch
  // ============================================
  
  const result = await chrome.storage.local.get(['entityId']);
  fetchStatus(result.entityId);
  
  // Refresh every 5 seconds while popup is open
  setInterval(() => {
    chrome.storage.local.get(['entityId'], (result) => {
      fetchStatus(result.entityId);
    });
  }, 5000);
});
