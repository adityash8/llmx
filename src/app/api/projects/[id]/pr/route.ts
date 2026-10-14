import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'
import { body,failure,ApiError } from '@/lib/api'
import { ownedProject } from '@/lib/projects'
import { adminClient } from '@/lib/supabase-server'
import { decryptToken,createGithubPR,githubApi,consumeGithubQuota } from '@/lib/github'
const input=z.object({owner:z.string().regex(/^[\w-]{1,100}$/),repo:z.string().regex(/^[\w.-]{1,100}$/),path:z.enum(['llms.txt','public/llms.txt']).default('public/llms.txt')})
export async function GET(request:NextRequest,context:{params:Promise<{id:string}>}){try{
 const query=input.parse(Object.fromEntries(request.nextUrl.searchParams));const{project,user}=await ownedProject((await context.params).id)
 const admin=adminClient();await consumeGithubQuota(user.id,(name,args)=>admin.rpc(name,args))
 const{data}=await admin.from('llmx_github_tokens').select('encrypted_token').eq('user_id',user.id).single();if(!data)throw new ApiError('Connect GitHub first.',409)
 let previous='';try{const file=await githubApi(`/repos/${query.owner}/${query.repo}/contents/${query.path}`,decryptToken(data.encrypted_token));if(file.content)previous=Buffer.from(file.content,'base64').toString('utf8')}catch(error){if(!(error instanceof ApiError)||!error.message.includes('404'))throw error}
 return NextResponse.json({previous,next:project.content})
}catch(error){return failure(error)}}
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){try{
 const query=await body(request,input);const{project,user}=await ownedProject((await context.params).id)
 if(!project.verified_at||Date.now()-Date.parse(project.verified_at)>30*86400_000)throw new ApiError('Verify domain ownership within the last 30 days before creating a PR.',403)
 const admin=adminClient();await consumeGithubQuota(user.id,(name,args)=>admin.rpc(name,args))
 const{data}=await admin.from('llmx_github_tokens').select('encrypted_token').eq('user_id',user.id).single();if(!data)throw new ApiError('Connect GitHub first.',409)
 const pr=await createGithubPR(decryptToken(data.encrypted_token),query.owner,query.repo,query.path,project.content)
 return NextResponse.json(pr)
}catch(error){return failure(error)}}
