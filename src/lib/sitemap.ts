import { SitemapUrl, SitemapAnalysis } from '@/types'

export async function detectSitemap(domain: string): Promise<string[]> {
  const sitemapUrls = [
    `${domain}/sitemap.xml`,
    `${domain}/sitemap_index.xml`,
    `${domain}/sitemaps.xml`,
  ]

  const foundSitemaps: string[] = []

  for (const sitemapUrl of sitemapUrls) {
    try {
      const response = await fetch(sitemapUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'LLMX Bot/1.0',
        },
      })

      if (response.ok) {
        foundSitemaps.push(sitemapUrl)
      }
    } catch (error) {
      console.warn(`Failed to check ${sitemapUrl}:`, error)
    }
  }

  return foundSitemaps
}

export async function parseSitemap(sitemapUrl: string, maxUrls: number = 500): Promise<{
  urls: SitemapUrl[]
  analysis: SitemapAnalysis
}> {
  try {
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'LLMX Bot/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status}`)
    }

    const xmlText = await response.text()
    
    // Use regex-based parsing instead of DOMParser for server-side compatibility
    return parseSitemapXml(xmlText, maxUrls, sitemapUrl)
  } catch (error) {
    console.error('Error parsing sitemap:', error)
    throw error
  }
}

function parseSitemapXml(xmlText: string, maxUrls: number, baseUrl: string): {
  urls: SitemapUrl[]
  analysis: SitemapAnalysis
} {
  const urls: SitemapUrl[] = []
  const nestedSitemaps: string[] = []
  
  // Check if this is a sitemap index
  const sitemapIndexMatch = xmlText.match(/<sitemapindex[^>]*>([\s\S]*?)<\/sitemapindex>/i)
  if (sitemapIndexMatch) {
    const sitemapMatches = sitemapIndexMatch[1].match(/<sitemap>([\s\S]*?)<\/sitemap>/gi)
    
    if (sitemapMatches) {
      for (const sitemapMatch of sitemapMatches) {
        const locMatch = sitemapMatch.match(/<loc>([^<]+)<\/loc>/i)
        if (locMatch && nestedSitemaps.length < 10) { // Limit nested sitemaps
          nestedSitemaps.push(locMatch[1])
        }
      }
    }

    return {
      urls: [], // We'll parse nested sitemaps separately
      analysis: {
        totalUrls: 0,
        validUrls: 0,
        invalidUrls: 0,
        lastModified: null,
        hasNestedSitemaps: true,
        nestedSitemaps,
      },
    }
  }

  // Parse regular sitemap
  const urlMatches = xmlText.match(/<url>([\s\S]*?)<\/url>/gi)
  
  if (urlMatches) {
    for (const urlMatch of urlMatches) {
      if (urls.length >= maxUrls) break

      const locMatch = urlMatch.match(/<loc>([^<]+)<\/loc>/i)
      const lastmodMatch = urlMatch.match(/<lastmod>([^<]+)<\/lastmod>/i)
      const changefreqMatch = urlMatch.match(/<changefreq>([^<]+)<\/changefreq>/i)
      const priorityMatch = urlMatch.match(/<priority>([^<]+)<\/priority>/i)

      if (locMatch) {
        urls.push({
          loc: locMatch[1],
          lastmod: lastmodMatch?.[1],
          changefreq: changefreqMatch?.[1],
          priority: priorityMatch?.[1] ? parseFloat(priorityMatch[1]) : undefined,
        })
      }
    }
  }

  return {
    urls,
    analysis: {
      totalUrls: urls.length,
      validUrls: urls.length,
      invalidUrls: 0,
      lastModified: null,
      hasNestedSitemaps: false,
      nestedSitemaps: [],
    },
  }
}

export function filterUrlsByRules(urls: SitemapUrl[], rules: Array<{ type: 'include' | 'exclude', pattern: string }>): SitemapUrl[] {
  if (rules.length === 0) return urls

  return urls.filter(url => {
    let shouldInclude = true

    for (const rule of rules) {
      const regex = new RegExp(rule.pattern, 'i')
      const matches = regex.test(url.loc)

      if (rule.type === 'exclude' && matches) {
        shouldInclude = false
        break
      } else if (rule.type === 'include' && !matches) {
        shouldInclude = false
        break
      }
    }

    return shouldInclude
  })
}
