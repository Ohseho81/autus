/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📝 KRATON Auto Script Generator
 * AI 상담 스크립트 자동 생성기
 * 상황별 맞춤 대화 스크립트를 AI가 실시간 생성
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// MOCK DATA & TEMPLATES
// ============================================

const SCENARIO_TYPES = [
  { id: 'churn_prevention', label: '이탈 방지', icon: '🛡️', color: 'red' },
  { id: 'payment_reminder', label: '수납 안내', icon: '💳', color: 'orange' },
  { id: 'satisfaction_recovery', label: '만족도 회복', icon: '😊', color: 'yellow' },
  { id: 'new_enrollment', label: '신규 상담', icon: '🌟', color: 'cyan' },
  { id: 'progress_report', label: '성과 보고', icon: '📊', color: 'purple' },
  { id: 'schedule_change', label: '일정 변경', icon: '📅', color: 'blue' },
];

const STUDENT_PROFILES = [
  { id: 'STU-2013', name: '오연우', grade: '중2', parent: '오연우 어머니', sIndex: 0.32, issues: ['결석 증가', '만족도 하락'] },
  { id: 'STU-1087', name: '김민지', grade: '중3', parent: '김민지 어머니', sIndex: 0.45, issues: ['수강료 연체', '진로 고민'] },
  { id: 'STU-0892', name: '이준혁', grade: '고1', parent: '이준혁 아버지', sIndex: 0.48, issues: ['성적 정체', '동기 저하'] },
];

// AI Generated Scripts (Mock)
const generateScript = (scenario, student, tone) => {
  const scripts = {
    churn_prevention: {
      formal: {
        opening: `안녕하세요, ${student.parent}님. ${student.name} 학생 담당 선생님입니다.`,
        empathy: `최근 ${student.name} 학생의 출석이 불규칙해서 걱정이 되어 연락드렸습니다. 혹시 가정에서 어려운 일이 있으시거나, 학원 생활에 불편한 점이 있으신지 여쭤봐도 될까요?`,
        main: `저희도 ${student.name} 학생이 더 즐겁게 공부할 수 있도록 여러 방안을 고민하고 있습니다. 현재 만족도가 다소 낮은 상황인데, 구체적으로 어떤 부분이 아쉬우셨는지 말씀해주시면 적극 개선하겠습니다.`,
        solution: `담당 선생님과의 케미 문제라면 선생님 변경도 가능하고, 학습 방식이 맞지 않다면 맞춤 커리큘럼을 다시 설계해 드릴 수 있습니다. ${student.name} 학생에게 가장 도움이 되는 방향으로 조정하겠습니다.`,
        closing: `${student.parent}님의 소중한 의견 경청하겠습니다. 언제든 편하게 연락 주세요.`,
      },
      friendly: {
        opening: `${student.parent}님, 안녕하세요! ${student.name} 담당 선생이에요~ 😊`,
        empathy: `요즘 ${student.name}이가 수업에 잘 못 나오고 있어서요, 혹시 무슨 일 있는 건 아닌지 걱정돼서 연락드렸어요.`,
        main: `솔직히 말씀드리면 ${student.name}이가 요즘 좀 힘들어하는 것 같아서요. 어머님이 느끼신 점이나, 아이가 집에서 뭐라고 했는지 들어볼 수 있을까요?`,
        solution: `저희가 할 수 있는 건 다 해볼게요! 선생님 바꿔드릴 수도 있고, 수업 방식도 ${student.name}이한테 맞게 조절할 수 있어요. 뭐든 말씀해 주세요!`,
        closing: `${student.name}이가 다시 즐겁게 공부할 수 있도록 같이 노력해봐요! 언제든 연락 주세요~ 💪`,
      },
    },
    payment_reminder: {
      formal: {
        opening: `안녕하세요, ${student.parent}님. 학원 행정팀입니다.`,
        empathy: `다름이 아니라 ${student.name} 학생의 이번 달 수강료 납부 건으로 연락드렸습니다. 혹시 바쁘신 와중에 놓치신 건 아닌지 확인차 연락드립니다.`,
        main: `현재 미납 금액이 있어서 안내드리는데요, 혹시 일시적으로 어려운 상황이시라면 분납이나 납부 일정 조정도 가능합니다.`,
        solution: `2개월 분납이나, 다음 달까지 유예하는 방법도 있으니 편하신 방식으로 말씀해 주세요. 저희가 최대한 맞춰드리겠습니다.`,
        closing: `양해 부탁드리며, 문의사항 있으시면 언제든 연락 주세요. 감사합니다.`,
      },
      friendly: {
        opening: `${student.parent}님 안녕하세요~ 학원이에요! 😊`,
        empathy: `다름이 아니라 이번 달 수강료 안내드리려고요~ 혹시 깜빡하신 건 아닐까 해서 연락드렸어요!`,
        main: `바쁘시다 보면 놓치실 수도 있잖아요~ 혹시 요즘 여러 가지로 바쁘시면 분납도 가능하니까 편하게 말씀해 주세요!`,
        solution: `나눠서 내시거나, 다음 달에 한꺼번에 내셔도 돼요. 뭐든 맞춰드릴 수 있으니까 부담 갖지 마세요!`,
        closing: `궁금한 거 있으시면 언제든 톡 주세요~ 감사합니다! 🙏`,
      },
    },
    satisfaction_recovery: {
      formal: {
        opening: `안녕하세요, ${student.parent}님. ${student.name} 학생 담당 선생님입니다.`,
        empathy: `최근 ${student.name} 학생의 학습 만족도가 다소 낮아진 것 같아 연락드렸습니다. 혹시 수업이나 학원 생활에서 불편하셨던 점이 있으셨을까요?`,
        main: `${student.issues.join(', ')} 등의 상황이 있었는데, 저희가 미처 세심하게 챙기지 못한 부분이 있다면 진심으로 사과드립니다.`,
        solution: `앞으로는 ${student.name} 학생에게 더 집중해서 케어하겠습니다. 주 1회 개별 피드백을 드리고, 학습 진도도 세밀하게 조정하겠습니다.`,
        closing: `${student.parent}님께서 느끼신 점 말씀해 주시면 바로 반영하겠습니다. 감사합니다.`,
      },
      friendly: {
        opening: `${student.parent}님 안녕하세요~ ${student.name} 담당 선생이에요!`,
        empathy: `요즘 ${student.name}이가 수업을 좀 힘들어하는 것 같아서요 ㅠㅠ 혹시 뭔가 마음에 안 드는 부분이 있었을까요?`,
        main: `솔직히 저희가 좀 더 신경 썼어야 했는데, 최근에 ${student.issues[0]} 이슈가 있었잖아요. 많이 속상하셨죠?`,
        solution: `앞으로 ${student.name}이한테 특별히 더 신경 쓸게요! 매주 따로 피드백도 드리고, 수업 방식도 아이한테 맞게 바꿔볼게요!`,
        closing: `어머님 생각도 궁금해요~ 편하게 말씀해 주세요! 같이 ${student.name}이 응원해요! 💪`,
      },
    },
  };

  return scripts[scenario]?.[tone] || scripts.churn_prevention.formal;
};

const generateFollowUpQuestions = (scenario) => {
  const questions = {
    churn_prevention: [
      '혹시 다른 학원이나 과외를 알아보고 계신 건가요?',
      '아이가 집에서 학원에 대해 뭐라고 얘기하던가요?',
      '담당 선생님과의 관계는 어떠신 것 같으세요?',
      '수업 시간이나 요일이 불편하신 건 아니신가요?',
    ],
    payment_reminder: [
      '현금, 카드, 계좌이체 중 어떤 방법이 편하세요?',
      '분납을 원하시면 2회 또는 3회로 나눌 수 있어요.',
      '다음 달 수강료와 합산해서 납부하셔도 됩니다.',
    ],
    satisfaction_recovery: [
      '구체적으로 어떤 부분이 아쉬우셨어요?',
      '선생님 스타일이 안 맞으신 건가요?',
      '숙제나 진도가 너무 빠르거나 느린 건 아닌가요?',
      '다른 친구들과의 관계는 괜찮은가요?',
    ],
  };
  return questions[scenario] || [];
};

// ============================================
// SUB COMPONENTS
// ============================================

// Scenario Selector
const ScenarioSelector = memo(function ScenarioSelector({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {SCENARIO_TYPES.map(scenario => (
        <button
          key={scenario.id}
          onClick={() => onSelect(scenario.id)}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            selected === scenario.id
              ? `bg-${scenario.color}-500/20 border-${scenario.color}-500/50`
              : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
          }`}
        >
          <span className="text-2xl mb-2 block">{scenario.icon}</span>
          <p className="text-white font-medium">{scenario.label}</p>
        </button>
      ))}
    </div>
  );
});

// Student Selector
const StudentSelector = memo(function StudentSelector({ selected, onSelect }) {
  return (
    <div className="space-y-2">
      {STUDENT_PROFILES.map(student => (
        <button
          key={student.id}
          onClick={() => onSelect(student)}
          className={`w-full p-3 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
            selected?.id === student.id
              ? 'bg-cyan-500/20 border-cyan-500/50'
              : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
          }`}
        >
          <div>
            <p className="text-white font-medium">{student.name}</p>
            <p className="text-gray-500 text-xs">{student.grade} · {student.parent}</p>
          </div>
          <div className="text-right">
            <p className={`text-sm ${student.sIndex < 0.5 ? 'text-red-400' : 'text-emerald-400'}`}>
              s-Index {(student.sIndex * 100).toFixed(0)}%
            </p>
            <div className="flex gap-1 mt-1">
              {student.issues.map((issue, idx) => (
                <span key={idx} className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px]">
                  {issue}
                </span>
              ))}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
});

// Tone Selector
const ToneSelector = memo(function ToneSelector({ selected, onSelect }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onSelect('formal')}
        className={`flex-1 p-3 rounded-xl border-2 transition-all ${
          selected === 'formal'
            ? 'bg-purple-500/20 border-purple-500/50'
            : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
        }`}
      >
        <span className="text-xl mb-1 block">👔</span>
        <p className="text-white text-sm">정중한 톤</p>
      </button>
      <button
        onClick={() => onSelect('friendly')}
        className={`flex-1 p-3 rounded-xl border-2 transition-all ${
          selected === 'friendly'
            ? 'bg-emerald-500/20 border-emerald-500/50'
            : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
        }`}
      >
        <span className="text-xl mb-1 block">😊</span>
        <p className="text-white text-sm">친근한 톤</p>
      </button>
    </div>
  );
});

// Generated Script Display
const ScriptDisplay = memo(function ScriptDisplay({ script, isGenerating }) {
  if (isGenerating) {
    return (
      <div className="p-6 bg-gray-800/50 rounded-xl flex items-center justify-center min-h-[300px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"
        />
        <span className="ml-3 text-gray-400">AI가 스크립트를 생성 중...</span>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="p-6 bg-gray-800/50 rounded-xl flex items-center justify-center min-h-[300px] text-gray-500">
        <div className="text-center">
          <span className="text-4xl mb-4 block">📝</span>
          <p>시나리오와 학생을 선택하면</p>
          <p>AI가 맞춤 스크립트를 생성합니다</p>
        </div>
      </div>
    );
  }

  const sections = [
    { key: 'opening', label: '오프닝', icon: '👋' },
    { key: 'empathy', label: '공감', icon: '💝' },
    { key: 'main', label: '본론', icon: '💬' },
    { key: 'solution', label: '해결책', icon: '💡' },
    { key: 'closing', label: '마무리', icon: '🤝' },
  ];

  return (
    <div className="space-y-4">
      {sections.map(section => (
        <motion.div
          key={section.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gray-800/50 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{section.icon}</span>
            <span className="text-cyan-400 font-medium">{section.label}</span>
          </div>
          <p className="text-gray-300 leading-relaxed">{script[section.key]}</p>
        </motion.div>
      ))}
    </div>
  );
});

// Follow-up Questions
const FollowUpQuestions = memo(function FollowUpQuestions({ questions }) {
  if (!questions.length) return null;

  return (
    <div className="p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl border border-purple-500/30">
      <h4 className="text-purple-400 font-medium mb-3 flex items-center gap-2">
        <span>❓</span> 후속 질문 제안
      </h4>
      <div className="space-y-2">
        {questions.map((q, idx) => (
          <p key={idx} className="text-gray-300 text-sm flex items-start gap-2">
            <span className="text-cyan-400">•</span>
            {q}
          </p>
        ))}
      </div>
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function AutoScriptGenerator() {
  const [scenario, setScenario] = useState(null);
  const [student, setStudent] = useState(null);
  const [tone, setTone] = useState('formal');
  const [script, setScript] = useState(null);
  const [followUp, setFollowUp] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate script
  const handleGenerate = useCallback(() => {
    if (!scenario || !student) return;

    setIsGenerating(true);
    setScript(null);

    // Simulate AI generation delay
    setTimeout(() => {
      const generatedScript = generateScript(scenario, student, tone);
      const questions = generateFollowUpQuestions(scenario);
      setScript(generatedScript);
      setFollowUp(questions);
      setIsGenerating(false);
    }, 1500);
  }, [scenario, student, tone]);

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    if (!script) return;
    const text = Object.values(script).join('\n\n');
    navigator.clipboard.writeText(text);
  }, [script]);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">📝</span>
              Auto Script Generator
            </h1>
            <p className="text-gray-400 mt-1">AI 상담 스크립트 자동 생성기</p>
          </div>
          {script && (
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/50 hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
            >
              <span>📋</span> 복사하기
            </button>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="space-y-6">
            {/* Scenario */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-yellow-400">1️⃣</span>
                상담 시나리오
              </h3>
              <ScenarioSelector selected={scenario} onSelect={setScenario} />
            </div>

            {/* Student */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-yellow-400">2️⃣</span>
                상담 대상
              </h3>
              <StudentSelector selected={student} onSelect={setStudent} />
            </div>

            {/* Tone */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-yellow-400">3️⃣</span>
                말투 스타일
              </h3>
              <ToneSelector selected={tone} onSelect={setTone} />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!scenario || !student || isGenerating}
              className={`w-full p-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                scenario && student && !isGenerating
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>🤖</span>
              {isGenerating ? 'AI 생성 중...' : 'AI 스크립트 생성'}
            </button>
          </div>

          {/* Script Display */}
          <div className="col-span-2 space-y-4">
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-cyan-400">💬</span>
                생성된 스크립트
                {student && scenario && (
                  <span className="ml-auto text-gray-500 text-sm">
                    {student.parent} · {SCENARIO_TYPES.find(s => s.id === scenario)?.label}
                  </span>
                )}
              </h3>
              <div className="max-h-[500px] overflow-y-auto">
                <ScriptDisplay script={script} isGenerating={isGenerating} />
              </div>
            </div>

            {/* Follow-up Questions */}
            <FollowUpQuestions questions={followUp} />

            {/* Tips */}
            {script && (
              <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/30">
                <h4 className="text-emerald-400 font-medium mb-2 flex items-center gap-2">
                  <span>💡</span> 상담 팁
                </h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <p>• 학부모의 말을 먼저 경청하세요</p>
                  <p>• 공감 표현 후 해결책을 제시하세요</p>
                  <p>• 구체적인 다음 단계를 약속하세요</p>
                  <p>• 감사 인사로 마무리하세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
