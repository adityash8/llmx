import type { SitemapUrl, SitemapAnalysis } from '../types'
import { safeFetch, publicUrl } from './safe-fetch'
export { filterUrlsByRules } from './rules'

export function normalizeDomain(domain: string): string {
  return publicUrl(domain.includes('://') ? domain : `https://${domain}`).origin
}
const decodeXml = (text: string) => text.trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
export function parseSitemapXml(xml: string, maxUrls = 500): { urls: SitemapUrl[]; analysis: SitemapAnalysis } {
  if (!/<(?:urlset|sitemapindex)\b/i.test(xml) || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Expected a sitemap XML urlset or index without entities')
  const nestedSitemaps: string[] = []; const urls: SitemapUrl[] = []; let total = 0
  const isIndex = /<sitemapindex\b/i.test(xml)
  const entries = xml.match(isIndex ? /<sitemap\b[^>]*>[\s\S]*?<\/sitemap>/gi : /<url\b[^>]*>[\s\S]*?<\/url>/gi) ?? []
  for (const entry of entries) {
    const loc = entry.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i)?.[1]
    if (!loc) continue
    const href = publicUrl(decodeXml(loc)).href
    total++
    if (isIndex) { if (nestedSitemaps.length < 20) nestedSitemaps.push(href) }
    else if (urls.length < maxUrls) urls.push({ loc: href, lastmod: entry.match(/<lastmod\b[^>]*>([^<]+)<\/lastmod>/i)?.[1] })
  }
  return { urls, analysis: { totalUrls: total, validUrls: urls.length, invalidUrls: 0, lastModified: null, hasNestedSitemaps: isIndex, nestedSitemaps } }
}
export async function detectSitemap(domain: string): Promise<string[]> {
  const origin = normalizeDomain(domain)
  const deadline = Date.now() + 15_000
  const candidates = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`]
  try {
    const robots = await safeFetch(`${origin}/robots.txt`, { deadline, maxBytes: 128_000 })
    for (const match of robots.text.matchAll(/^Sitemap:\s*(\S+)/gim)) {
      const url = publicUrl(match[1]); if (url.origin === origin) candidates.unshift(url.href)
    }
  } catch { /* Standard sitemap paths are still checked. */ }
  for (const candidate of [...new Set(candidates)].slice(0, 4)) {
    try { const res = await safeFetch(candidate, { deadline }); if (res.status === 200 && /<(urlset|sitemapindex)\b/i.test(res.text)) return [candidate] } catch { /* Try next known path. */ }
  }
  return []
}
export async function parseSitemap(sitemapUrl: string, maxUrls = 500) {
  const response = await safeFetch(sitemapUrl)
  if (response.status !== 200) throw new Error(`Sitemap returned HTTP ${response.status}`)
  return parseSitemapXml(response.text, Math.min(500, maxUrls))
}
export async function parseSitemapWithNested(sitemapUrl: string, maxUrls = 500) {
  const origin = publicUrl(sitemapUrl).origin; const visited = new Set<string>(); const queue = [{ url: sitemapUrl, depth: 0 }]
  const urls: SitemapUrl[] = []; const deadline = Date.now() + 20_000; let totalUrls = 0
  while (queue.length && visited.size < 20 && urls.length < Math.min(maxUrls, 500)) {
    const next = queue.shift()!
    if (visited.has(next.url)) continue
    visited.add(next.url)
    const response = await safeFetch(next.url, { deadline })
    if (response.status !== 200) throw new Error(`Sitemap returned HTTP ${response.status}`)
    const parsed = parseSitemapXml(response.text, Math.min(maxUrls, 500) - urls.length)
    if (!parsed.analysis.hasNestedSitemaps) totalUrls += parsed.analysis.totalUrls
    for (const page of parsed.urls) if (publicUrl(page.loc).origin === origin && !urls.some(u => u.loc === page.loc)) urls.push(page)
    if (next.depth < 2) for (const child of parsed.analysis.nestedSitemaps) if (publicUrl(child).origin === origin) queue.push({ url: child, depth: next.depth + 1 })
  }
  return { urls, analysis: { totalUrls, validUrls: urls.length, invalidUrls: Math.max(0, totalUrls - urls.length), lastModified: null, hasNestedSitemaps: visited.size > 1, nestedSitemaps: [...visited], truncated: queue.length > 0 || totalUrls > urls.length } }
}
