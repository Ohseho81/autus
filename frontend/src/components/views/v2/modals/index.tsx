/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📦 모달 시스템 (Modal System) - AUTUS 2.0
 * 설계 문서의 15개 공통 모달 구현
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Calendar, MessageSquare, Users, ChevronRight, AlertTriangle, Brain, Phone } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export type ModalType = 
  | 'customer-list'      // 고객 목록
  | 'customer-select'    // 고객 선택
  | 'score-detail'       // 스코어 상세
  | 'voice-process'      // Voice 처리
  | 'voice-detail'       // Voice 상세
  | 'strategy-list'      // 전략 목록
  | 'action-create'      // 액션 생성
  | 'action-detail'      // 액션 상세
  | 'action-delegate'    // 액션 위임
  | 'action-postpone'    // 액션 연기
  | 'calendar'           // 캘린더
  | 'message'            // 메시지
  | 'churn-prevent'      // 이탈 방지
  | 'competitor-detail'  // 경쟁사 상세
  | 'lead-list'          // 리드 목록
  | 'date-detail'        // 날짜 상세
  | 'threat-detail'      // 위협 상세
  | 'opportunity-detail' // 기회 상세
  | 'keyword-detail'     // 키워드 상세
  | 'resonance-customers'// 공명 고객
  | 'tsel-detail'        // TSEL 상세
  | 'sigma-detail'       // σ 요인 상세
  | 'user-detail';       // 담당자 상세

export interface ModalPayload {
  type: ModalType;
  data?: any;
  onConfirm?: (result: any) => void;
  onCancel?: () => void;
}

interface ModalContextType {
  openModal: (payload: ModalPayload) => void;
  closeModal: () => void;
  currentModal: ModalPayload | null;
}

// ─────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────

const ModalContext = createContext<ModalContextType | null>(null);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within ModalProvider');
  return context;
};

// ─────────────────────────────────────────────────────────────────────
// Modal Components
// ─────────────────────────────────────────────────────────────────────

// Base Modal Wrapper
const ModalWrapper: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}> = ({ title, onClose, children, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[480px]',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className={`${sizeClasses[size]} max-h-[80vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-700 transition">
            <X size={18} className="text-slate-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Customer List Modal
const CustomerListModal: React.FC<{ data: any; onConfirm: (customer: any) => void; onClose: () => void }> = ({ 
  data, onConfirm, onClose 
}) => {
  const [search, setSearch] = useState('');
  const customers = data?.customers || [
    { id: 'c1', name: '김민수', temperature: 38, grade: '중2' },
    { id: 'c2', name: '이서연', temperature: 72, grade: '중1' },
    { id: 'c3', name: '박지훈', temperature: 85, grade: '중3' },
  ];
  
  const filtered = customers.filter((c: any) => 
    c.name.includes(search) || c.grade.includes(search)
  );

  return (
    <ModalWrapper title={data?.title || '고객 목록'} onClose={onClose} size="md">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="이름, 학년으로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800 rounded-lg text-sm border border-slate-700 focus:border-blue-500 outline-none text-white"
        />
      </div>
      
      <div className="space-y-2">
        {filtered.map((customer: any) => (
          <motion.button
            key={customer.id}
            whileHover={{ x: 4 }}
            onClick={() => onConfirm(customer)}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition"
          >
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${
                customer.temperature >= 70 ? 'bg-emerald-500' : 
                customer.temperature >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <div className="text-left">
                <div className="text-sm font-medium text-white">{customer.name}</div>
                <div className="text-xs text-slate-400">{customer.grade}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${
                customer.temperature >= 70 ? 'text-emerald-400' : 
                customer.temperature >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>{customer.temperature}°</span>
              <ChevronRight size={14} className="text-slate-500" />
            </div>
          </motion.button>
        ))}
      </div>
    </ModalWrapper>
  );
};

// Action Create Modal
const ActionCreateModal: React.FC<{ data: any; onConfirm: (action: any) => void; onClose: () => void }> = ({ 
  data, onConfirm, onClose 
}) => {
  const [form, setForm] = useState({
    title: data?.suggestedTitle || '',
    priority: 'high',
    assignee: '',
    dueDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = () => {
    onConfirm({ ...form, customerId: data?.customerId, source: data?.source });
  };

  return (
    <ModalWrapper title="새 액션 생성" onClose={onClose} size="md">
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">제목</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="액션 제목 입력..."
            className="w-full px-3 py-2 bg-slate-800 rounded-lg text-sm border border-slate-700 focus:border-blue-500 outline-none text-white"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">우선순위</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 rounded-lg text-sm border border-slate-700 text-white"
            >
              <option value="urgent">긴급</option>
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
          </div>
          
          <div>
            <label className="text-xs text-slate-400 mb-1 block">마감일</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 rounded-lg text-sm border border-slate-700 text-white"
            />
          </div>
        </div>
        
        <div>
          <label className="text-xs text-slate-400 mb-1 block">담당자</label>
          <input
            type="text"
            value={form.assignee}
            onChange={(e) => setForm({ ...form, assignee: e.target.value })}
            placeholder="담당자 이름..."
            className="w-full px-3 py-2 bg-slate-800 rounded-lg text-sm border border-slate-700 focus:border-blue-500 outline-none text-white"
          />
        </div>
        
        <div>
          <label className="text-xs text-slate-400 mb-1 block">메모</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="추가 메모..."
            rows={3}
            className="w-full px-3 py-2 bg-slate-800 rounded-lg text-sm border border-slate-700 focus:border-blue-500 outline-none text-white resize-none"
          />
        </div>
        
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-white"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-sm text-white font-medium"
          >
            생성
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

// Calendar Modal
const CalendarModal: React.FC<{ data: any; onConfirm: (date: string) => void; onClose: () => void }> = ({ 
  data, onConfirm, onClose 
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('14:00');

  return (
    <ModalWrapper title={`${data?.customerName || '고객'} 상담 예약`} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">날짜</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 rounded-lg text-sm border border-slate-700 text-white"
          />
        </div>
        
        <div>
          <label className="text-xs text-slate-400 mb-1 block">시간</label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 rounded-lg text-sm border border-slate-700 text-white"
          >
            {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={() => onConfirm(`${selectedDate}T${selectedTime}`)}
          className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-sm text-white font-medium flex items-center justify-center gap-2"
        >
          <Calendar size={16} />
          예약하기
        </button>
      </div>
    </ModalWrapper>
  );
};

// Message Modal
const MessageModal: React.FC<{ data: any; onConfirm: (message: string) => void; onClose: () => void }> = ({ 
  data, onConfirm, onClose 
}) => {
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<'sms' | 'kakao' | 'call'>('kakao');

  const templates = [
    '안녕하세요, 학원입니다. 상담 관련하여 연락드립니다.',
    '자녀분의 학습 현황에 대해 말씀드릴 내용이 있습니다.',
    '특별 프로모션 안내드립니다.',
  ];

  return (
    <ModalWrapper title={`${data?.customerName || '고객'}에게 메시지`} onClose={onClose} size="md">
      <div className="space-y-4">
        {/* Channel Selection */}
        <div className="flex gap-2">
          {[
            { id: 'kakao', label: '카카오톡', icon: '💬' },
            { id: 'sms', label: 'SMS', icon: '📱' },
            { id: 'call', label: '전화', icon: '📞' },
          ].map(ch => (
            <button
              key={ch.id}
              onClick={() => setChannel(ch.id as typeof channel)}
              className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-1 ${
                channel === ch.id ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {ch.icon} {ch.label}
            </button>
          ))}
        </div>
        
        {channel !== 'call' && (
          <>
            {/* Templates */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">템플릿</label>
              <div className="space-y-1">
                {templates.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setMessage(t)}
                    className="w-full text-left p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Message Input */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">메시지</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="메시지 내용..."
                rows={4}
                className="w-full px-3 py-2 bg-slate-800 rounded-lg text-sm border border-slate-700 focus:border-blue-500 outline-none text-white resize-none"
              />
            </div>
          </>
        )}
        
        <button
          onClick={() => onConfirm(channel === 'call' ? 'call' : message)}
          className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-sm text-white font-medium flex items-center justify-center gap-2"
        >
          {channel === 'call' ? <Phone size={16} /> : <MessageSquare size={16} />}
          {channel === 'call' ? '전화 연결' : '전송하기'}
        </button>
      </div>
    </ModalWrapper>
  );
};

// Churn Prevention Modal
const ChurnPreventModal: React.FC<{ data: any; onConfirm: (strategy: string) => void; onClose: () => void }> = ({ 
  data, onConfirm, onClose 
}) => {
  const strategies = [
    { id: 'consultation', name: '긴급 상담 예약', description: '24시간 내 전화 상담', effect: '+15°' },
    { id: 'discount', name: '할인 제안', description: '다음 달 수강료 10% 할인', effect: '+10°' },
    { id: 'upgrade', name: '서비스 업그레이드', description: '1:1 보충 수업 제공', effect: '+20°' },
    { id: 'feedback', name: '피드백 요청', description: '불만 사항 청취 및 개선', effect: '+12°' },
  ];

  return (
    <ModalWrapper title="이탈 방지 모드" onClose={onClose} size="md">
      <div className="mb-4 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle size={16} />
          <span className="text-sm font-medium">{data?.customerName || '고객'}님 이탈 위험</span>
        </div>
        <div className="text-xs text-slate-400 mt-1">
          현재 온도: {data?.temperature || 38}° | 이탈 확률: {data?.churnProbability || 42}%
        </div>
      </div>
      
      <div className="space-y-2">
        {strategies.map((s) => (
          <motion.button
            key={s.id}
            whileHover={{ scale: 1.02 }}
            onClick={() => onConfirm(s.id)}
            className="w-full p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-left transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">{s.name}</span>
              <span className="text-xs text-emerald-400">{s.effect}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">{s.description}</div>
          </motion.button>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
        <div className="flex items-center gap-2 text-purple-400">
          <Brain size={14} />
          <span className="text-xs">AI 추천: "긴급 상담 예약"이 가장 효과적입니다</span>
        </div>
      </div>
    </ModalWrapper>
  );
};

// Voice Process Modal
const VoiceProcessModal: React.FC<{ data: any; onConfirm: (result: any) => void; onClose: () => void }> = ({ 
  data, onConfirm, onClose 
}) => {
  const [status, setStatus] = useState(data?.currentStatus || 'pending');
  const [notes, setNotes] = useState('');

  return (
    <ModalWrapper title="Voice 처리" onClose={onClose} size="md">
      <div className="mb-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
        <div className="text-sm text-white mb-1">{data?.customerName || '고객'}님의 Voice</div>
        <div className="text-xs text-slate-400">"{data?.content || '학원비가 좀 부담이 되네요...'}"</div>
        <div className="text-xs text-slate-500 mt-1">{data?.date || '1/20'}</div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 mb-2 block">처리 상태</label>
          <div className="flex gap-2">
            {[
              { id: 'pending', label: '대기', color: 'amber' },
              { id: 'inProgress', label: '처리중', color: 'blue' },
              { id: 'resolved', label: '해결', color: 'emerald' },
              { id: 'escalated', label: '상위 보고', color: 'red' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setStatus(s.id)}
                className={`flex-1 py-2 rounded-lg text-xs ${
                  status === s.id ? `bg-${s.color}-500 text-white` : 'bg-slate-700 text-slate-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="text-xs text-slate-400 mb-1 block">처리 메모</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="처리 내용 기록..."
            rows={3}
            className="w-full px-3 py-2 bg-slate-800 rounded-lg text-sm border border-slate-700 focus:border-blue-500 outline-none text-white resize-none"
          />
        </div>
        
        <button
          onClick={() => onConfirm({ status, notes, voiceId: data?.voiceId })}
          className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-sm text-white font-medium"
        >
          저장
        </button>
      </div>
    </ModalWrapper>
  );
};

// Strategy List Modal
const StrategyListModal: React.FC<{ data: any; onConfirm: (strategy: any) => void; onClose: () => void }> = ({ 
  data, onConfirm, onClose 
}) => {
  const strategies = data?.strategies || [
    { id: 's1', name: '가치 재인식 상담', effect: 15, description: '가격 대비 가치 강조', recommended: true },
    { id: 's2', name: '성적 향상 증명', effect: 12, description: '성적 데이터 리포트 제공', recommended: false },
    { id: 's3', name: '특별 케어 제안', effect: 18, description: '1:1 추가 수업 제공', recommended: false },
    { id: 's4', name: '학부모 면담', effect: 20, description: '직접 만남으로 신뢰 구축', recommended: false },
  ];

  return (
    <ModalWrapper title="전략 선택" onClose={onClose} size="md">
      <div className="space-y-2">
        {strategies.map((s: any) => (
          <motion.button
            key={s.id}
            whileHover={{ scale: 1.02 }}
            onClick={() => onConfirm(s)}
            className={`w-full p-3 rounded-lg text-left transition ${
              s.recommended ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {s.recommended && <Brain size={14} className="text-purple-400" />}
                <span className="text-sm font-medium text-white">{s.name}</span>
              </div>
              <span className="text-xs text-emerald-400">+{s.effect}°</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">{s.description}</div>
          </motion.button>
        ))}
      </div>
    </ModalWrapper>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Modal Renderer
// ─────────────────────────────────────────────────────────────────────

const ModalRenderer: React.FC<{ modal: ModalPayload; onClose: () => void }> = ({ modal, onClose }) => {
  const handleConfirm = (result: any) => {
    modal.onConfirm?.(result);
    onClose();
  };

  switch (modal.type) {
    case 'customer-list':
      return <CustomerListModal data={modal.data} onConfirm={handleConfirm} onClose={onClose} />;
    case 'action-create':
      return <ActionCreateModal data={modal.data} onConfirm={handleConfirm} onClose={onClose} />;
    case 'calendar':
      return <CalendarModal data={modal.data} onConfirm={handleConfirm} onClose={onClose} />;
    case 'message':
      return <MessageModal data={modal.data} onConfirm={handleConfirm} onClose={onClose} />;
    case 'churn-prevent':
      return <ChurnPreventModal data={modal.data} onConfirm={handleConfirm} onClose={onClose} />;
    case 'voice-process':
      return <VoiceProcessModal data={modal.data} onConfirm={handleConfirm} onClose={onClose} />;
    case 'strategy-list':
      return <StrategyListModal data={modal.data} onConfirm={handleConfirm} onClose={onClose} />;
    default:
      // Generic modal for types not yet implemented
      return (
        <ModalWrapper title={modal.type.replace(/-/g, ' ')} onClose={onClose} size="sm">
          <div className="text-center py-8 text-slate-400">
            <div className="text-4xl mb-2">🚧</div>
            <div className="text-sm">이 모달은 준비 중입니다</div>
          </div>
        </ModalWrapper>
      );
  }
};

// ─────────────────────────────────────────────────────────────────────
// Modal Provider
// ─────────────────────────────────────────────────────────────────────

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentModal, setCurrentModal] = useState<ModalPayload | null>(null);

  const openModal = useCallback((payload: ModalPayload) => {
    setCurrentModal(payload);
  }, []);

  const closeModal = useCallback(() => {
    currentModal?.onCancel?.();
    setCurrentModal(null);
  }, [currentModal]);

  return (
    <ModalContext.Provider value={{ openModal, closeModal, currentModal }}>
      {children}
      <AnimatePresence>
        {currentModal && (
          <ModalRenderer modal={currentModal} onClose={closeModal} />
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
};

export default ModalProvider;
