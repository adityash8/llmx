import { PlanLimits, User, UserUsage } from '@/types'

export const PLAN_LIMITS: PlanLimits = {
  free: {
    generationsPerMonth: 5,
    maxUrlsPerGeneration: 100,
    features: [
      'Generate llms.txt files',
      'Basic validation',
      'Download files',
      'Copy to clipboard'
    ]
  },
  pro: {
    generationsPerMonth: 100,
    maxUrlsPerGeneration: 1000,
    features: [
      'Everything in Free',
      'Auto-updates via GitHub PRs',
      'Advanced validation',
      'Priority support',
      'Custom rules',
      'Webhook integrations'
    ]
  },
  agency: {
    generationsPerMonth: 1000,
    maxUrlsPerGeneration: 10000,
    features: [
      'Everything in Pro',
      'Multiple projects',
      'Team collaboration',
      'API access',
      'Custom integrations',
      'Dedicated support'
    ]
  }
}

export function getPlanLimits(plan: 'free' | 'pro' | 'agency') {
  return PLAN_LIMITS[plan]
}

export function canGenerate(user: User): { canGenerate: boolean; reason?: string } {
  const limits = getPlanLimits(user.plan)
  const usage = user.usage

  // Check if user has exceeded monthly limit
  if (usage.generationsThisMonth >= limits.generationsPerMonth) {
    return {
      canGenerate: false,
      reason: `You've reached your monthly limit of ${limits.generationsPerMonth} generations. Upgrade to continue.`
    }
  }

  return { canGenerate: true }
}

export function canUseFeature(user: User, feature: string): boolean {
  const limits = getPlanLimits(user.plan)
  return limits.features.includes(feature)
}

export function getUpgradeMessage(user: User, feature: string): string {
  const currentPlan = user.plan
  const limits = getPlanLimits(currentPlan)
  
  if (limits.features.includes(feature)) {
    return ''
  }

  switch (currentPlan) {
    case 'free':
      return `This feature is available in Pro and Agency plans. Upgrade to unlock ${feature}.`
    case 'pro':
      return `This feature is available in Agency plan. Upgrade to unlock ${feature}.`
    default:
      return ''
  }
}

export function getUsagePercentage(user: User): number {
  const limits = getPlanLimits(user.plan)
  return Math.round((user.usage.generationsThisMonth / limits.generationsPerMonth) * 100)
}

export function getRemainingGenerations(user: User): number {
  const limits = getPlanLimits(user.plan)
  return Math.max(0, limits.generationsPerMonth - user.usage.generationsThisMonth)
}

export function shouldShowUpgradePrompt(user: User): boolean {
  const usagePercentage = getUsagePercentage(user)
  return user.plan === 'free' && usagePercentage >= 80
}

export function getPlanPrice(plan: 'pro' | 'agency'): { monthly: number; yearly: number } {
  const prices = {
    pro: { monthly: 19, yearly: 190 },
    agency: { monthly: 99, yearly: 990 }
  }
  return prices[plan]
}
