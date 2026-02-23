'use client';

import { useState, useEffect, useCallback } from 'react';

const FUNCTION_URL = 'https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/template-manager';

type KakaoStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

interface Template {
  key: string;
  label: string;
  description: string;
  academy_name: string;
  footer: string;
  body_custom: boolean;
  body_text: string;
  default_body: string;
  kakao_status: KakaoStatus;
  variables: { key: string; label: string }[];
}

const TEMPLATE_CONFIGS: { key: string; label: string; description: string; defaultBody: string; variables: { key: string; label: string }[] }[] = [
  {
    key: 'attendance_remind',
    label: '출석 확인 알림',
    description: '학부모에게 출석 확인을 요청하는 알림톡',
    defaultBody: '안녕하세요, #{학원명}입니다.\n#{학생명}의 #{수업명} 수업 출석을 확인해주세요.\n\n📅 #{날짜} #{시간}\n\n아래 버튼을 눌러 출석 여부를 알려주세요.',
    variables: [
      { key: '#{학원명}', label: '학원명' },
      { key: '#{학생명}', label: '학생명' },
      { key: '#{수업명}', label: '수업명' },
      { key: '#{날짜}', label: '날짜' },
      { key: '#{시간}', label: '시간' },
      { key: '#{코치명}', label: '코치명' },
    ],
  },
  {
    key: 'result_report',
    label: '수업 결과 리포트',
    description: '수업 후 학부모에게 결과를 전달하는 알림톡',
    defaultBody: '안녕하세요, #{학원명}입니다.\n#{학생명}의 오늘 수업이 완료되었습니다.\n\n🏷 오늘의 키워드: #{키워드}\n📊 훈련 단계: #{단계}\n\n상세 결과는 아래 버튼을 눌러 확인해주세요.',
    variables: [
      { key: '#{학원명}', label: '학원명' },
      { key: '#{학생명}', label: '학생명' },
      { key: '#{수업명}', label: '수업명' },
      { key: '#{키워드}', label: '키워드' },
      { key: '#{단계}', label: '훈련 단계' },
      { key: '#{코치명}', label: '코치명' },
      { key: '#{메모}', label: '코치 메모' },
    ],
  },
];

const STATUS_MAP: Record<KakaoStatus, { label: string; color: string }> = {
  draft: { label: '미신청', color: 'bg-gray-100 text-gray-600' },
  pending_review: { label: '검수중', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '승인완료', color: 'bg-green-100 text-green-700' },
  rejected: { label: '거절됨', color: 'bg-red-100 text-red-700' },
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  useEffect(() => {
    const oid = localStorage.getItem('org_id') || '';
    const at = localStorage.getItem('access_token') || '';
    setOrgId(oid);
    setAccessToken(at);
    if (oid) loadTemplates(oid, at);
    else setLoading(false);
  }, []);

  async function loadTemplates(oid: string, at: string) {
    setLoading(true);
    const loaded: Template[] = [];
    for (const config of TEMPLATE_CONFIGS) {
      try {
        const res = await fetch(`${FUNCTION_URL}?org_id=${oid}&key=${config.key}`, {
          headers: at ? { Authorization: `Bearer ${at}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          loaded.push({
            key: config.key,
            label: config.label,
            description: config.description,
            academy_name: data.academy_name || '',
            footer: data.footer || '',
            body_custom: data.body_custom || false,
            body_text: data.body_text || config.defaultBody,
            default_body: config.defaultBody,
            kakao_status: data.kakao_status || 'draft',
            variables: config.variables,
          });
        } else {
          loaded.push({
            key: config.key,
            label: config.label,
            description: config.description,
            academy_name: '',
            footer: '',
            body_custom: false,
            body_text: config.defaultBody,
            default_body: config.defaultBody,
            kakao_status: 'draft',
            variables: config.variables,
          });
        }
      } catch {
        loaded.push({
          key: config.key,
          label: config.label,
          description: config.description,
          academy_name: '',
          footer: '',
          body_custom: false,
          body_text: config.defaultBody,
          default_body: config.defaultBody,
          kakao_status: 'draft',
          variables: config.variables,
        });
      }
    }
    setTemplates(loaded);
    setLoading(false);
  }

  function updateTemplate(key: string, updates: Partial<Template>) {
    setTemplates((prev) =>
      prev.map((t) => (t.key === key ? { ...t, ...updates } : t))
    );
  }

  async function saveTemplate(template: Template) {
    setSaving(true);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          org_id: orgId,
          key: template.key,
          academy_name: template.academy_name,
          footer: template.footer,
          body_custom: template.body_custom,
          body_text: template.body_custom ? template.body_text : template.default_body,
        }),
      });
      if (!res.ok) throw new Error('저장 실패');
      setEditingKey(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const insertVariable = useCallback((templateKey: string, variable: string) => {
    const tpl = templates.find((t) => t.key === templateKey);
    if (!tpl) return;
    updateTemplate(templateKey, { body_text: tpl.body_text + variable });
  }, [templates]);

  function renderPreview(template: Template) {
    const body = template.body_custom ? template.body_text : template.default_body;
    let preview = body;
    const sampleValues: Record<string, string> = {
      '#{학원명}': template.academy_name || '우리학원',
      '#{학생명}': '김민준',
      '#{수업명}': '농구 A반',
      '#{날짜}': '2월 24일 (월)',
      '#{시간}': '오후 4시',
      '#{코치명}': '박코치',
      '#{키워드}': '집중력 향상',
      '#{단계}': '반복',
      '#{메모}': '오늘 아주 잘했습니다.',
    };
    for (const [key, value] of Object.entries(sampleValues)) {
      preview = preview.replaceAll(key, value);
    }
    return preview;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">🔑</div>
          <p className="text-gray-700 font-medium mb-2">로그인이 필요합니다</p>
          <p className="text-sm text-gray-500">관리자 페이지에서 로그인 후 이용해주세요.</p>
        </div>
      </div>
    );
  }

  const editingTemplate = templates.find((t) => t.key === editingKey);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">알림톡 템플릿 관리</h1>
          <p className="text-sm text-gray-500 mt-1">카카오 알림톡 메시지 템플릿을 관리합니다</p>
        </div>

        {!editingKey ? (
          /* Template List */
          <div className="space-y-3">
            {templates.map((tpl) => {
              const status = STATUS_MAP[tpl.kakao_status];
              return (
                <div
                  key={tpl.key}
                  className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setEditingKey(tpl.key)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-base font-semibold text-gray-900">{tpl.label}</h2>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{tpl.description}</p>
                      <p className="text-xs text-gray-400 mt-1">키: {tpl.key}</p>
                    </div>
                    <span className="text-gray-300 text-xl">›</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : editingTemplate ? (
          /* Edit View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Edit Form */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-900">{editingTemplate.label}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_MAP[editingTemplate.kakao_status].color}`}>
                    {STATUS_MAP[editingTemplate.kakao_status].label}
                  </span>
                </div>

                {/* Academy Name */}
                <label className="block mb-3">
                  <span className="text-xs font-semibold text-gray-500">학원명</span>
                  <input
                    type="text"
                    value={editingTemplate.academy_name}
                    onChange={(e) => updateTemplate(editingTemplate.key, { academy_name: e.target.value })}
                    placeholder="학원명을 입력하세요"
                    className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Footer */}
                <label className="block mb-3">
                  <span className="text-xs font-semibold text-gray-500">푸터</span>
                  <input
                    type="text"
                    value={editingTemplate.footer}
                    onChange={(e) => updateTemplate(editingTemplate.key, { footer: e.target.value })}
                    placeholder="하단에 표시될 문구 (예: 문의: 010-1234-5678)"
                    className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Body Custom Toggle */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-500">본문 커스텀</span>
                    <p className="text-[10px] text-gray-400">끄면 기본 템플릿을 사용합니다</p>
                  </div>
                  <button
                    onClick={() =>
                      updateTemplate(editingTemplate.key, {
                        body_custom: !editingTemplate.body_custom,
                        body_text: !editingTemplate.body_custom ? editingTemplate.body_text : editingTemplate.default_body,
                      })
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      editingTemplate.body_custom ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        editingTemplate.body_custom ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Body Text Editor */}
                {editingTemplate.body_custom && (
                  <>
                    {/* Variable Buttons */}
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-gray-500 mb-1 block">변수 삽입</span>
                      <div className="flex flex-wrap gap-1.5">
                        {editingTemplate.variables.map((v) => (
                          <button
                            key={v.key}
                            onClick={() => insertVariable(editingTemplate.key, v.key)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={editingTemplate.body_text}
                      onChange={(e) => updateTemplate(editingTemplate.key, { body_text: e.target.value })}
                      rows={8}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                    />
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingKey(null)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  목록으로
                </button>
                <button
                  onClick={() => saveTemplate(editingTemplate)}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </div>

            {/* Right: Preview */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">실시간 미리보기</h3>
              <div className="bg-[#F7E600] rounded-2xl p-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  {/* Kakao Talk Bubble Style */}
                  <div className="text-xs text-gray-400 mb-2">알림톡</div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {renderPreview(editingTemplate)}
                  </div>
                  {editingTemplate.footer && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400">{editingTemplate.footer}</p>
                    </div>
                  )}
                  {/* Sample Button */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="bg-gray-50 rounded-lg py-2.5 text-center text-xs font-medium text-blue-600">
                      확인하기
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
