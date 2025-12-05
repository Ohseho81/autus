import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = 'http://127.0.0.1:8003'

function App() {
  const [mode, setMode] = useState('my') // 'my' or 'admin'
  const [identity, setIdentity] = useState(null)
  const [memory, setMemory] = useState(null)
  const [universe, setUniverse] = useState(null)
  const [graph, setGraph] = useState(null)
  const [qrCode, setQrCode] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [identityRes, memoryRes, universeRes, graphRes] = await Promise.all([
          axios.get(`${API_URL}/twin/auth/identity`),
          axios.get(`${API_URL}/twin/memory/summary`),
          axios.get(`${API_URL}/universe/overview`),
          axios.get(`${API_URL}/twin/graph/summary`)
        ])
        setIdentity(identityRes.data)
        setMemory(memoryRes.data)
        setUniverse(universeRes.data)
        setGraph(graphRes.data)
      } catch (error) {
        console.error('API Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const showQR = async () => {
    const res = await axios.get(`${API_URL}/twin/auth/qr-image`)
    setQrCode(res.data.qr_image)
  }

  if (loading) return <div className="loading">Loading AUTUS...</div>

  return (
    <div className="app">
      {/* Header with Mode Toggle */}
      <header className="header">
        <div className="logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">AUTUS</span>
        </div>
        <div className="mode-toggle">
          <button 
            className={`mode-btn ${mode === 'my' ? 'active' : ''}`}
            onClick={() => setMode('my')}
          >
            👤 My
          </button>
          <button 
            className={`mode-btn ${mode === 'admin' ? 'active' : ''}`}
            onClick={() => setMode('admin')}
          >
            🔧 Admin
          </button>
          <button 
            className={`mode-btn ${mode === 'sovereign' ? 'active' : ''}`}
            onClick={() => setMode('sovereign')}
          >
            🔐 Sovereign
          </button>
        </div>
        <button className="icon-btn" onClick={showQR}>📱</button>
      </header>

      {/* My Mode */}
      {mode === 'my' && (
        <div className="view-my">
          {/* Identity Section */}
          <div className="section identity-section">
            <div className="identity-avatar">⭐</div>
            <div className="identity-info">
              <span className="identity-label">Zero ID</span>
              <span className="identity-value">{identity?.zero_id}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="qs-item">
              <span className="qs-num">{universe?.layers?.["3_worlds"]?.count || 0}</span>
              <span className="qs-label">Worlds</span>
            </div>
            <div className="qs-item">
              <span className="qs-num">{universe?.layers?.["4_packs"]?.count || 0}</span>
              <span className="qs-label">Packs</span>
            </div>
            <div className="qs-item">
              <span className="qs-num">{memory?.preferences_count || 0}</span>
              <span className="qs-label">Prefs</span>
            </div>
          </div>

          {/* My Cards */}
          <div className="my-cards">
            <div className="my-card">
              <div className="mc-header">
                <span className="mc-icon">🌍</span>
                <span className="mc-title">My Worlds</span>
              </div>
              <div className="mc-tags">
                {universe?.layers?.["3_worlds"]?.cities?.map(city => (
                  <span key={city} className="mc-tag">{city}</span>
                ))}
              </div>
            </div>

            <div className="my-card">
              <div className="mc-header">
                <span className="mc-icon">📦</span>
                <span className="mc-title">My Packs</span>
              </div>
              <div className="mc-tags">
                {universe?.layers?.["4_packs"]?.active?.map(pack => (
                  <span key={pack} className="mc-tag mc-tag-pack">{pack}</span>
                ))}
              </div>
            </div>

            <div className="my-card">
              <div className="mc-header">
                <span className="mc-icon">🧠</span>
                <span className="mc-title">My Memory</span>
              </div>
              <div className="mc-content">
                <div className="mc-stat">
                  <span>{memory?.preferences_count || 0}</span> preferences
                </div>
                <div className="mc-stat">
                  <span>{memory?.patterns_count || 0}</span> patterns
                </div>
                <div className="mc-stat">
                  <span>{memory?.workflows_count || 0}</span> workflows
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Badge */}
          <div className="privacy-badge">
            🔒 All data stored locally • No login required
          </div>
        </div>
      )}

      {/* Admin Mode */}
      {mode === 'admin' && (
        <div className="view-admin">
          {/* Stats Grid */}
          <div className="admin-stats">
            <div className="as-card">
              <span className="as-num">{graph?.nodes || 0}</span>
              <span className="as-label">Total Nodes</span>
            </div>
            <div className="as-card">
              <span className="as-num">{graph?.edges || 0}</span>
              <span className="as-label">Connections</span>
            </div>
            <div className="as-card">
              <span className="as-num">{Math.round((graph?.graph_health?.connectivity || 0) * 100)}%</span>
              <span className="as-label">Connectivity</span>
            </div>
            <div className="as-card">
              <span className="as-num">{universe?.layers?.["3_worlds"]?.count || 0}</span>
              <span className="as-label">Cities</span>
            </div>
          </div>

          {/* Graph Details */}
          <div className="admin-section">
            <h3>📊 Node Distribution</h3>
            <div className="distribution">
              {graph?.type_distribution && Object.entries(graph.type_distribution).map(([type, count]) => (
                <div key={type} className="dist-item">
                  <span className="dist-type">{type}</span>
                  <div className="dist-bar-wrap">
                    <div 
                      className="dist-bar" 
                      style={{ width: `${(count / graph.nodes) * 100}%` }}
                    />
                  </div>
                  <span className="dist-count">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Worlds Admin */}
          <div className="admin-section">
            <h3>🌍 Active Worlds</h3>
            <div className="admin-list">
              {universe?.layers?.["3_worlds"]?.cities?.map(city => (
                <div key={city} className="admin-item">
                  <span className="ai-icon">🏙️</span>
                  <span className="ai-name">{city}</span>
                  <span className="ai-status active">Active</span>
                </div>
              ))}
            </div>
          </div>

          {/* Packs Admin */}
          <div className="admin-section">
            <h3>📦 Active Packs</h3>
            <div className="admin-list">
              {universe?.layers?.["4_packs"]?.active?.map(pack => (
                <div key={pack} className="admin-item">
                  <span className="ai-icon">⚙️</span>
                  <span className="ai-name">{pack}</span>
                  <span className="ai-status active">Running</span>
                </div>
              ))}
            </div>
          </div>

          {/* Twin Definition */}
          <div className="admin-section">
            <h3>📐 Twin Definition</h3>
            <div className="definition-pillars">
              <div className="pillar">
                <span className="pillar-icon">📊</span>
                <span className="pillar-name">Information</span>
                <span className="pillar-desc">현실의 상태·사실·데이터</span>
              </div>
              <div className="pillar">
                <span className="pillar-icon">🔗</span>
                <span className="pillar-name">Context</span>
                <span className="pillar-desc">관계·구조·시간성</span>
              </div>
              <div className="pillar">
                <span className="pillar-icon">🎯</span>
                <span className="pillar-name">Intent</span>
                <span className="pillar-desc">목표·전략·정책</span>
              </div>
              <div className="pillar">
                <span className="pillar-icon">💥</span>
                <span className="pillar-name">Impact</span>
                <span className="pillar-desc">결과·효과·피드백</span>
              </div>
            </div>
            <div className="definition-loop">
              Information → Context → Intent → Impact → ∞
            </div>
          </div>

          {/* System Status */}
          <div className="admin-section">
            <h3>🔧 System Status</h3>
            <div className="system-status">
              <div className="ss-item">
                <span>Identity Protocol</span>
                <span className="ss-ok">✓ Active</span>
              </div>
              <div className="ss-item">
                <span>Memory Protocol</span>
                <span className="ss-ok">✓ Active</span>
              </div>
              <div className="ss-item">
                <span>Graph Engine</span>
                <span className="ss-ok">✓ Active</span>
              </div>
              <div className="ss-item">
                <span>Pack Engine</span>
                <span className="ss-ok">✓ Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sovereign Mode - Only You */}
      {mode === 'sovereign' && (
        <div className="view-sovereign">
          <div className="sovereign-warning">
            ⚠️ This information is for your eyes only
          </div>

          <div className="sovereign-section">
            <h3>🔑 Your Core Identity</h3>
            <div className="sovereign-item">
              <span className="si-label">Zero ID</span>
              <span className="si-value mono">{identity?.zero_id}</span>
            </div>
            <div className="sovereign-item">
              <span className="si-label">3D Signature</span>
              <span className="si-value mono">
                [{identity?.coordinates_3d?.x?.toFixed(4)}, {identity?.coordinates_3d?.y?.toFixed(4)}, {identity?.coordinates_3d?.z?.toFixed(4)}]
              </span>
            </div>
            <div className="sovereign-item">
              <span className="si-label">Auth Type</span>
              <span className="si-value">{identity?.auth_type}</span>
            </div>
          </div>

          <div className="sovereign-section">
            <h3>🛡️ Data Sovereignty</h3>
            <div className="sovereign-item">
              <span className="si-label">Data Policy</span>
              <span className="si-value si-badge">{memory?.sovereign?.data_policy || 'local_only'}</span>
            </div>
            <div className="sovereign-item">
              <span className="si-label">Login Required</span>
              <span className="si-value">{identity?.requires_login ? '❌ Yes' : '✅ No'}</span>
            </div>
            <div className="sovereign-item">
              <span className="si-label">Email Required</span>
              <span className="si-value">{identity?.requires_email ? '❌ Yes' : '✅ No'}</span>
            </div>
          </div>

          <div className="sovereign-section">
            <h3>📜 Consent History</h3>
            {memory?.sovereign?.consent?.length > 0 ? (
              memory.sovereign.consent.map((c, i) => (
                <div key={i} className="consent-item">
                  <span>{c.type}</span>
                  <span className={c.granted ? 'granted' : 'denied'}>
                    {c.granted ? '✓ Granted' : '✗ Denied'}
                  </span>
                </div>
              ))
            ) : (
              <div className="no-consent">No consent records yet</div>
            )}
          </div>

          <div className="sovereign-section">
            <h3>🌐 My Universe</h3>
            <div className="sovereign-item">
              <span className="si-label">Total Nodes</span>
              <span className="si-value">{universe?.universe?.nodes}</span>
            </div>
            <div className="sovereign-item">
              <span className="si-label">Total Edges</span>
              <span className="si-value">{universe?.universe?.edges}</span>
            </div>
            <div className="sovereign-item">
              <span className="si-label">Connectivity</span>
              <span className="si-value">{Math.round((universe?.universe?.connectivity || 0) * 100)}%</span>
            </div>
          </div>

          <div className="sovereign-section danger-zone">
            <h3>⚠️ Danger Zone</h3>
            <p className="danger-text">These actions are irreversible</p>
            <button className="danger-btn" onClick={() => alert('This would reset your local memory')}>
              🗑️ Reset Memory
            </button>
            <button className="danger-btn danger-critical" onClick={() => alert('This would destroy your identity')}>
              💀 Destroy Identity
            </button>
          </div>

          <div className="sovereign-footer">
            🔒 All data stored locally on this device only
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrCode && (
        <div className="qr-modal" onClick={() => setQrCode(null)}>
          <div className="qr-content" onClick={e => e.stopPropagation()}>
            <h3>📱 Sync Device</h3>
            <img src={qrCode} alt="QR" />
            <p>Scan to sync your identity</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
