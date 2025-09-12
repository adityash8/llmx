import { NextRequest, NextResponse } from 'next/server'
import { detectSitemap, parseSitemap } from '@/lib/sitemap'

// Configuration constants
const MAX_URLS_PER_SITEMAP = 500
const MAX_NESTED_SITEMAPS = 3
const MAX_URLS_PER_NESTED_SITEMAP = 200
const MAX_TOTAL_URLS = 500

// Error messages
const ERROR_MESSAGES = {
  DOMAIN_REQUIRED: 'Domain is required',
  NO_SITEMAPS_FOUND: 'No sitemaps found',
  PROCESSING_FAILED: 'Failed to process sitemap'
} as const

/**
 * Parses nested sitemaps in parallel for better performance
 */
async function parseNestedSitemaps(
  nestedSitemaps: string[], 
  maxUrlsPerSitemap: number
): Promise<{ urls: any[], totalProcessed: number }> {
  const sitemapsToProcess = nestedSitemaps.slice(0, MAX_NESTED_SITEMAPS)
  
  // Process nested sitemaps in parallel for better performance
  const parsePromises = sitemapsToProcess.map(async (sitemapUrl) => {
    try {
      const result = await parseSitemap(sitemapUrl, maxUrlsPerSitemap)
      return result.urls
    } catch (error) {
      console.warn(`Failed to parse nested sitemap ${sitemapUrl}:`, error)
      return []
    }
  })

  const results = await Promise.allSettled(parsePromises)
  const allUrls: any[] = []
  let totalProcessed = 0

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allUrls.push(...result.value)
      totalProcessed += result.value.length
      
      // Stop if we've reached the limit
      if (totalProcessed >= MAX_TOTAL_URLS) break
    }
  }

  return { urls: allUrls, totalProcessed }
}

/**
 * Validates and normalizes the input domain
 */
function validateDomain(domain: string): string {
  if (!domain || typeof domain !== 'string') {
    throw new Error(ERROR_MESSAGES.DOMAIN_REQUIRED)
  }
  
  // Ensure domain has protocol
  return domain.startsWith('http') ? domain : `https://${domain}`
}

/**
 * Creates a standardized error response
 */
function createErrorResponse(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Creates a successful response with sitemap data
 */
function createSuccessResponse(
  sitemaps: string[], 
  selectedSitemap: string, 
  urls: any[], 
  analysis: any
) {
  return NextResponse.json({
    sitemaps,
    selectedSitemap,
    urls: urls.slice(0, MAX_TOTAL_URLS), // Ensure we don't exceed limit
    analysis: {
      ...analysis,
      totalUrls: urls.length,
      validUrls: urls.length,
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { domain: rawDomain } = await request.json()
    const domain = validateDomain(rawDomain)

    // Detect available sitemaps
    const sitemaps = await detectSitemap(domain)
    
    if (sitemaps.length === 0) {
      return NextResponse.json({ 
        sitemaps: [],
        message: ERROR_MESSAGES.NO_SITEMAPS_FOUND 
      })
    }

    // Parse the primary sitemap
    const primaryResult = await parseSitemap(sitemaps[0], MAX_URLS_PER_SITEMAP)
    let allUrls = [...primaryResult.urls]

    // Handle nested sitemaps if present
    if (primaryResult.analysis.hasNestedSitemaps && primaryResult.analysis.nestedSitemaps.length > 0) {
      const { urls: nestedUrls } = await parseNestedSitemaps(
        primaryResult.analysis.nestedSitemaps,
        MAX_URLS_PER_NESTED_SITEMAP
      )
      allUrls = [...allUrls, ...nestedUrls]
    }

    return createSuccessResponse(
      sitemaps,
      sitemaps[0],
      allUrls,
      primaryResult.analysis
    )

  } catch (error) {
    console.error('Error processing sitemap:', error)
    
    // Handle validation errors with 400 status
    if (error instanceof Error && error.message === ERROR_MESSAGES.DOMAIN_REQUIRED) {
      return createErrorResponse(error.message, 400)
    }
    
    return createErrorResponse(ERROR_MESSAGES.PROCESSING_FAILED)
  }
}