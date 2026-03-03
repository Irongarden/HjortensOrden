import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

// Note: explicit return type is required because @supabase/ssr@0.4 returns
// SupabaseClient<DB, SchemaName, Schema> (3 args) but @supabase/supabase-js@2.98
// now has 5 type params, causing the Schema arg to land on the wrong position.
export function createClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ) as unknown as SupabaseClient<Database>
}
