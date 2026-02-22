import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { GoalTargetType, GoalChangeRecord } from './types';
import { enqueueMessage } from './outbound-worker';

export async function recordGoalChange(
  org_id: string,
  student_id: string,
  target_type: GoalTargetType,
  from_text: string,
  to_text: string,
  reason_code: string,
  decided_by_role: string,
  decided_by_id: string,
  effective_from?: string
): Promise<string> {
  logger.info('Recording goal change', {
    org_id,
    student_id,
    target_type,
    reason_code
  });

  const client = getSupabaseAdmin();

  try {
    // Insert goal change record
    const { data: result, error: insertError } = await client
      .from('goal_change_log')
      .insert({
        org_id,
        student_id,
        target_type,
        from_text,
        to_text,
        reason_code,
        decided_by_role,
        decided_by_id,
        effective_from: effective_from || new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select('id');

    if (insertError) throw insertError;
    if (!result || result.length === 0) throw new Error('No result returned');

    const goal_change_id = result[0].id;
    logger.info('Goal change recorded', { goal_change_id, student_id, target_type });

    // If DESTINATION, notify parent
    if (target_type === 'DESTINATION') {
      const { data: parentData, error: parentError } = await client
        .from('users')
        .select('id, phone, name')
        .eq('org_id', org_id)
        .eq('student_id', student_id)
        .eq('role', 'PARENT')
        .limit(1);

      if (parentError) throw parentError;

      if (parentData && parentData.length > 0) {
        const parent = parentData[0];
        await enqueueMessage(
          org_id,
          'PARENT',
          parent.id as string,
          parent.phone as string,
          'GOAL_CHANGE_NOTIFICATION',
          {
            student_id,
            target_type,
            from_text,
            to_text,
            student_name: parent.name
          },
          'HIGH'
        );
        logger.info('Parent notified of goal change', { parent_id: parent.id, student_id });
      }
    }

    return goal_change_id;
  } catch (error) {
    logger.error('Failed to record goal change', error instanceof Error ? error : new Error(String(error)), {
      org_id,
      student_id,
      target_type
    });
    throw error;
  }
}

export async function getGoalHistory(
  org_id: string,
  student_id: string,
  target_type?: GoalTargetType,
  limit: number = 10
): Promise<GoalChangeRecord[]> {
  logger.info('Fetching goal history', {
    org_id,
    student_id,
    target_type,
    limit
  });

  const client = getSupabaseAdmin();

  try {
    let query = client
      .from('goal_change_log')
      .select('*')
      .eq('org_id', org_id)
      .eq('student_id', student_id);

    if (target_type) {
      query = query.eq('target_type', target_type);
    }

    const { data: result, error } = await query
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    logger.info('Goal history retrieved', { student_id, count: result?.length || 0 });
    return (result || []) as GoalChangeRecord[];
  } catch (error) {
    logger.error('Failed to get goal history', error instanceof Error ? error : new Error(String(error)), {
      org_id,
      student_id,
      target_type
    });
    throw error;
  }
}
