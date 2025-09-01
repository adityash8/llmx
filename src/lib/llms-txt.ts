import { SitemapUrl, LlmsTxtContent, LlmsTxtRule } from '@/types'

export function generateLlmsTxt(urls: SitemapUrl[], rules: LlmsTxtRule[] = []): LlmsTxtContent {
  // Generate robots-style section
  const robotsSection = generateRobotsSection(urls, rules)
  
  // Generate JSON section
  const jsonSection = generateJsonSection(urls, rules)
  
  // Combine into full content
  const fullContent = `${robotsSection}\n\n${jsonSection}`
  
  return {
    robotsSection,
    jsonSection,
    fullContent,
  }
}

function generateRobotsSection(urls: SitemapUrl[], rules: LlmsTxtRule[]): string {
  let content = '# LLMX Generated llms.txt\n'
  content += '# Generated on: ' + new Date().toISOString() + '\n'
  content += '# Total URLs: ' + urls.length + '\n\n'
  
  // Add rules as comments
  if (rules.length > 0) {
    content += '# Rules Applied:\n'
    rules.forEach(rule => {
      content += `# ${rule.type.toUpperCase()}: ${rule.pattern}`
      if (rule.description) {
        content += ` - ${rule.description}`
      }
      content += '\n'
    })
    content += '\n'
  }
  
  // Add URLs
  content += '# URLs for LLMs to crawl:\n'
  urls.forEach(url => {
    content += `Allow: ${url.loc}\n`
  })
  
  return content
}

function generateJsonSection(urls: SitemapUrl[], rules: LlmsTxtRule[]): string {
  const jsonData = {
    version: '1.0',
    generated_by: 'LLMX',
    generated_at: new Date().toISOString(),
    total_urls: urls.length,
    rules_applied: rules,
    urls: urls.map(url => ({
      url: url.loc,
      last_modified: url.lastmod,
      change_frequency: url.changefreq,
      priority: url.priority,
    })),
    metadata: {
      description: 'This file helps LLMs discover and understand the canonical content of this website.',
      usage: 'LLMs should prioritize these URLs when crawling and indexing this domain.',
      format: 'Combines robots.txt-style directives with structured JSON data.',
    },
  }
  
  return `# JSON Section (for programmatic access)\n<json>\n${JSON.stringify(jsonData, null, 2)}\n</json>`
}

export function validateLlmsTxt(content: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check for required sections
  if (!content.includes('# LLMX Generated llms.txt')) {
    errors.push('Missing LLMX header')
  }
  
  if (!content.includes('Allow:')) {
    errors.push('No Allow directives found')
  }
  
  if (!content.includes('<json>')) {
    errors.push('Missing JSON section')
  }
  
  // Check JSON syntax
  const jsonMatch = content.match(/<json>\s*(\{[\s\S]*?\})\s*<\/json>/)
  if (jsonMatch) {
    try {
      JSON.parse(jsonMatch[1])
    } catch (error) {
      errors.push('Invalid JSON syntax in JSON section')
    }
  } else {
    errors.push('JSON section not properly formatted')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const PRESET_RULES: Record<string, LlmsTxtRule[]> = {
  'blog': [
    { type: 'include', pattern: '/blog/', description: 'Include blog posts' },
    { type: 'exclude', pattern: '/blog/tag/', description: 'Exclude tag pages' },
    { type: 'exclude', pattern: '/blog/category/', description: 'Exclude category pages' },
  ],
  'docs': [
    { type: 'include', pattern: '/docs/', description: 'Include documentation' },
    { type: 'include', pattern: '/api/', description: 'Include API docs' },
    { type: 'exclude', pattern: '/docs/search', description: 'Exclude search pages' },
  ],
  'ecommerce': [
    { type: 'include', pattern: '/product/', description: 'Include product pages' },
    { type: 'include', pattern: '/category/', description: 'Include category pages' },
    { type: 'exclude', pattern: '/cart', description: 'Exclude cart pages' },
    { type: 'exclude', pattern: '/checkout', description: 'Exclude checkout pages' },
  ],
  'saas': [
    { type: 'include', pattern: '/pricing', description: 'Include pricing page' },
    { type: 'include', pattern: '/features', description: 'Include features page' },
    { type: 'include', pattern: '/docs/', description: 'Include documentation' },
    { type: 'exclude', pattern: '/admin', description: 'Exclude admin pages' },
    { type: 'exclude', pattern: '/dashboard', description: 'Exclude dashboard pages' },
  ],
}
