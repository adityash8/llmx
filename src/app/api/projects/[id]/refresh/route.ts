import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'
import { body,failure,ApiError } from '@/lib/api'
import { ownedProject } from '@/lib/projects'
import { adminClient } from '@/lib/supabase-server'
import { detectSitemap,parseSitemapWithNested } from '@/lib/sitemap'
import { selectProjectUrls } from '@/lib/rules'
import { validateUrls } from '@/lib/validation'
import { generateLlmsTxt } from '@/lib/llms-txt'
export const maxDuration=60
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){try{
 await body(request,z.object({}));const{project,user}=await ownedProject((await context.params).id);const admin=adminClient();const usage=await admin.rpc('llmx_consume_usage',{p_user:user.id});if(usage.error)throw new ApiError('Usage storage unavailable',503);if(!usage.data)throw new ApiError('Daily integration limit reached (10)',429)
 const sitemaps=await detectSitemap(project.domain);if(!sitemaps.length)throw new ApiError('No sitemap found. Existing saved export is unchanged. Reimport URLs in the generator.',404)
 const imported=await parseSitemapWithNested(sitemaps[0]);const selected=selectProjectUrls(imported.urls,project.rules,project.excluded_urls);const validation=await validateUrls(selected);if(!validation.safeUrls.length)throw new ApiError('No checked pages passed safe mode. Existing export is unchanged.',422)
 const content=generateLlmsTxt(validation.safeUrls,[],{siteName:project.name,siteUrl:project.domain}).fullContent
 const{error}=await admin.from('llmx_projects').update({urls:imported.urls,content,updated_at:new Date().toISOString()}).eq('id',project.id).eq('user_id',user.id);if(error)throw new ApiError('Could not save refresh',503)
 return NextResponse.json({content,exportedUrls:validation.safeUrls.length,validation})
}catch(error){return failure(error)}}
