// ============================================
// AUTUS Pilot Application API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};


export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET: List pilot applications
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({
      success: true,
      data: {
        total: 0,
        applications: [],
        message: 'Supabase not configured - returning empty list'
      }
    }, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();
    let query = getSupabaseAdmin()
      .from('pilot_academies')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pilots:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        total: data?.length || 0,
        applications: data || []
      }
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Pilot API GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Submit new pilot application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      academy_name,
      contact_name,
      contact_phone,
      contact_email,
      student_count,
      pain_points,
      message,
      source
    } = body;

    // Validation
    if (!academy_name || !contact_name || !contact_phone || !contact_email) {
      return NextResponse.json(
        { success: false, error: 'Required fields: academy_name, contact_name, contact_phone, contact_email' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse student count to number
    let studentCountNum = 100;
    if (student_count) {
      const match = student_count.match(/(\d+)/);
      if (match) {
        studentCountNum = parseInt(match[1]);
      }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Simulation mode
      return NextResponse.json({
        success: true,
        data: {
          id: crypto.randomUUID(),
          academy_name,
          contact_name,
          status: 'lead',
          message: 'Application recorded (Supabase not configured)',
          created_at: new Date().toISOString()
        }
      }, { status: 200, headers: corsHeaders });
    }

    
    // Insert pilot application
    const { data, error } = await getSupabaseAdmin()
      .from('pilot_academies')
      .insert({
        name: academy_name,
        contact_name,
        contact_phone,
        contact_email,
        student_count: studentCountNum,
        source: source || 'landing_page',
        status: 'lead',
        first_contact_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting pilot:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Send notification (via n8n webhook if configured)
    const n8nWebhook = process.env.N8N_PILOT_WEBHOOK_URL;
    if (n8nWebhook) {
      try {
        await fetch(n8nWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'new_pilot_application',
            data: {
              academy_name,
              contact_name,
              contact_phone,
              contact_email,
              student_count: studentCountNum,
              pain_points,
              message
            }
          })
        });
      } catch (e) {
        console.error('Failed to notify n8n:', e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        academy_name: data.name,
        status: data.status,
        message: '파일럿 신청이 완료되었습니다. 영업일 기준 1일 이내에 연락드리겠습니다.',
        created_at: data.created_at
      }
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('Pilot API POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
