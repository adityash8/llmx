import { SitemapUrl, SitemapAnalysis } from '@/types'

export async function detectSitemap(domain: string): Promise<string[]> {
  const normalizedDomain = domain.startsWith('http') ? domain : `https://${domain}`

  const sitemapUrls = [
    `${normalizedDomain}/sitemap.xml`,
    `${normalizedDomain}/sitemap_index.xml`,
    `${normalizedDomain}/sitemaps.xml`,
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
        break
      }
    } catch (error) {
      console.warn(`Failed to check ${sitemapUrl}:`, error)
    }
  }

  return foundSitemaps
}

export async function parseSitemap(
  sitemapUrl: string,
  maxUrls: number = 500,
  prioritizeRecent: boolean = true
): Promise<{
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

    return parseSitemapXml(xmlText, maxUrls, sitemapUrl, prioritizeRecent)
  } catch (error) {
    console.error('Error parsing sitemap:', error)
    throw error
  }
}

export async function parseSitemapWithNested(
  sitemapUrl: string,
  maxUrls: number = 500
): Promise<{
  urls: SitemapUrl[]
  analysis: SitemapAnalysis
}> {
  const result = await parseSitemap(sitemapUrl, maxUrls)

  if (result.analysis.hasNestedSitemaps && result.analysis.nestedSitemaps.length > 0) {
    const allUrls: SitemapUrl[] = []

    for (const nestedUrl of result.analysis.nestedSitemaps) {
      if (allUrls.length >= maxUrls) break

      try {
        const nestedResult = await parseSitemap(nestedUrl, maxUrls - allUrls.length, true)
        allUrls.push(...nestedResult.urls)
      } catch (error) {
        console.warn(`Failed to parse nested sitemap ${nestedUrl}:`, error)
      }
    }

    if (allUrls.length > maxUrls) {
      allUrls.sort((a, b) => {
        const dateA = a.lastmod ? new Date(a.lastmod).getTime() : 0
        const dateB = b.lastmod ? new Date(b.lastmod).getTime() : 0
        return dateB - dateA
      })
      allUrls.splice(maxUrls)
    }

    return {
      urls: allUrls,
      analysis: {
        totalUrls: allUrls.length,
        validUrls: allUrls.length,
        invalidUrls: 0,
        lastModified: allUrls[0]?.lastmod ? new Date(allUrls[0].lastmod) : null,
        hasNestedSitemaps: true,
        nestedSitemaps: result.analysis.nestedSitemaps,
      },
    }
  }

  return result
}

function parseSitemapXml(
  xmlText: string,
  maxUrls: number,
  baseUrl: string,
  prioritizeRecent: boolean = true
): {
  urls: SitemapUrl[]
  analysis: SitemapAnalysis
} {
  const urls: SitemapUrl[] = []
  const nestedSitemaps: string[] = []

  const sitemapIndexMatch = xmlText.match(/<sitemapindex[^>]*>([\s\S]*?)<\/sitemapindex>/i)
  if (sitemapIndexMatch) {
    const sitemapMatches = sitemapIndexMatch[1].match(/<sitemap>([\s\S]*?)<\/sitemap>/gi)

    if (sitemapMatches) {
      for (const sitemapMatch of sitemapMatches) {
        const locMatch = sitemapMatch.match(/<loc>([^<]+)<\/loc>/i)
        if (locMatch && nestedSitemaps.length < 10) {
          nestedSitemaps.push(locMatch[1])
        }
      }
    }

    return {
      urls: [],
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

  const urlMatches = xmlText.match(/<url>([\s\S]*?)<\/url>/gi)

  if (urlMatches) {
    const allUrls: SitemapUrl[] = []

    for (const urlMatch of urlMatches) {
      const locMatch = urlMatch.match(/<loc>([^<]+)<\/loc>/i)
      const lastmodMatch = urlMatch.match(/<lastmod>([^<]+)<\/lastmod>/i)
      const changefreqMatch = urlMatch.match(/<changefreq>([^<]+)<\/changefreq>/i)
      const priorityMatch = urlMatch.match(/<priority>([^<]+)<\/priority>/i)

      if (locMatch) {
        allUrls.push({
          loc: locMatch[1],
          lastmod: lastmodMatch?.[1],
          changefreq: changefreqMatch?.[1],
          priority: priorityMatch?.[1] ? parseFloat(priorityMatch[1]) : undefined,
        })
      }
    }

    if (prioritizeRecent && allUrls.length > maxUrls) {
      allUrls.sort((a, b) => {
        const dateA = a.lastmod ? new Date(a.lastmod).getTime() : 0
        const dateB = b.lastmod ? new Date(b.lastmod).getTime() : 0
        return dateB - dateA
      })
    }

    urls.push(...allUrls.slice(0, maxUrls))
  }

  return {
    urls,
    analysis: {
      totalUrls: urls.length,
      validUrls: urls.length,
      invalidUrls: 0,
      lastModified: urls[0]?.lastmod ? new Date(urls[0].lastmod) : null,
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
