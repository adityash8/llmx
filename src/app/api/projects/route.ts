import { NextRequest,NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { body,failure,ApiError } from '@/lib/api'
import { projectSchema } from '@/lib/projects'
import { adminClient,identity } from '@/lib/supabase-server'
import { normalizeDomain } from '@/lib/sitemap'
import { validateLlmsTxt } from '@/lib/llms-txt'
import { pageKey } from '@/lib/rules'
export async function GET(){try{const{client,user}=await identity();const{data,error}=await client.from('llmx_projects').select('id,name,domain,content,verified_at,created_at,updated_at').eq('user_id',user.id).order('updated_at',{ascending:false});if(error)throw new ApiError('Project storage is unavailable. Ask the site operator to apply the LLMX migration.',503);return NextResponse.json({projects:data})}catch(error){return failure(error)}}
export async function POST(request:NextRequest){try{
  const data=await body(request,projectSchema);const{user}=await identity();const domain=normalizeDomain(data.domain)
  if(data.urls.some(u=>new URL(u.loc).origin!==domain))throw new ApiError('Saved project URLs must belong to its domain')
  const imported=new Set(data.urls.map(u=>pageKey(u.loc)));const excludedUrls=[...new Set(data.excludedUrls.map(pageKey))]
  if(excludedUrls.some(url=>!imported.has(url)))throw new ApiError('Excluded pages must be imported project URLs')
  if(!validateLlmsTxt(data.content).isValid)throw new ApiError('Save a valid Markdown export')
  const{data:project,error}=await adminClient().from('llmx_projects').insert({user_id:user.id,name:data.name,domain,urls:data.urls,rules:data.rules,excluded_urls:excludedUrls,content:data.content,proof:randomBytes(24).toString('hex')}).select('id,name,domain,proof,content,verified_at').single()
  if(error)throw new ApiError('Could not save. The free pilot allows one private project; storage must be configured.',409)
  return NextResponse.json({project},{status:201})
}catch(error){return failure(error)}}
