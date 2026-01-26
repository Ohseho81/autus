/**
 * KRATON API 서비스 레이어
 * 
 * Supabase 연동 + Mock 폴백
 * 모든 데이터 CRUD 처리
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';

// ============================================
// 기본 API 유틸리티
// ============================================
async function apiCall(table, operation, params = {}) {
  if (!supabase) {
    console.warn(`[API] Mock 모드: ${table}.${operation}`);
    return { data: null, error: 'Mock mode' };
  }

  try {
    let query = supabase.from(table);

    switch (operation) {
      case 'select':
        query = query.select(params.columns || '*');
        if (params.filters) {
          Object.entries(params.filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }
        if (params.order) {
          query = query.order(params.order.column, { ascending: params.order.ascending ?? false });
        }
        if (params.limit) {
          query = query.limit(params.limit);
        }
        break;

      case 'insert':
        query = query.insert(params.data).select();
        break;

      case 'update':
        query = query.update(params.data).eq('id', params.id).select();
        break;

      case 'delete':
        query = query.delete().eq('id', params.id);
        break;

      case 'upsert':
        query = query.upsert(params.data).select();
        break;
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error(`[API] ${table}.${operation} 실패:`, err);
    return { data: null, error: err.message };
  }
}

// ============================================
// Students API
// ============================================
export const studentsApi = {
  // 전체 학생 목록
  async getAll(filters = {}) {
    return apiCall('students', 'select', {
      columns: '*, classes(name)',
      filters,
      order: { column: 'created_at', ascending: false },
    });
  },

  // 단일 학생 조회
  async getById(id) {
    const { data, error } = await apiCall('students', 'select', {
      columns: '*, classes(name), attendance(*), grades(*)',
      filters: { id },
    });
    return { data: data?.[0] || null, error };
  },

  // 학생 생성
  async create(studentData) {
    return apiCall('students', 'insert', { data: studentData });
  },

  // 학생 수정
  async update(id, updates) {
    return apiCall('students', 'update', { id, data: updates });
  },

  // 학생 삭제
  async delete(id) {
    return apiCall('students', 'delete', { id });
  },

  // State별 학생 조회
  async getByState(state) {
    return apiCall('students', 'select', {
      filters: { state },
      order: { column: 'updated_at', ascending: false },
    });
  },

  // 위험 학생 목록 (State 5+)
  async getRiskStudents() {
    if (!supabase) return { data: [], error: 'Mock mode' };
    
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .gte('state', 5)
      .order('state', { ascending: false });
    
    return { data, error };
  },
};

// ============================================
// Members API (교직원)
// ============================================
export const membersApi = {
  async getAll(role = null) {
    const filters = role ? { role } : {};
    return apiCall('members', 'select', { filters });
  },

  async getById(id) {
    const { data, error } = await apiCall('members', 'select', {
      filters: { id },
    });
    return { data: data?.[0] || null, error };
  },

  async create(memberData) {
    return apiCall('members', 'insert', { data: memberData });
  },

  async update(id, updates) {
    return apiCall('members', 'update', { id, data: updates });
  },
};

// ============================================
// Activities API (활동 로그)
// ============================================
export const activitiesApi = {
  async getRecent(limit = 10) {
    return apiCall('activities', 'select', {
      columns: '*, students(name)',
      order: { column: 'created_at', ascending: false },
      limit,
    });
  },

  async create(activityData) {
    return apiCall('activities', 'insert', { data: activityData });
  },

  async getByStudent(studentId, limit = 20) {
    return apiCall('activities', 'select', {
      filters: { student_id: studentId },
      order: { column: 'created_at', ascending: false },
      limit,
    });
  },
};

// ============================================
// Risks API (위험 큐)
// ============================================
export const risksApi = {
  async getActive() {
    if (!supabase) return { data: [], error: 'Mock mode' };
    
    const { data, error } = await supabase
      .from('risks')
      .select('*, students(name, state)')
      .eq('status', 'active')
      .order('priority', { ascending: false });
    
    return { data, error };
  },

  async create(riskData) {
    return apiCall('risks', 'insert', { data: riskData });
  },

  async resolve(id, resolution) {
    return apiCall('risks', 'update', {
      id,
      data: { status: 'resolved', resolution, resolved_at: new Date().toISOString() },
    });
  },
};

// ============================================
// Solutions API (합의 솔루션)
// ============================================
export const solutionsApi = {
  async getAll(status = null) {
    const filters = status ? { status } : {};
    return apiCall('solutions', 'select', {
      filters,
      order: { column: 'usage_count', ascending: false },
    });
  },

  async incrementUsage(id) {
    if (!supabase) return { error: 'Mock mode' };
    
    const { data, error } = await supabase.rpc('increment_solution_usage', { solution_id: id });
    return { data, error };
  },

  async standardize(id) {
    return apiCall('solutions', 'update', {
      id,
      data: { status: 'standardized', standardized_at: new Date().toISOString() },
    });
  },
};

// ============================================
// Stats API (통계)
// ============================================
export const statsApi = {
  async getDashboard() {
    if (!supabase) {
      // Mock 데이터 반환
      return {
        data: {
          totalStudents: 156,
          vIndex: 847.3,
          automationRate: 78.5,
          riskCount: 6,
          stateDistribution: { 1: 45, 2: 68, 3: 25, 4: 12, 5: 4, 6: 2 },
        },
        error: null,
      };
    }

    try {
      // 여러 통계를 병렬로 조회
      const [studentsRes, risksRes] = await Promise.all([
        supabase.from('students').select('state', { count: 'exact' }),
        supabase.from('risks').select('*', { count: 'exact' }).eq('status', 'active'),
      ]);

      const students = studentsRes.data || [];
      const stateDistribution = students.reduce((acc, s) => {
        acc[s.state] = (acc[s.state] || 0) + 1;
        return acc;
      }, {});

      return {
        data: {
          totalStudents: studentsRes.count || 0,
          riskCount: risksRes.count || 0,
          stateDistribution,
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: err.message };
    }
  },
};

// ============================================
// Export All
// ============================================
export const api = {
  students: studentsApi,
  members: membersApi,
  activities: activitiesApi,
  risks: risksApi,
  solutions: solutionsApi,
  stats: statsApi,
  isConfigured: isSupabaseConfigured,
};

export default api;
