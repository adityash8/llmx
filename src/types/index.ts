export interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: number
}

export interface LlmsTxtRule {
  type: 'include' | 'exclude'
  pattern: string
  description?: string
}

export interface ValidationIssue {
  type: 'status' | 'canonical' | 'robots' | 'freshness' | 'duplicate'
  severity: 'error' | 'warning' | 'info'
  message: string
  url?: string
  suggestion?: string
}

export interface Project {
  id: string
  name: string
  domain: string
  sitemapUrl?: string
  rules: LlmsTxtRule[]
  urls: SitemapUrl[]
  validationIssues: ValidationIssue[]
  llmsTxtContent: string
  createdAt: Date
  updatedAt: Date
  userId: string
  isPublic?: boolean
  score?: number
}

export interface LlmsTxtContent {
  robotsSection: string
  jsonSection: string
  fullContent: string
}

export interface SitemapAnalysis {
  totalUrls: number
  validUrls: number
  invalidUrls: number
  lastModified: Date | null
  hasNestedSitemaps: boolean
  nestedSitemaps: string[]
}

export interface ValidationResult {
  issues: ValidationIssue[]
  score: number
  summary: {
    errors: number
    warnings: number
    info: number
  }
}

export interface GitHubPR {
  id: string
  url: string
  title: string
  branch: string
  status: 'pending' | 'merged' | 'closed'
  createdAt: Date
}

export interface User {
  id: string
  email: string
  name?: string
  plan: 'free' | 'pro' | 'agency'
  projects: Project[]
  githubToken?: string
  stripeCustomerId?: string
}
