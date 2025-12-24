'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Plus, RefreshCw, ArrowRight } from 'lucide-react'
import Navigation from '@/components/navigation'

interface WebflowSite {
  id: string
  displayName: string
  shortName: string
  previewUrl?: string
}

export default function WebflowSitesPage() {
  const [sites, setSites] = useState<WebflowSite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadSites()
  }, [])

  const loadSites = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/webflow/sites')

      if (!response.ok) {
        if (response.status === 404) {
          setError('Webflow not connected')
        } else {
          throw new Error('Failed to load sites')
        }
        return
      }

      const data = await response.json()
      setSites(data.sites)
    } catch (error) {
      console.error('Error loading sites:', error)
      setError('Failed to load Webflow sites')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      const response = await fetch('/api/webflow/authorize')
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        throw new Error('Failed to get authorization URL')
      }
    } catch (error) {
      console.error('Error connecting to Webflow:', error)
      setError('Failed to connect to Webflow')
      setIsConnecting(false)
    }
  }

  const handleSelectSite = (site: WebflowSite) => {
    router.push(`/generate?webflowSiteId=${site.id}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p>Loading Webflow sites...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Webflow Sites</h1>
              <p className="text-gray-600">Select a site to generate llms.txt</p>
            </div>
            <div className="flex space-x-4">
              {sites.length > 0 && (
                <Button variant="outline" onClick={loadSites}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              )}
              {!error && sites.length > 0 && (
                <Button onClick={handleConnect} disabled={isConnecting}>
                  <Plus className="h-4 w-4 mr-2" />
                  {isConnecting ? 'Connecting...' : 'Connect Another Site'}
                </Button>
              )}
            </div>
          </div>

          {error === 'Webflow not connected' ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <svg
                    className="h-16 w-16 text-blue-600 mx-auto mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Connect Webflow
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Connect your Webflow account to start generating llms.txt files for your sites
                  </p>
                  <Button onClick={handleConnect} disabled={isConnecting}>
                    {isConnecting ? 'Connecting...' : 'Connect to Webflow'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={loadSites}>Try Again</Button>
                </div>
              </CardContent>
            </Card>
          ) : sites.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">No Webflow sites found</p>
                  <Button onClick={handleConnect} disabled={isConnecting}>
                    {isConnecting ? 'Connecting...' : 'Reconnect to Webflow'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {sites.map((site) => (
                <Card
                  key={site.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleSelectSite(site)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {site.displayName}
                          </h3>
                          <Badge variant="outline">{site.shortName}</Badge>
                        </div>
                        {site.previewUrl && (
                          <a
                            href={site.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {site.previewUrl}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>What happens next?</CardTitle>
              <CardDescription>
                Select a site to begin the llms.txt generation process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>We'll automatically detect your sitemap.xml</li>
                <li>You can configure rules to include/exclude URLs</li>
                <li>We'll validate all URLs and flag any issues</li>
                <li>Generate and preview your llms.txt file</li>
                <li>Publish directly to your Webflow site</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
