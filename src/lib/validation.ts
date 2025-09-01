import { SitemapUrl, ValidationIssue, ValidationResult } from '@/types'

export async function validateUrls(urls: SitemapUrl[]): Promise<ValidationResult> {
  const issues: ValidationIssue[] = []
  const maxConcurrent = 10 // Limit concurrent requests
  
  // Process URLs in batches
  const batches = []
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    batches.push(urls.slice(i, i + maxConcurrent))
  }
  
  for (const batch of batches) {
    const batchPromises = batch.map(url => validateSingleUrl(url))
    const batchResults = await Promise.allSettled(batchPromises)
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        issues.push(...result.value)
      } else {
        issues.push({
          type: 'status',
          severity: 'error',
          message: `Failed to validate ${batch[index].loc}: ${result.reason}`,
          url: batch[index].loc,
        })
      }
    })
  }
  
  // Calculate score based on issues
  const score = calculateScore(issues)
  
  // Group issues by type
  const summary = {
    errors: issues.filter(issue => issue.severity === 'error').length,
    warnings: issues.filter(issue => issue.severity === 'warning').length,
    info: issues.filter(issue => issue.severity === 'info').length,
  }
  
  return { issues, score, summary }
}

async function validateSingleUrl(url: SitemapUrl): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = []
  
  try {
    const response = await fetch(url.loc, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'LLMX Bot/1.0',
      },
    })
    
    // Check status code
    if (response.status >= 400) {
      issues.push({
        type: 'status',
        severity: 'error',
        message: `HTTP ${response.status}: ${response.statusText}`,
        url: url.loc,
        suggestion: 'Check if the URL is correct and accessible',
      })
    } else if (response.status >= 300) {
      issues.push({
        type: 'status',
        severity: 'warning',
        message: `HTTP ${response.status}: ${response.statusText}`,
        url: url.loc,
        suggestion: 'Consider using the canonical URL instead',
      })
    }
    
    // Check for canonical URL conflicts
    const canonicalUrl = response.headers.get('link')
    if (canonicalUrl && canonicalUrl !== url.loc) {
      issues.push({
        type: 'canonical',
        severity: 'warning',
        message: `Canonical URL differs: ${canonicalUrl}`,
        url: url.loc,
        suggestion: `Use the canonical URL: ${canonicalUrl}`,
      })
    }
    
    // Check robots.txt conflicts
    const robotsHeader = response.headers.get('x-robots-tag')
    if (robotsHeader && robotsHeader.includes('noindex')) {
      issues.push({
        type: 'robots',
        severity: 'error',
        message: 'Page is marked as noindex',
        url: url.loc,
        suggestion: 'Remove noindex directive or exclude from llms.txt',
      })
    }
    
    // Check freshness
    const lastModified = response.headers.get('last-modified')
    if (lastModified && url.lastmod) {
      const lastModifiedDate = new Date(lastModified)
      const sitemapDate = new Date(url.lastmod)
      const daysDiff = Math.abs(lastModifiedDate.getTime() - sitemapDate.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysDiff > 30) {
        issues.push({
          type: 'freshness',
          severity: 'warning',
          message: `Sitemap lastmod differs from server by ${Math.round(daysDiff)} days`,
          url: url.loc,
          suggestion: 'Update sitemap with current last-modified date',
        })
      }
    }
    
  } catch (error) {
    issues.push({
      type: 'status',
      severity: 'error',
      message: `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      url: url.loc,
      suggestion: 'Check if the URL is accessible and the domain is correct',
    })
  }
  
  return issues
}

function calculateScore(issues: ValidationIssue[]): number {
  const totalIssues = issues.length
  if (totalIssues === 0) return 100
  
  let score = 100
  
  // Deduct points based on severity
  issues.forEach(issue => {
    switch (issue.severity) {
      case 'error':
        score -= 10
        break
      case 'warning':
        score -= 5
        break
      case 'info':
        score -= 2
        break
    }
  })
  
  // Bonus for having no critical issues
  const criticalIssues = issues.filter(issue => issue.severity === 'error').length
  if (criticalIssues === 0) {
    score += 10
  }
  
  return Math.max(0, Math.min(100, score))
}

export function checkDuplicateUrls(urls: SitemapUrl[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const urlMap = new Map<string, SitemapUrl[]>()
  
  // Group URLs by their normalized form
  urls.forEach(url => {
    const normalized = normalizeUrl(url.loc)
    if (!urlMap.has(normalized)) {
      urlMap.set(normalized, [])
    }
    urlMap.get(normalized)!.push(url)
  })
  
  // Check for duplicates
  urlMap.forEach((urlGroup, normalized) => {
    if (urlGroup.length > 1) {
      issues.push({
        type: 'duplicate',
        severity: 'warning',
        message: `Found ${urlGroup.length} duplicate URLs`,
        url: urlGroup[0].loc,
        suggestion: `Remove duplicates: ${urlGroup.map(u => u.loc).join(', ')}`,
      })
    }
  })
  
  return issues
}

function normalizeUrl(url: string): string {
  // Remove trailing slash and normalize
  return url.replace(/\/$/, '').toLowerCase()
}

export function getScoreBadge(score: number): { label: string; variant: 'success' | 'warning' | 'error' } {
  if (score >= 90) {
    return { label: 'A+', variant: 'success' }
  } else if (score >= 80) {
    return { label: 'A', variant: 'success' }
  } else if (score >= 70) {
    return { label: 'B', variant: 'warning' }
  } else if (score >= 60) {
    return { label: 'C', variant: 'warning' }
  } else {
    return { label: 'D', variant: 'error' }
  }
}
