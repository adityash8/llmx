import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@/types'
let browserClient: ReturnType<typeof createBrowserClient> | undefined
export function createClientSupabase() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if(!url||!key) throw new Error('Sign-in is not configured. You can generate and download without an account.')
  browserClient ??= createBrowserClient(url,key)
  return browserClient
}
export async function signUp(email:string,password:string,name?:string) {
  const {data,error}=await createClientSupabase().auth.signUp({email,password,options:{data:{name}}})
  if(error) throw new Error(error.message)
  return data
}
export async function signIn(email:string,password:string) {const {data,error}=await createClientSupabase().auth.signInWithPassword({email,password});if(error)throw new Error(error.message);return data}
export async function signOut(){const{error}=await createClientSupabase().auth.signOut();if(error)throw new Error(error.message)}
export async function getCurrentUser():Promise<User|null> {
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)return null
  const {data:{user},error}=await createClientSupabase().auth.getUser();if(error||!user)return null
  return {id:user.id,email:user.email||'',name:user.user_metadata?.name,plan:'free',projects:[],usage:{id:user.id,userId:user.id,generationsThisMonth:0,totalGenerations:0,lastGenerationDate:new Date(),lastResetDate:new Date()}}
}
export async function getUser(userId:string){const user=await getCurrentUser();return user?.id===userId?user:null}
export async function getUserProjects(_userId:string){const response=await fetch('/api/projects');const data=await response.json();if(!response.ok)throw new Error(data.error);return data.projects}
export async function deleteProject(projectId:string){const response=await fetch(`/api/projects/${encodeURIComponent(projectId)}`,{method:'DELETE'});if(!response.ok)throw new Error('Project deletion failed')}
