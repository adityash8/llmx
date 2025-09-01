'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Zap, CheckCircle, AlertTriangle } from 'lucide-react'

export default function DemoPage() {
  const [domain, setDomain] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTest = async () => {
    if (!domain.trim()) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Failed to process domain')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Zap className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">LLMX Demo</h1>
          </div>
          <p className="text-gray-600">Test the sitemap detection and parsing functionality</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test Domain</CardTitle>
            <CardDescription>
              Enter a domain to test sitemap detection and parsing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                placeholder="https://example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleTest} disabled={isLoading}>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Test
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Results</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Sitemaps Found:</h3>
                    <div className="space-y-2">
                      {result.sitemaps.map((sitemap: string, index: number) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-mono">{sitemap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">URLs Parsed:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{result.urls.length}</div>
                        <div className="text-sm text-gray-600">Total URLs</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{result.analysis.validUrls}</div>
                        <div className="text-sm text-gray-600">Valid URLs</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Sample URLs:</h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {result.urls.slice(0, 10).map((url: any, index: number) => (
                        <div key={index} className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
                          {url.loc}
                        </div>
                      ))}
                      {result.urls.length > 10 && (
                        <div className="text-sm text-gray-500 italic">
                          ... and {result.urls.length - 10} more URLs
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
