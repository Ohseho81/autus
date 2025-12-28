// ================================================================
// HR MANAGER
// Automated hiring, scheduling, and interview workflows
// ================================================================

export const HRManager = {
    candidates: [],
    schedules: [],
    interviews: [],
    
    config: {
        autoScreening: true,
        interviewSlots: ['09:00', '10:30', '14:00', '15:30'],
        requiredDocuments: ['resume', 'certificate', 'portfolio'],
        evaluationCriteria: ['experience', 'education', 'skills', 'culture_fit']
    },
    
    // ================================================================
    // HIRING WORKFLOW
    // ================================================================
    
    // Process new application
    processApplication: async function(application) {
        const candidate = {
            id: 'cand_' + Date.now(),
            ...application,
            status: 'received',
            appliedAt: Date.now(),
            screeningScore: 0,
            stage: 'initial'
        };
        
        // Auto-screening
        if (this.config.autoScreening) {
            candidate.screeningScore = this.autoScreen(application);
            candidate.status = candidate.screeningScore >= 60 ? 'qualified' : 'rejected';
            candidate.stage = candidate.screeningScore >= 60 ? 'screening_passed' : 'screening_failed';
        }
        
        this.candidates.push(candidate);
        
        return {
            candidate,
            nextAction: candidate.status === 'qualified' ? 'schedule_interview' : 'send_rejection',
            savedTime: 20 // Minutes saved on manual screening
        };
    },
    
    // Auto-screening algorithm
    autoScreen: function(application) {
        let score = 0;
        
        // Experience check (0-30 points)
        if (application.experience >= 5) score += 30;
        else if (application.experience >= 3) score += 25;
        else if (application.experience >= 1) score += 15;
        else score += 5;
        
        // Education check (0-25 points)
        if (application.education === 'masters') score += 25;
        else if (application.education === 'bachelors') score += 20;
        else if (application.education === 'associate') score += 15;
        else score += 10;
        
        // Skills match (0-25 points)
        const requiredSkills = ['teaching', 'communication', 'patience'];
        const matchedSkills = (application.skills || []).filter(s => 
            requiredSkills.includes(s.toLowerCase())
        ).length;
        score += (matchedSkills / requiredSkills.length) * 25;
        
        // Documents completeness (0-20 points)
        const docs = application.documents || [];
        const docScore = this.config.requiredDocuments.filter(d => docs.includes(d)).length;
        score += (docScore / this.config.requiredDocuments.length) * 20;
        
        return Math.round(score);
    },
    
    // Get candidates by status
    getCandidates: function(status = null) {
        if (status) {
            return this.candidates.filter(c => c.status === status);
        }
        return this.candidates;
    },
    
    // ================================================================
    // SCHEDULING
    // ================================================================
    
    // Create schedule
    createSchedule: function(teacherId, weekStart) {
        const schedule = {
            id: 'sched_' + Date.now(),
            teacherId,
            weekStart,
            slots: this.generateWeekSlots(weekStart),
            createdAt: Date.now()
        };
        
        this.schedules.push(schedule);
        return schedule;
    },
    
    // Generate week slots
    generateWeekSlots: function(weekStart) {
        const slots = [];
        const days = ['월', '화', '수', '목', '금'];
        
        days.forEach((day, dayIndex) => {
            const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
            times.forEach(time => {
                slots.push({
                    day,
                    dayIndex,
                    time,
                    status: 'available',
                    assignedClass: null
                });
            });
        });
        
        return slots;
    },
    
    // Auto-assign classes to schedule
    autoAssignClasses: function(scheduleId, classes) {
        const schedule = this.schedules.find(s => s.id === scheduleId);
        if (!schedule) return null;
        
        const assignments = [];
        let classIndex = 0;
        
        for (const slot of schedule.slots) {
            if (slot.status === 'available' && classIndex < classes.length) {
                slot.status = 'assigned';
                slot.assignedClass = classes[classIndex];
                assignments.push({ slot, class: classes[classIndex] });
                classIndex++;
            }
        }
        
        return {
            scheduleId,
            assignments,
            unassigned: classes.slice(classIndex),
            savedTime: assignments.length * 3 // 3 min per assignment
        };
    },
    
    // Check scheduling conflicts
    checkConflicts: function(scheduleId) {
        const schedule = this.schedules.find(s => s.id === scheduleId);
        if (!schedule) return [];
        
        const conflicts = [];
        const assigned = schedule.slots.filter(s => s.status === 'assigned');
        
        // Check for overlapping times
        assigned.forEach((slot, i) => {
            assigned.forEach((other, j) => {
                if (i < j && slot.day === other.day && slot.time === other.time) {
                    conflicts.push({ slot1: slot, slot2: other, type: 'time_overlap' });
                }
            });
        });
        
        return conflicts;
    },
    
    // ================================================================
    // INTERVIEW MANAGEMENT
    // ================================================================
    
    // Schedule interview
    scheduleInterview: function(candidateId, datetime, interviewers = []) {
        const candidate = this.candidates.find(c => c.id === candidateId);
        if (!candidate || candidate.status !== 'qualified') {
            return { error: '유효하지 않은 후보자입니다.' };
        }
        
        const interview = {
            id: 'int_' + Date.now(),
            candidateId,
            datetime,
            interviewers,
            status: 'scheduled',
            questions: this.generateInterviewQuestions(candidate),
            createdAt: Date.now()
        };
        
        this.interviews.push(interview);
        candidate.stage = 'interview_scheduled';
        
        return {
            interview,
            candidate,
            notification: this.generateNotification(interview),
            savedTime: 15 // Minutes saved
        };
    },
    
    // Generate interview questions
    generateInterviewQuestions: function(candidate) {
        const baseQuestions = [
            '교육 철학에 대해 말씀해주세요.',
            '어려운 학생을 다룬 경험이 있으신가요?',
            '수업 준비는 어떻게 하시나요?',
            '학부모와의 소통 방식은?',
            '본인의 강점과 약점은 무엇인가요?'
        ];
        
        const experienceQuestions = candidate.experience >= 3 ? [
            '가장 성공적이었던 수업 사례를 공유해주세요.',
            '후배 교사 멘토링 경험이 있으신가요?'
        ] : [
            '교생 실습에서 배운 점은 무엇인가요?',
            '어떤 교사가 되고 싶으신가요?'
        ];
        
        return [...baseQuestions, ...experienceQuestions];
    },
    
    // Generate notification
    generateNotification: function(interview) {
        const candidate = this.candidates.find(c => c.id === interview.candidateId);
        
        return {
            to: candidate.email,
            subject: '[면접 일정 안내] AUTUS Education',
            body: `안녕하세요, ${candidate.name}님.\n\n면접 일정이 확정되었습니다.\n\n일시: ${new Date(interview.datetime).toLocaleString('ko-KR')}\n\n감사합니다.`
        };
    },
    
    // Record interview result
    recordInterviewResult: function(interviewId, evaluation) {
        const interview = this.interviews.find(i => i.id === interviewId);
        if (!interview) return null;
        
        interview.evaluation = evaluation;
        interview.status = 'completed';
        interview.completedAt = Date.now();
        
        // Calculate overall score
        const scores = Object.values(evaluation.scores || {});
        interview.overallScore = scores.length > 0 
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;
        
        // Update candidate status
        const candidate = this.candidates.find(c => c.id === interview.candidateId);
        if (candidate) {
            candidate.interviewScore = interview.overallScore;
            candidate.stage = interview.overallScore >= 70 ? 'interview_passed' : 'interview_failed';
            candidate.status = interview.overallScore >= 70 ? 'offer_pending' : 'rejected';
        }
        
        return {
            interview,
            candidate,
            recommendation: interview.overallScore >= 70 ? '채용 권장' : '불합격',
            savedTime: 10
        };
    }
};

export default HRManager;




