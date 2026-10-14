import type { SitemapUrl, LlmsTxtContent, LlmsTxtRule } from '../types'
import { filterUrlsByRules } from './rules'
export interface LlmsTxtGenerationOptions { siteName?: string; siteUrl?: string; description?: string; includeCredit?: boolean }
const plain = (value: string) => value.replace(/[\r\n\[\]<>`#]/g, ' ').trim()
export function generateLlmsTxt(urls: SitemapUrl[], rules: LlmsTxtRule[] = [], options: LlmsTxtGenerationOptions = {}): LlmsTxtContent {
  const pages = [...new Map(filterUrlsByRules(urls, rules).map(u => [u.loc, u])).values()]
  const name = plain(options.siteName || (pages[0] ? new URL(pages[0].loc).hostname : 'Website')) || 'Website'
  const fullContent = `# ${name}\n\n${options.description ? `> ${plain(options.description)}\n\n` : ''}## Pages\n\n` + pages.map(page => {
    const url = new URL(page.loc)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Only HTTP(S) page links without credentials are allowed')
    let path = url.pathname
    try { path = decodeURIComponent(path) } catch { /* Keep an encoded but valid URL path. */ }
    const label = plain(path.replace(/\//g, ' ').trim()) || name
    return `- [${label}](${url.href.replace(/\(/g, '%28').replace(/\)/g, '%29')})`
  }).join('\n') + '\n'
  return {
    fullContent,
    robotsSection: '# Nonstandard LLMX auxiliary rules; not robots.txt or llms.txt\n' + rules.map(r => `${r.type === 'include' ? 'Allow' : 'Disallow'}: ${r.pattern}`).join('\n'),
    jsonSection: JSON.stringify({ proposal: 'llmstxt.org/v2', site: { name, url: options.siteUrl || '', description: options.description || '' }, pages }, null, 2),
  }
}
export function validateLlmsTxt(content: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  if (content.length > 1_000_000) errors.push('File exceeds 1 MB')
  if (!/^# [^\r\n]+(?:\r?\n|$)/.test(content.trimStart())) errors.push('Start with an H1 site or project name')
  if (/^(?:User-agent|Allow|Disallow):/im.test(content) || /```json|<json>/i.test(content)) errors.push('Robots directives and JSON are auxiliary formats, not proposal llms.txt')
  let section = false
  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith('## ')) section = true
    if (line.startsWith('- ')) {
      const match = line.match(/^- \[([^\]]+)\]\(([^)]+)\)(?:\s*:\s*.+)?$/)
      if (!section || !match) { errors.push('Put Markdown page links under an H2 section'); continue }
      try { const url = new URL(match[2]); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error() } catch { errors.push('File lists must link to HTTP(S) pages without credentials') }
    }
  }
  return { isValid: !errors.length, errors }
}

export const WEBFLOW_PRESET_RULES: Record<string, LlmsTxtRule[]> = {
  'blog': [
    { type: 'include', pattern: '/blog/', priority: 8, description: 'Include blog posts' },
    { type: 'exclude', pattern: '/blog/tag/', description: 'Exclude tag pages' },
    { type: 'exclude', pattern: '/blog/category/', description: 'Exclude category pages' },
  ],
  'docs': [
    { type: 'include', pattern: '/docs/', priority: 10, description: 'Include documentation' },
    { type: 'include', pattern: '/help/', priority: 9, description: 'Include help center' },
    { type: 'exclude', pattern: '/docs/search', description: 'Exclude search pages' },
  ],
  'products': [
    { type: 'include', pattern: '/products/', priority: 9, description: 'Include product pages' },
    { type: 'include', pattern: '/product/', priority: 9, description: 'Include product detail pages' },
    { type: 'exclude', pattern: '/products/cart', description: 'Exclude cart pages' },
  ],
  'static': [
    { type: 'include', pattern: '/about', priority: 7, description: 'Include about page' },
    { type: 'include', pattern: '/pricing', priority: 10, description: 'Include pricing page' },
    { type: 'include', pattern: '/features', priority: 9, description: 'Include features page' },
    { type: 'include', pattern: '/contact', priority: 6, description: 'Include contact page' },
  ],
}

export const PRESET_RULES = WEBFLOW_PRESET_RULES
