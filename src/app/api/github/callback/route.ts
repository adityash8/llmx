import { NextRequest,NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { identity,adminClient } from '@/lib/supabase-server'
import { encryptToken } from '@/lib/github'
export async function GET(request:NextRequest){const app=process.env.LLMX_APP_URL||request.nextUrl.origin;let success=false;try{
 const{user}=await identity();const state=request.nextUrl.searchParams.get('state');const code=request.nextUrl.searchParams.get('code')
 if(!state||!code||state!==request.cookies.get('llmx_oauth')?.value)throw new Error('State mismatch')
 const admin=adminClient();const{data,error}=await admin.from('llmx_oauth_states').delete().eq('state_hash',createHash('sha256').update(state).digest('hex')).eq('user_id',user.id).gt('expires_at',new Date().toISOString()).select().single();if(error||!data)throw new Error('Expired state')
 const response=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:process.env.GITHUB_CLIENT_ID,client_secret:process.env.GITHUB_CLIENT_SECRET,code,redirect_uri:`${app}/api/github/callback`}),signal:AbortSignal.timeout(10000),redirect:'error'})
 const token=await response.json();if(!response.ok||typeof token.access_token!=='string')throw new Error('Token exchange failed')
 const saved=await admin.from('llmx_github_tokens').upsert({user_id:user.id,encrypted_token:encryptToken(token.access_token)});if(saved.error)throw new Error('Token storage failed');success=true
}catch{/* OAuth errors contain secrets; never log them. */}
 const response=NextResponse.redirect(new URL(`/dashboard?github=${success?'connected':'failed'}`,app));response.cookies.delete('llmx_oauth');return response}
