import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton — one browser client for the whole app.
// Multiple Supabase client instances sharing the same cookie storage race on
// token refresh and can return empty RLS responses without throwing errors,
// making data silently disappear. A singleton prevents this entirely.
let _client: SupabaseClient<Database> | null = null

export function createClient(): SupabaseClient<Database> {
  if (_client) return _client
  _client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ) as unknown as SupabaseClient<Database>
  return _client
}
