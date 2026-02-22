import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ConsentType, ConsentRecord } from './types';

export async function grantConsent(
  org_id: string,
  parent_id: string,
  consent_type: ConsentType,
  consent_version: string,
  channel: string,
  student_id?: string
): Promise<string> {
  logger.info('Granting consent', {
    org_id,
    parent_id,
    consent_type,
    channel
  });

  const client = getSupabaseAdmin();

  try {
    // Deactivate old consents of the same type
    const { error: deactivateError } = await client
      .from('consent_records')
      .update({ is_active: false })
      .eq('org_id', org_id)
      .eq('parent_id', parent_id)
      .eq('consent_type', consent_type)
      .eq('is_active', true);

    if (deactivateError) throw deactivateError;

    // Insert new consent
    const { data: result, error: insertError } = await client
      .from('consent_records')
      .insert({
        org_id,
        parent_id,
        student_id: student_id || null,
        consent_type,
        consent_version,
        consented_at: new Date().toISOString(),
        channel,
        is_active: true
      })
      .select('id');

    if (insertError) throw insertError;
    if (!result || result.length === 0) throw new Error('No result returned');

    const consent_id = result[0].id;
    logger.info('Consent granted', { consent_id, org_id, parent_id, consent_type });
    return consent_id;
  } catch (error) {
    logger.error('Failed to grant consent', error instanceof Error ? error : new Error(String(error)), {
      org_id,
      parent_id,
      consent_type
    });
    throw error;
  }
}

export async function revokeConsent(
  org_id: string,
  parent_id: string,
  consent_type: ConsentType
): Promise<void> {
  logger.info('Revoking consent', {
    org_id,
    parent_id,
    consent_type
  });

  const client = getSupabaseAdmin();

  try {
    const { error } = await client
      .from('consent_records')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString()
      })
      .eq('org_id', org_id)
      .eq('parent_id', parent_id)
      .eq('consent_type', consent_type)
      .eq('is_active', true);

    if (error) throw error;
    logger.info('Consent revoked', { org_id, parent_id, consent_type });
  } catch (error) {
    logger.error('Failed to revoke consent', error instanceof Error ? error : new Error(String(error)), {
      org_id,
      parent_id,
      consent_type
    });
    throw error;
  }
}

export async function checkConsent(
  org_id: string,
  parent_id: string,
  consent_type: ConsentType
): Promise<ConsentRecord | null> {
  logger.info('Checking consent', {
    org_id,
    parent_id,
    consent_type
  });

  const client = getSupabaseAdmin();

  try {
    const { data: result, error } = await client
      .from('consent_records')
      .select('*')
      .eq('org_id', org_id)
      .eq('parent_id', parent_id)
      .eq('consent_type', consent_type)
      .eq('is_active', true)
      .order('consented_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!result || result.length === 0) {
      logger.info('No active consent found', { org_id, parent_id, consent_type });
      return null;
    }

    const consent = result[0] as ConsentRecord;
    logger.info('Consent found', {
      consent_id: consent.id,
      org_id,
      parent_id,
      consent_type
    });
    return consent;
  } catch (error) {
    logger.error('Failed to check consent', error instanceof Error ? error : new Error(String(error)), {
      org_id,
      parent_id,
      consent_type
    });
    throw error;
  }
}
