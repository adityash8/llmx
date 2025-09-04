'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowRight } from 'lucide-react'
import Navigation from '@/components/navigation'

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionId) {
      // Verify the session and update user subscription
      verifySession(sessionId)
    } else {
      setError('No session ID provided')
      setIsLoading(false)
    }
  }, [sessionId])

  const verifySession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })

      if (response.ok) {
        setIsLoading(false)
      } else {
        setError('Failed to verify payment')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error verifying session:', error)
      setError('Failed to verify payment')
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Processing your payment...</h1>
            <p className="text-gray-600">Please wait while we confirm your subscription.</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800">Payment Verification Failed</CardTitle>
                <CardDescription className="text-red-700">
                  {error}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => window.location.href = '/pricing'}>
                  Back to Pricing
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Pro!
          </h1>
          
          <p className="text-xl text-gray-600 mb-8">
            Your subscription has been activated. You now have access to all premium features.
          </p>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
              <CardDescription>
                Here's what you can do with your new Pro plan:
              </CardDescription>
            </CardHeader>
            <CardContent className="text-left">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>100 generations per month</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Auto-updates via GitHub PRs</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Advanced validation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Webhook integrations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Priority support</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center space-x-4">
            <Button size="lg" onClick={() => window.location.href = '/generate'}>
              Start Generating
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => window.location.href = '/'}>
              Back to Home
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
