export default function Home() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a10 0%, #1a1a30 100%)',
      color: '#e0e0e0',
      fontFamily: 'SF Pro Display, system-ui, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '3rem', 
        background: 'linear-gradient(135deg, #00f0ff, #b44aff)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '1rem'
      }}>
        🌊 AUTUS API
      </h1>
      <p style={{ fontSize: '1.25rem', color: '#888', marginBottom: '2rem' }}>
        V = (M - T) × (1 + s)^t
      </p>
      
      <div style={{ 
        background: 'rgba(26, 26, 32, 0.8)',
        borderRadius: '16px',
        padding: '2rem',
        border: '1px solid rgba(51, 51, 68, 0.4)',
        maxWidth: '600px'
      }}>
        <h2 style={{ color: '#00f0ff', marginBottom: '1rem' }}>📡 API Endpoints</h2>
        <ul style={{ lineHeight: '2', listStyle: 'none', padding: 0 }}>
          <li>🧠 <code>/api/brain</code> - Claude AI Integration</li>
          <li>⚛️ <code>/api/physics</code> - V Engine & Impulse</li>
          <li>🤝 <code>/api/consensus</code> - 활용 기반 자동 합의</li>
          <li>🧬 <code>/api/organisms</code> - 유기체 CRUD</li>
          <li>🏆 <code>/api/leaderboard</code> - V 순위 / 솔루션 랭킹</li>
          <li>🎁 <code>/api/rewards</code> - 보상 카드 관리</li>
        </ul>
      </div>

      <p style={{ marginTop: '2rem', color: '#555' }}>
        Edge Runtime • Supabase • Claude AI
      </p>
    </main>
  )
}
