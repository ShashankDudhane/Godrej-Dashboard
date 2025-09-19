import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase' // optional if you generated types

export const supabase = createClientComponentClient<Database>()
