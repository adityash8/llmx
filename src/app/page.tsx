'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Zap, Shield, CheckCircle, ArrowRight } from 'lucide-react'
import Navigation from '@/components/navigation'

export default function HomePage() {
  const [domain, setDomain] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!domain.trim()) return

    setIsLoading(true)
    // Redirect to generate page with domain
    window.location.href = `/generate?domain=${encodeURIComponent(domain)}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            🚀 The llms.txt Generator
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Tell AI what to read
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Generate, validate, and maintain production-ready llms.txt files so large language models can reliably discover your site's canonical content.
          </p>
          
          {/* Domain Input Form */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Enter your domain</span>
              </CardTitle>
              <CardDescription>
                We'll automatically detect your sitemap and generate a clean llms.txt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <>
                        Generate
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Auto-Detect Sitemaps</CardTitle>
              <CardDescription>
                Automatically finds and parses your sitemap.xml, including nested sitemaps
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Smart Validation</CardTitle>
              <CardDescription>
                Validates URLs for status codes, canonical conflicts, and robots.txt issues
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Production Ready</CardTitle>
              <CardDescription>
                Export to file or create GitHub PRs with automatic refresh scheduling
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to make your site AI-ready?
          </h2>
          <p className="text-gray-600 mb-8">
            Join thousands of sites using LLMX to ensure LLMs discover their best content
          </p>
          <div className="flex justify-center space-x-4">
            <Button size="lg">Start Free Trial</Button>
            <Button variant="outline" size="lg">View Demo</Button>
          </div>
        </div>
      </main>
    </div>
  )
}
