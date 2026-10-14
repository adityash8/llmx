import { NextRequest, NextResponse } from 'next/server'
import { body, failure, generateSchema } from '@/lib/api'
import { generateLlmsTxt } from '@/lib/llms-txt'
import { filterUrlsByRules } from '@/lib/rules'
import { publicUrl } from '@/lib/safe-fetch'
import { validateUrls } from '@/lib/validation'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function POST(request: NextRequest) {
  try {
    const data = await body(request,generateSchema)
    data.urls.forEach(u => publicUrl(u.loc))
    const selected = filterUrlsByRules(data.urls,data.rules)
    const validation = await validateUrls(selected)
    const exported = data.safeMode ? validation.safeUrls : selected
    return NextResponse.json({llmsTxt:generateLlmsTxt(exported,data.rules,data.options),validation,totalUrls:selected.length,validatedUrls:validation.checked,exportedUrls:exported.length,safeMode:data.safeMode})
  } catch(error) { return failure(error) }
}
