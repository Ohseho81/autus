// ================================================================
// AUTUS AI ADVICE GENERATOR
// Physics 데이터 → LLM → 맞춤 조언 생성
// ================================================================

// ================================================================
// AI ADVICE GENERATOR
// ================================================================

export const AIAdviceGenerator = {
    config: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 500
    },
    promptTemplates: {},
    
    init(config = {}) {
        this.config = { ...this.config, ...config };
        this.promptTemplates = this._getPromptTemplates();
        return this;
    },
    
    /**
     * Physics 데이터로부터 조언 생성
     */
    async generateAdvice(physicsData, context = {}) {
        const analysis = this._analyzePhysics(physicsData);
        const prompt = this._buildPrompt(analysis, context);
        const advice = await this._callLLM(prompt);
        
        return {
            timestamp: new Date(),
            input: physicsData,
            analysis,
            advice,
            confidence: this._calculateConfidence(analysis),
            actionItems: this._extractActionItems(advice)
        };
    },
    
    /**
     * 학생별 맞춤 조언
     */
    async generateStudentAdvice(studentData) {
        const prompt = this._buildStudentPrompt(studentData);
        const advice = await this._callLLM(prompt);
        
        return {
            studentId: studentData.id,
            studentName: studentData.name,
            advice,
            category: this._categorizeAdvice(studentData),
            priority: this._determinePriority(studentData),
            suggestedActions: this._generateActions(studentData)
        };
    },
    
    /**
     * 학부모용 코멘트 생성
     */
    async generateParentComment(studentData, reportType = 'weekly') {
        const template = this.promptTemplates[reportType + 'Parent'];
        const filled = this._fillTemplate(template, studentData);
        const comment = await this._callLLM(filled);
        
        return {
            comment,
            tone: this._determineTone(studentData),
            keyPoints: this._extractKeyPoints(comment)
        };
    },
    
    /**
     * 이탈 방지 메시지 생성
     */
    async generateRetentionMessage(atRiskStudent) {
        const template = this.promptTemplates.retention;
        const filled = this._fillTemplate(template, atRiskStudent);
        const message = await this._callLLM(filled);
        
        return {
            message,
            urgency: atRiskStudent.riskScore > 0.8 ? 'HIGH' : 'MEDIUM',
            channel: atRiskStudent.preferredChannel || 'kakao',
            callToAction: this._generateCTA(atRiskStudent)
        };
    },
    
    /**
     * 그룹 분석 코멘트
     */
    async generateGroupAnalysis(groupData) {
        const stats = this._calculateGroupStats(groupData);
        const prompt = this._buildGroupPrompt(stats);
        const analysis = await this._callLLM(prompt);
        
        return {
            groupId: groupData.id,
            memberCount: groupData.members.length,
            analysis,
            insights: this._extractInsights(analysis),
            recommendations: this._generateGroupRecommendations(stats)
        };
    },
    
    // ================================================================
    // PHYSICS ANALYSIS
    // ================================================================
    
    _analyzePhysics(data) {
        const mass = data.mass || 50;
        const energy = data.energy || 50;
        const velocity = data.velocity || 0;
        const position = data.position || { x: 0, y: 0 };
        
        // 운동량 계산
        const momentum = mass * velocity;
        
        // 운동 에너지
        const kineticEnergy = 0.5 * mass * velocity * velocity;
        
        // 궤도 상태 결정
        let orbitStatus;
        if (mass >= 80 && energy >= 70) {
            orbitStatus = 'CORE';
        } else if (mass >= 60) {
            orbitStatus = 'INNER';
        } else if (mass >= 40) {
            orbitStatus = 'MIDDLE';
        } else {
            orbitStatus = 'OUTER';
        }
        
        // 성장 잠재력
        const growthPotential = (energy / 100) * (1 + velocity * 0.5);
        
        // 안정성
        const stability = mass >= 60 ? 'STABLE' : mass >= 40 ? 'MODERATE' : 'UNSTABLE';
        
        return {
            mass,
            energy,
            velocity,
            momentum,
            kineticEnergy,
            orbitStatus,
            growthPotential,
            stability,
            healthScore: (mass + energy) / 2
        };
    },
    
    // ================================================================
    // PROMPT BUILDING
    // ================================================================
    
    _buildPrompt(analysis, context) {
        return `
당신은 AUTUS 교육 시스템의 AI 조언자입니다.

## 학생 물리 데이터 분석
- 질량(Mass): ${analysis.mass} (학습량/진도)
- 에너지(Energy): ${analysis.energy} (참여도/열정)
- 속도(Velocity): ${analysis.velocity} (성장 속도)
- 궤도 상태: ${analysis.orbitStatus}
- 성장 잠재력: ${(analysis.growthPotential * 100).toFixed(1)}%
- 안정성: ${analysis.stability}
- 건강 점수: ${analysis.healthScore.toFixed(1)}%

## 컨텍스트
${context.additionalInfo || '없음'}

## 요청
위 데이터를 바탕으로 학생에게 적합한 학습 조언을 3-5문장으로 작성해주세요.
긍정적이고 격려하는 톤을 유지하면서도 구체적인 개선점을 제시해주세요.
`;
    },
    
    _buildStudentPrompt(student) {
        return `
## 학생 정보
- 이름: ${student.name}
- 출석률: ${student.attendance || 0}%
- 진도: ${student.progress || 0}%
- 참여도: ${student.engagement || 0}%
- 최근 성적 추세: ${student.trend || '유지'}

## 강점
${student.strengths?.join(', ') || '분석 중'}

## 개선 필요 영역
${student.weaknesses?.join(', ') || '분석 중'}

이 학생에게 맞춤화된 학습 조언을 작성해주세요.
`;
    },
    
    _buildGroupPrompt(stats) {
        return `
## 그룹 통계
- 평균 출석률: ${stats.avgAttendance}%
- 평균 진도: ${stats.avgProgress}%
- 평균 참여도: ${stats.avgEngagement}%
- 위험 학생 비율: ${stats.atRiskRatio}%

그룹 전체에 대한 분석과 개선 방향을 제시해주세요.
`;
    },
    
    // ================================================================
    // LLM CALL (MOCK)
    // ================================================================
    
    async _callLLM(prompt) {
        // 실제 구현에서는 OpenAI API 호출
        // 여기서는 규칙 기반 응답 생성
        
        return new Promise(resolve => {
            setTimeout(() => {
                const response = this._generateMockResponse(prompt);
                resolve(response);
            }, 100);
        });
    },
    
    _generateMockResponse(prompt) {
        // 프롬프트 분석하여 적절한 응답 생성
        const isPositive = prompt.includes('80') || prompt.includes('90') || prompt.includes('CORE');
        const isAtRisk = prompt.includes('OUTER') || prompt.includes('UNSTABLE') || prompt.includes('위험');
        
        if (isAtRisk) {
            return `학생의 현재 학습 상태에 조금 더 관심이 필요합니다. 최근 참여도가 다소 낮아진 것으로 보이는데, 이는 일시적인 현상일 수 있습니다. 작은 목표부터 차근차근 달성해 나가면서 성취감을 느끼는 것이 중요합니다. 선생님과 함께 현재 어려운 부분을 파악하고, 맞춤형 보충 학습을 진행하는 것을 권장드립니다. 꾸준한 격려와 관심이 큰 도움이 될 것입니다.`;
        } else if (isPositive) {
            return `정말 훌륭한 학습 성과를 보여주고 있습니다! 현재 궤도에서 안정적으로 성장하고 있으며, 특히 참여도와 진도 모두 우수합니다. 이 페이스를 유지하면서 조금 더 도전적인 목표를 설정해 보는 것을 권장드립니다. 강점 영역을 더욱 발전시키면서, 관심 있는 심화 주제를 탐구해 보세요. 지금처럼만 해주시면 됩니다!`;
        } else {
            return `꾸준히 노력하고 있는 모습이 보입니다. 현재 안정적인 학습 패턴을 유지하고 있으며, 조금씩 성장하고 있습니다. 더 빠른 성장을 위해서는 매일 일정한 시간에 학습하는 습관을 강화하고, 어려운 부분은 즉시 질문하는 적극성이 필요합니다. 작은 목표를 세우고 달성해 나가면서 자신감을 키워가세요.`;
        }
    },
    
    // ================================================================
    // HELPER METHODS
    // ================================================================
    
    _fillTemplate(template, data) {
        let filled = template;
        Object.entries(data).forEach(([key, value]) => {
            filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
        return filled;
    },
    
    _calculateConfidence(analysis) {
        // 데이터 완성도에 따른 신뢰도
        const dataPoints = ['mass', 'energy', 'velocity'];
        const filledPoints = dataPoints.filter(p => analysis[p] !== undefined).length;
        return filledPoints / dataPoints.length;
    },
    
    _extractActionItems(advice) {
        // 조언에서 액션 아이템 추출
        const items = [];
        
        if (advice.includes('목표')) {
            items.push({ action: '주간 목표 설정', priority: 'HIGH' });
        }
        if (advice.includes('질문') || advice.includes('상담')) {
            items.push({ action: '선생님과 상담 예약', priority: 'MEDIUM' });
        }
        if (advice.includes('습관') || advice.includes('꾸준')) {
            items.push({ action: '학습 루틴 점검', priority: 'MEDIUM' });
        }
        
        return items.length > 0 ? items : [{ action: '현재 페이스 유지', priority: 'LOW' }];
    },
    
    _categorizeAdvice(studentData) {
        const attendance = studentData.attendance || 0;
        const engagement = studentData.engagement || 0;
        
        if (attendance < 70 || engagement < 50) return 'INTERVENTION';
        if (attendance < 85 || engagement < 70) return 'SUPPORT';
        return 'ENCOURAGEMENT';
    },
    
    _determinePriority(studentData) {
        const attendance = studentData.attendance || 0;
        const engagement = studentData.engagement || 0;
        
        if (attendance < 60 || engagement < 40) return 'URGENT';
        if (attendance < 75 || engagement < 60) return 'HIGH';
        if (attendance < 85 || engagement < 75) return 'MEDIUM';
        return 'LOW';
    },
    
    _generateActions(studentData) {
        const actions = [];
        const attendance = studentData.attendance || 0;
        const engagement = studentData.engagement || 0;
        
        if (attendance < 80) {
            actions.push({ type: 'ATTENDANCE_BOOST', message: '출석 독려 메시지 발송' });
        }
        if (engagement < 70) {
            actions.push({ type: 'ENGAGEMENT_BOOST', message: '참여 유도 활동 제안' });
        }
        
        return actions;
    },
    
    _determineTone(studentData) {
        const score = (studentData.attendance || 0 + studentData.engagement || 0) / 2;
        
        if (score >= 85) return 'CELEBRATORY';
        if (score >= 70) return 'ENCOURAGING';
        if (score >= 55) return 'SUPPORTIVE';
        return 'CONCERNED';
    },
    
    _extractKeyPoints(comment) {
        // 핵심 포인트 추출 (간단한 버전)
        const sentences = comment.split(/[.!?]/).filter(s => s.trim());
        return sentences.slice(0, 3).map(s => s.trim());
    },
    
    _generateCTA(atRiskStudent) {
        const riskScore = atRiskStudent.riskScore || 0.5;
        
        if (riskScore > 0.8) {
            return '지금 바로 상담 예약하기';
        } else if (riskScore > 0.6) {
            return '학습 계획 다시 세우기';
        } else {
            return '선생님 메시지 확인하기';
        }
    },
    
    _calculateGroupStats(groupData) {
        const members = groupData.members || [];
        
        const avgAttendance = members.reduce((s, m) => s + (m.attendance || 0), 0) / members.length;
        const avgProgress = members.reduce((s, m) => s + (m.progress || 0), 0) / members.length;
        const avgEngagement = members.reduce((s, m) => s + (m.engagement || 0), 0) / members.length;
        const atRisk = members.filter(m => (m.attendance || 0) < 70 || (m.engagement || 0) < 50);
        
        return {
            avgAttendance: avgAttendance.toFixed(1),
            avgProgress: avgProgress.toFixed(1),
            avgEngagement: avgEngagement.toFixed(1),
            atRiskRatio: ((atRisk.length / members.length) * 100).toFixed(1)
        };
    },
    
    _extractInsights(analysis) {
        return [
            '그룹 전체적으로 안정적인 학습 패턴을 보임',
            '참여도 향상을 위한 그룹 활동 권장',
            '개별 피드백과 그룹 피드백의 균형 필요'
        ];
    },
    
    _generateGroupRecommendations(stats) {
        const recs = [];
        
        if (parseFloat(stats.avgAttendance) < 80) {
            recs.push('출석률 향상 프로그램 도입');
        }
        if (parseFloat(stats.avgEngagement) < 70) {
            recs.push('참여형 수업 활동 확대');
        }
        if (parseFloat(stats.atRiskRatio) > 20) {
            recs.push('위험 학생 집중 관리 필요');
        }
        
        return recs.length > 0 ? recs : ['현재 상태 유지 권장'];
    },
    
    _getPromptTemplates() {
        return {
            weeklyParent: `
학생 {{name}}의 이번 주 학습 현황입니다.
- 출석률: {{attendance}}%
- 진도: {{progress}}%
- 참여도: {{engagement}}%

학부모님께 전달할 격려와 조언의 메시지를 작성해주세요.
`,
            monthlyParent: `
학생 {{name}}의 이번 달 학습 성과입니다.
- 전월 대비 성장률: {{growth}}%
- 주요 성취: {{achievements}}
- 개선 필요 영역: {{improvements}}

학부모님께 전달할 종합 코멘트를 작성해주세요.
`,
            retention: `
이탈 위험 학생 정보:
- 학생명: {{name}}
- 위험 점수: {{riskScore}}
- 주요 원인: {{reasons}}

학생의 이탈을 방지하기 위한 따뜻하고 격려하는 메시지를 작성해주세요.
학생이 다시 참여하고 싶어지도록 동기를 부여해주세요.
`
        };
    }
};

// ================================================================
// TEST
// ================================================================

export async function testAIAdviceGenerator() {
    console.log('Testing AI Advice Generator...');
    
    const generator = Object.create(AIAdviceGenerator).init();
    
    // 물리 데이터로 조언 생성
    const physicsAdvice = await generator.generateAdvice({
        mass: 75,
        energy: 82,
        velocity: 0.15
    });
    
    console.log('✅ Physics Advice:', physicsAdvice.advice.substring(0, 50) + '...');
    
    // 학생별 조언 생성
    const studentAdvice = await generator.generateStudentAdvice({
        id: 'student_001',
        name: '김학생',
        attendance: 92,
        progress: 78,
        engagement: 85
    });
    
    console.log('✅ Student Advice:', studentAdvice.advice.substring(0, 50) + '...');
    
    // 학부모 코멘트 생성
    const parentComment = await generator.generateParentComment({
        name: '김학생',
        attendance: 92,
        progress: 78,
        engagement: 85
    });
    
    console.log('✅ Parent Comment:', parentComment.comment.substring(0, 50) + '...');
    
    return { generator, physicsAdvice, studentAdvice, parentComment };
}

export default AIAdviceGenerator;
