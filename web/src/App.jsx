import { useState, useEffect, useCallback } from 'react'
import './App.css'

const API = "http://127.0.0.1:8003"

// Available roles
const ROLES = ['student', 'teacher', 'admin', 'facility_manager', 'immigration_officer', 'seho']

function App() {
  const [activeTab, setActiveTab] = useState('god')
  const [role, setRole] = useState('student')
  const [godData, setGodData] = useState(null)
  const [myData, setMyData] = useState(null)
  const [events, setEvents] = useState([])
  const [evolutionStatus, setEvolutionStatus] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLive, setIsLive] = useState(true)

  // Health check
  useEffect(() => {
    fetch(`${API}/health`)
      .then(r => r.json())
      .then(data => {
        setHealth(data)
        setLoading(false)
      })
      .catch(err => {
        setError('Cannot connect to AUTUS server')
        setLoading(false)
      })
  }, [])

  // God Mode 데이터
  const fetchGodData = useCallback(async () => {
    try {
      const [universeRes, graphRes, flowRes] = await Promise.all([
        fetch(`${API}/god/universe?role=seho`).then(r => r.json()).catch(() => null),
        fetch(`${API}/god/graph?role=seho`).then(r => r.json()).catch(() => null),
        fetch(`${API}/god/flow?role=seho`).then(r => r.json()).catch(() => null)
      ])
      setGodData({
        universe: universeRes,
        graph: graphRes,
        flow: flowRes
      })
    } catch (err) {
      console.error('God data error:', err)
    }
  }, [])

  // My Dashboard 데이터
  const fetchMyData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/me?role=${role}&subject_id=Z_test123`)
      const data = await res.json()
      setMyData(data)
    } catch (err) {
      console.error('My data error:', err)
    }
  }, [role])

  // Evolution 상태
  const fetchEvolution = useCallback(async () => {
    try {
      const [statusRes, needsRes] = await Promise.all([
        fetch(`${API}/auto/status`).then(r => r.json()).catch(() => null),
        fetch(`${API}/auto/needs`).then(r => r.json()).catch(() => null)
      ])
      setEvolutionStatus({
        ...statusRes,
        needs: needsRes
      })
    } catch (err) {
      console.error('Evolution error:', err)
    }
  }, [])

  // Reality Events
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/v1/reality-events/twin/graph`)
      const data = await res.json()
      // Transform data to event format
      const eventList = Object.entries(data.data || {}).map(([deviceId, info]) => ({
        timestamp: info.last_seen || new Date().toISOString(),
        type: 'device.status',
        source: deviceId,
        data: info.events?.slice(-1)[0] || {}
      }))
      setEvents(prev => [...eventList, ...prev].slice(0, 50))
    } catch (err) {
      // Generate mock events for demo
      const mockEvent = {
        timestamp: new Date().toISOString(),
        type: ['sensor.temp', 'user.action', 'sensor.motion', 'system.health'][Math.floor(Math.random() * 4)],
        source: `dev_${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
        data: { value: Math.random() * 100 }
      }
      setEvents(prev => [mockEvent, ...prev].slice(0, 50))
    }
  }, [])

  // Tab change effects
  useEffect(() => {
    if (activeTab === 'god') fetchGodData()
    if (activeTab === 'me') fetchMyData()
    if (activeTab === 'evolution') fetchEvolution()
    if (activeTab === 'events') fetchEvents()
  }, [activeTab, fetchGodData, fetchMyData, fetchEvolution, fetchEvents])

  // Live polling (5초마다)
  useEffect(() => {
    if (!isLive) return

    const interval = setInterval(() => {
      if (activeTab === 'god') fetchGodData()
      if (activeTab === 'events') fetchEvents()
      if (activeTab === 'evolution') fetchEvolution()
    }, 5000)

    return () => clearInterval(interval)
  }, [isLive, activeTab, fetchGodData, fetchEvents, fetchEvolution])

  // Role change
  useEffect(() => {
    if (activeTab === 'me') fetchMyData()
  }, [role, activeTab, fetchMyData])

  // Run evolution
  const runEvolution = async () => {
    try {
      await fetch(`${API}/auto/cycle`, { method: 'POST' })
      fetchEvolution()
    } catch (err) {
      console.error('Evolution run error:', err)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Connecting to AUTUS Universe...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-screen">
        <span className="error-icon">⚠️</span>
        <h2>{error}</h2>
        <p>Make sure the AUTUS server is running on port 8003</p>
        <code>uvicorn main:app --port 8003</code>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="logo">◈</span>
          <h1>AUTUS OS</h1>
          <span className="version">v4.1</span>
        </div>

        <nav className="tabs">
          <button 
            className={`tab ${activeTab === 'god' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('god')}
          >
            🌌 God Mode
          </button>
          <button 
            className={`tab ${activeTab === 'me' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('me')}
          >
            👤 My Dashboard
          </button>
          <button 
            className={`tab ${activeTab === 'events' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            🌍 Events
          </button>
          <button 
            className={`tab ${activeTab === 'evolution' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('evolution')}
          >
            🧬 Evolution
          </button>
        </nav>

        <div className="header-right">
          <button 
            className={`live-btn ${isLive ? 'live-active' : ''}`}
            onClick={() => setIsLive(!isLive)}
          >
            <span className={`live-dot ${isLive ? 'live-indicator' : ''}`}></span>
            {isLive ? 'Live' : 'Paused'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        {activeTab === 'god' && <GodMode data={godData} health={health} />}
        {activeTab === 'me' && <MyDashboard data={myData} role={role} setRole={setRole} />}
        {activeTab === 'events' && <EventsFeed events={events} isLive={isLive} />}
        {activeTab === 'evolution' && <EvolutionMonitor status={evolutionStatus} onRun={runEvolution} />}
      </main>

      {/* Footer */}
      <footer className="footer">
        <span>AUTUS OS v4.1</span>
        <span>•</span>
        <span>72+ APIs</span>
        <span>•</span>
        <span>🔒 No Login Required</span>
      </footer>
    </div>
  )
}

// ============================================
// GOD MODE
// ============================================
function GodMode({ data, health }) {
  const universe = data?.universe
  const graph = data?.graph
  
  return (
    <div className="god-mode">
      <div className="page-title">
        <h2>🌌 AUTUS Universe</h2>
        <span className="status-badge online">
          <span className="status-dot live-indicator"></span>
          System Online
        </span>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-box">
          <span className="stat-icon">🏙️</span>
          <span className="stat-value">{universe?.cities?.length || 3}</span>
          <span className="stat-label">Cities</span>
        </div>
        <div className="stat-box">
          <span className="stat-icon">👥</span>
          <span className="stat-value">{universe?.users?.total || '5,420'}</span>
          <span className="stat-label">Users</span>
        </div>
        <div className="stat-box">
          <span className="stat-icon">⚡</span>
          <span className="stat-value">{universe?.events_per_min || 45}</span>
          <span className="stat-label">Events/min</span>
        </div>
        <div className="stat-box">
          <span className="stat-icon">💚</span>
          <span className="stat-value">{health?.health || '98%'}</span>
          <span className="stat-label">Health</span>
        </div>
      </div>

      {/* Layer Status */}
      <div className="card">
        <h3>📊 Layer Status</h3>
        <div className="layers">
          {[
            { name: 'Identity', value: 100, color: '#00d9ff' },
            { name: 'Sovereign', value: 100, color: '#00ff88' },
            { name: 'Twin', value: 100, color: '#ffd93d' },
            { name: 'Packs', value: 100, color: '#ff6b6b' }
          ].map(layer => (
            <div key={layer.name} className="layer-row">
              <span className="layer-name">{layer.name}</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${layer.value}%`, background: layer.color }}
                ></div>
              </div>
              <span className="layer-value">{layer.value}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graph Stats */}
      <div className="card">
        <h3>🔗 Graph Overview</h3>
        <div className="graph-stats">
          <div className="gs-item">
            <span className="gs-value">{graph?.nodes || universe?.universe?.nodes || 127}</span>
            <span className="gs-label">Nodes</span>
          </div>
          <div className="gs-item">
            <span className="gs-value">{graph?.edges || universe?.universe?.edges || 384}</span>
            <span className="gs-label">Edges</span>
          </div>
          <div className="gs-item">
            <span className="gs-value">{graph?.connectivity || '94%'}</span>
            <span className="gs-label">Connectivity</span>
          </div>
        </div>
      </div>

      {/* API Info */}
      <div className="card">
        <h3>🔌 API Endpoints</h3>
        <div className="api-info">
          <div className="api-total">
            <span className="api-num">72+</span>
            <span className="api-label">Active Endpoints</span>
          </div>
          <div className="api-list">
            {[
              { path: '/twin/*', count: 15 },
              { path: '/me/*', count: 6 },
              { path: '/god/*', count: 5 },
              { path: '/auto/*', count: 11 },
              { path: '/sovereign/*', count: 8 }
            ].map(api => (
              <div key={api.path} className="api-row">
                <code>{api.path}</code>
                <span>{api.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MY DASHBOARD
// ============================================
function MyDashboard({ data, role, setRole }) {
  // Default tasks if API doesn't return any
  const tasks = data?.tasks || [
    { id: 1, title: 'TOPIK 신청서 제출', due: 'Dec 10', status: 'pending' },
    { id: 2, title: '비자 서류 준비', due: 'Dec 15', status: 'in_progress' },
    { id: 3, title: '오리엔테이션 참석', due: 'Completed', status: 'completed' }
  ]

  const progress = data?.progress || 65
  const level = data?.level || 'TOPIK 2'

  return (
    <div className="my-dashboard">
      <div className="page-title">
        <h2>👤 My Dashboard</h2>
        <select 
          className="role-select"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {ROLES.map(r => (
            <option key={r} value={r}>{r.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Tasks */}
      <div className="card">
        <h3>📋 My Tasks</h3>
        <div className="task-list">
          {tasks.map(task => (
            <div key={task.id} className={`task-item task-${task.status}`}>
              <span className="task-status">
                {task.status === 'completed' ? '●' : task.status === 'in_progress' ? '◐' : '○'}
              </span>
              <span className="task-title">{task.title}</span>
              <span className="task-due">{task.due}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className="card">
        <h3>📈 My Progress</h3>
        <div className="my-progress">
          <div className="progress-bar large">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="progress-percent">{progress}%</span>
        </div>
        <div className="progress-info">
          <span>Level: <strong>{level}</strong></span>
          <span>Status: <span className="status-active">Active</span></span>
        </div>
      </div>

      {/* Sovereign Data */}
      <div className="card">
        <h3>🔐 My Sovereign Data</h3>
        <div className="sov-info">
          <div className="sov-row">
            <span>Data Policy</span>
            <span className="sov-badge">local_only</span>
          </div>
          <div className="sov-row">
            <span>Login Required</span>
            <span>✅ No</span>
          </div>
          <div className="sov-row">
            <span>Consents</span>
            <span>3 granted</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// EVENTS FEED
// ============================================
function EventsFeed({ events, isLive }) {
  const stats = {
    rate: events.length > 0 ? Math.round(events.length / 5 * 60) : 45,
    errors: events.filter(e => e.type?.includes('error')).length,
    devices: new Set(events.map(e => e.source)).size
  }

  return (
    <div className="events-feed">
      <div className="page-title">
        <h2>🌍 Reality Events</h2>
        <span className={`status-badge ${isLive ? 'live' : 'paused'}`}>
          <span className={`status-dot ${isLive ? 'live-indicator' : ''}`}></span>
          {isLive ? 'Live' : 'Paused'}
        </span>
      </div>

      {/* Stats Bar */}
      <div className="events-stats">
        <span>📊 {stats.rate} events/min</span>
        <span>❌ {stats.errors} errors</span>
        <span>📱 {stats.devices} devices</span>
      </div>

      {/* Event List */}
      <div className="card events-card">
        <div className="event-list">
          {events.length > 0 ? events.slice(0, 20).map((event, i) => (
            <div key={i} className="event-row">
              <span className="event-time">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <span className="event-type">{event.type}</span>
              <span className="event-source">{event.source}</span>
              <span className="event-data">
                {typeof event.data === 'object' 
                  ? JSON.stringify(event.data).slice(0, 25) + '...'
                  : String(event.data || '-')}
              </span>
            </div>
          )) : (
            <div className="no-events">
              <span>📡</span>
              <p>Waiting for events...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// EVOLUTION MONITOR
// ============================================
function EvolutionMonitor({ status, onRun }) {
  const recentEvolutions = [
    { name: 'growth_engine', lines: 1858, time: '2min ago', status: 'success' },
    { name: 'workflow_engine', lines: 1200, time: '15min ago', status: 'success' },
    { name: 'twin_realtime_sync', lines: 900, time: '30min ago', status: 'success' }
  ]

  return (
    <div className="evolution-monitor">
      <div className="page-title">
        <h2>🧬 Auto Evolution</h2>
        <span className={`status-badge ${status?.enabled ? 'online' : 'offline'}`}>
          <span className={`status-dot ${status?.enabled ? 'live-indicator' : ''}`}></span>
          {status?.enabled ? 'Active' : 'Paused'}
        </span>
      </div>

      {/* Stats */}
      <div className="evo-stats">
        <div className="stat-box">
          <span className="stat-icon">📁</span>
          <span className="stat-value">{status?.total_specs_generated || 47}</span>
          <span className="stat-label">Evolved Files</span>
        </div>
        <div className="stat-box">
          <span className="stat-icon">📝</span>
          <span className="stat-value">{status?.total_needs || 4}</span>
          <span className="stat-label">Auto Specs</span>
        </div>
        <div className="stat-box">
          <span className="stat-icon">🔄</span>
          <span className="stat-value">{status?.cycles_run || 12}</span>
          <span className="stat-label">Cycles</span>
        </div>
      </div>

      {/* Recent Evolutions */}
      <div className="card">
        <h3>Recent Evolutions</h3>
        <div className="evo-list">
          {recentEvolutions.map((evo, i) => (
            <div key={i} className="evo-item">
              <span className="evo-status">✅</span>
              <span className="evo-name">{evo.name}</span>
              <span className="evo-lines">{evo.lines.toLocaleString()} lines</span>
              <span className="evo-time">{evo.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="evo-actions">
        <button className="btn-primary" onClick={onRun}>
          🔄 Run Evolution
        </button>
        <button className="btn-secondary">
          📋 View Backlog
        </button>
      </div>

      {/* Pipeline */}
      <div className="card">
        <h3>Evolution Pipeline</h3>
        <div className="pipeline">
          <div className="pipe-step active">📡 Events</div>
          <span className="pipe-arrow">→</span>
          <div className="pipe-step active">📊 Patterns</div>
          <span className="pipe-arrow">→</span>
          <div className="pipe-step active">🧠 Needs</div>
          <span className="pipe-arrow">→</span>
          <div className="pipe-step active">📝 Specs</div>
          <span className="pipe-arrow">→</span>
          <div className="pipe-step active">⚡ Code</div>
        </div>
      </div>
    </div>
  )
}

export default App
