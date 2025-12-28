// ================================================================
// AUTUS API MODULE INDEX
// Backend communication layer
// ================================================================

// Re-export from js/api
export { AutusEngine } from '../js/api/AutusEngine.js';
export { default as PhysicsClient } from '../js/api/physics-client.js';

// ================================================================
// API CONFIGURATION
// ================================================================

export const API_CONFIG = {
    BASE_URL: 'http://localhost:8001',
    TIMEOUT: 5000,
    RETRY_COUNT: 3,
    RETRY_DELAY: 1000
};

// ================================================================
// API HELPERS
// ================================================================

/**
 * Fetch with timeout and retry
 */
export async function fetchWithRetry(url, options = {}, retries = API_CONFIG.RETRY_COUNT) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeout);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeout);
        
        if (retries > 0 && error.name !== 'AbortError') {
            await new Promise(r => setTimeout(r, API_CONFIG.RETRY_DELAY));
            return fetchWithRetry(url, options, retries - 1);
        }
        
        throw error;
    }
}

/**
 * Quick state fetch
 */
export async function fetchState(sessionId) {
    const response = await fetchWithRetry(
        `${API_CONFIG.BASE_URL}/state?session_id=${sessionId}`
    );
    return response.json();
}

/**
 * Quick commit
 */
export async function commit(sessionId, options = {}) {
    const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            version: 'autus.commit.v1',
            session_id: sessionId,
            t_ms: Date.now(),
            ...options
        })
    });
    return response.json();
}

export default {
    API_CONFIG,
    fetchWithRetry,
    fetchState,
    commit
};




