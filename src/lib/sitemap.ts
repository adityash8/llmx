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
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml')

    // Check if this is a sitemap index
    const sitemapElements = xmlDoc.querySelectorAll('sitemap')
    if (sitemapElements.length > 0) {
      const nestedSitemaps: string[] = []
      const nestedUrls: SitemapUrl[] = []

      for (const sitemapElement of sitemapElements) {
        const locElement = sitemapElement.querySelector('loc')
        if (locElement?.textContent) {
          nestedSitemaps.push(locElement.textContent)
          
          // Parse nested sitemap if we haven't reached the limit
          if (nestedUrls.length < maxUrls) {
            try {
              const nestedResult = await parseSitemap(locElement.textContent, maxUrls - nestedUrls.length)
              nestedUrls.push(...nestedResult.urls)
            } catch (error) {
              console.warn(`Failed to parse nested sitemap ${locElement.textContent}:`, error)
            }
          }
        }
      }

      return {
        urls: nestedUrls.slice(0, maxUrls),
        analysis: {
          totalUrls: nestedUrls.length,
          validUrls: nestedUrls.length,
          invalidUrls: 0,
          lastModified: null,
          hasNestedSitemaps: true,
          nestedSitemaps,
        },
      }
    }

    // Parse regular sitemap
    const urlElements = xmlDoc.querySelectorAll('url')
    const urls: SitemapUrl[] = []

    for (const urlElement of urlElements) {
      if (urls.length >= maxUrls) break

      const locElement = urlElement.querySelector('loc')
      const lastmodElement = urlElement.querySelector('lastmod')
      const changefreqElement = urlElement.querySelector('changefreq')
      const priorityElement = urlElement.querySelector('priority')

      if (locElement?.textContent) {
        urls.push({
          loc: locElement.textContent,
          lastmod: lastmodElement?.textContent,
          changefreq: changefreqElement?.textContent,
          priority: priorityElement?.textContent ? parseFloat(priorityElement.textContent) : undefined,
        })
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
  } catch (error) {
    console.error('Error parsing sitemap:', error)
    throw error
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
