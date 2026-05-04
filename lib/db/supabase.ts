import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY!;

let _admin: SupabaseClient | null = null;
let _public: SupabaseClient | null = null;

export function adminDb(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(SUPABASE_URL, SUPABASE_SECRET, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' },
    });
  }
  return _admin;
}

export function publicDb(): SupabaseClient {
  if (!_public) {
    _public = createClient(SUPABASE_URL, SUPABASE_PUB, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _public;
}
