import { NextRequest, NextResponse } from 'next/server'
import { detectSitemap, parseSitemap, filterUrlsByRules } from '@/lib/sitemap'
import { generateLlmsTxt } from '@/lib/llms-txt'
import { validateUrlsWithLLMSimulation, checkDuplicateUrls } from '@/lib/validation'
import { PRESET_RULES } from '@/lib/llms-txt'

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json()
    
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Detect sitemaps
    const sitemaps = await detectSitemap(domain)
    
    if (sitemaps.length === 0) {
      return NextResponse.json({ 
        error: 'No sitemaps found for this domain' 
      }, { status: 404 })
    }

    // Parse the first sitemap (limit to 100 URLs for public validator)
    const result = await parseSitemap(sitemaps[0], 100)

    // If this is a sitemap index, parse the first nested sitemap
    let allUrls = result.urls
    if (result.analysis.hasNestedSitemaps && result.analysis.nestedSitemaps.length > 0) {
      try {
        const nestedResult = await parseSitemap(result.analysis.nestedSitemaps[0], 50)
        allUrls = [...allUrls, ...nestedResult.urls]
      } catch (error) {
        console.warn('Failed to parse nested sitemap:', error)
      }
    }

    // Apply basic rules to filter URLs
    const basicRules = [
      { type: 'exclude' as const, pattern: '/admin' },
      { type: 'exclude' as const, pattern: '/dashboard' },
      { type: 'exclude' as const, pattern: '/login' },
      { type: 'exclude' as const, pattern: '/register' },
      { type: 'exclude' as const, pattern: '/cart' },
      { type: 'exclude' as const, pattern: '/checkout' },
    ]

    const filteredUrls = filterUrlsByRules(allUrls, basicRules)

    // Check for duplicate URLs
    const duplicateIssues = checkDuplicateUrls(filteredUrls)

    // Validate URLs with LLM simulation (limit to first 20 for performance in public validator)
    const urlsToValidate = filteredUrls.slice(0, 20)
    const validation = await validateUrlsWithLLMSimulation(urlsToValidate)

    // Combine all issues
    const allIssues = [...validation.issues, ...duplicateIssues]

    // Generate llms.txt content
    const llmsTxtContent = generateLlmsTxt(filteredUrls, basicRules)

    // Use the score from enhanced validation
    const score = validation.score

    return NextResponse.json({
      score,
      issues: allIssues,
      totalUrls: filteredUrls.length,
      validUrls: filteredUrls.length - allIssues.filter(i => i.severity === 'error').length,
      llmsTxtContent: llmsTxtContent.fullContent,
      sitemapUrl: sitemaps[0],
      analysis: {
        ...result.analysis,
        totalUrls: filteredUrls.length,
        validUrls: filteredUrls.length,
      }
    })

  } catch (error) {
    console.error('Error validating domain:', error)
    return NextResponse.json(
      { error: 'Failed to validate domain' }, 
      { status: 500 }
    )
  }
}
