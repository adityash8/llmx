'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Download, 
  Copy,
  Share2,
  ExternalLink,
  Star,
  TrendingUp
} from 'lucide-react'
import { ValidationIssue } from '@/types'
import { getScoreBadge } from '@/lib/validation'
import Navigation from '@/components/navigation'

export default function ValidatorPage() {
  const [domain, setDomain] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    score: number
    issues: ValidationIssue[]
    totalUrls: number
    validUrls: number
    llmsTxtContent: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!domain.trim()) return

    setIsLoading(true)
    setError(null)
    setValidationResult(null)

    try {
      const response = await fetch('/api/validate-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setValidationResult(data)
      } else {
        setError(data.error || 'Failed to validate domain')
      }
    } catch (error) {
      console.error('Error validating domain:', error)
      setError('Failed to validate domain. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (validationResult?.llmsTxtContent) {
      navigator.clipboard.writeText(validationResult.llmsTxtContent)
    }
  }

  const downloadFile = () => {
    if (validationResult?.llmsTxtContent) {
      const blob = new Blob([validationResult.llmsTxtContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'llms.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const shareResult = () => {
    if (validationResult) {
      const shareText = `Check out my site's AI readiness score: ${validationResult.score}/100! 🚀\n\nGenerated with LLMX - the llms.txt generator\n\n`
      const shareUrl = `${window.location.origin}/validator?domain=${encodeURIComponent(domain)}`
      
      if (navigator.share) {
        navigator.share({
          title: 'My AI Readiness Score',
          text: shareText,
          url: shareUrl
        })
      } else {
        navigator.clipboard.writeText(shareText + shareUrl)
        // You could show a toast here
      }
    }
  }

  const scoreBadge = validationResult ? getScoreBadge(validationResult.score) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4">
            🔍 Public Validator
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Readiness Validator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Check how well your site is optimized for AI discovery. Get instant validation, 
            shareable scores, and actionable recommendations.
          </p>
        </div>

        {/* Domain Input */}
        <Card className="max-w-2xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Validate Your Domain</span>
            </CardTitle>
            <CardDescription>
              Enter your domain to get an instant AI readiness score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleValidate} className="space-y-4">
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
                      Validate
                      <Search className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="max-w-2xl mx-auto mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Validation Error</span>
              </div>
              <p className="text-red-700 mt-2">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {validationResult && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Score Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Star className="h-5 w-5" />
                      <span>AI Readiness Score</span>
                    </CardTitle>
                    <CardDescription>
                      Based on {validationResult.totalUrls} URLs analyzed
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-gray-900 mb-2">
                      {validationResult.score}/100
                    </div>
                    <Badge variant={scoreBadge?.variant} className="text-lg px-4 py-2">
                      {scoreBadge?.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {validationResult.issues.filter(i => i.severity === 'error').length}
                    </div>
                    <div className="text-sm text-gray-600">Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {validationResult.issues.filter(i => i.severity === 'warning').length}
                    </div>
                    <div className="text-sm text-gray-600">Warnings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {validationResult.validUrls}
                    </div>
                    <div className="text-sm text-gray-600">Valid URLs</div>
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <Button onClick={shareResult} variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Score
                  </Button>
                  <Button onClick={() => window.location.href = '/generate'}>
                    Generate llms.txt
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Issues */}
            {validationResult.issues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Issues Found</CardTitle>
                  <CardDescription>
                    Fix these issues to improve your AI readiness score
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {validationResult.issues.map((issue, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${
                        issue.severity === 'error' ? 'border-red-200 bg-red-50' :
                        issue.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      }`}>
                        <div className="flex items-start space-x-3">
                          {issue.severity === 'error' ? (
                            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                          ) : issue.severity === 'warning' ? (
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {issue.message}
                            </div>
                            {issue.url && (
                              <div className="text-sm text-gray-600 mt-1">
                                URL: {issue.url}
                              </div>
                            )}
                            {issue.suggestion && (
                              <div className="text-sm text-gray-700 mt-2 p-2 bg-white rounded border">
                                💡 {issue.suggestion}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated llms.txt */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generated llms.txt</span>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={downloadFile}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="preview">
                  <TabsList>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="raw">Raw</TabsTrigger>
                  </TabsList>
                  <TabsContent value="preview" className="mt-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm whitespace-pre-wrap">{validationResult.llmsTxtContent}</pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="raw" className="mt-4">
                    <textarea
                      value={validationResult.llmsTxtContent}
                      readOnly
                      className="w-full h-64 p-4 border rounded-lg font-mono text-sm"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Instant Validation</CardTitle>
              <CardDescription>
                Get immediate feedback on your site's AI readiness with detailed scoring
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Share2 className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Shareable Results</CardTitle>
              <CardDescription>
                Share your AI readiness score with badges and social media integration
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Actionable Insights</CardTitle>
              <CardDescription>
                Get specific recommendations to improve your site's AI discoverability
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  )
}
