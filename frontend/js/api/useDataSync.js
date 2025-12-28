/**
 * AUTUS Data Sync Hook
 * ====================
 * 
 * 외부 API 데이터를 state_contract와 동기화
 * 
 * Supported APIs:
 * - Google Calendar (Energy, Time slots)
 * - Screen Time / RescueTime (Risk/Distraction slot)
 * - Finance APIs (Constraint slot)
 * 
 * Version: 1.0.0
 * Status: BEZOS MODE
 */

// ================================================================
// CONFIG
// ================================================================

const SYNC_CONFIG = {
    calendarClientId: '', // Set your Google Calendar Client ID
    rescueTimeKey: '',    // Set your RescueTime API key
    financeApiKey: '',    // Set your finance API key
    
    syncInterval: 60000,  // 1 minute
    cacheExpiry: 300000,  // 5 minutes
};

// ================================================================
// DATA SYNC HOOK
// ================================================================

export function useDataSync(onUpdate) {
    let syncInterval = null;
    let cache = {
        calendar: { data: null, timestamp: 0 },
        screenTime: { data: null, timestamp: 0 },
        finance: { data: null, timestamp: 0 }
    };
    
    /**
     * Start data synchronization
     */
    function start() {
        syncAll();
        syncInterval = setInterval(syncAll, SYNC_CONFIG.syncInterval);
        console.log('[DataSync] Started');
    }
    
    /**
     * Stop data synchronization
     */
    function stop() {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
        console.log('[DataSync] Stopped');
    }
    
    /**
     * Sync all data sources
     */
    async function syncAll() {
        const results = await Promise.all([
            syncCalendar(),
            syncScreenTime(),
            syncFinance()
        ]);
        
        const allocations = calculateAllocations(results);
        
        if (onUpdate) {
            onUpdate({
                calendar: results[0],
                screenTime: results[1],
                finance: results[2],
                allocations
            });
        }
        
        return allocations;
    }
    
    /**
     * Sync Google Calendar data
     */
    async function syncCalendar() {
        const now = Date.now();
        
        // Check cache
        if (cache.calendar.data && (now - cache.calendar.timestamp) < SYNC_CONFIG.cacheExpiry) {
            return cache.calendar.data;
        }
        
        try {
            // If no API configured, simulate data
            if (!SYNC_CONFIG.calendarClientId) {
                const simulated = simulateCalendarData();
                cache.calendar = { data: simulated, timestamp: now };
                return simulated;
            }
            
            // Real API call (requires OAuth2)
            const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                headers: {
                    'Authorization': `Bearer ${await getCalendarToken()}`
                }
            });
            
            const data = await response.json();
            const processed = processCalendarData(data);
            
            cache.calendar = { data: processed, timestamp: now };
            return processed;
            
        } catch (error) {
            console.warn('[DataSync] Calendar sync failed:', error);
            return cache.calendar.data || simulateCalendarData();
        }
    }
    
    /**
     * Sync Screen Time / RescueTime data
     */
    async function syncScreenTime() {
        const now = Date.now();
        
        if (cache.screenTime.data && (now - cache.screenTime.timestamp) < SYNC_CONFIG.cacheExpiry) {
            return cache.screenTime.data;
        }
        
        try {
            if (!SYNC_CONFIG.rescueTimeKey) {
                const simulated = simulateScreenTimeData();
                cache.screenTime = { data: simulated, timestamp: now };
                return simulated;
            }
            
            const response = await fetch(
                `https://www.rescuetime.com/anapi/data?key=${SYNC_CONFIG.rescueTimeKey}&format=json&perspective=interval&resolution_time=day`
            );
            
            const data = await response.json();
            const processed = processScreenTimeData(data);
            
            cache.screenTime = { data: processed, timestamp: now };
            return processed;
            
        } catch (error) {
            console.warn('[DataSync] Screen time sync failed:', error);
            return cache.screenTime.data || simulateScreenTimeData();
        }
    }
    
    /**
     * Sync Finance data
     */
    async function syncFinance() {
        const now = Date.now();
        
        if (cache.finance.data && (now - cache.finance.timestamp) < SYNC_CONFIG.cacheExpiry) {
            return cache.finance.data;
        }
        
        try {
            if (!SYNC_CONFIG.financeApiKey) {
                const simulated = simulateFinanceData();
                cache.finance = { data: simulated, timestamp: now };
                return simulated;
            }
            
            // Implement your finance API here (Plaid, etc.)
            const simulated = simulateFinanceData();
            cache.finance = { data: simulated, timestamp: now };
            return simulated;
            
        } catch (error) {
            console.warn('[DataSync] Finance sync failed:', error);
            return cache.finance.data || simulateFinanceData();
        }
    }
    
    /**
     * Calculate allocations from synced data
     */
    function calculateAllocations(results) {
        const [calendar, screenTime, finance] = results;
        
        const allocations = {
            M: 0.125,  // Mass - manual
            E: 0.125,  // Energy - from calendar
            V: 0.125,  // Volume - manual
            T: 0.125,  // Time - from calendar
            S: 0.125,  // Pattern - manual
            N: 0.125,  // Constraint - from finance
            NE: 0.125, // Risk - from screen time
            C: 0.125   // Context - manual
        };
        
        // Energy from available focus hours
        if (calendar?.focusHours) {
            allocations.E = Math.min(calendar.focusHours / 10, 0.4);
        }
        
        // Time from meeting load
        if (calendar?.meetingLoad) {
            allocations.T = Math.max(0.05, 0.2 - calendar.meetingLoad * 0.15);
        }
        
        // Constraint from financial runway
        if (finance?.runway) {
            allocations.N = Math.min(finance.runway / 12, 0.3);
        }
        
        // Risk from distraction score
        if (screenTime?.distractionScore) {
            allocations.NE = Math.min(screenTime.distractionScore, 0.3);
        }
        
        // Normalize to sum = 1
        const total = Object.values(allocations).reduce((a, b) => a + b, 0);
        Object.keys(allocations).forEach(k => {
            allocations[k] = allocations[k] / total;
        });
        
        return allocations;
    }
    
    // ================================================================
    // DATA PROCESSORS
    // ================================================================
    
    function processCalendarData(data) {
        const events = data.items || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        let meetingMinutes = 0;
        
        events.forEach(event => {
            const start = new Date(event.start.dateTime || event.start.date);
            const end = new Date(event.end.dateTime || event.end.date);
            
            if (start >= today && start < tomorrow) {
                meetingMinutes += (end - start) / 60000;
            }
        });
        
        const workHours = 10;
        const focusHours = Math.max(0, workHours - meetingMinutes / 60);
        
        return {
            focusHours,
            meetingLoad: meetingMinutes / (workHours * 60),
            eventCount: events.length
        };
    }
    
    function processScreenTimeData(data) {
        const rows = data.rows || [];
        
        let productiveMinutes = 0;
        let distractingMinutes = 0;
        
        rows.forEach(row => {
            const productivity = row[3];
            const minutes = row[1];
            
            if (productivity >= 0) {
                productiveMinutes += minutes;
            } else {
                distractingMinutes += minutes;
            }
        });
        
        const total = productiveMinutes + distractingMinutes;
        const distractionScore = total > 0 ? distractingMinutes / total : 0;
        
        return {
            productiveMinutes,
            distractingMinutes,
            distractionScore
        };
    }
    
    // ================================================================
    // SIMULATORS (for demo)
    // ================================================================
    
    function simulateCalendarData() {
        return {
            focusHours: 4 + Math.random() * 4,      // 4-8 hours
            meetingLoad: 0.2 + Math.random() * 0.4, // 20-60%
            eventCount: Math.floor(3 + Math.random() * 5)
        };
    }
    
    function simulateScreenTimeData() {
        return {
            productiveMinutes: 200 + Math.random() * 200,
            distractingMinutes: 60 + Math.random() * 120,
            distractionScore: 0.15 + Math.random() * 0.25
        };
    }
    
    function simulateFinanceData() {
        return {
            runway: 3 + Math.random() * 9, // 3-12 months
            burnRate: 1000 + Math.random() * 4000,
            balance: 10000 + Math.random() * 50000
        };
    }
    
    // ================================================================
    // OAUTH HELPERS
    // ================================================================
    
    async function getCalendarToken() {
        // Implement OAuth2 flow here
        // Return access token
        return localStorage.getItem('google_calendar_token') || '';
    }
    
    // ================================================================
    // RETURN HOOK API
    // ================================================================
    
    return {
        start,
        stop,
        syncAll,
        syncCalendar,
        syncScreenTime,
        syncFinance,
        getCache: () => cache,
        setConfig: (config) => Object.assign(SYNC_CONFIG, config)
    };
}

// ================================================================
// SINGLETON INSTANCE
// ================================================================

let dataSyncInstance = null;

export function getDataSync(onUpdate) {
    if (!dataSyncInstance) {
        dataSyncInstance = useDataSync(onUpdate);
    }
    return dataSyncInstance;
}

export default useDataSync;




