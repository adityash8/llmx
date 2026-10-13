import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as supabaseClient } from '@supabase/supabase-js'
import { ApiError } from './api'

export async function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new ApiError('Private projects require Supabase configuration. Anonymous export still works.',503)
  const jar = await cookies()
  return createServerClient(url,key,{cookies:{getAll:()=>jar.getAll(),setAll:values=>values.forEach(v=>jar.set(v.name,v.value,v.options))}})
}
export const createClient = createServerSupabase
export async function identity() {
  const client = await createServerSupabase()
  const {data:{user},error} = await client.auth.getUser()
  if(error||!user) throw new ApiError('Sign in to use private projects.',401)
  return {client,user}
}
export function adminClient() {
  const url=process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!key) throw new ApiError('Server integration storage is not configured.',503)
  return supabaseClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
}
