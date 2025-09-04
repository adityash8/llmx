import { NextRequest, NextResponse } from 'next/server'
import { generateLlmsTxt } from '@/lib/llms-txt'
import { validateUrls } from '@/lib/validation'
import { getUser, updateUserUsage } from '@/lib/supabase'
import { canGenerate, getPlanLimits } from '@/lib/plans'

export async function POST(request: NextRequest) {
  try {
    const { urls, rules, userId } = await request.json()
    
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'URLs array is required' }, { status: 400 })
    }

    // Check user authentication and usage limits
    if (userId) {
      const user = await getUser(userId)
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Check if user can generate
      const canGenerateResult = canGenerate(user)
      if (!canGenerateResult.canGenerate) {
        return NextResponse.json({ 
          error: canGenerateResult.reason,
          code: 'USAGE_LIMIT_EXCEEDED'
        }, { status: 429 })
      }

      // Check URL limit
      const limits = getPlanLimits(user.plan)
      if (urls.length > limits.maxUrlsPerGeneration) {
        return NextResponse.json({ 
          error: `URL limit exceeded. Your plan allows up to ${limits.maxUrlsPerGeneration} URLs per generation.`,
          code: 'URL_LIMIT_EXCEEDED'
        }, { status: 400 })
      }

      // Update usage after successful generation
      await updateUserUsage(userId)
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
