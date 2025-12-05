import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = 'http://127.0.0.1:8003'

function App() {
  const [overview, setOverview] = useState(null)
  const [graph, setGraph] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewRes, graphRes] = await Promise.all([
          axios.get(`${API_URL}/twin/overview`),
          axios.get(`${API_URL}/twin/graph/summary`)
        ])
        setOverview(overviewRes.data)
        setGraph(graphRes.data)
      } catch (error) {
        console.error('API Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div className="loading">Loading AUTUS Twin...</div>

  return (
    <div className="app">
      <header>
        <h1>🌐 AUTUS Twin</h1>
        <p>The Protocol for Personal AI Operating Systems</p>
      </header>

      <div className="dashboard">
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

      <footer>
        <p>Zero Identity • Privacy by Architecture • Meta-Circular Development</p>
      </footer>
    </div>
  )
}

export default App
