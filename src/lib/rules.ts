import type { LlmsTxtRule, SitemapUrl } from '../types'

export function ruleMatcher(pattern: string): (url: string) => boolean {
  if (!pattern || pattern.length > 200) throw new Error('Rules must contain 1–200 characters')
  if (pattern.startsWith('regex:')) {
    const source = pattern.slice(6)
    // Deliberately bounded regex dialect: no groups, alternation, braces, backrefs or repeated quantifiers.
    if (!source || /[(){}|]|\\[1-9]|[+*?]{2}/.test(source) || (source.match(/[+*]/g)?.length ?? 0) > 1) throw new Error('Use a simple regex without groups, alternation, or repeated quantifiers; use multiple rules for OR')
    const regex = new RegExp(source, 'i')
    return url => regex.test(url)
  }
  if (pattern.startsWith('glob:')) {
    const source = pattern.slice(5).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
    const regex = new RegExp(`^${source}$`, 'i')
    return url => regex.test(new URL(url).pathname) || regex.test(url)
  }
  return url => url.toLowerCase().includes(pattern.toLowerCase())
}
export function filterUrlsByRules(urls: SitemapUrl[], rules: LlmsTxtRule[]): SitemapUrl[] {
  const includes = rules.filter(r => r.type === 'include').map(r => ruleMatcher(r.pattern))
  const excludes = rules.filter(r => r.type === 'exclude').map(r => ruleMatcher(r.pattern))
  return urls.filter(u => (!includes.length || includes.some(match => match(u.loc))) && !excludes.some(match => match(u.loc)))
}
export function pageKey(value: string): string {
  const url = new URL(value)
  url.hash = ''
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/$/, '')
  return url.href
}
export function selectProjectUrls(urls: SitemapUrl[], rules: LlmsTxtRule[], excludedUrls: string[]): SitemapUrl[] {
  const excluded = new Set(excludedUrls.map(pageKey))
  return filterUrlsByRules(urls, rules).filter(page => !excluded.has(pageKey(page.loc)))
}
