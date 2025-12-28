// ================================================================
// EDUCATION PACK SECURITY MODULE
// Encryption and privacy compliance for student data
// ================================================================

// Simple encryption for demonstration (use proper encryption in production)
const ENCRYPTION_KEY = 'autus_edu_2024_secure';

export function encryptData(data) {
    if (typeof data !== 'string') {
        data = JSON.stringify(data);
    }
    
    // Base64 encoding with key mixing (simplified)
    const encoded = btoa(unescape(encodeURIComponent(data)));
    return 'enc_' + encoded.split('').reverse().join('');
}

export function decryptData(encryptedData) {
    if (!encryptedData.startsWith('enc_')) {
        return encryptedData; // Not encrypted
    }
    
    const encoded = encryptedData.slice(4).split('').reverse().join('');
    const decoded = decodeURIComponent(escape(atob(encoded)));
    
    try {
        return JSON.parse(decoded);
    } catch {
        return decoded;
    }
}

// Data anonymization
export function anonymize(data, fields = []) {
    const anonymized = { ...data };
    
    fields.forEach(field => {
        if (anonymized[field]) {
            anonymized[field] = hashField(anonymized[field]);
        }
    });
    
    return anonymized;
}

function hashField(value) {
    // Simple hash for anonymization
    let hash = 0;
    const str = String(value);
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'anon_' + Math.abs(hash).toString(16);
}

// Privacy compliance checker
export const PrivacyCompliance = {
    // Korean education privacy laws
    regulations: {
        PIPA: 'Personal Information Protection Act',
        SPIPA: 'Special Act on Student Personal Information',
        FERPA_KR: 'Educational Records Privacy Guidelines'
    },
    
    // Check data handling compliance
    checkCompliance: function(dataType, operation) {
        const rules = {
            student_name: { collect: 'consent', store: 'encrypted', share: 'prohibited' },
            student_grade: { collect: 'consent', store: 'encrypted', share: 'guardian_only' },
            contact_info: { collect: 'consent', store: 'encrypted', share: 'prohibited' },
            academic_record: { collect: 'consent', store: 'encrypted', share: 'guardian_only' },
            behavior_log: { collect: 'notice', store: 'encrypted', share: 'internal_only' }
        };
        
        const rule = rules[dataType];
        if (!rule) {
            return { compliant: true, note: 'No specific regulation' };
        }
        
        return {
            compliant: true,
            requirement: rule[operation],
            dataType,
            operation,
            regulations: Object.keys(this.regulations)
        };
    },
    
    // Generate privacy notice
    generatePrivacyNotice: function(dataTypes) {
        return {
            title: '개인정보 수집 및 이용 동의',
            collector: 'AUTUS Education',
            purpose: '학습 관리 및 분석 서비스 제공',
            items: dataTypes,
            retention: '서비스 이용 기간 + 1년',
            rights: [
                '열람 요구권',
                '정정 요구권',
                '삭제 요구권',
                '처리정지 요구권'
            ],
            contact: 'privacy@autus.edu'
        };
    },
    
    // Audit log
    auditLog: [],
    
    logAccess: function(userId, dataType, operation) {
        this.auditLog.push({
            timestamp: Date.now(),
            userId,
            dataType,
            operation,
            ip: 'local'
        });
    },
    
    getAuditLog: function(filters = {}) {
        let logs = this.auditLog;
        
        if (filters.userId) {
            logs = logs.filter(l => l.userId === filters.userId);
        }
        if (filters.dataType) {
            logs = logs.filter(l => l.dataType === filters.dataType);
        }
        if (filters.startDate) {
            logs = logs.filter(l => l.timestamp >= filters.startDate);
        }
        
        return logs;
    }
};

export default {
    encryptData,
    decryptData,
    anonymize,
    PrivacyCompliance
};




