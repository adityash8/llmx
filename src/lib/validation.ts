import type { SitemapUrl, ValidationIssue, ValidationResult } from '../types'
import { safeFetch, type SafeResponse } from './safe-fetch'

export function robotsAllows(text: string, path: string, agent = 'LLMX'): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = []
  let group: typeof groups[number] | undefined
  for (const line of text.split(/\r?\n/)) {
    const match = line.replace(/#.*$/, '').match(/^\s*(user-agent|allow|disallow)\s*:\s*(.*)$/i)
    if (!match) continue
    const key = match[1].toLowerCase(), value = match[2].trim()
    if (key === 'user-agent') {
      if (!group || group.rules.length) { group = { agents: [], rules: [] }; groups.push(group) }
      group.agents.push(value.toLowerCase())
    } else if (group && value) group.rules.push({ allow: key === 'allow', path: value })
  }
  const specific = groups.filter(g => g.agents.some(a => a !== '*' && agent.toLowerCase().includes(a)))
  const active = specific.length ? specific : groups.filter(g => g.agents.includes('*'))
  const matches = active.flatMap(g => g.rules).filter(r => {
    const source = r.path.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
    return new RegExp(`^${source}`).test(path)
  }).sort((a,b) => b.path.replace(/[*$]/g,'').length - a.path.replace(/[*$]/g,'').length || Number(b.allow) - Number(a.allow))
  return matches[0]?.allow ?? true
}
export function inspectPage(page: SitemapUrl, response: SafeResponse, robots: string | null, now = Date.now()): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const add = (type: ValidationIssue['type'], severity: ValidationIssue['severity'], message: string, suggestion: string) => issues.push({ type, severity, message, suggestion, url: page.loc })
  if (response.status >= 400) add('status', 'error', `HTTP ${response.status}`, 'Fix this URL or exclude it from the file.')
  if (response.url !== page.loc) add('canonical', 'warning', `Redirects to ${response.url}`, 'Use the final URL.')
  const tags = response.text.match(/<(?:link|meta)\b[^>]*>/gi) ?? []
  for (const tag of tags) {
    const attr = (name: string) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1]
    if (tag.toLowerCase().startsWith('<link') && attr('rel')?.toLowerCase().split(/\s+/).includes('canonical')) {
      try { const canonical = new URL(attr('href') || '', response.url).href; if (canonical !== page.loc) add('canonical','warning',`Canonical is ${canonical}`,'Use the canonical URL and remove duplicate entries.') } catch { add('canonical','warning','Canonical URL is malformed','Fix the canonical link on this page.') }
    }
    if (tag.toLowerCase().startsWith('<meta') && /^(robots|llmx)$/i.test(attr('name') || '') && /noindex|none/i.test(attr('content') || '')) add('robots','error','Page metadata says noindex','Exclude this page or review its indexing policy.')
  }
  const canonicalHeader = response.headers.link?.match(/<([^>]+)>;\s*rel=["']?canonical/i)?.[1]
  if (canonicalHeader && new URL(canonicalHeader, response.url).href !== page.loc) add('canonical','warning',`Canonical is ${new URL(canonicalHeader,response.url).href}`,'Use the canonical URL.')
  if (/noindex|none/i.test(response.headers['x-robots-tag'] || '')) add('robots','error','HTTP header says noindex','Exclude this page or review its indexing policy.')
  const url = new URL(page.loc)
  if (robots === null) add('robots','warning','robots.txt could not be checked','Review robots.txt before publishing.')
  else if (!robotsAllows(robots, url.pathname + url.search)) add('robots','error','robots.txt blocks LLMX or general crawlers','Exclude this page or review your access policy. llms.txt does not override robots.txt.')
  if (page.lastmod) {
    const date = Date.parse(page.lastmod)
    if (!Number.isFinite(date) || date > now + 86400_000) add('freshness','warning','Sitemap lastmod is invalid or in the future','Correct the sitemap date.')
    else if (now - date > 365 * 86400_000) add('freshness','warning','Sitemap reports no change in over a year','Review the content. Its age alone does not mean it is incorrect.')
  }
  return issues
}
export function checkDuplicateUrls(urls: SitemapUrl[]): ValidationIssue[] {
  const seen = new Set<string>(); const issues: ValidationIssue[] = []
  for (const page of urls) { const url = new URL(page.loc); url.hash = ''; if (seen.has(url.href)) issues.push({ type: 'duplicate', severity: 'warning', message: 'Duplicate URL', url: page.loc, suggestion: 'Keep one entry.' }); seen.add(url.href) }
  return issues
}
export async function validateUrls(urls: SitemapUrl[], fetcher = safeFetch): Promise<ValidationResult & { checked: number; safeUrls: SitemapUrl[] }> {
  const issues = checkDuplicateUrls(urls); const safeUrls: SitemapUrl[] = []
  const deadline = Date.now() + 20_000
  const origins = [...new Set(urls.slice(0, 20).map(u => new URL(u.loc).origin))]
  const robots = new Map<string, string | null>()
  for (const origin of origins.slice(0, 5)) {
    try { const res = await fetcher(`${origin}/robots.txt`, { deadline, maxBytes: 128_000 }); robots.set(origin, res.status === 404 ? '' : res.status === 200 ? res.text : null) } catch { robots.set(origin,null) }
  }
  const sample = urls.slice(0,20)
  for (let start = 0; start < sample.length; start += 4) {
    const results = await Promise.allSettled(sample.slice(start,start+4).map(async page => {
      const response = await fetcher(page.loc, { deadline, maxBytes: 512_000 })
      return inspectPage(page,response,robots.get(new URL(page.loc).origin) ?? null)
    }))
    results.forEach((result,index) => {
      const page = sample[start+index]
      const pageIssues: ValidationIssue[] = result.status === 'fulfilled' ? result.value : [{ type: 'status', severity:'error',url:page.loc,message:'Page could not be fetched safely within the request limits',suggestion:'Check availability, then retry or exclude this page.' }]
      issues.push(...pageIssues)
      if (!pageIssues.some(i => i.severity === 'error' || i.type === 'canonical' || (i.type === 'robots' && i.severity === 'warning'))) safeUrls.push(page)
    })
  }
  const failed = new Set(issues.filter(i => i.severity === 'error').map(i => i.url)).size
  return { issues, safeUrls, checked: sample.length, score: sample.length ? Math.round(100 * (sample.length - failed) / sample.length) : 0, summary: { errors:issues.filter(i => i.severity === 'error').length, warnings:issues.filter(i => i.severity === 'warning').length, info:issues.filter(i => i.severity === 'info').length } }
}
export function getScoreBadge(score: number): { label: string; variant: 'success' | 'warning' | 'error' } { return { label: `${score}% accessible in sample`, variant: score === 100 ? 'success' : score >= 50 ? 'warning' : 'error' } }
