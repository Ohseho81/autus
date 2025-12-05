import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import Identity3D from './Identity3D'
import Universe3D from './Universe3D'

const API_URL = 'http://127.0.0.1:8003'

function App() {
  const [overview, setOverview] = useState(null)
  const [graph, setGraph] = useState(null)
  const [identity, setIdentity] = useState(null)
  const [memory, setMemory] = useState(null)
  const [universe, setUniverse] = useState(null)
  const [qrCode, setQrCode] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewRes, graphRes, identityRes, memoryRes, universeRes] = await Promise.all([
          axios.get(`${API_URL}/twin/overview`),
          axios.get(`${API_URL}/twin/graph/summary`),
          axios.get(`${API_URL}/twin/auth/identity`),
          axios.get(`${API_URL}/twin/memory/summary`),
          axios.get(`${API_URL}/universe/overview`)
        ])
        setOverview(overviewRes.data)
        setGraph(graphRes.data)
        setIdentity(identityRes.data)
        setMemory(memoryRes.data)
        setUniverse(universeRes.data)
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

  if (loading) return <div className="loading">Loading AUTUS Universe...</div>

  return (
    <div className="app">
      <header>
        <h1>🌌 AUTUS Universe</h1>
        <p>Your Personal Operating System • 1-2-3-4-Universe Model</p>
      </header>

      {/* Universe 3D View - Full Width */}
      <div className="universe-section">
        <div className="card universe-card">
          <h2>🌌 Your Universe</h2>
          <Universe3D data={universe} />
          <div className="universe-legend">
            <span>⭐ Identity (You)</span>
            <span>🪐 Worlds (Cities)</span>
            <span>🛸 Packs (Actions)</span>
          </div>
        </div>
      </div>

      <div className="dashboard">
        {/* Layer 1: Identity Card */}
        <div className="card identity-card">
          <h2>1️⃣ Identity</h2>
          <p className="layer-question">Who am I?</p>
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

        {/* Layer 2: Sovereign Memory Card */}
        <div className="card">
          <h2>2️⃣ Sovereign Memory</h2>
          <p className="layer-question">What do I value?</p>
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

        {/* Layer 3: Worlds Card */}
        <div className="card">
          <h2>3️⃣ Twin Worlds</h2>
          <p className="layer-question">Where do I belong?</p>
          {universe?.layers?.["3_worlds"] && (
            <>
              <div className="stats">
                <div className="stat">
                  <span className="value">{universe.layers["3_worlds"].count}</span>
                  <span className="label">Cities</span>
                </div>
              </div>
              <div className="world-list">
                {universe.layers["3_worlds"].cities.map(city => (
                  <div key={city} className="world-item">
                    🪐 {city}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Layer 4: Packs Card */}
        <div className="card">
          <h2>4️⃣ Pack Engine</h2>
          <p className="layer-question">How do I act?</p>
          {universe?.layers?.["4_packs"] && (
            <>
              <div className="stats">
                <div className="stat">
                  <span className="value">{universe.layers["4_packs"].count}</span>
                  <span className="label">Active Packs</span>
                </div>
              </div>
              <div className="pack-list">
                {universe.layers["4_packs"].active.map(pack => (
                  <div key={pack} className="pack-item">
                    🛸 {pack}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Graph Summary */}
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
        <p>1️⃣ Identity • 2️⃣ Sovereign • 3️⃣ Worlds • 4️⃣ Packs • 🌌 Universe</p>
        <p className="version">AUTUS Protocol v1.0.0</p>
      </footer>
    </div>
  )
}

export default App
