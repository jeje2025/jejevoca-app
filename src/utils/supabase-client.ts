import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

console.log('🔧 Supabase Client Config:', {
  url: supabaseUrl,
  hasKey: !!publicAnonKey,
  keyPreview: publicAnonKey?.substring(0, 20) + '...'
});

export const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
