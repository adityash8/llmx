import { NextRequest, NextResponse } from 'next/server'
import { generateLlmsTxt } from '@/lib/llms-txt'
import { validateUrls } from '@/lib/validation'


export async function POST(request: NextRequest) {
  try {
    const { urls, rules } = await request.json()
    
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'URLs array is required' }, { status: 400 })
    }

    // Generate llms.txt
    const llmsTxtContent = generateLlmsTxt(urls, rules || [])

    // Validate URLs (limit to first 50 for performance)
    const urlsToValidate = urls.slice(0, 50)
    const validation = await validateUrls(urlsToValidate)

    return NextResponse.json({
      llmsTxt: llmsTxtContent,
      validation,
      totalUrls: urls.length,
      validatedUrls: urlsToValidate.length
    })

  } catch (error) {
    console.error('Error generating llms.txt:', error)
    return NextResponse.json(
      { error: 'Failed to generate llms.txt' }, 
      { status: 500 }
    )
  }
}
