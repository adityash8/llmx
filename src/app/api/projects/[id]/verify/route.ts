import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveTxt } from 'node:dns/promises'
import { adminClient } from '@/lib/supabase-server'
import { ownedProject } from '@/lib/projects'
import { safeFetch } from '@/lib/safe-fetch'
import { body,failure,ApiError } from '@/lib/api'
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){try{
  const{method}=await body(request,z.object({method:z.enum(['file','dns'])}));const{project,user}=await ownedProject((await context.params).id)
  const expected=`llmx-verification=${project.proof}`;let verified=false
  if(method==='file'){const res=await safeFetch(`${project.domain}/.well-known/llmx-verification.txt`,{maxBytes:4096});verified=res.status===200&&res.url===`${project.domain}/.well-known/llmx-verification.txt`&&res.text.trim()===expected}
  else{try{const records=await Promise.race([resolveTxt(`_llmx.${new URL(project.domain).hostname}`),new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(new Error('DNS timeout')),5000);timer.unref()})]);verified=records.some(record=>record.join('')===expected)}catch{verified=false}}
  if(!verified)throw new ApiError('Proof not found. Publish the exact verification text and retry after DNS propagation.',422)
  const{error}=await adminClient().from('llmx_projects').update({verified_at:new Date().toISOString()}).eq('id',project.id).eq('user_id',user.id);if(error)throw new ApiError('Could not record verification',503)
  return NextResponse.json({verified:true})
}catch(error){return failure(error)}}
