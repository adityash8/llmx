import { NextRequest,NextResponse } from 'next/server'
import { createHash,randomBytes } from 'node:crypto'
import { identity,adminClient } from '@/lib/supabase-server'
import { failure,ApiError } from '@/lib/api'
export async function GET(request:NextRequest){try{
 const{user}=await identity();const id=process.env.GITHUB_CLIENT_ID;const app=process.env.LLMX_APP_URL
 if(!id||!process.env.GITHUB_CLIENT_SECRET||!app||!process.env.LLMX_TOKEN_ENCRYPTION_KEY)throw new ApiError('GitHub OAuth is not configured. Download your file instead.',503)
 const state=randomBytes(32).toString('hex');const{error}=await adminClient().from('llmx_oauth_states').insert({state_hash:createHash('sha256').update(state).digest('hex'),user_id:user.id,expires_at:new Date(Date.now()+600_000).toISOString()});if(error)throw new ApiError('OAuth state could not be saved',503)
 const url=new URL('https://github.com/login/oauth/authorize');url.searchParams.set('client_id',id);url.searchParams.set('redirect_uri',`${app}/api/github/callback`);url.searchParams.set('state',state);url.searchParams.set('scope','repo')
 const response=NextResponse.redirect(url);response.cookies.set('llmx_oauth',state,{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/',maxAge:600});return response
}catch(error){return failure(error)}}
