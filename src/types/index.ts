export interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: number
}

export interface LlmsTxtRule {
  type: 'include' | 'exclude'
  pattern: string
  priority?: number
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
  webflowSiteId?: string
  sitemapUrl?: string
  rules: LlmsTxtRule[]
  urls: SitemapUrl[]
  validationIssues: ValidationIssue[]
  llmsTxtContent: string
  lastPublishedAt?: Date
  publishedFileUrl?: string
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

export interface WebflowSite {
  id: string
  webflowSiteId: string
  displayName: string
  shortName: string
  previewUrl?: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface WebflowToken {
  id: string
  userId: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  createdAt: Date
}

export interface User {
  id: string
  email: string
  name?: string
  plan: 'free' | 'pro' | 'agency'
  projects: Project[]
  webflowSites?: WebflowSite[]
  stripeCustomerId?: string
  usage: UserUsage
  subscription?: Subscription
}

export interface UserUsage {
  id: string
  userId: string
  generationsThisMonth: number
  lastGenerationDate: Date
  totalGenerations: number
  lastResetDate: Date
}

export interface Subscription {
  id: string
  userId: string
  plan: 'pro' | 'agency'
  status: 'active' | 'canceled' | 'past_due' | 'unpaid'
  stripeSubscriptionId: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
}

export interface PlanLimits {
  free: {
    generationsPerMonth: number
    maxUrlsPerGeneration: number
    features: string[]
  }
  pro: {
    generationsPerMonth: number
    maxUrlsPerGeneration: number
    features: string[]
  }
  agency: {
    generationsPerMonth: number
    maxUrlsPerGeneration: number
    features: string[]
  }
}
