'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, Zap, Crown, Building } from 'lucide-react'
import { User } from '@/types'
import { getUsagePercentage, getRemainingGenerations, shouldShowUpgradePrompt, getPlanLimits } from '@/lib/plans'

interface UsageTrackerProps {
  user: User
  onUpgrade?: () => void
}

export default function UsageTracker({ user, onUpgrade }: UsageTrackerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const usagePercentage = getUsagePercentage(user)
  const remainingGenerations = getRemainingGenerations(user)
  const limits = getPlanLimits(user.plan)
  const showUpgradePrompt = shouldShowUpgradePrompt(user)

  useEffect(() => {
    // Show usage tracker if user is close to limit or has used some generations
    setIsVisible(user.usage.generationsThisMonth > 0 || showUpgradePrompt)
  }, [user.usage.generationsThisMonth, showUpgradePrompt])

  if (!isVisible) return null

  const getPlanIcon = () => {
    switch (user.plan) {
      case 'free': return Zap
      case 'pro': return Crown
      case 'agency': return Building
      default: return Zap
    }
  }

  const getPlanColor = () => {
    switch (user.plan) {
      case 'free': return 'text-blue-600'
      case 'pro': return 'text-purple-600'
      case 'agency': return 'text-orange-600'
      default: return 'text-blue-600'
    }
  }

  const PlanIcon = getPlanIcon()

  return (
    <Card className={`mb-6 ${showUpgradePrompt ? 'border-orange-200 bg-orange-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PlanIcon className={`h-5 w-5 ${getPlanColor()}`} />
            <CardTitle className="text-lg capitalize">{user.plan} Plan</CardTitle>
            {showUpgradePrompt && (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Near Limit
              </Badge>
            )}
          </div>
          {user.plan === 'free' && (
            <Button size="sm" onClick={onUpgrade}>
              Upgrade
            </Button>
          )}
        </div>
        <CardDescription>
          {remainingGenerations > 0 
            ? `${remainingGenerations} generations remaining this month`
            : 'Monthly limit reached'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Monthly Usage</span>
            <span>{user.usage.generationsThisMonth} / {limits.generationsPerMonth}</span>
          </div>
          <Progress 
            value={usagePercentage} 
            className={`h-2 ${usagePercentage >= 100 ? 'bg-red-200' : usagePercentage >= 80 ? 'bg-orange-200' : ''}`}
          />
          
          {showUpgradePrompt && (
            <div className="mt-4 p-3 bg-orange-100 border border-orange-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-orange-800">
                    You're approaching your monthly limit
                  </p>
                  <p className="text-orange-700 mt-1">
                    Upgrade to Pro for 100 generations per month and premium features like auto-updates.
                  </p>
                </div>
              </div>
            </div>
          )}

          {user.plan === 'free' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm">
                <p className="font-medium text-blue-800 mb-2">
                  Unlock Premium Features
                </p>
                <ul className="text-blue-700 space-y-1">
                  <li>• Auto-updates via GitHub PRs</li>
                  <li>• Advanced validation</li>
                  <li>• Webhook integrations</li>
                  <li>• Priority support</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
