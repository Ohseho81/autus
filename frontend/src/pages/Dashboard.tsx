import { useEffect, useState, useCallback } from 'react'
import { Upload, RefreshCw, Settings, AlertCircle, CheckCircle2 } from 'lucide-react'
import { PhysisMap, PhysisMapEmpty } from '../components/PhysisMap'
import { TierList } from '../components/TierList'
import { AmberTicker, AmberTickerSkeleton, MiniTicker } from '../components/AmberTicker'

// API 함수들 (실제 구현 시 api/client.ts에서 import)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function fetchDashboardData() {
  const res = await fetch(`${API_BASE}/api/v2/analytics/summary`)
  return res.json()
}

async function fetchZScoreRanking() {
  const res = await fetch(`${API_BASE}/api/v2/students/calculate-zscore`, { method: 'POST' })
  return res.json()
}

async function resetDemoData() {
  const res = await fetch(`${API_BASE}/api/v2/students/demo/reset`)
  return res.json()
}

interface DashboardData {
  summary: {
    total_students: number
    health_score: number
    health_status: string
    avg_sq: number
    total_monthly_revenue: number
    cluster_distribution: Record<string, number>
  }
  quick_stats: {
    golden_core: number
    high_potential: number
    at_risk: number
  }
}

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [zscoreRanking, setZscoreRanking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tier' | 'cluster'>('tier')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [dashboard, ranking] = await Promise.all([
        fetchDashboardData(),
        fetchZScoreRanking()
      ])
      
      setDashboardData(dashboard)
      setZscoreRanking(ranking.ranking || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleReset = async () => {
    if (!confirm('데모 데이터를 초기화하시겠습니까?')) return
    try {
      await resetDemoData()
      loadData()
    } catch (err) {
      alert('초기화에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6 text-white">
      {/* 헤더 */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
            <span className="text-amber-500">AUTUS</span>
            <span className="text-white">.PRIME</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Education Management System v2.1 · Z-Score Engine
          </p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-gray-400">System Online</span>
          </div>
          
          {dashboardData && (
            <div className="bg-slate-800 px-3 py-1 rounded text-xs">
              <span className="text-gray-400">총 가치: </span>
              <span className="text-amber-500 font-bold">
                ₩{(dashboardData.summary.total_monthly_revenue / 10000).toFixed(0)}만
              </span>
            </div>
          )}
          
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={loadData} className="ml-auto text-xs underline">재시도</button>
        </div>
      )}

      {/* 메트릭 카드 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse h-20"></div>
          ))}
        </div>
      ) : dashboardData ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">총 학생</p>
            <p className="text-2xl font-bold">{dashboardData.summary.total_students}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">평균 SQ</p>
            <p className="text-2xl font-bold text-amber-500">{dashboardData.summary.avg_sq.toFixed(1)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">건강도</p>
            <p className="text-2xl font-bold text-green-500">{dashboardData.summary.health_score.toFixed(0)}%</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">위험 학생</p>
            <p className="text-2xl font-bold text-red-500">{dashboardData.quick_stats.at_risk}</p>
          </div>
        </div>
      ) : null}

      {/* 메인 콘텐츠 */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 클러스터 분포 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Cluster Distribution
            </h3>
            {dashboardData && (
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(dashboardData.summary.cluster_distribution || {}).map(([cluster, count]) => (
                  <div key={cluster} className="text-center p-3 bg-slate-700/50 rounded">
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-gray-400 truncate">{cluster.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 골든 코어 정보 */}
          {dashboardData && dashboardData.quick_stats.golden_core > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌟</span>
                <h3 className="font-semibold text-amber-400">Golden Core</h3>
                <span className="ml-auto text-2xl font-bold text-amber-500">
                  {dashboardData.quick_stats.golden_core}명
                </span>
              </div>
              <p className="text-xs text-gray-400">
                VIP 최우선 관리 대상 · 추가 과목/장기 등록 유도 추천
              </p>
            </div>
          )}
        </div>

        {/* 오른쪽: 서열 리스트 */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Z-Score Ranking
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('tier')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'tier' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Tier
              </button>
              <button
                onClick={() => setViewMode('cluster')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'cluster' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Cluster
              </button>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-2">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="bg-slate-800 rounded-lg p-3 animate-pulse h-16"></div>
              ))
            ) : zscoreRanking.length > 0 ? (
              zscoreRanking.map((student: any) => (
                <div 
                  key={student.student_id}
                  className="bg-slate-800 rounded-lg p-3 border-l-4 hover:bg-slate-700 transition-colors"
                  style={{
                    borderLeftColor: student.tier === 'DIAMOND' ? '#38bdf8' :
                                     student.tier === 'PLATINUM' ? '#e5e4e2' :
                                     student.tier === 'GOLD' ? '#fbbf24' :
                                     student.tier === 'STEEL' ? '#71797E' : '#ef4444'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">#{student.rank}</span>
                      <span className="text-sm">{student.tier_emoji}</span>
                      <span className="font-medium">{student.student_name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono ${
                        student.z_score >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                    <span>SQ: {student.sq_score.toFixed(0)}</span>
                    <span>{student.percentile?.toFixed(1)}%ile</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>학생 데이터가 없습니다</p>
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="w-full mt-4 p-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Settings size={12} className="inline mr-1" />
            Reset Demo Data
          </button>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-gray-600">
        <p>AUTUS-PRIME · Education Pack · Powered by Z-Score Engine</p>
        <p className="mt-1">
          SQ = (1.5 × Fee) + (1.2 × Grade) - (2.0 × Entropy)
        </p>
      </footer>
    </div>
  )
}

export default Dashboard










import { useEffect, useState, useCallback } from 'react'
import { Upload, RefreshCw, Settings, AlertCircle, CheckCircle2 } from 'lucide-react'
import { PhysisMap, PhysisMapEmpty } from '../components/PhysisMap'
import { TierList } from '../components/TierList'
import { AmberTicker, AmberTickerSkeleton, MiniTicker } from '../components/AmberTicker'

// API 함수들 (실제 구현 시 api/client.ts에서 import)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function fetchDashboardData() {
  const res = await fetch(`${API_BASE}/api/v2/analytics/summary`)
  return res.json()
}

async function fetchZScoreRanking() {
  const res = await fetch(`${API_BASE}/api/v2/students/calculate-zscore`, { method: 'POST' })
  return res.json()
}

async function resetDemoData() {
  const res = await fetch(`${API_BASE}/api/v2/students/demo/reset`)
  return res.json()
}

interface DashboardData {
  summary: {
    total_students: number
    health_score: number
    health_status: string
    avg_sq: number
    total_monthly_revenue: number
    cluster_distribution: Record<string, number>
  }
  quick_stats: {
    golden_core: number
    high_potential: number
    at_risk: number
  }
}

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [zscoreRanking, setZscoreRanking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tier' | 'cluster'>('tier')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [dashboard, ranking] = await Promise.all([
        fetchDashboardData(),
        fetchZScoreRanking()
      ])
      
      setDashboardData(dashboard)
      setZscoreRanking(ranking.ranking || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleReset = async () => {
    if (!confirm('데모 데이터를 초기화하시겠습니까?')) return
    try {
      await resetDemoData()
      loadData()
    } catch (err) {
      alert('초기화에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6 text-white">
      {/* 헤더 */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
            <span className="text-amber-500">AUTUS</span>
            <span className="text-white">.PRIME</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Education Management System v2.1 · Z-Score Engine
          </p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-gray-400">System Online</span>
          </div>
          
          {dashboardData && (
            <div className="bg-slate-800 px-3 py-1 rounded text-xs">
              <span className="text-gray-400">총 가치: </span>
              <span className="text-amber-500 font-bold">
                ₩{(dashboardData.summary.total_monthly_revenue / 10000).toFixed(0)}만
              </span>
            </div>
          )}
          
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={loadData} className="ml-auto text-xs underline">재시도</button>
        </div>
      )}

      {/* 메트릭 카드 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse h-20"></div>
          ))}
        </div>
      ) : dashboardData ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">총 학생</p>
            <p className="text-2xl font-bold">{dashboardData.summary.total_students}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">평균 SQ</p>
            <p className="text-2xl font-bold text-amber-500">{dashboardData.summary.avg_sq.toFixed(1)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">건강도</p>
            <p className="text-2xl font-bold text-green-500">{dashboardData.summary.health_score.toFixed(0)}%</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">위험 학생</p>
            <p className="text-2xl font-bold text-red-500">{dashboardData.quick_stats.at_risk}</p>
          </div>
        </div>
      ) : null}

      {/* 메인 콘텐츠 */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 클러스터 분포 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Cluster Distribution
            </h3>
            {dashboardData && (
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(dashboardData.summary.cluster_distribution || {}).map(([cluster, count]) => (
                  <div key={cluster} className="text-center p-3 bg-slate-700/50 rounded">
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-gray-400 truncate">{cluster.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 골든 코어 정보 */}
          {dashboardData && dashboardData.quick_stats.golden_core > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌟</span>
                <h3 className="font-semibold text-amber-400">Golden Core</h3>
                <span className="ml-auto text-2xl font-bold text-amber-500">
                  {dashboardData.quick_stats.golden_core}명
                </span>
              </div>
              <p className="text-xs text-gray-400">
                VIP 최우선 관리 대상 · 추가 과목/장기 등록 유도 추천
              </p>
            </div>
          )}
        </div>

        {/* 오른쪽: 서열 리스트 */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Z-Score Ranking
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('tier')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'tier' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Tier
              </button>
              <button
                onClick={() => setViewMode('cluster')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'cluster' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Cluster
              </button>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-2">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="bg-slate-800 rounded-lg p-3 animate-pulse h-16"></div>
              ))
            ) : zscoreRanking.length > 0 ? (
              zscoreRanking.map((student: any) => (
                <div 
                  key={student.student_id}
                  className="bg-slate-800 rounded-lg p-3 border-l-4 hover:bg-slate-700 transition-colors"
                  style={{
                    borderLeftColor: student.tier === 'DIAMOND' ? '#38bdf8' :
                                     student.tier === 'PLATINUM' ? '#e5e4e2' :
                                     student.tier === 'GOLD' ? '#fbbf24' :
                                     student.tier === 'STEEL' ? '#71797E' : '#ef4444'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">#{student.rank}</span>
                      <span className="text-sm">{student.tier_emoji}</span>
                      <span className="font-medium">{student.student_name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono ${
                        student.z_score >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                    <span>SQ: {student.sq_score.toFixed(0)}</span>
                    <span>{student.percentile?.toFixed(1)}%ile</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>학생 데이터가 없습니다</p>
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="w-full mt-4 p-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Settings size={12} className="inline mr-1" />
            Reset Demo Data
          </button>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-gray-600">
        <p>AUTUS-PRIME · Education Pack · Powered by Z-Score Engine</p>
        <p className="mt-1">
          SQ = (1.5 × Fee) + (1.2 × Grade) - (2.0 × Entropy)
        </p>
      </footer>
    </div>
  )
}

export default Dashboard










import { useEffect, useState, useCallback } from 'react'
import { Upload, RefreshCw, Settings, AlertCircle, CheckCircle2 } from 'lucide-react'
import { PhysisMap, PhysisMapEmpty } from '../components/PhysisMap'
import { TierList } from '../components/TierList'
import { AmberTicker, AmberTickerSkeleton, MiniTicker } from '../components/AmberTicker'

// API 함수들 (실제 구현 시 api/client.ts에서 import)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function fetchDashboardData() {
  const res = await fetch(`${API_BASE}/api/v2/analytics/summary`)
  return res.json()
}

async function fetchZScoreRanking() {
  const res = await fetch(`${API_BASE}/api/v2/students/calculate-zscore`, { method: 'POST' })
  return res.json()
}

async function resetDemoData() {
  const res = await fetch(`${API_BASE}/api/v2/students/demo/reset`)
  return res.json()
}

interface DashboardData {
  summary: {
    total_students: number
    health_score: number
    health_status: string
    avg_sq: number
    total_monthly_revenue: number
    cluster_distribution: Record<string, number>
  }
  quick_stats: {
    golden_core: number
    high_potential: number
    at_risk: number
  }
}

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [zscoreRanking, setZscoreRanking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tier' | 'cluster'>('tier')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [dashboard, ranking] = await Promise.all([
        fetchDashboardData(),
        fetchZScoreRanking()
      ])
      
      setDashboardData(dashboard)
      setZscoreRanking(ranking.ranking || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleReset = async () => {
    if (!confirm('데모 데이터를 초기화하시겠습니까?')) return
    try {
      await resetDemoData()
      loadData()
    } catch (err) {
      alert('초기화에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6 text-white">
      {/* 헤더 */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
            <span className="text-amber-500">AUTUS</span>
            <span className="text-white">.PRIME</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Education Management System v2.1 · Z-Score Engine
          </p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-gray-400">System Online</span>
          </div>
          
          {dashboardData && (
            <div className="bg-slate-800 px-3 py-1 rounded text-xs">
              <span className="text-gray-400">총 가치: </span>
              <span className="text-amber-500 font-bold">
                ₩{(dashboardData.summary.total_monthly_revenue / 10000).toFixed(0)}만
              </span>
            </div>
          )}
          
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={loadData} className="ml-auto text-xs underline">재시도</button>
        </div>
      )}

      {/* 메트릭 카드 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse h-20"></div>
          ))}
        </div>
      ) : dashboardData ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">총 학생</p>
            <p className="text-2xl font-bold">{dashboardData.summary.total_students}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">평균 SQ</p>
            <p className="text-2xl font-bold text-amber-500">{dashboardData.summary.avg_sq.toFixed(1)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">건강도</p>
            <p className="text-2xl font-bold text-green-500">{dashboardData.summary.health_score.toFixed(0)}%</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">위험 학생</p>
            <p className="text-2xl font-bold text-red-500">{dashboardData.quick_stats.at_risk}</p>
          </div>
        </div>
      ) : null}

      {/* 메인 콘텐츠 */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 클러스터 분포 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Cluster Distribution
            </h3>
            {dashboardData && (
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(dashboardData.summary.cluster_distribution || {}).map(([cluster, count]) => (
                  <div key={cluster} className="text-center p-3 bg-slate-700/50 rounded">
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-gray-400 truncate">{cluster.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 골든 코어 정보 */}
          {dashboardData && dashboardData.quick_stats.golden_core > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌟</span>
                <h3 className="font-semibold text-amber-400">Golden Core</h3>
                <span className="ml-auto text-2xl font-bold text-amber-500">
                  {dashboardData.quick_stats.golden_core}명
                </span>
              </div>
              <p className="text-xs text-gray-400">
                VIP 최우선 관리 대상 · 추가 과목/장기 등록 유도 추천
              </p>
            </div>
          )}
        </div>

        {/* 오른쪽: 서열 리스트 */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Z-Score Ranking
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('tier')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'tier' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Tier
              </button>
              <button
                onClick={() => setViewMode('cluster')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'cluster' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Cluster
              </button>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-2">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="bg-slate-800 rounded-lg p-3 animate-pulse h-16"></div>
              ))
            ) : zscoreRanking.length > 0 ? (
              zscoreRanking.map((student: any) => (
                <div 
                  key={student.student_id}
                  className="bg-slate-800 rounded-lg p-3 border-l-4 hover:bg-slate-700 transition-colors"
                  style={{
                    borderLeftColor: student.tier === 'DIAMOND' ? '#38bdf8' :
                                     student.tier === 'PLATINUM' ? '#e5e4e2' :
                                     student.tier === 'GOLD' ? '#fbbf24' :
                                     student.tier === 'STEEL' ? '#71797E' : '#ef4444'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">#{student.rank}</span>
                      <span className="text-sm">{student.tier_emoji}</span>
                      <span className="font-medium">{student.student_name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono ${
                        student.z_score >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                    <span>SQ: {student.sq_score.toFixed(0)}</span>
                    <span>{student.percentile?.toFixed(1)}%ile</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>학생 데이터가 없습니다</p>
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="w-full mt-4 p-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Settings size={12} className="inline mr-1" />
            Reset Demo Data
          </button>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-gray-600">
        <p>AUTUS-PRIME · Education Pack · Powered by Z-Score Engine</p>
        <p className="mt-1">
          SQ = (1.5 × Fee) + (1.2 × Grade) - (2.0 × Entropy)
        </p>
      </footer>
    </div>
  )
}

export default Dashboard










import { useEffect, useState, useCallback } from 'react'
import { Upload, RefreshCw, Settings, AlertCircle, CheckCircle2 } from 'lucide-react'
import { PhysisMap, PhysisMapEmpty } from '../components/PhysisMap'
import { TierList } from '../components/TierList'
import { AmberTicker, AmberTickerSkeleton, MiniTicker } from '../components/AmberTicker'

// API 함수들 (실제 구현 시 api/client.ts에서 import)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function fetchDashboardData() {
  const res = await fetch(`${API_BASE}/api/v2/analytics/summary`)
  return res.json()
}

async function fetchZScoreRanking() {
  const res = await fetch(`${API_BASE}/api/v2/students/calculate-zscore`, { method: 'POST' })
  return res.json()
}

async function resetDemoData() {
  const res = await fetch(`${API_BASE}/api/v2/students/demo/reset`)
  return res.json()
}

interface DashboardData {
  summary: {
    total_students: number
    health_score: number
    health_status: string
    avg_sq: number
    total_monthly_revenue: number
    cluster_distribution: Record<string, number>
  }
  quick_stats: {
    golden_core: number
    high_potential: number
    at_risk: number
  }
}

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [zscoreRanking, setZscoreRanking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tier' | 'cluster'>('tier')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [dashboard, ranking] = await Promise.all([
        fetchDashboardData(),
        fetchZScoreRanking()
      ])
      
      setDashboardData(dashboard)
      setZscoreRanking(ranking.ranking || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleReset = async () => {
    if (!confirm('데모 데이터를 초기화하시겠습니까?')) return
    try {
      await resetDemoData()
      loadData()
    } catch (err) {
      alert('초기화에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6 text-white">
      {/* 헤더 */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
            <span className="text-amber-500">AUTUS</span>
            <span className="text-white">.PRIME</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Education Management System v2.1 · Z-Score Engine
          </p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-gray-400">System Online</span>
          </div>
          
          {dashboardData && (
            <div className="bg-slate-800 px-3 py-1 rounded text-xs">
              <span className="text-gray-400">총 가치: </span>
              <span className="text-amber-500 font-bold">
                ₩{(dashboardData.summary.total_monthly_revenue / 10000).toFixed(0)}만
              </span>
            </div>
          )}
          
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={loadData} className="ml-auto text-xs underline">재시도</button>
        </div>
      )}

      {/* 메트릭 카드 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse h-20"></div>
          ))}
        </div>
      ) : dashboardData ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">총 학생</p>
            <p className="text-2xl font-bold">{dashboardData.summary.total_students}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">평균 SQ</p>
            <p className="text-2xl font-bold text-amber-500">{dashboardData.summary.avg_sq.toFixed(1)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">건강도</p>
            <p className="text-2xl font-bold text-green-500">{dashboardData.summary.health_score.toFixed(0)}%</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">위험 학생</p>
            <p className="text-2xl font-bold text-red-500">{dashboardData.quick_stats.at_risk}</p>
          </div>
        </div>
      ) : null}

      {/* 메인 콘텐츠 */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 클러스터 분포 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Cluster Distribution
            </h3>
            {dashboardData && (
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(dashboardData.summary.cluster_distribution || {}).map(([cluster, count]) => (
                  <div key={cluster} className="text-center p-3 bg-slate-700/50 rounded">
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-gray-400 truncate">{cluster.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 골든 코어 정보 */}
          {dashboardData && dashboardData.quick_stats.golden_core > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌟</span>
                <h3 className="font-semibold text-amber-400">Golden Core</h3>
                <span className="ml-auto text-2xl font-bold text-amber-500">
                  {dashboardData.quick_stats.golden_core}명
                </span>
              </div>
              <p className="text-xs text-gray-400">
                VIP 최우선 관리 대상 · 추가 과목/장기 등록 유도 추천
              </p>
            </div>
          )}
        </div>

        {/* 오른쪽: 서열 리스트 */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Z-Score Ranking
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('tier')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'tier' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Tier
              </button>
              <button
                onClick={() => setViewMode('cluster')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'cluster' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Cluster
              </button>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-2">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="bg-slate-800 rounded-lg p-3 animate-pulse h-16"></div>
              ))
            ) : zscoreRanking.length > 0 ? (
              zscoreRanking.map((student: any) => (
                <div 
                  key={student.student_id}
                  className="bg-slate-800 rounded-lg p-3 border-l-4 hover:bg-slate-700 transition-colors"
                  style={{
                    borderLeftColor: student.tier === 'DIAMOND' ? '#38bdf8' :
                                     student.tier === 'PLATINUM' ? '#e5e4e2' :
                                     student.tier === 'GOLD' ? '#fbbf24' :
                                     student.tier === 'STEEL' ? '#71797E' : '#ef4444'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">#{student.rank}</span>
                      <span className="text-sm">{student.tier_emoji}</span>
                      <span className="font-medium">{student.student_name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono ${
                        student.z_score >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                    <span>SQ: {student.sq_score.toFixed(0)}</span>
                    <span>{student.percentile?.toFixed(1)}%ile</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>학생 데이터가 없습니다</p>
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="w-full mt-4 p-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Settings size={12} className="inline mr-1" />
            Reset Demo Data
          </button>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-gray-600">
        <p>AUTUS-PRIME · Education Pack · Powered by Z-Score Engine</p>
        <p className="mt-1">
          SQ = (1.5 × Fee) + (1.2 × Grade) - (2.0 × Entropy)
        </p>
      </footer>
    </div>
  )
}

export default Dashboard










import { useEffect, useState, useCallback } from 'react'
import { Upload, RefreshCw, Settings, AlertCircle, CheckCircle2 } from 'lucide-react'
import { PhysisMap, PhysisMapEmpty } from '../components/PhysisMap'
import { TierList } from '../components/TierList'
import { AmberTicker, AmberTickerSkeleton, MiniTicker } from '../components/AmberTicker'

// API 함수들 (실제 구현 시 api/client.ts에서 import)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function fetchDashboardData() {
  const res = await fetch(`${API_BASE}/api/v2/analytics/summary`)
  return res.json()
}

async function fetchZScoreRanking() {
  const res = await fetch(`${API_BASE}/api/v2/students/calculate-zscore`, { method: 'POST' })
  return res.json()
}

async function resetDemoData() {
  const res = await fetch(`${API_BASE}/api/v2/students/demo/reset`)
  return res.json()
}

interface DashboardData {
  summary: {
    total_students: number
    health_score: number
    health_status: string
    avg_sq: number
    total_monthly_revenue: number
    cluster_distribution: Record<string, number>
  }
  quick_stats: {
    golden_core: number
    high_potential: number
    at_risk: number
  }
}

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [zscoreRanking, setZscoreRanking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tier' | 'cluster'>('tier')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [dashboard, ranking] = await Promise.all([
        fetchDashboardData(),
        fetchZScoreRanking()
      ])
      
      setDashboardData(dashboard)
      setZscoreRanking(ranking.ranking || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleReset = async () => {
    if (!confirm('데모 데이터를 초기화하시겠습니까?')) return
    try {
      await resetDemoData()
      loadData()
    } catch (err) {
      alert('초기화에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6 text-white">
      {/* 헤더 */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
            <span className="text-amber-500">AUTUS</span>
            <span className="text-white">.PRIME</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Education Management System v2.1 · Z-Score Engine
          </p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-gray-400">System Online</span>
          </div>
          
          {dashboardData && (
            <div className="bg-slate-800 px-3 py-1 rounded text-xs">
              <span className="text-gray-400">총 가치: </span>
              <span className="text-amber-500 font-bold">
                ₩{(dashboardData.summary.total_monthly_revenue / 10000).toFixed(0)}만
              </span>
            </div>
          )}
          
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={loadData} className="ml-auto text-xs underline">재시도</button>
        </div>
      )}

      {/* 메트릭 카드 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse h-20"></div>
          ))}
        </div>
      ) : dashboardData ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">총 학생</p>
            <p className="text-2xl font-bold">{dashboardData.summary.total_students}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">평균 SQ</p>
            <p className="text-2xl font-bold text-amber-500">{dashboardData.summary.avg_sq.toFixed(1)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">건강도</p>
            <p className="text-2xl font-bold text-green-500">{dashboardData.summary.health_score.toFixed(0)}%</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">위험 학생</p>
            <p className="text-2xl font-bold text-red-500">{dashboardData.quick_stats.at_risk}</p>
          </div>
        </div>
      ) : null}

      {/* 메인 콘텐츠 */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 클러스터 분포 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Cluster Distribution
            </h3>
            {dashboardData && (
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(dashboardData.summary.cluster_distribution || {}).map(([cluster, count]) => (
                  <div key={cluster} className="text-center p-3 bg-slate-700/50 rounded">
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-gray-400 truncate">{cluster.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 골든 코어 정보 */}
          {dashboardData && dashboardData.quick_stats.golden_core > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌟</span>
                <h3 className="font-semibold text-amber-400">Golden Core</h3>
                <span className="ml-auto text-2xl font-bold text-amber-500">
                  {dashboardData.quick_stats.golden_core}명
                </span>
              </div>
              <p className="text-xs text-gray-400">
                VIP 최우선 관리 대상 · 추가 과목/장기 등록 유도 추천
              </p>
            </div>
          )}
        </div>

        {/* 오른쪽: 서열 리스트 */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Z-Score Ranking
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('tier')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'tier' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Tier
              </button>
              <button
                onClick={() => setViewMode('cluster')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'cluster' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Cluster
              </button>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-2">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="bg-slate-800 rounded-lg p-3 animate-pulse h-16"></div>
              ))
            ) : zscoreRanking.length > 0 ? (
              zscoreRanking.map((student: any) => (
                <div 
                  key={student.student_id}
                  className="bg-slate-800 rounded-lg p-3 border-l-4 hover:bg-slate-700 transition-colors"
                  style={{
                    borderLeftColor: student.tier === 'DIAMOND' ? '#38bdf8' :
                                     student.tier === 'PLATINUM' ? '#e5e4e2' :
                                     student.tier === 'GOLD' ? '#fbbf24' :
                                     student.tier === 'STEEL' ? '#71797E' : '#ef4444'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">#{student.rank}</span>
                      <span className="text-sm">{student.tier_emoji}</span>
                      <span className="font-medium">{student.student_name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono ${
                        student.z_score >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                    <span>SQ: {student.sq_score.toFixed(0)}</span>
                    <span>{student.percentile?.toFixed(1)}%ile</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>학생 데이터가 없습니다</p>
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="w-full mt-4 p-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Settings size={12} className="inline mr-1" />
            Reset Demo Data
          </button>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-gray-600">
        <p>AUTUS-PRIME · Education Pack · Powered by Z-Score Engine</p>
        <p className="mt-1">
          SQ = (1.5 × Fee) + (1.2 × Grade) - (2.0 × Entropy)
        </p>
      </footer>
    </div>
  )
}

export default Dashboard




















import { useEffect, useState, useCallback } from 'react'
import { Upload, RefreshCw, Settings, AlertCircle, CheckCircle2 } from 'lucide-react'
import { PhysisMap, PhysisMapEmpty } from '../components/PhysisMap'
import { TierList } from '../components/TierList'
import { AmberTicker, AmberTickerSkeleton, MiniTicker } from '../components/AmberTicker'

// API 함수들 (실제 구현 시 api/client.ts에서 import)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function fetchDashboardData() {
  const res = await fetch(`${API_BASE}/api/v2/analytics/summary`)
  return res.json()
}

async function fetchZScoreRanking() {
  const res = await fetch(`${API_BASE}/api/v2/students/calculate-zscore`, { method: 'POST' })
  return res.json()
}

async function resetDemoData() {
  const res = await fetch(`${API_BASE}/api/v2/students/demo/reset`)
  return res.json()
}

interface DashboardData {
  summary: {
    total_students: number
    health_score: number
    health_status: string
    avg_sq: number
    total_monthly_revenue: number
    cluster_distribution: Record<string, number>
  }
  quick_stats: {
    golden_core: number
    high_potential: number
    at_risk: number
  }
}

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [zscoreRanking, setZscoreRanking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tier' | 'cluster'>('tier')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [dashboard, ranking] = await Promise.all([
        fetchDashboardData(),
        fetchZScoreRanking()
      ])
      
      setDashboardData(dashboard)
      setZscoreRanking(ranking.ranking || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleReset = async () => {
    if (!confirm('데모 데이터를 초기화하시겠습니까?')) return
    try {
      await resetDemoData()
      loadData()
    } catch (err) {
      alert('초기화에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6 text-white">
      {/* 헤더 */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
            <span className="text-amber-500">AUTUS</span>
            <span className="text-white">.PRIME</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Education Management System v2.1 · Z-Score Engine
          </p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-gray-400">System Online</span>
          </div>
          
          {dashboardData && (
            <div className="bg-slate-800 px-3 py-1 rounded text-xs">
              <span className="text-gray-400">총 가치: </span>
              <span className="text-amber-500 font-bold">
                ₩{(dashboardData.summary.total_monthly_revenue / 10000).toFixed(0)}만
              </span>
            </div>
          )}
          
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={loadData} className="ml-auto text-xs underline">재시도</button>
        </div>
      )}

      {/* 메트릭 카드 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse h-20"></div>
          ))}
        </div>
      ) : dashboardData ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">총 학생</p>
            <p className="text-2xl font-bold">{dashboardData.summary.total_students}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">평균 SQ</p>
            <p className="text-2xl font-bold text-amber-500">{dashboardData.summary.avg_sq.toFixed(1)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">건강도</p>
            <p className="text-2xl font-bold text-green-500">{dashboardData.summary.health_score.toFixed(0)}%</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">위험 학생</p>
            <p className="text-2xl font-bold text-red-500">{dashboardData.quick_stats.at_risk}</p>
          </div>
        </div>
      ) : null}

      {/* 메인 콘텐츠 */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 클러스터 분포 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Cluster Distribution
            </h3>
            {dashboardData && (
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(dashboardData.summary.cluster_distribution || {}).map(([cluster, count]) => (
                  <div key={cluster} className="text-center p-3 bg-slate-700/50 rounded">
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-gray-400 truncate">{cluster.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 골든 코어 정보 */}
          {dashboardData && dashboardData.quick_stats.golden_core > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌟</span>
                <h3 className="font-semibold text-amber-400">Golden Core</h3>
                <span className="ml-auto text-2xl font-bold text-amber-500">
                  {dashboardData.quick_stats.golden_core}명
                </span>
              </div>
              <p className="text-xs text-gray-400">
                VIP 최우선 관리 대상 · 추가 과목/장기 등록 유도 추천
              </p>
            </div>
          )}
        </div>

        {/* 오른쪽: 서열 리스트 */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Z-Score Ranking
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('tier')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'tier' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Tier
              </button>
              <button
                onClick={() => setViewMode('cluster')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'cluster' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Cluster
              </button>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-2">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="bg-slate-800 rounded-lg p-3 animate-pulse h-16"></div>
              ))
            ) : zscoreRanking.length > 0 ? (
              zscoreRanking.map((student: any) => (
                <div 
                  key={student.student_id}
                  className="bg-slate-800 rounded-lg p-3 border-l-4 hover:bg-slate-700 transition-colors"
                  style={{
                    borderLeftColor: student.tier === 'DIAMOND' ? '#38bdf8' :
                                     student.tier === 'PLATINUM' ? '#e5e4e2' :
                                     student.tier === 'GOLD' ? '#fbbf24' :
                                     student.tier === 'STEEL' ? '#71797E' : '#ef4444'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">#{student.rank}</span>
                      <span className="text-sm">{student.tier_emoji}</span>
                      <span className="font-medium">{student.student_name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono ${
                        student.z_score >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                    <span>SQ: {student.sq_score.toFixed(0)}</span>
                    <span>{student.percentile?.toFixed(1)}%ile</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>학생 데이터가 없습니다</p>
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="w-full mt-4 p-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Settings size={12} className="inline mr-1" />
            Reset Demo Data
          </button>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-gray-600">
        <p>AUTUS-PRIME · Education Pack · Powered by Z-Score Engine</p>
        <p className="mt-1">
          SQ = (1.5 × Fee) + (1.2 × Grade) - (2.0 × Entropy)
        </p>
      </footer>
    </div>
  )
}

export default Dashboard










import { useEffect, useState, useCallback } from 'react'
import { Upload, RefreshCw, Settings, AlertCircle, CheckCircle2 } from 'lucide-react'
import { PhysisMap, PhysisMapEmpty } from '../components/PhysisMap'
import { TierList } from '../components/TierList'
import { AmberTicker, AmberTickerSkeleton, MiniTicker } from '../components/AmberTicker'

// API 함수들 (실제 구현 시 api/client.ts에서 import)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function fetchDashboardData() {
  const res = await fetch(`${API_BASE}/api/v2/analytics/summary`)
  return res.json()
}

async function fetchZScoreRanking() {
  const res = await fetch(`${API_BASE}/api/v2/students/calculate-zscore`, { method: 'POST' })
  return res.json()
}

async function resetDemoData() {
  const res = await fetch(`${API_BASE}/api/v2/students/demo/reset`)
  return res.json()
}

interface DashboardData {
  summary: {
    total_students: number
    health_score: number
    health_status: string
    avg_sq: number
    total_monthly_revenue: number
    cluster_distribution: Record<string, number>
  }
  quick_stats: {
    golden_core: number
    high_potential: number
    at_risk: number
  }
}

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [zscoreRanking, setZscoreRanking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tier' | 'cluster'>('tier')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [dashboard, ranking] = await Promise.all([
        fetchDashboardData(),
        fetchZScoreRanking()
      ])
      
      setDashboardData(dashboard)
      setZscoreRanking(ranking.ranking || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleReset = async () => {
    if (!confirm('데모 데이터를 초기화하시겠습니까?')) return
    try {
      await resetDemoData()
      loadData()
    } catch (err) {
      alert('초기화에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6 text-white">
      {/* 헤더 */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
            <span className="text-amber-500">AUTUS</span>
            <span className="text-white">.PRIME</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Education Management System v2.1 · Z-Score Engine
          </p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-gray-400">System Online</span>
          </div>
          
          {dashboardData && (
            <div className="bg-slate-800 px-3 py-1 rounded text-xs">
              <span className="text-gray-400">총 가치: </span>
              <span className="text-amber-500 font-bold">
                ₩{(dashboardData.summary.total_monthly_revenue / 10000).toFixed(0)}만
              </span>
            </div>
          )}
          
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={loadData} className="ml-auto text-xs underline">재시도</button>
        </div>
      )}

      {/* 메트릭 카드 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse h-20"></div>
          ))}
        </div>
      ) : dashboardData ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">총 학생</p>
            <p className="text-2xl font-bold">{dashboardData.summary.total_students}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">평균 SQ</p>
            <p className="text-2xl font-bold text-amber-500">{dashboardData.summary.avg_sq.toFixed(1)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">건강도</p>
            <p className="text-2xl font-bold text-green-500">{dashboardData.summary.health_score.toFixed(0)}%</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">위험 학생</p>
            <p className="text-2xl font-bold text-red-500">{dashboardData.quick_stats.at_risk}</p>
          </div>
        </div>
      ) : null}

      {/* 메인 콘텐츠 */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 클러스터 분포 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Cluster Distribution
            </h3>
            {dashboardData && (
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(dashboardData.summary.cluster_distribution || {}).map(([cluster, count]) => (
                  <div key={cluster} className="text-center p-3 bg-slate-700/50 rounded">
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-gray-400 truncate">{cluster.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 골든 코어 정보 */}
          {dashboardData && dashboardData.quick_stats.golden_core > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌟</span>
                <h3 className="font-semibold text-amber-400">Golden Core</h3>
                <span className="ml-auto text-2xl font-bold text-amber-500">
                  {dashboardData.quick_stats.golden_core}명
                </span>
              </div>
              <p className="text-xs text-gray-400">
                VIP 최우선 관리 대상 · 추가 과목/장기 등록 유도 추천
              </p>
            </div>
          )}
        </div>

        {/* 오른쪽: 서열 리스트 */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Z-Score Ranking
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('tier')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'tier' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Tier
              </button>
              <button
                onClick={() => setViewMode('cluster')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'cluster' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Cluster
              </button>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-2">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="bg-slate-800 rounded-lg p-3 animate-pulse h-16"></div>
              ))
            ) : zscoreRanking.length > 0 ? (
              zscoreRanking.map((student: any) => (
                <div 
                  key={student.student_id}
                  className="bg-slate-800 rounded-lg p-3 border-l-4 hover:bg-slate-700 transition-colors"
                  style={{
                    borderLeftColor: student.tier === 'DIAMOND' ? '#38bdf8' :
                                     student.tier === 'PLATINUM' ? '#e5e4e2' :
                                     student.tier === 'GOLD' ? '#fbbf24' :
                                     student.tier === 'STEEL' ? '#71797E' : '#ef4444'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">#{student.rank}</span>
                      <span className="text-sm">{student.tier_emoji}</span>
                      <span className="font-medium">{student.student_name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono ${
                        student.z_score >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                    <span>SQ: {student.sq_score.toFixed(0)}</span>
                    <span>{student.percentile?.toFixed(1)}%ile</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>학생 데이터가 없습니다</p>
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="w-full mt-4 p-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Settings size={12} className="inline mr-1" />
            Reset Demo Data
          </button>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-gray-600">
        <p>AUTUS-PRIME · Education Pack · Powered by Z-Score Engine</p>
        <p className="mt-1">
          SQ = (1.5 × Fee) + (1.2 × Grade) - (2.0 × Entropy)
        </p>
      </footer>
    </div>
  )
}

export default Dashboard










import { useEffect, useState, useCallback } from 'react'
import { Upload, RefreshCw, Settings, AlertCircle, CheckCircle2 } from 'lucide-react'
import { PhysisMap, PhysisMapEmpty } from '../components/PhysisMap'
import { TierList } from '../components/TierList'
import { AmberTicker, AmberTickerSkeleton, MiniTicker } from '../components/AmberTicker'

// API 함수들 (실제 구현 시 api/client.ts에서 import)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function fetchDashboardData() {
  const res = await fetch(`${API_BASE}/api/v2/analytics/summary`)
  return res.json()
}

async function fetchZScoreRanking() {
  const res = await fetch(`${API_BASE}/api/v2/students/calculate-zscore`, { method: 'POST' })
  return res.json()
}

async function resetDemoData() {
  const res = await fetch(`${API_BASE}/api/v2/students/demo/reset`)
  return res.json()
}

interface DashboardData {
  summary: {
    total_students: number
    health_score: number
    health_status: string
    avg_sq: number
    total_monthly_revenue: number
    cluster_distribution: Record<string, number>
  }
  quick_stats: {
    golden_core: number
    high_potential: number
    at_risk: number
  }
}

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [zscoreRanking, setZscoreRanking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tier' | 'cluster'>('tier')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [dashboard, ranking] = await Promise.all([
        fetchDashboardData(),
        fetchZScoreRanking()
      ])
      
      setDashboardData(dashboard)
      setZscoreRanking(ranking.ranking || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleReset = async () => {
    if (!confirm('데모 데이터를 초기화하시겠습니까?')) return
    try {
      await resetDemoData()
      loadData()
    } catch (err) {
      alert('초기화에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6 text-white">
      {/* 헤더 */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
            <span className="text-amber-500">AUTUS</span>
            <span className="text-white">.PRIME</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Education Management System v2.1 · Z-Score Engine
          </p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-gray-400">System Online</span>
          </div>
          
          {dashboardData && (
            <div className="bg-slate-800 px-3 py-1 rounded text-xs">
              <span className="text-gray-400">총 가치: </span>
              <span className="text-amber-500 font-bold">
                ₩{(dashboardData.summary.total_monthly_revenue / 10000).toFixed(0)}만
              </span>
            </div>
          )}
          
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={loadData} className="ml-auto text-xs underline">재시도</button>
        </div>
      )}

      {/* 메트릭 카드 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse h-20"></div>
          ))}
        </div>
      ) : dashboardData ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">총 학생</p>
            <p className="text-2xl font-bold">{dashboardData.summary.total_students}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">평균 SQ</p>
            <p className="text-2xl font-bold text-amber-500">{dashboardData.summary.avg_sq.toFixed(1)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">건강도</p>
            <p className="text-2xl font-bold text-green-500">{dashboardData.summary.health_score.toFixed(0)}%</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">위험 학생</p>
            <p className="text-2xl font-bold text-red-500">{dashboardData.quick_stats.at_risk}</p>
          </div>
        </div>
      ) : null}

      {/* 메인 콘텐츠 */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 클러스터 분포 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Cluster Distribution
            </h3>
            {dashboardData && (
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(dashboardData.summary.cluster_distribution || {}).map(([cluster, count]) => (
                  <div key={cluster} className="text-center p-3 bg-slate-700/50 rounded">
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-gray-400 truncate">{cluster.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 골든 코어 정보 */}
          {dashboardData && dashboardData.quick_stats.golden_core > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌟</span>
                <h3 className="font-semibold text-amber-400">Golden Core</h3>
                <span className="ml-auto text-2xl font-bold text-amber-500">
                  {dashboardData.quick_stats.golden_core}명
                </span>
              </div>
              <p className="text-xs text-gray-400">
                VIP 최우선 관리 대상 · 추가 과목/장기 등록 유도 추천
              </p>
            </div>
          )}
        </div>

        {/* 오른쪽: 서열 리스트 */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Z-Score Ranking
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('tier')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'tier' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Tier
              </button>
              <button
                onClick={() => setViewMode('cluster')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'cluster' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Cluster
              </button>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-2">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="bg-slate-800 rounded-lg p-3 animate-pulse h-16"></div>
              ))
            ) : zscoreRanking.length > 0 ? (
              zscoreRanking.map((student: any) => (
                <div 
                  key={student.student_id}
                  className="bg-slate-800 rounded-lg p-3 border-l-4 hover:bg-slate-700 transition-colors"
                  style={{
                    borderLeftColor: student.tier === 'DIAMOND' ? '#38bdf8' :
                                     student.tier === 'PLATINUM' ? '#e5e4e2' :
                                     student.tier === 'GOLD' ? '#fbbf24' :
                                     student.tier === 'STEEL' ? '#71797E' : '#ef4444'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">#{student.rank}</span>
                      <span className="text-sm">{student.tier_emoji}</span>
                      <span className="font-medium">{student.student_name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono ${
                        student.z_score >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                    <span>SQ: {student.sq_score.toFixed(0)}</span>
                    <span>{student.percentile?.toFixed(1)}%ile</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>학생 데이터가 없습니다</p>
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="w-full mt-4 p-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Settings size={12} className="inline mr-1" />
            Reset Demo Data
          </button>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-gray-600">
        <p>AUTUS-PRIME · Education Pack · Powered by Z-Score Engine</p>
        <p className="mt-1">
          SQ = (1.5 × Fee) + (1.2 × Grade) - (2.0 × Entropy)
        </p>
      </footer>
    </div>
  )
}

export default Dashboard










import { useEffect, useState, useCallback } from 'react'
import { Upload, RefreshCw, Settings, AlertCircle, CheckCircle2 } from 'lucide-react'
import { PhysisMap, PhysisMapEmpty } from '../components/PhysisMap'
import { TierList } from '../components/TierList'
import { AmberTicker, AmberTickerSkeleton, MiniTicker } from '../components/AmberTicker'

// API 함수들 (실제 구현 시 api/client.ts에서 import)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function fetchDashboardData() {
  const res = await fetch(`${API_BASE}/api/v2/analytics/summary`)
  return res.json()
}

async function fetchZScoreRanking() {
  const res = await fetch(`${API_BASE}/api/v2/students/calculate-zscore`, { method: 'POST' })
  return res.json()
}

async function resetDemoData() {
  const res = await fetch(`${API_BASE}/api/v2/students/demo/reset`)
  return res.json()
}

interface DashboardData {
  summary: {
    total_students: number
    health_score: number
    health_status: string
    avg_sq: number
    total_monthly_revenue: number
    cluster_distribution: Record<string, number>
  }
  quick_stats: {
    golden_core: number
    high_potential: number
    at_risk: number
  }
}

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [zscoreRanking, setZscoreRanking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tier' | 'cluster'>('tier')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [dashboard, ranking] = await Promise.all([
        fetchDashboardData(),
        fetchZScoreRanking()
      ])
      
      setDashboardData(dashboard)
      setZscoreRanking(ranking.ranking || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleReset = async () => {
    if (!confirm('데모 데이터를 초기화하시겠습니까?')) return
    try {
      await resetDemoData()
      loadData()
    } catch (err) {
      alert('초기화에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6 text-white">
      {/* 헤더 */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
            <span className="text-amber-500">AUTUS</span>
            <span className="text-white">.PRIME</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Education Management System v2.1 · Z-Score Engine
          </p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-gray-400">System Online</span>
          </div>
          
          {dashboardData && (
            <div className="bg-slate-800 px-3 py-1 rounded text-xs">
              <span className="text-gray-400">총 가치: </span>
              <span className="text-amber-500 font-bold">
                ₩{(dashboardData.summary.total_monthly_revenue / 10000).toFixed(0)}만
              </span>
            </div>
          )}
          
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={loadData} className="ml-auto text-xs underline">재시도</button>
        </div>
      )}

      {/* 메트릭 카드 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse h-20"></div>
          ))}
        </div>
      ) : dashboardData ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">총 학생</p>
            <p className="text-2xl font-bold">{dashboardData.summary.total_students}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">평균 SQ</p>
            <p className="text-2xl font-bold text-amber-500">{dashboardData.summary.avg_sq.toFixed(1)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">건강도</p>
            <p className="text-2xl font-bold text-green-500">{dashboardData.summary.health_score.toFixed(0)}%</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">위험 학생</p>
            <p className="text-2xl font-bold text-red-500">{dashboardData.quick_stats.at_risk}</p>
          </div>
        </div>
      ) : null}

      {/* 메인 콘텐츠 */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 클러스터 분포 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Cluster Distribution
            </h3>
            {dashboardData && (
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(dashboardData.summary.cluster_distribution || {}).map(([cluster, count]) => (
                  <div key={cluster} className="text-center p-3 bg-slate-700/50 rounded">
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-gray-400 truncate">{cluster.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 골든 코어 정보 */}
          {dashboardData && dashboardData.quick_stats.golden_core > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌟</span>
                <h3 className="font-semibold text-amber-400">Golden Core</h3>
                <span className="ml-auto text-2xl font-bold text-amber-500">
                  {dashboardData.quick_stats.golden_core}명
                </span>
              </div>
              <p className="text-xs text-gray-400">
                VIP 최우선 관리 대상 · 추가 과목/장기 등록 유도 추천
              </p>
            </div>
          )}
        </div>

        {/* 오른쪽: 서열 리스트 */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Z-Score Ranking
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('tier')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'tier' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Tier
              </button>
              <button
                onClick={() => setViewMode('cluster')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'cluster' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Cluster
              </button>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-2">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="bg-slate-800 rounded-lg p-3 animate-pulse h-16"></div>
              ))
            ) : zscoreRanking.length > 0 ? (
              zscoreRanking.map((student: any) => (
                <div 
                  key={student.student_id}
                  className="bg-slate-800 rounded-lg p-3 border-l-4 hover:bg-slate-700 transition-colors"
                  style={{
                    borderLeftColor: student.tier === 'DIAMOND' ? '#38bdf8' :
                                     student.tier === 'PLATINUM' ? '#e5e4e2' :
                                     student.tier === 'GOLD' ? '#fbbf24' :
                                     student.tier === 'STEEL' ? '#71797E' : '#ef4444'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">#{student.rank}</span>
                      <span className="text-sm">{student.tier_emoji}</span>
                      <span className="font-medium">{student.student_name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono ${
                        student.z_score >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                    <span>SQ: {student.sq_score.toFixed(0)}</span>
                    <span>{student.percentile?.toFixed(1)}%ile</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>학생 데이터가 없습니다</p>
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="w-full mt-4 p-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Settings size={12} className="inline mr-1" />
            Reset Demo Data
          </button>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-gray-600">
        <p>AUTUS-PRIME · Education Pack · Powered by Z-Score Engine</p>
        <p className="mt-1">
          SQ = (1.5 × Fee) + (1.2 × Grade) - (2.0 × Entropy)
        </p>
      </footer>
    </div>
  )
}

export default Dashboard










import { useEffect, useState, useCallback } from 'react'
import { Upload, RefreshCw, Settings, AlertCircle, CheckCircle2 } from 'lucide-react'
import { PhysisMap, PhysisMapEmpty } from '../components/PhysisMap'
import { TierList } from '../components/TierList'
import { AmberTicker, AmberTickerSkeleton, MiniTicker } from '../components/AmberTicker'

// API 함수들 (실제 구현 시 api/client.ts에서 import)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function fetchDashboardData() {
  const res = await fetch(`${API_BASE}/api/v2/analytics/summary`)
  return res.json()
}

async function fetchZScoreRanking() {
  const res = await fetch(`${API_BASE}/api/v2/students/calculate-zscore`, { method: 'POST' })
  return res.json()
}

async function resetDemoData() {
  const res = await fetch(`${API_BASE}/api/v2/students/demo/reset`)
  return res.json()
}

interface DashboardData {
  summary: {
    total_students: number
    health_score: number
    health_status: string
    avg_sq: number
    total_monthly_revenue: number
    cluster_distribution: Record<string, number>
  }
  quick_stats: {
    golden_core: number
    high_potential: number
    at_risk: number
  }
}

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [zscoreRanking, setZscoreRanking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tier' | 'cluster'>('tier')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [dashboard, ranking] = await Promise.all([
        fetchDashboardData(),
        fetchZScoreRanking()
      ])
      
      setDashboardData(dashboard)
      setZscoreRanking(ranking.ranking || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleReset = async () => {
    if (!confirm('데모 데이터를 초기화하시겠습니까?')) return
    try {
      await resetDemoData()
      loadData()
    } catch (err) {
      alert('초기화에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6 text-white">
      {/* 헤더 */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
            <span className="text-amber-500">AUTUS</span>
            <span className="text-white">.PRIME</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Education Management System v2.1 · Z-Score Engine
          </p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-gray-400">System Online</span>
          </div>
          
          {dashboardData && (
            <div className="bg-slate-800 px-3 py-1 rounded text-xs">
              <span className="text-gray-400">총 가치: </span>
              <span className="text-amber-500 font-bold">
                ₩{(dashboardData.summary.total_monthly_revenue / 10000).toFixed(0)}만
              </span>
            </div>
          )}
          
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={loadData} className="ml-auto text-xs underline">재시도</button>
        </div>
      )}

      {/* 메트릭 카드 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse h-20"></div>
          ))}
        </div>
      ) : dashboardData ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">총 학생</p>
            <p className="text-2xl font-bold">{dashboardData.summary.total_students}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">평균 SQ</p>
            <p className="text-2xl font-bold text-amber-500">{dashboardData.summary.avg_sq.toFixed(1)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">건강도</p>
            <p className="text-2xl font-bold text-green-500">{dashboardData.summary.health_score.toFixed(0)}%</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">위험 학생</p>
            <p className="text-2xl font-bold text-red-500">{dashboardData.quick_stats.at_risk}</p>
          </div>
        </div>
      ) : null}

      {/* 메인 콘텐츠 */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 클러스터 분포 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Cluster Distribution
            </h3>
            {dashboardData && (
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(dashboardData.summary.cluster_distribution || {}).map(([cluster, count]) => (
                  <div key={cluster} className="text-center p-3 bg-slate-700/50 rounded">
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-gray-400 truncate">{cluster.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 골든 코어 정보 */}
          {dashboardData && dashboardData.quick_stats.golden_core > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌟</span>
                <h3 className="font-semibold text-amber-400">Golden Core</h3>
                <span className="ml-auto text-2xl font-bold text-amber-500">
                  {dashboardData.quick_stats.golden_core}명
                </span>
              </div>
              <p className="text-xs text-gray-400">
                VIP 최우선 관리 대상 · 추가 과목/장기 등록 유도 추천
              </p>
            </div>
          )}
        </div>

        {/* 오른쪽: 서열 리스트 */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Z-Score Ranking
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('tier')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'tier' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Tier
              </button>
              <button
                onClick={() => setViewMode('cluster')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'cluster' 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                Cluster
              </button>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-2">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="bg-slate-800 rounded-lg p-3 animate-pulse h-16"></div>
              ))
            ) : zscoreRanking.length > 0 ? (
              zscoreRanking.map((student: any) => (
                <div 
                  key={student.student_id}
                  className="bg-slate-800 rounded-lg p-3 border-l-4 hover:bg-slate-700 transition-colors"
                  style={{
                    borderLeftColor: student.tier === 'DIAMOND' ? '#38bdf8' :
                                     student.tier === 'PLATINUM' ? '#e5e4e2' :
                                     student.tier === 'GOLD' ? '#fbbf24' :
                                     student.tier === 'STEEL' ? '#71797E' : '#ef4444'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">#{student.rank}</span>
                      <span className="text-sm">{student.tier_emoji}</span>
                      <span className="font-medium">{student.student_name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono ${
                        student.z_score >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                    <span>SQ: {student.sq_score.toFixed(0)}</span>
                    <span>{student.percentile?.toFixed(1)}%ile</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>학생 데이터가 없습니다</p>
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="w-full mt-4 p-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Settings size={12} className="inline mr-1" />
            Reset Demo Data
          </button>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-gray-600">
        <p>AUTUS-PRIME · Education Pack · Powered by Z-Score Engine</p>
        <p className="mt-1">
          SQ = (1.5 × Fee) + (1.2 × Grade) - (2.0 × Entropy)
        </p>
      </footer>
    </div>
  )
}

export default Dashboard

























