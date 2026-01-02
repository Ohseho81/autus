import { useState } from 'react'
import { Zap, MessageCircle, ChevronRight } from 'lucide-react'

interface Student {
  id?: number
  student_id?: number
  name?: string
  student_name?: string
  sq_score: number
  z_score?: number
  tier?: string
  tier_emoji?: string
  tier_name_kr?: string
  cluster?: string
  cluster_emoji?: string
  cluster_name_kr?: string
  complain_count?: number
  monthly_fee?: number
  parent_name?: string
  parent_phone?: string
  rank?: number
  rank_suffix?: string
  percentile?: number
}

interface TierListProps {
  students: Student[]
  mode?: 'tier' | 'cluster'
  onActionClick?: (student: Student, action: any) => void
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  DIAMOND: { bg: 'bg-sky-900/50', text: 'text-sky-300', border: 'border-sky-500/30' },
  PLATINUM: { bg: 'bg-slate-600/50', text: 'text-slate-200', border: 'border-slate-400/30' },
  GOLD: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  STEEL: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-500/30' },
  IRON: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

const CLUSTER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  golden_core: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  high_potential: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-500/30' },
  stable_orbit: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-500/30' },
  friction_zone: { bg: 'bg-orange-900/50', text: 'text-orange-300', border: 'border-orange-500/30' },
  entropy_sink: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

export function TierList({ students, mode = 'tier', onActionClick }: TierListProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const getStyle = (student: Student) => {
    if (mode === 'tier' && student.tier) {
      return TIER_STYLES[student.tier] || TIER_STYLES.IRON
    }
    return CLUSTER_STYLES[student.cluster || 'stable_orbit'] || CLUSTER_STYLES.stable_orbit
  }

  const getLabel = (student: Student) => {
    if (mode === 'tier') {
      return {
        emoji: student.tier_emoji || '⚪',
        text: student.tier || 'N/A'
      }
    }
    return {
      emoji: student.cluster_emoji || '🌙',
      text: student.cluster_name_kr || student.cluster || 'N/A'
    }
  }

  const getId = (student: Student) => student.id || student.student_id || 0
  const getName = (student: Student) => student.name || student.student_name || 'Unknown'

  return (
    <div className="space-y-2">
      {students.map((student) => {
        const style = getStyle(student)
        const label = getLabel(student)
        const studentId = getId(student)
        const studentName = getName(student)
        const isLoading = loadingId === studentId
        const isExpanded = expandedId === studentId
        const isTopTier = student.tier === 'DIAMOND' || student.tier === 'PLATINUM' || student.cluster === 'golden_core'

        return (
          <div 
            key={studentId}
            className={`
              group relative p-3 rounded-lg bg-slate-800 border-l-4 
              transition-all duration-200 cursor-pointer
              hover:bg-slate-700
              ${isExpanded ? 'border-amber-500' : 'border-transparent hover:border-amber-500/50'}
            `}
            onClick={() => setExpandedId(isExpanded ? null : studentId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {student.rank && (
                  <span className="text-xs font-mono text-gray-500 w-6">
                    #{student.rank}
                  </span>
                )}
                
                <span className={`
                  text-xs font-bold px-2 py-0.5 rounded border
                  ${style.bg} ${style.text} ${style.border}
                `}>
                  {label.emoji} {label.text}
                </span>
                
                <span className="text-white font-medium truncate">
                  {studentName}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {student.z_score !== undefined && (
                  <span className={`
                    text-xs font-mono
                    ${student.z_score >= 0 ? 'text-green-400' : 'text-red-400'}
                  `}>
                    Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                  </span>
                )}
                
                <span className="text-sm font-mono text-gray-400">
                  {student.sq_score.toFixed(0)}
                </span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onActionClick?.(student, { type: isTopTier ? 'boost' : 'purge' })
                  }}
                  disabled={isLoading}
                  className={`
                    px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider
                    transition-colors disabled:opacity-50
                    ${isTopTier
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-slate-700 text-gray-400 hover:bg-red-600 hover:text-white'
                    }
                  `}
                >
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : isTopTier ? (
                    <span className="flex items-center gap-1">
                      <Zap size={12} /> BOOST
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> MSG
                    </span>
                  )}
                </button>
                
                <ChevronRight 
                  size={16} 
                  className={`
                    text-gray-600 transition-transform
                    ${isExpanded ? 'rotate-90' : ''}
                  `}
                />
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>백분위</span>
                  <span className="font-mono">{student.percentile?.toFixed(1) || '-'}%</span>
                </div>
                {student.monthly_fee && (
                  <div className="flex justify-between">
                    <span>월 수강료</span>
                    <span className="font-mono">₩{student.monthly_fee.toLocaleString()}</span>
                  </div>
                )}
                {student.complain_count !== undefined && (
                  <div className="flex justify-between">
                    <span>상담 횟수</span>
                    <span className="font-mono">{student.complain_count}회</span>
                  </div>
                )}
                {student.rank_suffix && (
                  <div className="flex justify-between">
                    <span>순위</span>
                    <span className="font-mono">{student.rank_suffix}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      
      {students.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>표시할 학생이 없습니다</p>
        </div>
      )}
    </div>
  )
}

export default TierList










import { useState } from 'react'
import { Zap, MessageCircle, ChevronRight } from 'lucide-react'

interface Student {
  id?: number
  student_id?: number
  name?: string
  student_name?: string
  sq_score: number
  z_score?: number
  tier?: string
  tier_emoji?: string
  tier_name_kr?: string
  cluster?: string
  cluster_emoji?: string
  cluster_name_kr?: string
  complain_count?: number
  monthly_fee?: number
  parent_name?: string
  parent_phone?: string
  rank?: number
  rank_suffix?: string
  percentile?: number
}

interface TierListProps {
  students: Student[]
  mode?: 'tier' | 'cluster'
  onActionClick?: (student: Student, action: any) => void
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  DIAMOND: { bg: 'bg-sky-900/50', text: 'text-sky-300', border: 'border-sky-500/30' },
  PLATINUM: { bg: 'bg-slate-600/50', text: 'text-slate-200', border: 'border-slate-400/30' },
  GOLD: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  STEEL: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-500/30' },
  IRON: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

const CLUSTER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  golden_core: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  high_potential: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-500/30' },
  stable_orbit: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-500/30' },
  friction_zone: { bg: 'bg-orange-900/50', text: 'text-orange-300', border: 'border-orange-500/30' },
  entropy_sink: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

export function TierList({ students, mode = 'tier', onActionClick }: TierListProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const getStyle = (student: Student) => {
    if (mode === 'tier' && student.tier) {
      return TIER_STYLES[student.tier] || TIER_STYLES.IRON
    }
    return CLUSTER_STYLES[student.cluster || 'stable_orbit'] || CLUSTER_STYLES.stable_orbit
  }

  const getLabel = (student: Student) => {
    if (mode === 'tier') {
      return {
        emoji: student.tier_emoji || '⚪',
        text: student.tier || 'N/A'
      }
    }
    return {
      emoji: student.cluster_emoji || '🌙',
      text: student.cluster_name_kr || student.cluster || 'N/A'
    }
  }

  const getId = (student: Student) => student.id || student.student_id || 0
  const getName = (student: Student) => student.name || student.student_name || 'Unknown'

  return (
    <div className="space-y-2">
      {students.map((student) => {
        const style = getStyle(student)
        const label = getLabel(student)
        const studentId = getId(student)
        const studentName = getName(student)
        const isLoading = loadingId === studentId
        const isExpanded = expandedId === studentId
        const isTopTier = student.tier === 'DIAMOND' || student.tier === 'PLATINUM' || student.cluster === 'golden_core'

        return (
          <div 
            key={studentId}
            className={`
              group relative p-3 rounded-lg bg-slate-800 border-l-4 
              transition-all duration-200 cursor-pointer
              hover:bg-slate-700
              ${isExpanded ? 'border-amber-500' : 'border-transparent hover:border-amber-500/50'}
            `}
            onClick={() => setExpandedId(isExpanded ? null : studentId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {student.rank && (
                  <span className="text-xs font-mono text-gray-500 w-6">
                    #{student.rank}
                  </span>
                )}
                
                <span className={`
                  text-xs font-bold px-2 py-0.5 rounded border
                  ${style.bg} ${style.text} ${style.border}
                `}>
                  {label.emoji} {label.text}
                </span>
                
                <span className="text-white font-medium truncate">
                  {studentName}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {student.z_score !== undefined && (
                  <span className={`
                    text-xs font-mono
                    ${student.z_score >= 0 ? 'text-green-400' : 'text-red-400'}
                  `}>
                    Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                  </span>
                )}
                
                <span className="text-sm font-mono text-gray-400">
                  {student.sq_score.toFixed(0)}
                </span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onActionClick?.(student, { type: isTopTier ? 'boost' : 'purge' })
                  }}
                  disabled={isLoading}
                  className={`
                    px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider
                    transition-colors disabled:opacity-50
                    ${isTopTier
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-slate-700 text-gray-400 hover:bg-red-600 hover:text-white'
                    }
                  `}
                >
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : isTopTier ? (
                    <span className="flex items-center gap-1">
                      <Zap size={12} /> BOOST
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> MSG
                    </span>
                  )}
                </button>
                
                <ChevronRight 
                  size={16} 
                  className={`
                    text-gray-600 transition-transform
                    ${isExpanded ? 'rotate-90' : ''}
                  `}
                />
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>백분위</span>
                  <span className="font-mono">{student.percentile?.toFixed(1) || '-'}%</span>
                </div>
                {student.monthly_fee && (
                  <div className="flex justify-between">
                    <span>월 수강료</span>
                    <span className="font-mono">₩{student.monthly_fee.toLocaleString()}</span>
                  </div>
                )}
                {student.complain_count !== undefined && (
                  <div className="flex justify-between">
                    <span>상담 횟수</span>
                    <span className="font-mono">{student.complain_count}회</span>
                  </div>
                )}
                {student.rank_suffix && (
                  <div className="flex justify-between">
                    <span>순위</span>
                    <span className="font-mono">{student.rank_suffix}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      
      {students.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>표시할 학생이 없습니다</p>
        </div>
      )}
    </div>
  )
}

export default TierList










import { useState } from 'react'
import { Zap, MessageCircle, ChevronRight } from 'lucide-react'

interface Student {
  id?: number
  student_id?: number
  name?: string
  student_name?: string
  sq_score: number
  z_score?: number
  tier?: string
  tier_emoji?: string
  tier_name_kr?: string
  cluster?: string
  cluster_emoji?: string
  cluster_name_kr?: string
  complain_count?: number
  monthly_fee?: number
  parent_name?: string
  parent_phone?: string
  rank?: number
  rank_suffix?: string
  percentile?: number
}

interface TierListProps {
  students: Student[]
  mode?: 'tier' | 'cluster'
  onActionClick?: (student: Student, action: any) => void
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  DIAMOND: { bg: 'bg-sky-900/50', text: 'text-sky-300', border: 'border-sky-500/30' },
  PLATINUM: { bg: 'bg-slate-600/50', text: 'text-slate-200', border: 'border-slate-400/30' },
  GOLD: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  STEEL: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-500/30' },
  IRON: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

const CLUSTER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  golden_core: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  high_potential: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-500/30' },
  stable_orbit: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-500/30' },
  friction_zone: { bg: 'bg-orange-900/50', text: 'text-orange-300', border: 'border-orange-500/30' },
  entropy_sink: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

export function TierList({ students, mode = 'tier', onActionClick }: TierListProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const getStyle = (student: Student) => {
    if (mode === 'tier' && student.tier) {
      return TIER_STYLES[student.tier] || TIER_STYLES.IRON
    }
    return CLUSTER_STYLES[student.cluster || 'stable_orbit'] || CLUSTER_STYLES.stable_orbit
  }

  const getLabel = (student: Student) => {
    if (mode === 'tier') {
      return {
        emoji: student.tier_emoji || '⚪',
        text: student.tier || 'N/A'
      }
    }
    return {
      emoji: student.cluster_emoji || '🌙',
      text: student.cluster_name_kr || student.cluster || 'N/A'
    }
  }

  const getId = (student: Student) => student.id || student.student_id || 0
  const getName = (student: Student) => student.name || student.student_name || 'Unknown'

  return (
    <div className="space-y-2">
      {students.map((student) => {
        const style = getStyle(student)
        const label = getLabel(student)
        const studentId = getId(student)
        const studentName = getName(student)
        const isLoading = loadingId === studentId
        const isExpanded = expandedId === studentId
        const isTopTier = student.tier === 'DIAMOND' || student.tier === 'PLATINUM' || student.cluster === 'golden_core'

        return (
          <div 
            key={studentId}
            className={`
              group relative p-3 rounded-lg bg-slate-800 border-l-4 
              transition-all duration-200 cursor-pointer
              hover:bg-slate-700
              ${isExpanded ? 'border-amber-500' : 'border-transparent hover:border-amber-500/50'}
            `}
            onClick={() => setExpandedId(isExpanded ? null : studentId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {student.rank && (
                  <span className="text-xs font-mono text-gray-500 w-6">
                    #{student.rank}
                  </span>
                )}
                
                <span className={`
                  text-xs font-bold px-2 py-0.5 rounded border
                  ${style.bg} ${style.text} ${style.border}
                `}>
                  {label.emoji} {label.text}
                </span>
                
                <span className="text-white font-medium truncate">
                  {studentName}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {student.z_score !== undefined && (
                  <span className={`
                    text-xs font-mono
                    ${student.z_score >= 0 ? 'text-green-400' : 'text-red-400'}
                  `}>
                    Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                  </span>
                )}
                
                <span className="text-sm font-mono text-gray-400">
                  {student.sq_score.toFixed(0)}
                </span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onActionClick?.(student, { type: isTopTier ? 'boost' : 'purge' })
                  }}
                  disabled={isLoading}
                  className={`
                    px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider
                    transition-colors disabled:opacity-50
                    ${isTopTier
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-slate-700 text-gray-400 hover:bg-red-600 hover:text-white'
                    }
                  `}
                >
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : isTopTier ? (
                    <span className="flex items-center gap-1">
                      <Zap size={12} /> BOOST
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> MSG
                    </span>
                  )}
                </button>
                
                <ChevronRight 
                  size={16} 
                  className={`
                    text-gray-600 transition-transform
                    ${isExpanded ? 'rotate-90' : ''}
                  `}
                />
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>백분위</span>
                  <span className="font-mono">{student.percentile?.toFixed(1) || '-'}%</span>
                </div>
                {student.monthly_fee && (
                  <div className="flex justify-between">
                    <span>월 수강료</span>
                    <span className="font-mono">₩{student.monthly_fee.toLocaleString()}</span>
                  </div>
                )}
                {student.complain_count !== undefined && (
                  <div className="flex justify-between">
                    <span>상담 횟수</span>
                    <span className="font-mono">{student.complain_count}회</span>
                  </div>
                )}
                {student.rank_suffix && (
                  <div className="flex justify-between">
                    <span>순위</span>
                    <span className="font-mono">{student.rank_suffix}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      
      {students.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>표시할 학생이 없습니다</p>
        </div>
      )}
    </div>
  )
}

export default TierList










import { useState } from 'react'
import { Zap, MessageCircle, ChevronRight } from 'lucide-react'

interface Student {
  id?: number
  student_id?: number
  name?: string
  student_name?: string
  sq_score: number
  z_score?: number
  tier?: string
  tier_emoji?: string
  tier_name_kr?: string
  cluster?: string
  cluster_emoji?: string
  cluster_name_kr?: string
  complain_count?: number
  monthly_fee?: number
  parent_name?: string
  parent_phone?: string
  rank?: number
  rank_suffix?: string
  percentile?: number
}

interface TierListProps {
  students: Student[]
  mode?: 'tier' | 'cluster'
  onActionClick?: (student: Student, action: any) => void
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  DIAMOND: { bg: 'bg-sky-900/50', text: 'text-sky-300', border: 'border-sky-500/30' },
  PLATINUM: { bg: 'bg-slate-600/50', text: 'text-slate-200', border: 'border-slate-400/30' },
  GOLD: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  STEEL: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-500/30' },
  IRON: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

const CLUSTER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  golden_core: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  high_potential: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-500/30' },
  stable_orbit: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-500/30' },
  friction_zone: { bg: 'bg-orange-900/50', text: 'text-orange-300', border: 'border-orange-500/30' },
  entropy_sink: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

export function TierList({ students, mode = 'tier', onActionClick }: TierListProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const getStyle = (student: Student) => {
    if (mode === 'tier' && student.tier) {
      return TIER_STYLES[student.tier] || TIER_STYLES.IRON
    }
    return CLUSTER_STYLES[student.cluster || 'stable_orbit'] || CLUSTER_STYLES.stable_orbit
  }

  const getLabel = (student: Student) => {
    if (mode === 'tier') {
      return {
        emoji: student.tier_emoji || '⚪',
        text: student.tier || 'N/A'
      }
    }
    return {
      emoji: student.cluster_emoji || '🌙',
      text: student.cluster_name_kr || student.cluster || 'N/A'
    }
  }

  const getId = (student: Student) => student.id || student.student_id || 0
  const getName = (student: Student) => student.name || student.student_name || 'Unknown'

  return (
    <div className="space-y-2">
      {students.map((student) => {
        const style = getStyle(student)
        const label = getLabel(student)
        const studentId = getId(student)
        const studentName = getName(student)
        const isLoading = loadingId === studentId
        const isExpanded = expandedId === studentId
        const isTopTier = student.tier === 'DIAMOND' || student.tier === 'PLATINUM' || student.cluster === 'golden_core'

        return (
          <div 
            key={studentId}
            className={`
              group relative p-3 rounded-lg bg-slate-800 border-l-4 
              transition-all duration-200 cursor-pointer
              hover:bg-slate-700
              ${isExpanded ? 'border-amber-500' : 'border-transparent hover:border-amber-500/50'}
            `}
            onClick={() => setExpandedId(isExpanded ? null : studentId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {student.rank && (
                  <span className="text-xs font-mono text-gray-500 w-6">
                    #{student.rank}
                  </span>
                )}
                
                <span className={`
                  text-xs font-bold px-2 py-0.5 rounded border
                  ${style.bg} ${style.text} ${style.border}
                `}>
                  {label.emoji} {label.text}
                </span>
                
                <span className="text-white font-medium truncate">
                  {studentName}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {student.z_score !== undefined && (
                  <span className={`
                    text-xs font-mono
                    ${student.z_score >= 0 ? 'text-green-400' : 'text-red-400'}
                  `}>
                    Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                  </span>
                )}
                
                <span className="text-sm font-mono text-gray-400">
                  {student.sq_score.toFixed(0)}
                </span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onActionClick?.(student, { type: isTopTier ? 'boost' : 'purge' })
                  }}
                  disabled={isLoading}
                  className={`
                    px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider
                    transition-colors disabled:opacity-50
                    ${isTopTier
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-slate-700 text-gray-400 hover:bg-red-600 hover:text-white'
                    }
                  `}
                >
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : isTopTier ? (
                    <span className="flex items-center gap-1">
                      <Zap size={12} /> BOOST
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> MSG
                    </span>
                  )}
                </button>
                
                <ChevronRight 
                  size={16} 
                  className={`
                    text-gray-600 transition-transform
                    ${isExpanded ? 'rotate-90' : ''}
                  `}
                />
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>백분위</span>
                  <span className="font-mono">{student.percentile?.toFixed(1) || '-'}%</span>
                </div>
                {student.monthly_fee && (
                  <div className="flex justify-between">
                    <span>월 수강료</span>
                    <span className="font-mono">₩{student.monthly_fee.toLocaleString()}</span>
                  </div>
                )}
                {student.complain_count !== undefined && (
                  <div className="flex justify-between">
                    <span>상담 횟수</span>
                    <span className="font-mono">{student.complain_count}회</span>
                  </div>
                )}
                {student.rank_suffix && (
                  <div className="flex justify-between">
                    <span>순위</span>
                    <span className="font-mono">{student.rank_suffix}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      
      {students.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>표시할 학생이 없습니다</p>
        </div>
      )}
    </div>
  )
}

export default TierList










import { useState } from 'react'
import { Zap, MessageCircle, ChevronRight } from 'lucide-react'

interface Student {
  id?: number
  student_id?: number
  name?: string
  student_name?: string
  sq_score: number
  z_score?: number
  tier?: string
  tier_emoji?: string
  tier_name_kr?: string
  cluster?: string
  cluster_emoji?: string
  cluster_name_kr?: string
  complain_count?: number
  monthly_fee?: number
  parent_name?: string
  parent_phone?: string
  rank?: number
  rank_suffix?: string
  percentile?: number
}

interface TierListProps {
  students: Student[]
  mode?: 'tier' | 'cluster'
  onActionClick?: (student: Student, action: any) => void
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  DIAMOND: { bg: 'bg-sky-900/50', text: 'text-sky-300', border: 'border-sky-500/30' },
  PLATINUM: { bg: 'bg-slate-600/50', text: 'text-slate-200', border: 'border-slate-400/30' },
  GOLD: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  STEEL: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-500/30' },
  IRON: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

const CLUSTER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  golden_core: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  high_potential: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-500/30' },
  stable_orbit: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-500/30' },
  friction_zone: { bg: 'bg-orange-900/50', text: 'text-orange-300', border: 'border-orange-500/30' },
  entropy_sink: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

export function TierList({ students, mode = 'tier', onActionClick }: TierListProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const getStyle = (student: Student) => {
    if (mode === 'tier' && student.tier) {
      return TIER_STYLES[student.tier] || TIER_STYLES.IRON
    }
    return CLUSTER_STYLES[student.cluster || 'stable_orbit'] || CLUSTER_STYLES.stable_orbit
  }

  const getLabel = (student: Student) => {
    if (mode === 'tier') {
      return {
        emoji: student.tier_emoji || '⚪',
        text: student.tier || 'N/A'
      }
    }
    return {
      emoji: student.cluster_emoji || '🌙',
      text: student.cluster_name_kr || student.cluster || 'N/A'
    }
  }

  const getId = (student: Student) => student.id || student.student_id || 0
  const getName = (student: Student) => student.name || student.student_name || 'Unknown'

  return (
    <div className="space-y-2">
      {students.map((student) => {
        const style = getStyle(student)
        const label = getLabel(student)
        const studentId = getId(student)
        const studentName = getName(student)
        const isLoading = loadingId === studentId
        const isExpanded = expandedId === studentId
        const isTopTier = student.tier === 'DIAMOND' || student.tier === 'PLATINUM' || student.cluster === 'golden_core'

        return (
          <div 
            key={studentId}
            className={`
              group relative p-3 rounded-lg bg-slate-800 border-l-4 
              transition-all duration-200 cursor-pointer
              hover:bg-slate-700
              ${isExpanded ? 'border-amber-500' : 'border-transparent hover:border-amber-500/50'}
            `}
            onClick={() => setExpandedId(isExpanded ? null : studentId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {student.rank && (
                  <span className="text-xs font-mono text-gray-500 w-6">
                    #{student.rank}
                  </span>
                )}
                
                <span className={`
                  text-xs font-bold px-2 py-0.5 rounded border
                  ${style.bg} ${style.text} ${style.border}
                `}>
                  {label.emoji} {label.text}
                </span>
                
                <span className="text-white font-medium truncate">
                  {studentName}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {student.z_score !== undefined && (
                  <span className={`
                    text-xs font-mono
                    ${student.z_score >= 0 ? 'text-green-400' : 'text-red-400'}
                  `}>
                    Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                  </span>
                )}
                
                <span className="text-sm font-mono text-gray-400">
                  {student.sq_score.toFixed(0)}
                </span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onActionClick?.(student, { type: isTopTier ? 'boost' : 'purge' })
                  }}
                  disabled={isLoading}
                  className={`
                    px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider
                    transition-colors disabled:opacity-50
                    ${isTopTier
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-slate-700 text-gray-400 hover:bg-red-600 hover:text-white'
                    }
                  `}
                >
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : isTopTier ? (
                    <span className="flex items-center gap-1">
                      <Zap size={12} /> BOOST
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> MSG
                    </span>
                  )}
                </button>
                
                <ChevronRight 
                  size={16} 
                  className={`
                    text-gray-600 transition-transform
                    ${isExpanded ? 'rotate-90' : ''}
                  `}
                />
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>백분위</span>
                  <span className="font-mono">{student.percentile?.toFixed(1) || '-'}%</span>
                </div>
                {student.monthly_fee && (
                  <div className="flex justify-between">
                    <span>월 수강료</span>
                    <span className="font-mono">₩{student.monthly_fee.toLocaleString()}</span>
                  </div>
                )}
                {student.complain_count !== undefined && (
                  <div className="flex justify-between">
                    <span>상담 횟수</span>
                    <span className="font-mono">{student.complain_count}회</span>
                  </div>
                )}
                {student.rank_suffix && (
                  <div className="flex justify-between">
                    <span>순위</span>
                    <span className="font-mono">{student.rank_suffix}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      
      {students.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>표시할 학생이 없습니다</p>
        </div>
      )}
    </div>
  )
}

export default TierList




















import { useState } from 'react'
import { Zap, MessageCircle, ChevronRight } from 'lucide-react'

interface Student {
  id?: number
  student_id?: number
  name?: string
  student_name?: string
  sq_score: number
  z_score?: number
  tier?: string
  tier_emoji?: string
  tier_name_kr?: string
  cluster?: string
  cluster_emoji?: string
  cluster_name_kr?: string
  complain_count?: number
  monthly_fee?: number
  parent_name?: string
  parent_phone?: string
  rank?: number
  rank_suffix?: string
  percentile?: number
}

interface TierListProps {
  students: Student[]
  mode?: 'tier' | 'cluster'
  onActionClick?: (student: Student, action: any) => void
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  DIAMOND: { bg: 'bg-sky-900/50', text: 'text-sky-300', border: 'border-sky-500/30' },
  PLATINUM: { bg: 'bg-slate-600/50', text: 'text-slate-200', border: 'border-slate-400/30' },
  GOLD: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  STEEL: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-500/30' },
  IRON: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

const CLUSTER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  golden_core: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  high_potential: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-500/30' },
  stable_orbit: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-500/30' },
  friction_zone: { bg: 'bg-orange-900/50', text: 'text-orange-300', border: 'border-orange-500/30' },
  entropy_sink: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

export function TierList({ students, mode = 'tier', onActionClick }: TierListProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const getStyle = (student: Student) => {
    if (mode === 'tier' && student.tier) {
      return TIER_STYLES[student.tier] || TIER_STYLES.IRON
    }
    return CLUSTER_STYLES[student.cluster || 'stable_orbit'] || CLUSTER_STYLES.stable_orbit
  }

  const getLabel = (student: Student) => {
    if (mode === 'tier') {
      return {
        emoji: student.tier_emoji || '⚪',
        text: student.tier || 'N/A'
      }
    }
    return {
      emoji: student.cluster_emoji || '🌙',
      text: student.cluster_name_kr || student.cluster || 'N/A'
    }
  }

  const getId = (student: Student) => student.id || student.student_id || 0
  const getName = (student: Student) => student.name || student.student_name || 'Unknown'

  return (
    <div className="space-y-2">
      {students.map((student) => {
        const style = getStyle(student)
        const label = getLabel(student)
        const studentId = getId(student)
        const studentName = getName(student)
        const isLoading = loadingId === studentId
        const isExpanded = expandedId === studentId
        const isTopTier = student.tier === 'DIAMOND' || student.tier === 'PLATINUM' || student.cluster === 'golden_core'

        return (
          <div 
            key={studentId}
            className={`
              group relative p-3 rounded-lg bg-slate-800 border-l-4 
              transition-all duration-200 cursor-pointer
              hover:bg-slate-700
              ${isExpanded ? 'border-amber-500' : 'border-transparent hover:border-amber-500/50'}
            `}
            onClick={() => setExpandedId(isExpanded ? null : studentId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {student.rank && (
                  <span className="text-xs font-mono text-gray-500 w-6">
                    #{student.rank}
                  </span>
                )}
                
                <span className={`
                  text-xs font-bold px-2 py-0.5 rounded border
                  ${style.bg} ${style.text} ${style.border}
                `}>
                  {label.emoji} {label.text}
                </span>
                
                <span className="text-white font-medium truncate">
                  {studentName}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {student.z_score !== undefined && (
                  <span className={`
                    text-xs font-mono
                    ${student.z_score >= 0 ? 'text-green-400' : 'text-red-400'}
                  `}>
                    Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                  </span>
                )}
                
                <span className="text-sm font-mono text-gray-400">
                  {student.sq_score.toFixed(0)}
                </span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onActionClick?.(student, { type: isTopTier ? 'boost' : 'purge' })
                  }}
                  disabled={isLoading}
                  className={`
                    px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider
                    transition-colors disabled:opacity-50
                    ${isTopTier
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-slate-700 text-gray-400 hover:bg-red-600 hover:text-white'
                    }
                  `}
                >
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : isTopTier ? (
                    <span className="flex items-center gap-1">
                      <Zap size={12} /> BOOST
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> MSG
                    </span>
                  )}
                </button>
                
                <ChevronRight 
                  size={16} 
                  className={`
                    text-gray-600 transition-transform
                    ${isExpanded ? 'rotate-90' : ''}
                  `}
                />
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>백분위</span>
                  <span className="font-mono">{student.percentile?.toFixed(1) || '-'}%</span>
                </div>
                {student.monthly_fee && (
                  <div className="flex justify-between">
                    <span>월 수강료</span>
                    <span className="font-mono">₩{student.monthly_fee.toLocaleString()}</span>
                  </div>
                )}
                {student.complain_count !== undefined && (
                  <div className="flex justify-between">
                    <span>상담 횟수</span>
                    <span className="font-mono">{student.complain_count}회</span>
                  </div>
                )}
                {student.rank_suffix && (
                  <div className="flex justify-between">
                    <span>순위</span>
                    <span className="font-mono">{student.rank_suffix}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      
      {students.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>표시할 학생이 없습니다</p>
        </div>
      )}
    </div>
  )
}

export default TierList










import { useState } from 'react'
import { Zap, MessageCircle, ChevronRight } from 'lucide-react'

interface Student {
  id?: number
  student_id?: number
  name?: string
  student_name?: string
  sq_score: number
  z_score?: number
  tier?: string
  tier_emoji?: string
  tier_name_kr?: string
  cluster?: string
  cluster_emoji?: string
  cluster_name_kr?: string
  complain_count?: number
  monthly_fee?: number
  parent_name?: string
  parent_phone?: string
  rank?: number
  rank_suffix?: string
  percentile?: number
}

interface TierListProps {
  students: Student[]
  mode?: 'tier' | 'cluster'
  onActionClick?: (student: Student, action: any) => void
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  DIAMOND: { bg: 'bg-sky-900/50', text: 'text-sky-300', border: 'border-sky-500/30' },
  PLATINUM: { bg: 'bg-slate-600/50', text: 'text-slate-200', border: 'border-slate-400/30' },
  GOLD: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  STEEL: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-500/30' },
  IRON: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

const CLUSTER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  golden_core: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  high_potential: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-500/30' },
  stable_orbit: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-500/30' },
  friction_zone: { bg: 'bg-orange-900/50', text: 'text-orange-300', border: 'border-orange-500/30' },
  entropy_sink: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

export function TierList({ students, mode = 'tier', onActionClick }: TierListProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const getStyle = (student: Student) => {
    if (mode === 'tier' && student.tier) {
      return TIER_STYLES[student.tier] || TIER_STYLES.IRON
    }
    return CLUSTER_STYLES[student.cluster || 'stable_orbit'] || CLUSTER_STYLES.stable_orbit
  }

  const getLabel = (student: Student) => {
    if (mode === 'tier') {
      return {
        emoji: student.tier_emoji || '⚪',
        text: student.tier || 'N/A'
      }
    }
    return {
      emoji: student.cluster_emoji || '🌙',
      text: student.cluster_name_kr || student.cluster || 'N/A'
    }
  }

  const getId = (student: Student) => student.id || student.student_id || 0
  const getName = (student: Student) => student.name || student.student_name || 'Unknown'

  return (
    <div className="space-y-2">
      {students.map((student) => {
        const style = getStyle(student)
        const label = getLabel(student)
        const studentId = getId(student)
        const studentName = getName(student)
        const isLoading = loadingId === studentId
        const isExpanded = expandedId === studentId
        const isTopTier = student.tier === 'DIAMOND' || student.tier === 'PLATINUM' || student.cluster === 'golden_core'

        return (
          <div 
            key={studentId}
            className={`
              group relative p-3 rounded-lg bg-slate-800 border-l-4 
              transition-all duration-200 cursor-pointer
              hover:bg-slate-700
              ${isExpanded ? 'border-amber-500' : 'border-transparent hover:border-amber-500/50'}
            `}
            onClick={() => setExpandedId(isExpanded ? null : studentId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {student.rank && (
                  <span className="text-xs font-mono text-gray-500 w-6">
                    #{student.rank}
                  </span>
                )}
                
                <span className={`
                  text-xs font-bold px-2 py-0.5 rounded border
                  ${style.bg} ${style.text} ${style.border}
                `}>
                  {label.emoji} {label.text}
                </span>
                
                <span className="text-white font-medium truncate">
                  {studentName}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {student.z_score !== undefined && (
                  <span className={`
                    text-xs font-mono
                    ${student.z_score >= 0 ? 'text-green-400' : 'text-red-400'}
                  `}>
                    Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                  </span>
                )}
                
                <span className="text-sm font-mono text-gray-400">
                  {student.sq_score.toFixed(0)}
                </span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onActionClick?.(student, { type: isTopTier ? 'boost' : 'purge' })
                  }}
                  disabled={isLoading}
                  className={`
                    px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider
                    transition-colors disabled:opacity-50
                    ${isTopTier
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-slate-700 text-gray-400 hover:bg-red-600 hover:text-white'
                    }
                  `}
                >
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : isTopTier ? (
                    <span className="flex items-center gap-1">
                      <Zap size={12} /> BOOST
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> MSG
                    </span>
                  )}
                </button>
                
                <ChevronRight 
                  size={16} 
                  className={`
                    text-gray-600 transition-transform
                    ${isExpanded ? 'rotate-90' : ''}
                  `}
                />
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>백분위</span>
                  <span className="font-mono">{student.percentile?.toFixed(1) || '-'}%</span>
                </div>
                {student.monthly_fee && (
                  <div className="flex justify-between">
                    <span>월 수강료</span>
                    <span className="font-mono">₩{student.monthly_fee.toLocaleString()}</span>
                  </div>
                )}
                {student.complain_count !== undefined && (
                  <div className="flex justify-between">
                    <span>상담 횟수</span>
                    <span className="font-mono">{student.complain_count}회</span>
                  </div>
                )}
                {student.rank_suffix && (
                  <div className="flex justify-between">
                    <span>순위</span>
                    <span className="font-mono">{student.rank_suffix}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      
      {students.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>표시할 학생이 없습니다</p>
        </div>
      )}
    </div>
  )
}

export default TierList










import { useState } from 'react'
import { Zap, MessageCircle, ChevronRight } from 'lucide-react'

interface Student {
  id?: number
  student_id?: number
  name?: string
  student_name?: string
  sq_score: number
  z_score?: number
  tier?: string
  tier_emoji?: string
  tier_name_kr?: string
  cluster?: string
  cluster_emoji?: string
  cluster_name_kr?: string
  complain_count?: number
  monthly_fee?: number
  parent_name?: string
  parent_phone?: string
  rank?: number
  rank_suffix?: string
  percentile?: number
}

interface TierListProps {
  students: Student[]
  mode?: 'tier' | 'cluster'
  onActionClick?: (student: Student, action: any) => void
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  DIAMOND: { bg: 'bg-sky-900/50', text: 'text-sky-300', border: 'border-sky-500/30' },
  PLATINUM: { bg: 'bg-slate-600/50', text: 'text-slate-200', border: 'border-slate-400/30' },
  GOLD: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  STEEL: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-500/30' },
  IRON: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

const CLUSTER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  golden_core: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  high_potential: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-500/30' },
  stable_orbit: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-500/30' },
  friction_zone: { bg: 'bg-orange-900/50', text: 'text-orange-300', border: 'border-orange-500/30' },
  entropy_sink: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

export function TierList({ students, mode = 'tier', onActionClick }: TierListProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const getStyle = (student: Student) => {
    if (mode === 'tier' && student.tier) {
      return TIER_STYLES[student.tier] || TIER_STYLES.IRON
    }
    return CLUSTER_STYLES[student.cluster || 'stable_orbit'] || CLUSTER_STYLES.stable_orbit
  }

  const getLabel = (student: Student) => {
    if (mode === 'tier') {
      return {
        emoji: student.tier_emoji || '⚪',
        text: student.tier || 'N/A'
      }
    }
    return {
      emoji: student.cluster_emoji || '🌙',
      text: student.cluster_name_kr || student.cluster || 'N/A'
    }
  }

  const getId = (student: Student) => student.id || student.student_id || 0
  const getName = (student: Student) => student.name || student.student_name || 'Unknown'

  return (
    <div className="space-y-2">
      {students.map((student) => {
        const style = getStyle(student)
        const label = getLabel(student)
        const studentId = getId(student)
        const studentName = getName(student)
        const isLoading = loadingId === studentId
        const isExpanded = expandedId === studentId
        const isTopTier = student.tier === 'DIAMOND' || student.tier === 'PLATINUM' || student.cluster === 'golden_core'

        return (
          <div 
            key={studentId}
            className={`
              group relative p-3 rounded-lg bg-slate-800 border-l-4 
              transition-all duration-200 cursor-pointer
              hover:bg-slate-700
              ${isExpanded ? 'border-amber-500' : 'border-transparent hover:border-amber-500/50'}
            `}
            onClick={() => setExpandedId(isExpanded ? null : studentId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {student.rank && (
                  <span className="text-xs font-mono text-gray-500 w-6">
                    #{student.rank}
                  </span>
                )}
                
                <span className={`
                  text-xs font-bold px-2 py-0.5 rounded border
                  ${style.bg} ${style.text} ${style.border}
                `}>
                  {label.emoji} {label.text}
                </span>
                
                <span className="text-white font-medium truncate">
                  {studentName}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {student.z_score !== undefined && (
                  <span className={`
                    text-xs font-mono
                    ${student.z_score >= 0 ? 'text-green-400' : 'text-red-400'}
                  `}>
                    Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                  </span>
                )}
                
                <span className="text-sm font-mono text-gray-400">
                  {student.sq_score.toFixed(0)}
                </span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onActionClick?.(student, { type: isTopTier ? 'boost' : 'purge' })
                  }}
                  disabled={isLoading}
                  className={`
                    px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider
                    transition-colors disabled:opacity-50
                    ${isTopTier
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-slate-700 text-gray-400 hover:bg-red-600 hover:text-white'
                    }
                  `}
                >
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : isTopTier ? (
                    <span className="flex items-center gap-1">
                      <Zap size={12} /> BOOST
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> MSG
                    </span>
                  )}
                </button>
                
                <ChevronRight 
                  size={16} 
                  className={`
                    text-gray-600 transition-transform
                    ${isExpanded ? 'rotate-90' : ''}
                  `}
                />
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>백분위</span>
                  <span className="font-mono">{student.percentile?.toFixed(1) || '-'}%</span>
                </div>
                {student.monthly_fee && (
                  <div className="flex justify-between">
                    <span>월 수강료</span>
                    <span className="font-mono">₩{student.monthly_fee.toLocaleString()}</span>
                  </div>
                )}
                {student.complain_count !== undefined && (
                  <div className="flex justify-between">
                    <span>상담 횟수</span>
                    <span className="font-mono">{student.complain_count}회</span>
                  </div>
                )}
                {student.rank_suffix && (
                  <div className="flex justify-between">
                    <span>순위</span>
                    <span className="font-mono">{student.rank_suffix}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      
      {students.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>표시할 학생이 없습니다</p>
        </div>
      )}
    </div>
  )
}

export default TierList










import { useState } from 'react'
import { Zap, MessageCircle, ChevronRight } from 'lucide-react'

interface Student {
  id?: number
  student_id?: number
  name?: string
  student_name?: string
  sq_score: number
  z_score?: number
  tier?: string
  tier_emoji?: string
  tier_name_kr?: string
  cluster?: string
  cluster_emoji?: string
  cluster_name_kr?: string
  complain_count?: number
  monthly_fee?: number
  parent_name?: string
  parent_phone?: string
  rank?: number
  rank_suffix?: string
  percentile?: number
}

interface TierListProps {
  students: Student[]
  mode?: 'tier' | 'cluster'
  onActionClick?: (student: Student, action: any) => void
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  DIAMOND: { bg: 'bg-sky-900/50', text: 'text-sky-300', border: 'border-sky-500/30' },
  PLATINUM: { bg: 'bg-slate-600/50', text: 'text-slate-200', border: 'border-slate-400/30' },
  GOLD: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  STEEL: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-500/30' },
  IRON: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

const CLUSTER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  golden_core: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  high_potential: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-500/30' },
  stable_orbit: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-500/30' },
  friction_zone: { bg: 'bg-orange-900/50', text: 'text-orange-300', border: 'border-orange-500/30' },
  entropy_sink: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

export function TierList({ students, mode = 'tier', onActionClick }: TierListProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const getStyle = (student: Student) => {
    if (mode === 'tier' && student.tier) {
      return TIER_STYLES[student.tier] || TIER_STYLES.IRON
    }
    return CLUSTER_STYLES[student.cluster || 'stable_orbit'] || CLUSTER_STYLES.stable_orbit
  }

  const getLabel = (student: Student) => {
    if (mode === 'tier') {
      return {
        emoji: student.tier_emoji || '⚪',
        text: student.tier || 'N/A'
      }
    }
    return {
      emoji: student.cluster_emoji || '🌙',
      text: student.cluster_name_kr || student.cluster || 'N/A'
    }
  }

  const getId = (student: Student) => student.id || student.student_id || 0
  const getName = (student: Student) => student.name || student.student_name || 'Unknown'

  return (
    <div className="space-y-2">
      {students.map((student) => {
        const style = getStyle(student)
        const label = getLabel(student)
        const studentId = getId(student)
        const studentName = getName(student)
        const isLoading = loadingId === studentId
        const isExpanded = expandedId === studentId
        const isTopTier = student.tier === 'DIAMOND' || student.tier === 'PLATINUM' || student.cluster === 'golden_core'

        return (
          <div 
            key={studentId}
            className={`
              group relative p-3 rounded-lg bg-slate-800 border-l-4 
              transition-all duration-200 cursor-pointer
              hover:bg-slate-700
              ${isExpanded ? 'border-amber-500' : 'border-transparent hover:border-amber-500/50'}
            `}
            onClick={() => setExpandedId(isExpanded ? null : studentId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {student.rank && (
                  <span className="text-xs font-mono text-gray-500 w-6">
                    #{student.rank}
                  </span>
                )}
                
                <span className={`
                  text-xs font-bold px-2 py-0.5 rounded border
                  ${style.bg} ${style.text} ${style.border}
                `}>
                  {label.emoji} {label.text}
                </span>
                
                <span className="text-white font-medium truncate">
                  {studentName}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {student.z_score !== undefined && (
                  <span className={`
                    text-xs font-mono
                    ${student.z_score >= 0 ? 'text-green-400' : 'text-red-400'}
                  `}>
                    Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                  </span>
                )}
                
                <span className="text-sm font-mono text-gray-400">
                  {student.sq_score.toFixed(0)}
                </span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onActionClick?.(student, { type: isTopTier ? 'boost' : 'purge' })
                  }}
                  disabled={isLoading}
                  className={`
                    px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider
                    transition-colors disabled:opacity-50
                    ${isTopTier
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-slate-700 text-gray-400 hover:bg-red-600 hover:text-white'
                    }
                  `}
                >
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : isTopTier ? (
                    <span className="flex items-center gap-1">
                      <Zap size={12} /> BOOST
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> MSG
                    </span>
                  )}
                </button>
                
                <ChevronRight 
                  size={16} 
                  className={`
                    text-gray-600 transition-transform
                    ${isExpanded ? 'rotate-90' : ''}
                  `}
                />
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>백분위</span>
                  <span className="font-mono">{student.percentile?.toFixed(1) || '-'}%</span>
                </div>
                {student.monthly_fee && (
                  <div className="flex justify-between">
                    <span>월 수강료</span>
                    <span className="font-mono">₩{student.monthly_fee.toLocaleString()}</span>
                  </div>
                )}
                {student.complain_count !== undefined && (
                  <div className="flex justify-between">
                    <span>상담 횟수</span>
                    <span className="font-mono">{student.complain_count}회</span>
                  </div>
                )}
                {student.rank_suffix && (
                  <div className="flex justify-between">
                    <span>순위</span>
                    <span className="font-mono">{student.rank_suffix}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      
      {students.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>표시할 학생이 없습니다</p>
        </div>
      )}
    </div>
  )
}

export default TierList










import { useState } from 'react'
import { Zap, MessageCircle, ChevronRight } from 'lucide-react'

interface Student {
  id?: number
  student_id?: number
  name?: string
  student_name?: string
  sq_score: number
  z_score?: number
  tier?: string
  tier_emoji?: string
  tier_name_kr?: string
  cluster?: string
  cluster_emoji?: string
  cluster_name_kr?: string
  complain_count?: number
  monthly_fee?: number
  parent_name?: string
  parent_phone?: string
  rank?: number
  rank_suffix?: string
  percentile?: number
}

interface TierListProps {
  students: Student[]
  mode?: 'tier' | 'cluster'
  onActionClick?: (student: Student, action: any) => void
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  DIAMOND: { bg: 'bg-sky-900/50', text: 'text-sky-300', border: 'border-sky-500/30' },
  PLATINUM: { bg: 'bg-slate-600/50', text: 'text-slate-200', border: 'border-slate-400/30' },
  GOLD: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  STEEL: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-500/30' },
  IRON: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

const CLUSTER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  golden_core: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-500/30' },
  high_potential: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-500/30' },
  stable_orbit: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-500/30' },
  friction_zone: { bg: 'bg-orange-900/50', text: 'text-orange-300', border: 'border-orange-500/30' },
  entropy_sink: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500/30' },
}

export function TierList({ students, mode = 'tier', onActionClick }: TierListProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const getStyle = (student: Student) => {
    if (mode === 'tier' && student.tier) {
      return TIER_STYLES[student.tier] || TIER_STYLES.IRON
    }
    return CLUSTER_STYLES[student.cluster || 'stable_orbit'] || CLUSTER_STYLES.stable_orbit
  }

  const getLabel = (student: Student) => {
    if (mode === 'tier') {
      return {
        emoji: student.tier_emoji || '⚪',
        text: student.tier || 'N/A'
      }
    }
    return {
      emoji: student.cluster_emoji || '🌙',
      text: student.cluster_name_kr || student.cluster || 'N/A'
    }
  }

  const getId = (student: Student) => student.id || student.student_id || 0
  const getName = (student: Student) => student.name || student.student_name || 'Unknown'

  return (
    <div className="space-y-2">
      {students.map((student) => {
        const style = getStyle(student)
        const label = getLabel(student)
        const studentId = getId(student)
        const studentName = getName(student)
        const isLoading = loadingId === studentId
        const isExpanded = expandedId === studentId
        const isTopTier = student.tier === 'DIAMOND' || student.tier === 'PLATINUM' || student.cluster === 'golden_core'

        return (
          <div 
            key={studentId}
            className={`
              group relative p-3 rounded-lg bg-slate-800 border-l-4 
              transition-all duration-200 cursor-pointer
              hover:bg-slate-700
              ${isExpanded ? 'border-amber-500' : 'border-transparent hover:border-amber-500/50'}
            `}
            onClick={() => setExpandedId(isExpanded ? null : studentId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {student.rank && (
                  <span className="text-xs font-mono text-gray-500 w-6">
                    #{student.rank}
                  </span>
                )}
                
                <span className={`
                  text-xs font-bold px-2 py-0.5 rounded border
                  ${style.bg} ${style.text} ${style.border}
                `}>
                  {label.emoji} {label.text}
                </span>
                
                <span className="text-white font-medium truncate">
                  {studentName}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {student.z_score !== undefined && (
                  <span className={`
                    text-xs font-mono
                    ${student.z_score >= 0 ? 'text-green-400' : 'text-red-400'}
                  `}>
                    Z: {student.z_score >= 0 ? '+' : ''}{student.z_score.toFixed(2)}
                  </span>
                )}
                
                <span className="text-sm font-mono text-gray-400">
                  {student.sq_score.toFixed(0)}
                </span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onActionClick?.(student, { type: isTopTier ? 'boost' : 'purge' })
                  }}
                  disabled={isLoading}
                  className={`
                    px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider
                    transition-colors disabled:opacity-50
                    ${isTopTier
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-slate-700 text-gray-400 hover:bg-red-600 hover:text-white'
                    }
                  `}
                >
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : isTopTier ? (
                    <span className="flex items-center gap-1">
                      <Zap size={12} /> BOOST
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> MSG
                    </span>
                  )}
                </button>
                
                <ChevronRight 
                  size={16} 
                  className={`
                    text-gray-600 transition-transform
                    ${isExpanded ? 'rotate-90' : ''}
                  `}
                />
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>백분위</span>
                  <span className="font-mono">{student.percentile?.toFixed(1) || '-'}%</span>
                </div>
                {student.monthly_fee && (
                  <div className="flex justify-between">
                    <span>월 수강료</span>
                    <span className="font-mono">₩{student.monthly_fee.toLocaleString()}</span>
                  </div>
                )}
                {student.complain_count !== undefined && (
                  <div className="flex justify-between">
                    <span>상담 횟수</span>
                    <span className="font-mono">{student.complain_count}회</span>
                  </div>
                )}
                {student.rank_suffix && (
                  <div className="flex justify-between">
                    <span>순위</span>
                    <span className="font-mono">{student.rank_suffix}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      
      {students.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>표시할 학생이 없습니다</p>
        </div>
      )}
    </div>
  )
}

export default TierList


























