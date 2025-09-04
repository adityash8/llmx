'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, X, Zap, Crown, Building } from 'lucide-react'
import Navigation from '@/components/navigation'
import { getPlanPrice } from '@/lib/plans'

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const plans = [
    {
      name: 'Free',
      description: 'Perfect for getting started',
      price: { monthly: 0, yearly: 0 },
      icon: Zap,
      features: [
        '5 generations per month',
        'Up to 100 URLs per generation',
        'Basic validation',
        'Download files',
        'Copy to clipboard',
        'Community support'
      ],
      limitations: [
        'No auto-updates',
        'No GitHub PRs',
        'No webhooks',
        'No priority support'
      ],
      cta: 'Current Plan',
      popular: false,
      plan: 'free' as const
    },
    {
      name: 'Pro',
      description: 'For growing websites',
      price: getPlanPrice('pro'),
      icon: Crown,
      features: [
        '100 generations per month',
        'Up to 1,000 URLs per generation',
        'Auto-updates via GitHub PRs',
        'Advanced validation',
        'Custom rules',
        'Webhook integrations',
        'Priority support',
        'Email support'
      ],
      limitations: [],
      cta: 'Upgrade to Pro',
      popular: true,
      plan: 'pro' as const
    },
    {
      name: 'Agency',
      description: 'For agencies and enterprises',
      price: getPlanPrice('agency'),
      icon: Building,
      features: [
        '1,000 generations per month',
        'Up to 10,000 URLs per generation',
        'Everything in Pro',
        'Multiple projects',
        'Team collaboration',
        'API access',
        'Custom integrations',
        'Dedicated support',
        'SLA guarantee'
      ],
      limitations: [],
      cta: 'Upgrade to Agency',
      popular: false,
      plan: 'agency' as const
    }
  ]

  const handleUpgrade = async (plan: 'pro' | 'agency') => {
    try {
      // For demo purposes, we'll use a mock user ID
      // In a real app, you'd get this from authentication
      const userId = 'demo-user-id'
      const userEmail = 'demo@example.com'

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          billingCycle,
          userId,
          userEmail
        })
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        console.error('Checkout error:', data.error)
        alert('Failed to start checkout. Please try again.')
      }
    } catch (error) {
      console.error('Error starting checkout:', error)
      alert('Failed to start checkout. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />

      <main className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            💰 Simple, Transparent Pricing
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Start free and upgrade as you grow. All plans include core llms.txt generation features.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <Badge variant="secondary" className="ml-2">
                Save 17%
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon
            const price = billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly
            const monthlyPrice = billingCycle === 'yearly' ? Math.round(plan.price.yearly / 12) : plan.price.monthly

            return (
              <Card key={plan.name} className={`relative ${plan.popular ? 'border-blue-500 shadow-lg scale-105' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${price}</span>
                    {billingCycle === 'yearly' && price > 0 && (
                      <span className="text-gray-500">/year</span>
                    )}
                    {billingCycle === 'monthly' && price > 0 && (
                      <span className="text-gray-500">/month</span>
                    )}
                    {price === 0 && (
                      <span className="text-gray-500">/forever</span>
                    )}
                  </div>
                  {billingCycle === 'yearly' && price > 0 && (
                    <p className="text-sm text-gray-600">
                      ${monthlyPrice}/month billed yearly
                    </p>
                  )}
                </CardHeader>

                <CardContent>
                  <Button 
                    className="w-full mb-6" 
                    variant={plan.popular ? 'default' : 'outline'}
                    disabled={plan.plan === 'free'}
                    onClick={() => plan.plan !== 'free' && handleUpgrade(plan.plan)}
                  >
                    {plan.cta}
                  </Button>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-gray-900">What's included:</h4>
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                    
                    {plan.limitations.length > 0 && (
                      <>
                        <h4 className="font-semibold text-sm text-gray-900 mt-4">Not included:</h4>
                        {plan.limitations.map((limitation, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <X className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-500">{limitation}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-2">What happens when I reach my limit?</h3>
              <p className="text-gray-600 text-sm">
                You'll be prompted to upgrade to continue generating llms.txt files. Your existing files remain accessible.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
              <p className="text-gray-600 text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What's included in auto-updates?</h3>
              <p className="text-gray-600 text-sm">
                Pro and Agency plans can automatically create GitHub PRs when your sitemap changes, keeping your llms.txt up to date.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-gray-600 text-sm">
                Yes, we offer a 30-day money-back guarantee for all paid plans. No questions asked.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
