import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { body, failure } from '@/lib/api'
import { normalizeDomain } from '@/lib/sitemap'
import { safeFetch } from '@/lib/safe-fetch'
import { validateLlmsTxt } from '@/lib/llms-txt'
import { validateUrls } from '@/lib/validation'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function POST(request: NextRequest) {
  try {
    const {domain,content} = await body(request,z.object({domain:z.string().max(2048).optional(),content:z.string().max(100_000).optional()}).refine(d => Boolean(d.domain || d.content)))
    let text = content || ''; let source = 'Pasted file'
    if (domain) {
      source = `${normalizeDomain(domain)}/llms.txt`
      const response = await safeFetch(source)
      if (response.status !== 200) return NextResponse.json({error:`No public llms.txt at this domain (HTTP ${response.status}). Generate a file or paste its contents.`},{status:404})
      text = response.text
    }
    const format = validateLlmsTxt(text)
    const urls = [...text.matchAll(/^- \[[^\]]*\]\((https?:\/\/[^)]+)\)/gm)].slice(0,20).map(m => ({loc:m[1]}))
    const validation = await validateUrls(urls)
    return NextResponse.json({source,format,validation,content:text,totalUrls:[...text.matchAll(/^- \[[^\]]*\]\(/gm)].length,checked:validation.checked})
  } catch(error) {return failure(error)}
}
