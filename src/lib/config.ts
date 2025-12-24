import { z } from 'zod'

// Configuration schema for LLMX
export const ConfigSchema = z.object({
  company: z.object({
    name: z.string(),
    tagline: z.string(),
    website: z.string().url(),
    description: z.string(),
  }),
  sitemap: z.object({
    autoDetect: z.boolean().default(true),
    urls: z.array(z.string().url()).default([]),
    maxUrls: z.number().default(500),
    cacheTimeout: z.number().default(60 * 60 * 1000), // 1 hour
  }),
  rules: z.object({
    presets: z.record(z.string(), z.array(z.object({
      type: z.enum(['include', 'exclude']),
      pattern: z.string(),
      description: z.string(),
    }))).default({}),
    custom: z.array(z.object({
      type: z.enum(['include', 'exclude']),
      pattern: z.string(),
      description: z.string(),
    })).default([]),
  }),
  validation: z.object({
    checkStatus: z.boolean().default(true),
    checkCanonical: z.boolean().default(true),
    checkRobots: z.boolean().default(true),
    checkFreshness: z.boolean().default(true),
    maxConcurrent: z.number().default(10),
    timeout: z.number().default(5000),
  }),
  output: z.object({
    includeRobotsSection: z.boolean().default(true),
    includeJsonSection: z.boolean().default(true),
    includeMetadata: z.boolean().default(true),
    format: z.enum(['txt', 'json', 'both']).default('both'),
  }),
  integrations: z.object({
    github: z.object({
      enabled: z.boolean().default(false),
      createPR: z.boolean().default(true),
      branchPrefix: z.string().default('llmx-update'),
    }),
    webhooks: z.object({
      enabled: z.boolean().default(false),
      urls: z.array(z.string().url()).default([]),
    }),
  }),
})

export type Config = z.infer<typeof ConfigSchema>

// Default configuration
export const DEFAULT_CONFIG: Config = {
  company: {
    name: 'LLMX',
    tagline: 'The llms.txt Generator',
    website: 'https://llmx.dev',
    description: 'Generate, validate, and maintain production-ready llms.txt files',
  },
  sitemap: {
    autoDetect: true,
    urls: [],
    maxUrls: 500,
    cacheTimeout: 60 * 60 * 1000,
  },
  rules: {
    presets: {
      blog: [
        { type: 'include', pattern: '/blog/', description: 'Include blog posts' },
        { type: 'exclude', pattern: '/blog/tag/', description: 'Exclude tag pages' },
        { type: 'exclude', pattern: '/blog/category/', description: 'Exclude category pages' },
      ],
      docs: [
        { type: 'include', pattern: '/docs/', description: 'Include documentation' },
        { type: 'include', pattern: '/api/', description: 'Include API docs' },
        { type: 'exclude', pattern: '/docs/search', description: 'Exclude search pages' },
      ],
      ecommerce: [
        { type: 'include', pattern: '/product/', description: 'Include product pages' },
        { type: 'include', pattern: '/category/', description: 'Include category pages' },
        { type: 'exclude', pattern: '/cart', description: 'Exclude cart pages' },
        { type: 'exclude', pattern: '/checkout', description: 'Exclude checkout pages' },
      ],
      saas: [
        { type: 'include', pattern: '/pricing', description: 'Include pricing page' },
        { type: 'include', pattern: '/features', description: 'Include features page' },
        { type: 'include', pattern: '/docs/', description: 'Include documentation' },
        { type: 'exclude', pattern: '/admin', description: 'Exclude admin pages' },
        { type: 'exclude', pattern: '/dashboard', description: 'Exclude dashboard pages' },
      ],
    },
    custom: [],
  },
  validation: {
    checkStatus: true,
    checkCanonical: true,
    checkRobots: true,
    checkFreshness: true,
    maxConcurrent: 10,
    timeout: 5000,
  },
  output: {
    includeRobotsSection: true,
    includeJsonSection: true,
    includeMetadata: true,
    format: 'both',
  },
  integrations: {
    github: {
      enabled: false,
      createPR: true,
      branchPrefix: 'llmx-update',
    },
    webhooks: {
      enabled: false,
      urls: [],
    },
  },
}

// Load configuration from file or environment
export async function loadConfig(): Promise<Config> {
  try {
    // Try to load from config file
    const configPath = process.env.LLMX_CONFIG_PATH || './llmx.config.json'
    const configData = await import('fs/promises').then(fs => fs.readFile(configPath, 'utf8'))
    const config = ConfigSchema.parse(JSON.parse(configData))
    
    // Merge with defaults
    return { ...DEFAULT_CONFIG, ...config }
  } catch (error) {
    console.warn('Could not load config file, using defaults:', error)
    return DEFAULT_CONFIG
  }
}

// Validate configuration
export function validateConfig(config: Config): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  try {
    ConfigSchema.parse(config)
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`))
    } else {
      errors.push('Unknown configuration error')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}
