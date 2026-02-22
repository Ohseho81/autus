/**
 * ============================================================================
 * AUTUS 3 - Contract Loop (L3)
 *
 * Generate terms -> sign -> activate -> manage lifecycle
 *
 * Trigger:  New enrollment or contract expiry warning (30 days)
 * Close:    Contract activated (signature complete)
 * Escalate: churn.finalized (TERMINAL) on termination
 *
 * Contract versioning: never delete, only create new versions.
 * ============================================================================
 */

import { getSupabase } from '../../supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContractStatus =
  | 'pending_signature'
  | 'active'
  | 'expiring'
  | 'expired'
  | 'terminated';

export type TermCategory =
  | '기본정보'   // Basic info
  | '수업'       // Class / lessons
  | '수납'       // Payments / billing
  | '책임'       // Liability
  | '개인정보'   // Privacy / data protection
  | '분쟁';      // Disputes

export interface ContractTerm {
  order: number;
  category: TermCategory;
  title: string;
  content: string;
  is_required: boolean;
}

export interface Contract {
  id: string;
  student_id: string;
  parent_id: string;
  organization_id: string;
  version: number;
  status: ContractStatus;
  terms: ContractTerm[];
  start_date: string;
  end_date: string;
  signed_at: string | null;
  signed_by: string | null;
  signature_hash: string | null;
  signature_ip: string | null;
  terminated_at: string | null;
  termination_reason: string | null;
  created_at: string;
}

export interface ContractOptions {
  duration_months?: number;     // Default: 12
  custom_terms?: Partial<ContractTerm>[];
  start_date?: string;          // Default: today
}

export interface ExpiringContract {
  contract_id: string;
  student_id: string;
  parent_id: string;
  student_name: string;
  end_date: string;
  days_until_expiry: number;
}

export interface SignatureData {
  signedBy: string;
  ipAddress: string;
}

interface EventLedgerEntry {
  event_type: string;
  event_category: string;
  entity_id: string;
  entity_type: string;
  state_from: string | null;
  state_to: string;
  payload: Record<string, unknown>;
  actor_type: 'system';
  source: 'autus_loop';
  occurred_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default contract duration in months */
const DEFAULT_DURATION_MONTHS = 12;

/** Days before expiry to trigger a warning */
const EXPIRY_WARNING_DAYS = 30;

/** Number of auto-generated terms */
const TOTAL_TERM_COUNT = 30;

/** Terms per category (balanced distribution) */
const TERMS_PER_CATEGORY = 5;

// ---------------------------------------------------------------------------
// ContractLoop
// ---------------------------------------------------------------------------

export class ContractLoop {
  // -------------------------------------------------------------------------
  // Public: create a new contract
  // -------------------------------------------------------------------------

  /**
   * Create a new contract with auto-generated terms.
   *
   * 1. Fetch student and parent data
   * 2. Determine the next version number
   * 3. Generate 30 contract terms across 6 categories
   * 4. Persist contract with status pending_signature
   * 5. Notify parent for signing
   * 6. Log event
   */
  async createContract(
    studentId: string,
    parentId: string,
    options?: ContractOptions,
  ): Promise<Contract> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase client unavailable');
      }

      // 1. Fetch student + parent + org data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, name, organization_id, current_class_id, enrolled_at')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        throw new Error(`Student not found: ${studentId}`);
      }

      const { data: parent, error: parentError } = await supabase
        .from('parents')
        .select('id, name, phone, email')
        .eq('id', parentId)
        .single();

      if (parentError || !parent) {
        throw new Error(`Parent not found: ${parentId}`);
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, settings')
        .eq('id', student.organization_id)
        .single();

      // 2. Determine next version
      const nextVersion = await this.getNextVersion(studentId);

      // 3. Generate terms
      const terms = this.generateTerms(
        { ...student, org_name: org?.name ?? '' },
        parent,
      );

      // Merge any custom terms from options
      if (options?.custom_terms) {
        for (const custom of options.custom_terms) {
          if (custom.order !== undefined && custom.order < terms.length) {
            terms[custom.order] = { ...terms[custom.order], ...custom };
          }
        }
      }

      // 4. Calculate dates
      const durationMonths = options?.duration_months ?? DEFAULT_DURATION_MONTHS;
      const startDate = options?.start_date ?? new Date().toISOString().split('T')[0];
      const endDate = this.addMonths(startDate, durationMonths);

      // 5. Insert contract
      const { data: contract, error: insertError } = await supabase
        .from('contracts')
        .insert({
          student_id: studentId,
          parent_id: parentId,
          organization_id: student.organization_id,
          version: nextVersion,
          status: 'pending_signature' as ContractStatus,
          terms,
          start_date: startDate,
          end_date: endDate,
          signed_at: null,
          signed_by: null,
          signature_hash: null,
          signature_ip: null,
          terminated_at: null,
          termination_reason: null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError || !contract) {
        throw new Error(`Failed to create contract: ${insertError?.message}`);
      }

      // 6. Notify parent for signing
      await this.notifyForSignature(contract.id, parentId, student.name);

      // 7. Log event
      await this.logEvent({
        event_type: 'contract.created',
        event_category: 'contract',
        entity_id: contract.id,
        entity_type: 'contract',
        state_from: null,
        state_to: 'pending_signature',
        payload: {
          student_id: studentId,
          parent_id: parentId,
          version: nextVersion,
          duration_months: durationMonths,
          term_count: terms.length,
          loop: 'L3_contract',
        },
        actor_type: 'system',
        source: 'autus_loop',
        occurred_at: new Date().toISOString(),
      });

      return contract as Contract;
    } catch (error) {
      console.error('[ContractLoop] createContract failed:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Public: process electronic signature
  // -------------------------------------------------------------------------

  /**
   * Process an electronic signature for a pending contract.
   *
   * 1. Validate contract is pending_signature
   * 2. Generate signature hash (SHA-256 of signedBy + timestamp + IP)
   * 3. Update contract to active
   * 4. Log event
   */
  async processSignature(contractId: string, signatureData: SignatureData): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // 1. Fetch contract
      const { data: contract, error } = await supabase
        .from('contracts')
        .select('id, student_id, parent_id, status, version')
        .eq('id', contractId)
        .single();

      if (error || !contract) {
        throw new Error(`Contract not found: ${contractId}`);
      }

      if (contract.status !== 'pending_signature') {
        throw new Error(`Contract ${contractId} is not pending signature (current: ${contract.status})`);
      }

      // 2. Generate signature hash
      const signedAt = new Date().toISOString();
      const signatureHash = await this.generateSignatureHash(
        signatureData.signedBy,
        signedAt,
        signatureData.ipAddress,
      );

      // 3. Activate contract
      await supabase
        .from('contracts')
        .update({
          status: 'active' as ContractStatus,
          signed_at: signedAt,
          signed_by: signatureData.signedBy,
          signature_hash: signatureHash,
          signature_ip: signatureData.ipAddress,
        })
        .eq('id', contractId);

      // 4. Log event
      await this.logEvent({
        event_type: 'contract.signed',
        event_category: 'contract',
        entity_id: contractId,
        entity_type: 'contract',
        state_from: 'pending_signature',
        state_to: 'active',
        payload: {
          student_id: contract.student_id,
          parent_id: contract.parent_id,
          signed_by: signatureData.signedBy,
          signature_hash: signatureHash,
          ip_address: signatureData.ipAddress,
          version: contract.version,
          loop: 'L3_contract',
        },
        actor_type: 'system',
        source: 'autus_loop',
        occurred_at: signedAt,
      });
    } catch (error) {
      console.error('[ContractLoop] processSignature failed:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Public: check expiring contracts
  // -------------------------------------------------------------------------

  /**
   * Find active contracts expiring within the warning window (30 days).
   * Updates their status to 'expiring' and triggers renewal_loop.
   */
  async checkExpiringContracts(): Promise<ExpiringContract[]> {
    try {
      const supabase = getSupabase();
      if (!supabase) return [];

      const now = new Date();
      const warningDate = new Date(now);
      warningDate.setDate(warningDate.getDate() + EXPIRY_WARNING_DAYS);

      // Fetch active contracts expiring within the window
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('id, student_id, parent_id, end_date, status')
        .eq('status', 'active')
        .lte('end_date', warningDate.toISOString().split('T')[0])
        .gte('end_date', now.toISOString().split('T')[0]);

      if (error || !contracts || contracts.length === 0) return [];

      const expiringList: ExpiringContract[] = [];

      for (const c of contracts) {
        // Update status to expiring
        await supabase
          .from('contracts')
          .update({ status: 'expiring' as ContractStatus })
          .eq('id', c.id);

        // Fetch student name
        const { data: student } = await supabase
          .from('students')
          .select('name')
          .eq('id', c.student_id)
          .single();

        const daysUntilExpiry = Math.ceil(
          (new Date(c.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        expiringList.push({
          contract_id: c.id,
          student_id: c.student_id,
          parent_id: c.parent_id,
          student_name: student?.name ?? 'Unknown',
          end_date: c.end_date,
          days_until_expiry: daysUntilExpiry,
        });

        // Log expiring event and trigger renewal_loop
        await this.logEvent({
          event_type: 'contract.expiring',
          event_category: 'contract',
          entity_id: c.id,
          entity_type: 'contract',
          state_from: 'active',
          state_to: 'expiring',
          payload: {
            student_id: c.student_id,
            parent_id: c.parent_id,
            end_date: c.end_date,
            days_until_expiry: daysUntilExpiry,
            trigger: 'renewal_loop',
            loop: 'L3_contract',
          },
          actor_type: 'system',
          source: 'autus_loop',
          occurred_at: new Date().toISOString(),
        });

        // Notify parent about expiring contract
        await this.notifyExpiring(c.id, c.parent_id, student?.name ?? 'Unknown', daysUntilExpiry);
      }

      return expiringList;
    } catch (error) {
      console.error('[ContractLoop] checkExpiringContracts failed:', error);
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Public: terminate contract
  // -------------------------------------------------------------------------

  /**
   * Terminate a contract and initiate the refund flow.
   *
   * Records a TERMINAL churn.finalized event.
   * Never deletes the contract -- only marks it terminated (versioning rule).
   */
  async terminateContract(contractId: string, reason: string): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Fetch contract
      const { data: contract, error } = await supabase
        .from('contracts')
        .select('id, student_id, parent_id, status, version, start_date, end_date')
        .eq('id', contractId)
        .single();

      if (error || !contract) {
        throw new Error(`Contract not found: ${contractId}`);
      }

      if (contract.status === 'terminated') {
        throw new Error(`Contract ${contractId} is already terminated`);
      }

      const previousStatus = contract.status;
      const terminatedAt = new Date().toISOString();

      // Update contract status (never delete)
      await supabase
        .from('contracts')
        .update({
          status: 'terminated' as ContractStatus,
          terminated_at: terminatedAt,
          termination_reason: reason,
        })
        .eq('id', contractId);

      // Calculate remaining period for potential refund
      const now = new Date();
      const endDate = new Date(contract.end_date);
      const remainingDays = Math.max(
        0,
        Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      );

      // Queue refund event if there is remaining time
      if (remainingDays > 0) {
        await supabase.from('events').insert({
          event_type: 'refund.requested',
          event_category: 'contract',
          entity_id: contractId,
          entity_type: 'contract',
          state_from: previousStatus,
          state_to: 'refund_pending',
          payload: {
            student_id: contract.student_id,
            parent_id: contract.parent_id,
            remaining_days: remainingDays,
            reason,
            loop: 'L3_contract',
          },
          actor_type: 'system',
          source: 'autus_loop',
          occurred_at: terminatedAt,
        });
      }

      // TERMINAL event: churn.finalized
      await this.logEvent({
        event_type: 'churn.finalized',
        event_category: 'contract',
        entity_id: contract.student_id,
        entity_type: 'student',
        state_from: previousStatus,
        state_to: 'terminated',
        payload: {
          contract_id: contractId,
          parent_id: contract.parent_id,
          version: contract.version,
          reason,
          remaining_days: remainingDays,
          tier: 'TERMINAL',
          loop: 'L3_contract',
        },
        actor_type: 'system',
        source: 'autus_loop',
        occurred_at: terminatedAt,
      });
    } catch (error) {
      console.error('[ContractLoop] terminateContract failed:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Public: expire contracts past their end date
  // -------------------------------------------------------------------------

  /**
   * Mark contracts past their end_date as expired.
   * Called by a daily scheduler.
   */
  async expireContracts(): Promise<number> {
    try {
      const supabase = getSupabase();
      if (!supabase) return 0;

      const today = new Date().toISOString().split('T')[0];

      const { data: expired, error } = await supabase
        .from('contracts')
        .select('id, student_id, parent_id')
        .in('status', ['active', 'expiring'])
        .lt('end_date', today);

      if (error || !expired) return 0;

      for (const c of expired) {
        await supabase
          .from('contracts')
          .update({ status: 'expired' as ContractStatus })
          .eq('id', c.id);

        await this.logEvent({
          event_type: 'contract.expired',
          event_category: 'contract',
          entity_id: c.id,
          entity_type: 'contract',
          state_from: 'active',
          state_to: 'expired',
          payload: {
            student_id: c.student_id,
            parent_id: c.parent_id,
            loop: 'L3_contract',
          },
          actor_type: 'system',
          source: 'autus_loop',
          occurred_at: new Date().toISOString(),
        });
      }

      return expired.length;
    } catch (error) {
      console.error('[ContractLoop] expireContracts failed:', error);
      return 0;
    }
  }

  // -------------------------------------------------------------------------
  // Private: generate 30 contract terms across 6 categories
  // -------------------------------------------------------------------------

  /**
   * Auto-generate 30 contract terms based on student/parent data.
   * 6 categories x 5 terms each = 30 terms.
   */
  private generateTerms(
    studentData: { name: string; organization_id: string; org_name: string },
    parentData: { name: string; phone: string; email: string },
  ): ContractTerm[] {
    const terms: ContractTerm[] = [];
    let order = 1;

    const orgName = studentData.org_name || '학원';
    const studentName = studentData.name;
    const parentName = parentData.name;

    // -- Category 1: 기본정보 (Basic Information) --
    const basicInfoTerms: Omit<ContractTerm, 'order'>[] = [
      { category: '기본정보', title: '계약 당사자', content: `본 계약은 ${orgName}(이하 "학원")과 ${parentName}(이하 "보호자") 사이에 체결됩니다.`, is_required: true },
      { category: '기본정보', title: '수강생 정보', content: `수강생: ${studentName}. 보호자는 수강생의 법정 대리인임을 확인합니다.`, is_required: true },
      { category: '기본정보', title: '계약 목적', content: '본 계약은 학원의 교육 서비스 제공과 보호자의 수강료 납부에 관한 사항을 정합니다.', is_required: true },
      { category: '기본정보', title: '계약 효력', content: '본 계약은 양 당사자의 전자 서명 시점부터 효력이 발생합니다.', is_required: true },
      { category: '기본정보', title: '연락처 정보', content: `보호자 연락처: ${parentData.phone}. 변경 시 즉시 학원에 통보하여야 합니다.`, is_required: true },
    ];

    // -- Category 2: 수업 (Classes) --
    const classTerms: Omit<ContractTerm, 'order'>[] = [
      { category: '수업', title: '수업 일정', content: '수업 일정은 학원이 정한 시간표에 따르며, 변경 시 최소 7일 전에 통보합니다.', is_required: true },
      { category: '수업', title: '출결 관리', content: '출석은 QR 코드 스캔으로 기록되며, 수업 시작 15분 경과 시 지각 처리됩니다.', is_required: true },
      { category: '수업', title: '결석 처리', content: '사전 연락 없는 결석은 무단결석으로 처리되며, 3회 연속 무단결석 시 상담이 진행됩니다.', is_required: true },
      { category: '수업', title: '보충 수업', content: '사전 통보된 결석에 한해 보충 수업을 제공하며, 가능 여부는 학원 사정에 따릅니다.', is_required: false },
      { category: '수업', title: '수업 내용', content: '수업 커리큘럼은 학원이 결정하며, 수강생의 수준과 진도에 맞게 조정될 수 있습니다.', is_required: true },
    ];

    // -- Category 3: 수납 (Payments) --
    const paymentTerms: Omit<ContractTerm, 'order'>[] = [
      { category: '수납', title: '수강료 납부', content: '수강료는 매월 말일까지 납부하여야 하며, 자동결제 등록을 권장합니다.', is_required: true },
      { category: '수납', title: '수강료 산정', content: '수강료는 월별 수강 횟수에 따라 산정되며, 월 8회 이상 수강 시 10% 할인이 적용됩니다.', is_required: true },
      { category: '수납', title: '연체 처리', content: '납부 기한 경과 시 독촉 안내가 발송되며, 장기 미납 시 수강이 제한될 수 있습니다.', is_required: true },
      { category: '수납', title: '환불 규정', content: '중도 해지 시 학원의 설립, 운영 및 과외교습에 관한 법률에 따라 환불합니다.', is_required: true },
      { category: '수납', title: '결제 수단', content: '카드 자동결제, 계좌이체 등 학원이 지정한 결제 수단을 이용할 수 있습니다.', is_required: false },
    ];

    // -- Category 4: 책임 (Liability) --
    const liabilityTerms: Omit<ContractTerm, 'order'>[] = [
      { category: '책임', title: '안전 관리', content: '학원은 수업 시간 중 수강생의 안전을 위해 합리적인 주의 의무를 다합니다.', is_required: true },
      { category: '책임', title: '사고 대응', content: '수업 중 사고 발생 시 학원은 즉시 보호자에게 통보하고 필요한 응급 조치를 취합니다.', is_required: true },
      { category: '책임', title: '시설물 관리', content: '수강생의 고의 또는 과실로 학원 시설물이 훼손된 경우 보호자가 배상 책임을 집니다.', is_required: true },
      { category: '책임', title: '보험', content: '학원은 교육 활동 중 발생할 수 있는 사고에 대비하여 배상책임보험에 가입합니다.', is_required: false },
      { category: '책임', title: '면책 사항', content: '천재지변, 감염병 등 불가항력적 사유로 인한 휴원 시 학원은 책임을 지지 않습니다.', is_required: true },
    ];

    // -- Category 5: 개인정보 (Privacy) --
    const privacyTerms: Omit<ContractTerm, 'order'>[] = [
      { category: '개인정보', title: '개인정보 수집', content: '학원은 교육 서비스 제공을 위해 수강생 및 보호자의 개인정보를 수집합니다.', is_required: true },
      { category: '개인정보', title: '수집 항목', content: '수집 항목: 성명, 연락처, 이메일, 출결 기록, 학습 진도 등 교육에 필요한 정보.', is_required: true },
      { category: '개인정보', title: '이용 목적', content: '수집된 개인정보는 교육 관리, 출결 관리, 수납 처리, 보호자 연락 목적으로만 사용됩니다.', is_required: true },
      { category: '개인정보', title: '보유 기간', content: '개인정보는 계약 종료 후 5년간 보관하며, 이후 안전하게 파기합니다.', is_required: true },
      { category: '개인정보', title: '제3자 제공', content: '보호자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 법령에 의한 경우는 예외입니다.', is_required: true },
    ];

    // -- Category 6: 분쟁 (Disputes) --
    const disputeTerms: Omit<ContractTerm, 'order'>[] = [
      { category: '분쟁', title: '분쟁 해결', content: '본 계약과 관련된 분쟁은 당사자 간 협의로 해결하는 것을 원칙으로 합니다.', is_required: true },
      { category: '분쟁', title: '관할 법원', content: '협의로 해결되지 않는 경우 학원 소재지 관할 법원에서 해결합니다.', is_required: true },
      { category: '분쟁', title: '계약 해지', content: '일방 당사자가 중대한 의무를 위반한 경우 상대방은 서면 통지로 계약을 해지할 수 있습니다.', is_required: true },
      { category: '분쟁', title: '계약 변경', content: '본 계약의 변경은 양 당사자의 서면 합의에 의해서만 가능합니다.', is_required: true },
      { category: '분쟁', title: '기타', content: '본 계약에 명시되지 않은 사항은 관련 법령 및 일반 관례에 따릅니다.', is_required: true },
    ];

    // Assemble all categories
    const allCategories = [
      basicInfoTerms,
      classTerms,
      paymentTerms,
      liabilityTerms,
      privacyTerms,
      disputeTerms,
    ];

    for (const categoryTerms of allCategories) {
      for (const term of categoryTerms) {
        terms.push({ ...term, order });
        order++;
      }
    }

    return terms;
  }

  // -------------------------------------------------------------------------
  // Private: get next version number for a student's contracts
  // -------------------------------------------------------------------------

  private async getNextVersion(studentId: string): Promise<number> {
    try {
      const supabase = getSupabase();
      if (!supabase) return 1;

      const { data, error } = await supabase
        .from('contracts')
        .select('version')
        .eq('student_id', studentId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return 1;

      return (data.version as number) + 1;
    } catch {
      return 1;
    }
  }

  // -------------------------------------------------------------------------
  // Private: generate signature hash
  // -------------------------------------------------------------------------

  /**
   * Create a SHA-256 hash from signedBy + timestamp + IP.
   * Uses the Web Crypto API (available in browsers and Deno/Edge).
   */
  private async generateSignatureHash(
    signedBy: string,
    timestamp: string,
    ipAddress: string,
  ): Promise<string> {
    const payload = `${signedBy}|${timestamp}|${ipAddress}`;

    try {
      // Use Web Crypto API (works in browser / edge runtime)
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback: simple hash for environments without Web Crypto
      let hash = 0;
      for (let i = 0; i < payload.length; i++) {
        const char = payload.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return `fallback-${Math.abs(hash).toString(16)}-${Date.now().toString(16)}`;
    }
  }

  // -------------------------------------------------------------------------
  // Private: notify parent for signature
  // -------------------------------------------------------------------------

  private async notifyForSignature(
    contractId: string,
    parentId: string,
    studentName: string,
  ): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      await supabase.from('events').insert({
        event_type: 'notification.queued',
        event_category: 'contract',
        entity_id: parentId,
        entity_type: 'parent',
        state_from: null,
        state_to: 'pending',
        payload: {
          type: 'contract_signature_request',
          contract_id: contractId,
          student_name: studentName,
          channel: 'kakao_alimtalk',
          message: `[계약서 서명 요청] ${studentName} 학생의 수강 계약서가 생성되었습니다. 전자 서명을 진행해 주세요.`,
        },
        actor_type: 'system',
        source: 'autus_loop',
        occurred_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ContractLoop] notifyForSignature failed:', error);
    }
  }

  // -------------------------------------------------------------------------
  // Private: notify parent about expiring contract
  // -------------------------------------------------------------------------

  private async notifyExpiring(
    contractId: string,
    parentId: string,
    studentName: string,
    daysUntilExpiry: number,
  ): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      await supabase.from('events').insert({
        event_type: 'notification.queued',
        event_category: 'contract',
        entity_id: parentId,
        entity_type: 'parent',
        state_from: null,
        state_to: 'pending',
        payload: {
          type: 'contract_expiring',
          contract_id: contractId,
          student_name: studentName,
          days_until_expiry: daysUntilExpiry,
          channel: 'kakao_alimtalk',
          message: `[계약 만료 안내] ${studentName} 학생의 수강 계약이 ${daysUntilExpiry}일 후 만료됩니다. 재등록을 원하시면 학원으로 연락해 주세요.`,
        },
        actor_type: 'system',
        source: 'autus_loop',
        occurred_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ContractLoop] notifyExpiring failed:', error);
    }
  }

  // -------------------------------------------------------------------------
  // Private: date utility
  // -------------------------------------------------------------------------

  private addMonths(dateStr: string, months: number): string {
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  }

  // -------------------------------------------------------------------------
  // Private: log event to ledger (append-only)
  // -------------------------------------------------------------------------

  private async logEvent(entry: EventLedgerEntry): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error } = await supabase.from('events').insert(entry);

      if (error) {
        console.error('[ContractLoop] logEvent insert failed:', error.message);
      }
    } catch (error) {
      console.error('[ContractLoop] logEvent failed:', error);
    }
  }
}
