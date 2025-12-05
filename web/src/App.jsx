import { useState, useEffect } from 'react'
import axios from 'axios'
import Identity3D from './Identity3D'
import './App.css'

const API_URL = 'http://127.0.0.1:8003'

function App() {
  const [overview, setOverview] = useState(null)
  const [graph, setGraph] = useState(null)
  const [identity, setIdentity] = useState(null)
  const [memory, setMemory] = useState(null)
  const [qrCode, setQrCode] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewRes, graphRes, identityRes, memoryRes] = await Promise.all([
          axios.get(`${API_URL}/twin/overview`),
          axios.get(`${API_URL}/twin/graph/summary`),
          axios.get(`${API_URL}/twin/auth/identity`),
          axios.get(`${API_URL}/twin/memory/summary`)
        ])
        setOverview(overviewRes.data)
        setGraph(graphRes.data)
        setIdentity(identityRes.data)
        setMemory(memoryRes.data)
      } catch (error) {
        console.error('API Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const showQR = async () => {
    try {
      const res = await axios.get(`${API_URL}/twin/auth/qr-image`)
      setQrCode(res.data.qr_image)
    } catch (error) {
      console.error('QR Error:', error)
    }
  }

  if (loading) return <div className="loading">Loading AUTUS Twin...</div>

  return (
    <div className="app">
      <header>
        <h1>🌐 AUTUS Twin</h1>
        <p>The Protocol for Personal AI Operating Systems</p>
      </header>

      <div className="dashboard">
        {/* Identity Card - Article I */}
        <div className="card identity-card">
          <h2>🔐 Zero Identity</h2>
          {identity && (
            <>
              <div className="zero-id">
                <span className="label">Zero ID</span>
                <span className="value">{identity.zero_id}</span>
              </div>
              <div className="coordinates">
                <h3>3D Coordinates</h3>
                <div className="coord-grid">
                  <div className="coord">
                    <span className="axis">X</span>
                    <span className="val">{identity.coordinates_3d.x.toFixed(3)}</span>
                  </div>
                  <div className="coord">
                    <span className="axis">Y</span>
                    <span className="val">{identity.coordinates_3d.y.toFixed(3)}</span>
                  </div>
                  <div className="coord">
                    <span className="axis">Z</span>
                    <span className="val">{identity.coordinates_3d.z.toFixed(3)}</span>
                  </div>
                </div>
                <Identity3D coordinates={identity.coordinates_3d} />
              </div>
              <div className="privacy-badges">
                <span className="badge">🚫 No Login</span>
                <span className="badge">🚫 No Email</span>
                <span className="badge">✅ Local Only</span>
              </div>
              <button className="qr-button" onClick={showQR}>
                📱 Show QR for Device Sync
              </button>
            </>
          )}
        </div>

        {/* Memory Card - Article II */}
        <div className="card">
          <h2>🧠 Local Memory</h2>
          {memory && (
            <div className="stats">
              <div className="stat">
                <span className="value">{memory.preferences_count}</span>
                <span className="label">Preferences</span>
              </div>
              <div className="stat">
                <span className="value">{memory.patterns_count}</span>
                <span className="label">Patterns</span>
              </div>
              <div className="stat">
                <span className="value">{memory.workflows_count}</span>
                <span className="label">Workflows</span>
              </div>
            </div>
          )}
          <div className="privacy-note">
            🔒 {memory?.sovereign?.data_policy || 'local_only'}
          </div>
        </div>

        {/* Overview Card */}
        <div className="card">
          <h2>📊 Overview</h2>
          {overview && (
            <div className="stats">
              <div className="stat">
                <span className="value">{overview.city_count}</span>
                <span className="label">Cities</span>
              </div>
              <div className="stat">
                <span className="value">{overview.talent_total}</span>
                <span className="label">Talents</span>
              </div>
              <div className="stat">
                <span className="value">{overview.active_packs}</span>
                <span className="label">Active Packs</span>
              </div>
              <div className="stat">
                <span className="value">{(overview.retention_avg * 100).toFixed(0)}%</span>
                <span className="label">Retention</span>
              </div>
            </div>
          )}
        </div>

        {/* Graph Card */}
        <div className="card">
          <h2>🔗 Graph Summary</h2>
          {graph && (
            <>
              <div className="stats">
                <div className="stat">
                  <span className="value">{graph.nodes}</span>
                  <span className="label">Nodes</span>
                </div>
                <div className="stat">
                  <span className="value">{graph.edges}</span>
                  <span className="label">Edges</span>
                </div>
                <div className="stat">
                  <span className="value">{(graph.graph_health.connectivity * 100).toFixed(0)}%</span>
                  <span className="label">Connectivity</span>
                </div>
              </div>
              <div className="type-dist">
                <h3>Node Types</h3>
                {Object.entries(graph.type_distribution).map(([type, count]) => (
                  <div key={type} className="type-item">
                    <span>{type}</span>
                    <span className="count">{count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top Cities */}
        <div className="card">
          <h2>🏙️ Top Cities</h2>
          {overview?.top_cities?.map(city => (
            <div key={city.city_id} className="city-item">
              <span>{city.city_id}</span>
              <span className="score">{(city.score * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* QR Modal */}
      {qrCode && (
        <div className="qr-modal" onClick={() => setQrCode(null)}>
          <div className="qr-content" onClick={e => e.stopPropagation()}>
            <h3>📱 Scan to Sync Device</h3>
            <img src={qrCode} alt="QR Code" />
            <p>Expires in 5 minutes</p>
            <p className="tap-hint">Tap outside to close</p>
          </div>
        </div>
      )}

      <footer>
        <p>Zero Identity • Privacy by Architecture • Meta-Circular Development</p>
        <p className="version">AUTUS Protocol v1.0.0</p>
      </footer>
    </div>
  )
}

export default App
