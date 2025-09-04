'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock, Crown, Building, Zap } from 'lucide-react'
import { User } from '@/types'
import { canUseFeature, getUpgradeMessage } from '@/lib/plans'

interface PremiumGateProps {
  user: User
  feature: string
  children: React.ReactNode
  onUpgrade?: () => void
  fallback?: React.ReactNode
}

export default function PremiumGate({ 
  user, 
  feature, 
  children, 
  onUpgrade, 
  fallback 
}: PremiumGateProps) {
  const hasAccess = canUseFeature(user, feature)
  const upgradeMessage = getUpgradeMessage(user, feature)

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  const getPlanIcon = () => {
    switch (user.plan) {
      case 'free': return Crown
      case 'pro': return Building
      default: return Crown
    }
  }

  const getUpgradePlan = () => {
    switch (user.plan) {
      case 'free': return 'Pro'
      case 'pro': return 'Agency'
      default: return 'Pro'
    }
  }

  const PlanIcon = getPlanIcon()
  const upgradePlan = getUpgradePlan()

  return (
    <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
          <Lock className="h-6 w-6 text-gray-500" />
        </div>
        <CardTitle className="text-xl">Premium Feature</CardTitle>
        <CardDescription>
          {upgradeMessage}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <PlanIcon className="h-5 w-5 text-purple-600" />
            <span className="font-medium">Upgrade to {upgradePlan}</span>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            {user.plan === 'free' && (
              <>
                <p>• 100 generations per month</p>
                <p>• Auto-updates via GitHub PRs</p>
                <p>• Advanced validation</p>
                <p>• Webhook integrations</p>
                <p>• Priority support</p>
              </>
            )}
            {user.plan === 'pro' && (
              <>
                <p>• 1,000 generations per month</p>
                <p>• Multiple projects</p>
                <p>• Team collaboration</p>
                <p>• API access</p>
                <p>• Dedicated support</p>
              </>
            )}
          </div>

          <Button onClick={onUpgrade} className="w-full">
            Upgrade to {upgradePlan}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Specific premium gate components for common features
export function GitHubPRGate({ user, children, onUpgrade }: { user: User; children: React.ReactNode; onUpgrade?: () => void }) {
  return (
    <PremiumGate 
      user={user} 
      feature="Auto-updates via GitHub PRs" 
      onUpgrade={onUpgrade}
    >
      {children}
    </PremiumGate>
  )
}

export function WebhookGate({ user, children, onUpgrade }: { user: User; children: React.ReactNode; onUpgrade?: () => void }) {
  return (
    <PremiumGate 
      user={user} 
      feature="Webhook integrations" 
      onUpgrade={onUpgrade}
    >
      {children}
    </PremiumGate>
  )
}

export function AdvancedValidationGate({ user, children, onUpgrade }: { user: User; children: React.ReactNode; onUpgrade?: () => void }) {
  return (
    <PremiumGate 
      user={user} 
      feature="Advanced validation" 
      onUpgrade={onUpgrade}
    >
      {children}
    </PremiumGate>
  )
}
