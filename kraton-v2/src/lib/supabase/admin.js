import { createClient } from '@supabase/supabase-js';

export function supabaseAdmin() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.warn('Supabase credentials not found, using mock client');
    return null;
  }
  
  return createClient(url, key, { 
    auth: { persistSession: false } 
  });
}

export function supabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    return null;
  }
  
  return createClient(url, key);
}
