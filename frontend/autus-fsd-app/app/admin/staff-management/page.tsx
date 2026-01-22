'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Send, Check, X, Upload, Download,
  Copy, Mail, Phone, ChevronDown, Clock, AlertCircle,
  Building2, GraduationCap, Settings, Trash2, RefreshCw, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

// ============================================
// Types
// ============================================

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'principal' | 'teacher' | 'admin';
  status: 'pending' | 'accepted' | 'expired';
  inviteCode: string;
  invitedAt: Date;
  acceptedAt?: Date;
}

type RoleType = 'principal' | 'teacher' | 'admin';

// ============================================
// Constants
// ============================================

const ROLES: { id: RoleType; name: string; icon: React.ReactNode; desc: string }[] = [
  { 
    id: 'principal', 
    name: '원장', 
    icon: <Building2 className="w-5 h-5" />,
    desc: '학원 전체 관리 및 설정'
  },
  { 
    id: 'teacher', 
    name: '강사', 
    icon: <GraduationCap className="w-5 h-5" />,
    desc: '학생 관리 및 수업'
  },
  { 
    id: 'admin', 
    name: '행정', 
    icon: <Settings className="w-5 h-5" />,
    desc: '출결, 수납, 상담 관리'
  },
];

const ROLE_COLORS: Record<RoleType, string> = {
  principal: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  teacher: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  admin: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
};

const STATUS_COLORS = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  accepted: 'bg-green-500/20 text-green-400',
  expired: 'bg-red-500/20 text-red-400',
};

// ============================================
// Components
// ============================================

const StaffCard: React.FC<{
  staff: StaffMember;
  onResend: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
}> = ({ staff, onResend, onDelete, onCopyLink }) => {
  const role = ROLES.find(r => r.id === staff.role);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gray-900/50 border border-gray-700 rounded-xl p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${ROLE_COLORS[staff.role]} border flex items-center justify-center`}>
            {role?.icon}
          </div>
          <div>
            <p className="font-semibold">{staff.name}</p>
            <p className="text-xs text-gray-400">{role?.name}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[staff.status]}`}>
          {staff.status === 'pending' ? '대기 중' : staff.status === 'accepted' ? '수락됨' : '만료됨'}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-400 mb-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          <span>{staff.email}</span>
        </div>
        {staff.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span>{staff.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>초대: {staff.invitedAt.toLocaleDateString('ko-KR')}</span>
        </div>
      </div>
      
      <div className="flex gap-2">
        {staff.status === 'pending' && (
          <>
            <button
              onClick={onCopyLink}
              className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <Copy className="w-3 h-3" />
              링크 복사
            </button>
            <button
              onClick={onResend}
              className="flex-1 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              재발송
            </button>
          </>
        )}
        <button
          onClick={onDelete}
          className="py-2 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};

const AddStaffModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (staff: Omit<StaffMember, 'id' | 'status' | 'inviteCode' | 'invitedAt'>) => void;
}> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<RoleType>('teacher');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSubmit = () => {
    if (name && email) {
      onAdd({ name, email, phone, role });
      setName('');
      setEmail('');
      setPhone('');
      setRole('teacher');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                직원 초대
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">이름 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">이메일 *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@example.com"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">연락처</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">역할 *</label>
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {ROLES.find(r => r.id === role)?.icon}
                      <span>{ROLES.find(r => r.id === role)?.name}</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden z-10"
                      >
                        {ROLES.map(r => (
                          <button
                            key={r.id}
                            onClick={() => {
                              setRole(r.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors ${
                              role === r.id ? 'bg-cyan-600/20' : ''
                            }`}
                          >
                            {r.icon}
                            <div className="text-left">
                              <p className="font-semibold">{r.name}</p>
                              <p className="text-xs text-gray-400">{r.desc}</p>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name || !email}
                className={`flex-1 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                  name && email 
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white' 
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                초대 발송
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const CSVUploadModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onUpload: (staffList: Omit<StaffMember, 'id' | 'status' | 'inviteCode' | 'invitedAt'>[]) => void;
}> = ({ isOpen, onClose, onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            name: values[headers.indexOf('name')] || values[headers.indexOf('이름')] || '',
            email: values[headers.indexOf('email')] || values[headers.indexOf('이메일')] || '',
            phone: values[headers.indexOf('phone')] || values[headers.indexOf('연락처')] || '',
            role: (values[headers.indexOf('role')] || values[headers.indexOf('역할')] || 'teacher') as RoleType,
          };
        }).filter(item => item.name && item.email);

        setPreview(data);
        setError('');
      } catch (err) {
        setError('CSV 파일 형식이 올바르지 않습니다.');
        setPreview([]);
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = () => {
    if (preview.length > 0) {
      onUpload(preview);
      setPreview([]);
      onClose();
    }
  };

  const downloadTemplate = () => {
    const template = '이름,이메일,연락처,역할\n홍길동,teacher@example.com,010-1234-5678,teacher\n김철수,admin@example.com,010-9876-5432,admin';
    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff_template.csv';
    a.click();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                CSV 일괄 등록
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download */}
            <button
              onClick={downloadTemplate}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl mb-4 flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              템플릿 다운로드
            </button>

            {/* File Upload */}
            <label className="block w-full p-8 border-2 border-dashed border-gray-700 rounded-xl text-center cursor-pointer hover:border-cyan-500 transition-colors mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-500" />
              <p className="text-gray-400 text-sm">CSV 파일을 드래그하거나 클릭하여 업로드</p>
            </label>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 mb-4">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              </div>
            )}

            {/* Preview */}
            {preview.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">{preview.length}명 발견</p>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {preview.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-lg p-2 text-sm flex items-center justify-between">
                      <span>{item.name}</span>
                      <span className="text-gray-400">{item.email}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${ROLE_COLORS[item.role]}`}>
                        {ROLES.find(r => r.id === item.role)?.name}
                      </span>
                    </div>
                  ))}
                  {preview.length > 5 && (
                    <p className="text-xs text-gray-500 text-center">외 {preview.length - 5}명...</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpload}
                disabled={preview.length === 0}
                className={`flex-1 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                  preview.length > 0 
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white' 
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                {preview.length}명 초대 발송
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// Main Page
// ============================================

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([
    {
      id: '1',
      name: '김선생',
      email: 'kim@example.com',
      phone: '010-1234-5678',
      role: 'teacher',
      status: 'accepted',
      inviteCode: 'abc123',
      invitedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      name: '이행정',
      email: 'lee@example.com',
      phone: '010-9876-5432',
      role: 'admin',
      status: 'pending',
      inviteCode: 'def456',
      invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleAddStaff = (staff: Omit<StaffMember, 'id' | 'status' | 'inviteCode' | 'invitedAt'>) => {
    const newStaff: StaffMember = {
      ...staff,
      id: Date.now().toString(),
      status: 'pending',
      inviteCode: generateInviteCode(),
      invitedAt: new Date(),
    };
    setStaffList(prev => [newStaff, ...prev]);
  };

  const handleBulkAdd = (staffs: Omit<StaffMember, 'id' | 'status' | 'inviteCode' | 'invitedAt'>[]) => {
    const newStaffs = staffs.map((staff, idx) => ({
      ...staff,
      id: (Date.now() + idx).toString(),
      status: 'pending' as const,
      inviteCode: generateInviteCode(),
      invitedAt: new Date(),
    }));
    setStaffList(prev => [...newStaffs, ...prev]);
  };

  const handleCopyLink = (staff: StaffMember) => {
    const link = `${window.location.origin}/invite/${staff.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedId(staff.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResend = (staff: StaffMember) => {
    // 실제로는 API 호출
    console.log('Resending invitation to:', staff.email);
  };

  const handleDelete = (staffId: string) => {
    setStaffList(prev => prev.filter(s => s.id !== staffId));
  };

  const pendingCount = staffList.filter(s => s.status === 'pending').length;
  const acceptedCount = staffList.filter(s => s.status === 'accepted').length;

  return (
    <div className="min-h-screen bg-[#05050a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm hidden md:inline">대시보드</span>
          </Link>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span className="font-bold">직원 관리</span>
          </div>
          <div className="w-20" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-white">{staffList.length}</p>
            <p className="text-xs text-gray-400">전체</p>
          </div>
          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-green-400">{acceptedCount}</p>
            <p className="text-xs text-gray-400">활성</p>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-yellow-400">{pendingCount}</p>
            <p className="text-xs text-gray-400">대기</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            직원 초대
          </button>
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="py-4 px-6 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            CSV
          </button>
        </div>

        {/* Copy Success Toast */}
        <AnimatePresence>
          {copiedId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-50"
            >
              <Check className="w-4 h-4" />
              초대 링크가 복사되었습니다!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Staff List */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">직원 목록 ({staffList.length}명)</h3>
          
          {staffList.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">등록된 직원이 없습니다</p>
              <p className="text-sm text-gray-500 mt-1">위 버튼을 클릭하여 직원을 초대하세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {staffList.map(staff => (
                  <StaffCard
                    key={staff.id}
                    staff={staff}
                    onResend={() => handleResend(staff)}
                    onDelete={() => handleDelete(staff.id)}
                    onCopyLink={() => handleCopyLink(staff)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddStaff}
      />
      <CSVUploadModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onUpload={handleBulkAdd}
      />
    </div>
  );
}
