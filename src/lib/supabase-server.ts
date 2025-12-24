import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Server-side client with auth for server components
export const createServerSupabase = () => createServerComponentClient({ cookies })

// Alias for API routes
export const createClient = createServerSupabase

