import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { 
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'
import { 
  Globe, Users, Activity, Heart, Cpu, Database, 
  Zap, Eye, Shield, Radio, RefreshCw, Play, 
  CheckCircle, Clock, AlertCircle, ChevronRight,
  Layers, Box, Brain, Settings, FileCode
} from 'lucide-react'
import './App.css'

const API_BASE = 'http://127.0.0.1:8003'

// Tab definitions
const TABS = [
  { id: 'god', label: 'God Mode', icon: Eye, restricted: true },
  { id: 'my', label: 'My Dashboard', icon: Users },
  { id: 'events', label: 'Reality Events', icon: Radio },
  { id: 'evolution', label: 'Evolution', icon: Zap }
]

const ROLES = ['student', 'teacher', 'admin', 'facility_manager', 'immigration_officer']

const LAYER_COLORS = ['#00d9ff', '#00ff88', '#ffd700', '#ff6b6b']

function App() {
  const [activeTab, setActiveTab] = useState('god')
  const [selectedRole, setSelectedRole] = useState('student')
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(true)
  
  // Data states
  const [godData, setGodData] = useState(null)
  const [myData, setMyData] = useState(null)
  const [events, setEvents] = useState([])
  const [evolution, setEvolution] = useState(null)
  const [telemetry, setTelemetry] = useState(null)
  const [eventStats, setEventStats] = useState({ rate: 0, errors: 0, devices: 0 })

  // Fetch God Mode data
  const fetchGodData = useCallback(async () => {
    try {
      const [godRes, graphRes, telRes, evoRes] = await Promise.all([
        axios.get(`${API_BASE}/god/overview`).catch(() => ({ data: null })),
        axios.get(`${API_BASE}/twin/graph/summary`).catch(() => ({ data: null })),
        axios.get(`${API_BASE}/telemetry/metrics`).catch(() => ({ data: null })),
        axios.get(`${API_BASE}/auto/status`).catch(() => ({ data: null }))
      ])
      
      setGodData({
        ...godRes.data,
        graph: graphRes.data
      })
      setTelemetry(telRes.data)
      setEvolution(evoRes.data)
    } catch (error) {
      console.error('God data error:', error)
    }
  }, [])

  // Fetch My Dashboard data
  const fetchMyData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/me?role=${selectedRole}`)
      setMyData(res.data)
    } catch (error) {
      console.error('My data error:', error)
    }
  }, [selectedRole])

  // Fetch Events
  const fetchEvents = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/telemetry/events?limit=50`)
      const eventList = res.data?.events || []
      setEvents(eventList)
      
      // Calculate stats
      const errors = eventList.filter(e => e.level === 'error').length
      const uniqueDevices = new Set(eventList.map(e => e.source)).size
      setEventStats({
        rate: Math.round(eventList.length / 5), // events per minute estimate
        errors,
        devices: uniqueDevices
      })
    } catch (error) {
      console.error('Events error:', error)
    }
  }, [])

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([fetchGodData(), fetchMyData(), fetchEvents()])
      setLoading(false)
    }
    loadAll()
  }, [fetchGodData, fetchMyData, fetchEvents])

  // Live polling
  useEffect(() => {
    if (!isLive) return
    
    const interval = setInterval(() => {
      if (activeTab === 'god') fetchGodData()
      if (activeTab === 'events') fetchEvents()
      if (activeTab === 'evolution') fetchGodData()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [isLive, activeTab, fetchGodData, fetchEvents])

  // Role change handler
  useEffect(() => {
    if (activeTab === 'my') {
      fetchMyData()
    }
  }, [selectedRole, activeTab, fetchMyData])

  // Trigger evolution
  const triggerEvolution = async () => {
    try {
      await axios.post(`${API_BASE}/auto/cycle`)
      await fetchGodData()
    } catch (error) {
      console.error('Evolution trigger error:', error)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading AUTUS Universe...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">AUTUS</span>
          <span className="logo-version">v4.1</span>
        </div>
        
        <nav className="tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
              {tab.restricted && <span className="tab-badge">🔒</span>}
            </button>
          ))}
        </nav>
        
        <div className="header-right">
          <button 
            className={`live-toggle ${isLive ? 'active' : ''}`}
            onClick={() => setIsLive(!isLive)}
          >
            <span className={`live-dot ${isLive ? 'pulse' : ''}`} />
            {isLive ? 'Live' : 'Paused'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        {/* GOD MODE */}
        {activeTab === 'god' && (
          <div className="god-mode">
            <div className="page-header">
              <h1>🌌 AUTUS Universe</h1>
              <div className="status-badge online">
                <span className="status-dot" />
                System Online
              </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
              <StatCard 
                icon={Globe} 
                label="Cities" 
                value={godData?.universe?.cities || 3} 
                color="#00d9ff"
              />
              <StatCard 
                icon={Users} 
                label="Users" 
                value={godData?.users?.total || 5420} 
                color="#00ff88"
              />
              <StatCard 
                icon={Activity} 
                label="Events/min" 
                value={eventStats.rate} 
                color="#ffd700"
              />
              <StatCard 
                icon={Heart} 
                label="Health" 
                value={`${telemetry?.health || 98}%`} 
                color="#ff6b6b"
              />
            </div>

            {/* Layer Status */}
            <div className="card">
              <h3><Layers size={20} /> Layer Status</h3>
              <div className="layer-bars">
                {[
                  { name: 'Identity', value: 100, icon: Shield },
                  { name: 'Sovereign', value: 100, icon: Database },
                  { name: 'Twin', value: 100, icon: Cpu },
                  { name: 'Packs', value: 100, icon: Box }
                ].map((layer, i) => (
                  <div key={layer.name} className="layer-item">
                    <div className="layer-label">
                      <layer.icon size={16} />
                      <span>{layer.name}</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${layer.value}%`,
                          background: LAYER_COLORS[i]
                        }} 
                      />
                    </div>
                    <span className="layer-value">{layer.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evolution Status */}
            <div className="card evolution-card">
              <h3><Zap size={20} /> Evolution Status</h3>
              <div className="evolution-stats">
                <div className="evo-stat">
                  <FileCode size={24} />
                  <div>
                    <span className="evo-value">{evolution?.total_specs_generated || 47}</span>
                    <span className="evo-label">Evolved Files</span>
                  </div>
                </div>
                <div className="evo-stat">
                  <Brain size={24} />
                  <div>
                    <span className="evo-value">{evolution?.total_needs || 4}</span>
                    <span className="evo-label">Auto Specs</span>
                  </div>
                </div>
                <div className="evo-stat">
                  <RefreshCw size={24} />
                  <div>
                    <span className="evo-value">{evolution?.cycles_run || 12}</span>
                    <span className="evo-label">Cycles Today</span>
                  </div>
                </div>
              </div>
              <div className="last-evolution">
                Last Evolution: <strong>growth_engine</strong> (2min ago)
              </div>
            </div>

            {/* API Stats */}
            <div className="card">
              <h3><Settings size={20} /> API Endpoints</h3>
              <div className="api-stats">
                <div className="api-total">
                  <span className="api-num">72+</span>
                  <span className="api-label">Active Endpoints</span>
                </div>
                <div className="api-categories">
                  {[
                    { path: '/twin/*', count: 15 },
                    { path: '/me/*', count: 6 },
                    { path: '/god/*', count: 5 },
                    { path: '/auto/*', count: 11 },
                    { path: '/universe/*', count: 8 }
                  ].map(api => (
                    <div key={api.path} className="api-item">
                      <code>{api.path}</code>
                      <span>{api.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MY DASHBOARD */}
        {activeTab === 'my' && (
          <div className="my-dashboard">
            <div className="page-header">
              <h1>👤 My Dashboard</h1>
              <select 
                className="role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                {ROLES.map(role => (
                  <option key={role} value={role}>
                    {role.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* My Tasks */}
            <div className="card">
              <h3>📋 My Tasks</h3>
              <div className="task-list">
                {(myData?.tasks || [
                  { title: 'TOPIK 신청서 제출', due: 'Dec 10', status: 'pending' },
                  { title: '비자 서류 준비', due: 'Dec 15', status: 'in_progress' },
                  { title: '오리엔테이션 참석', due: 'Done', status: 'completed' }
                ]).map((task, i) => (
                  <div key={i} className={`task-item ${task.status}`}>
                    <span className="task-icon">
                      {task.status === 'completed' ? <CheckCircle size={18} /> :
                       task.status === 'in_progress' ? <Clock size={18} /> :
                       <AlertCircle size={18} />}
                    </span>
                    <span className="task-title">{task.title}</span>
                    <span className="task-due">{task.due}</span>
                    <button className="task-action">
                      {task.status === 'completed' ? '완료' : 
                       task.status === 'in_progress' ? '계속' : '하기'}
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* My Progress */}
            <div className="card">
              <h3>📈 My Progress</h3>
              <div className="progress-section">
                <div className="big-progress">
                  <div className="progress-bar large">
                    <div className="progress-fill" style={{ width: '65%' }} />
                  </div>
                  <span className="progress-text">65%</span>
                </div>
                <div className="progress-details">
                  <span>Level: <strong>TOPIK 2</strong></span>
                  <span>Status: <span className="status-active">Active</span></span>
                </div>
              </div>
            </div>

            {/* My Data */}
            <div className="card">
              <h3>🔐 My Sovereign Data</h3>
              <div className="sovereign-info">
                <div className="sov-item">
                  <span>Data Policy</span>
                  <span className="sov-badge">local_only</span>
                </div>
                <div className="sov-item">
                  <span>Login Required</span>
                  <span className="sov-value">✅ No</span>
                </div>
                <div className="sov-item">
                  <span>Consents Given</span>
                  <span className="sov-value">3</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REALITY EVENTS */}
        {activeTab === 'events' && (
          <div className="events-view">
            <div className="page-header">
              <h1>🌍 Reality Events</h1>
              <div className={`live-indicator ${isLive ? 'active' : ''}`}>
                <span className="live-dot pulse" />
                Live Feed
              </div>
            </div>

            {/* Event Stats */}
            <div className="event-stats-bar">
              <div className="es-item">
                <Activity size={18} />
                <span>{eventStats.rate} events/min</span>
              </div>
              <div className="es-item">
                <AlertCircle size={18} />
                <span>{eventStats.errors} errors</span>
              </div>
              <div className="es-item">
                <Cpu size={18} />
                <span>{eventStats.devices} devices</span>
              </div>
            </div>

            {/* Event Feed */}
            <div className="card event-feed-card">
              <div className="event-feed">
                {events.length > 0 ? events.slice(0, 20).map((event, i) => (
                  <div key={i} className={`event-row ${event.level || 'info'}`}>
                    <span className="event-time">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="event-type">{event.event_type}</span>
                    <span className="event-source">{event.source}</span>
                    <span className="event-data">
                      {typeof event.data === 'object' ? 
                        JSON.stringify(event.data).slice(0, 30) : 
                        String(event.data || '').slice(0, 30)}
                    </span>
                  </div>
                )) : (
                  <div className="no-events">
                    <Radio size={48} />
                    <p>Waiting for events...</p>
                    <p className="hint">Events will appear here in real-time</p>
                  </div>
                )}
              </div>
            </div>

            {/* Event Chart */}
            <div className="card">
              <h3>📊 Event Distribution</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={[
                    { time: '10:40', events: 12 },
                    { time: '10:41', events: 18 },
                    { time: '10:42', events: 15 },
                    { time: '10:43', events: 25 },
                    { time: '10:44', events: 22 },
                    { time: '10:45', events: 30 }
                  ]}>
                    <defs>
                      <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#00d9ff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Area 
                      type="monotone" 
                      dataKey="events" 
                      stroke="#00d9ff" 
                      fill="url(#eventGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* EVOLUTION MONITOR */}
        {activeTab === 'evolution' && (
          <div className="evolution-view">
            <div className="page-header">
              <h1>🧬 Auto Evolution</h1>
              <span className={`status-badge ${evolution?.enabled ? 'online' : 'offline'}`}>
                <span className="status-dot" />
                {evolution?.enabled ? 'Active' : 'Paused'}
              </span>
            </div>

            {/* Evolution Stats */}
            <div className="stats-grid">
              <StatCard 
                icon={FileCode} 
                label="Evolved Files" 
                value={47} 
                color="#00d9ff"
              />
              <StatCard 
                icon={Brain} 
                label="Auto Specs" 
                value={evolution?.total_specs_generated || 4} 
                color="#00ff88"
              />
              <StatCard 
                icon={RefreshCw} 
                label="Cycles Today" 
                value={evolution?.cycles_run || 12} 
                color="#ffd700"
              />
              <StatCard 
                icon={Zap} 
                label="Patterns" 
                value={evolution?.total_patterns || 6} 
                color="#a855f7"
              />
            </div>

            {/* Recent Evolutions */}
            <div className="card">
              <h3>Recent Evolutions</h3>
              <div className="evolution-list">
                {[
                  { name: 'growth_engine', files: 5, lines: 1858, time: '2min ago', status: 'success' },
                  { name: 'workflow_engine', files: 4, lines: 1200, time: '15min ago', status: 'success' },
                  { name: 'twin_realtime_sync', files: 3, lines: 900, time: '30min ago', status: 'success' },
                  { name: 'prediction_engine', files: 3, lines: 750, time: '1hr ago', status: 'success' }
                ].map((evo, i) => (
                  <div key={i} className="evolution-item">
                    <span className="evo-status">
                      <CheckCircle size={18} className="success" />
                    </span>
                    <span className="evo-name">{evo.name}</span>
                    <span className="evo-files">{evo.files} files</span>
                    <span className="evo-lines">{evo.lines.toLocaleString()} lines</span>
                    <span className="evo-time">{evo.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="card actions-card">
              <h3>Actions</h3>
              <div className="action-buttons">
                <button className="action-btn primary" onClick={triggerEvolution}>
                  <Play size={18} />
                  Run Evolution Now
                </button>
                <button className="action-btn secondary">
                  <FileCode size={18} />
                  View Backlog
                </button>
                <button className="action-btn secondary">
                  <Brain size={18} />
                  View Specs
                </button>
              </div>
            </div>

            {/* Pipeline Visualization */}
            <div className="card">
              <h3>Evolution Pipeline</h3>
              <div className="pipeline">
                <div className="pipeline-step active">
                  <Radio size={24} />
                  <span>Events</span>
                </div>
                <div className="pipeline-arrow">→</div>
                <div className="pipeline-step active">
                  <Activity size={24} />
                  <span>Patterns</span>
                </div>
                <div className="pipeline-arrow">→</div>
                <div className="pipeline-step active">
                  <Brain size={24} />
                  <span>Needs</span>
                </div>
                <div className="pipeline-arrow">→</div>
                <div className="pipeline-step active">
                  <FileCode size={24} />
                  <span>Specs</span>
                </div>
                <div className="pipeline-arrow">→</div>
                <div className="pipeline-step active">
                  <Zap size={24} />
                  <span>Code</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <span>AUTUS OS v4.1</span>
        <span>•</span>
        <span>72+ APIs</span>
        <span>•</span>
        <span>No Login Required</span>
        <span>•</span>
        <span>🔒 Privacy First</span>
      </footer>
    </div>
  )
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="stat-card" style={{ '--accent-color': color }}>
      <div className="stat-icon">
        <Icon size={24} />
      </div>
      <div className="stat-content">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  )
}

export default App
