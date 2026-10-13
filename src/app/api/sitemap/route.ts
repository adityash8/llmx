import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { body, failure } from '@/lib/api'
import { detectSitemap, parseSitemapWithNested } from '@/lib/sitemap'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function POST(request: NextRequest) {
  try {
    const {domain,sitemapUrl} = await body(request,z.object({domain:z.string().min(1).max(2048),sitemapUrl:z.string().url().max(2048).optional()}))
    const sitemaps = sitemapUrl ? [sitemapUrl] : await detectSitemap(domain)
    if (!sitemaps.length) return NextResponse.json({sitemaps:[],urls:[],message:'No sitemap found. Paste an explicit sitemap URL or import page URLs below.'})
    const result = await parseSitemapWithNested(sitemaps[0])
    return NextResponse.json({sitemaps,selectedSitemap:sitemaps[0],...result})
  } catch(error) { return failure(error) }
}
