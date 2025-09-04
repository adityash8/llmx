'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
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
  GitBranch,
  Settings,
  Copy
} from 'lucide-react'
import { filterUrlsByRules } from '@/lib/sitemap'
import { PRESET_RULES } from '@/lib/llms-txt'
import { getScoreBadge } from '@/lib/validation'
import { SitemapUrl, LlmsTxtRule, ValidationIssue, User } from '@/types'
import Navigation from '@/components/navigation'
import UsageTracker from '@/components/usage-tracker'
import { GitHubPRGate } from '@/components/premium-gate'

export default function GeneratePage() {
  const searchParams = useSearchParams()
  const domain = searchParams.get('domain') || ''
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [sitemapUrls, setSitemapUrls] = useState<string[]>([])
  const [selectedSitemap, setSelectedSitemap] = useState('')
  const [parsedUrls, setParsedUrls] = useState<SitemapUrl[]>([])
  const [rules, setRules] = useState<LlmsTxtRule[]>([])
  const [filteredUrls, setFilteredUrls] = useState<SitemapUrl[]>([])
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([])
  const [validationScore, setValidationScore] = useState(0)
  const [llmsTxtContent, setLlmsTxtContent] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Detect sitemap
  useEffect(() => {
    if (domain && currentStep === 1) {
      detectSitemapForDomain()
    }
  }, [domain, currentStep, detectSitemapForDomain])

  // Step 2: Parse sitemap
  useEffect(() => {
    if (selectedSitemap && currentStep === 2) {
      // This step is now handled in the API call
      setCurrentStep(3)
    }
  }, [selectedSitemap, currentStep])

  // Step 3: Apply rules and generate
  useEffect(() => {
    if (parsedUrls.length > 0 && currentStep === 3 && rules.length > 0) {
      applyRulesAndGenerate()
    }
  }, [parsedUrls, rules, currentStep, applyRulesAndGenerate])

  const detectSitemapForDomain = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSitemapUrls(data.sitemaps)
        if (data.sitemaps.length > 0) {
          setSelectedSitemap(data.selectedSitemap)
          setParsedUrls(data.urls)
          setCurrentStep(3) // Skip to rules since we already have URLs
        }
      } else {
        console.error('Error:', data.error)
      }
    } catch (error) {
      console.error('Error detecting sitemap:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const applyRulesAndGenerate = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Apply rules
      const filtered = filterUrlsByRules(parsedUrls, rules)
      setFilteredUrls(filtered)

      // Generate llms.txt via API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          urls: filtered, 
          rules,
          userId: user?.id // Include user ID for usage tracking
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setLlmsTxtContent(data.llmsTxt.fullContent)
        setValidationIssues(data.validation.issues)
        setValidationScore(data.validation.score)
        setCurrentStep(4)
      } else {
        if (data.code === 'USAGE_LIMIT_EXCEEDED' || data.code === 'URL_LIMIT_EXCEEDED') {
          setError(data.error)
        } else {
          console.error('Error:', data.error)
          setError('Failed to generate llms.txt. Please try again.')
        }
      }
    } catch (error) {
      console.error('Error generating llms.txt:', error)
      setError('Failed to generate llms.txt. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset)
    if (preset && PRESET_RULES[preset]) {
      setRules(PRESET_RULES[preset])
    } else {
      setRules([])
    }
  }

  const addCustomRule = () => {
    setRules([...rules, { type: 'include', pattern: '', description: '' }])
  }

  const updateRule = (index: number, field: keyof LlmsTxtRule, value: string) => {
    const updatedRules = [...rules]
    updatedRules[index] = { ...updatedRules[index], [field]: value }
    setRules(updatedRules)
  }

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index))
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(llmsTxtContent)
  }

  const downloadFile = () => {
    const blob = new Blob([llmsTxtContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'llms.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const scoreBadge = getScoreBadge(validationScore)

  const handleUpgrade = () => {
    window.location.href = '/pricing'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        {/* Usage Tracker */}
        {user && (
          <UsageTracker user={user} onUpgrade={handleUpgrade} />
        )}

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-red-700 mt-2">{error}</p>
              {error.includes('limit') && (
                <Button 
                  size="sm" 
                  className="mt-3"
                  onClick={handleUpgrade}
                >
                  Upgrade Plan
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-4 text-sm text-gray-600">
            {currentStep === 1 && 'Detecting sitemap...'}
            {currentStep === 2 && 'Parsing sitemap...'}
            {currentStep === 3 && 'Applying rules...'}
            {currentStep === 4 && 'Generated successfully!'}
          </div>
        </div>

        {/* Step 1: Sitemap Detection */}
        {currentStep === 1 && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Detecting Sitemap</span>
              </CardTitle>
              <CardDescription>
                We found the following sitemaps for {domain}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                  <p>Detecting sitemaps...</p>
                </div>
              ) : sitemapUrls.length > 0 ? (
                <div className="space-y-4">
                  {sitemapUrls.map((url) => (
                    <div key={url} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="flex-1 text-sm">{url}</span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedSitemap(url)
                          setCurrentStep(2)
                        }}
                      >
                        Use This
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-gray-600">No sitemaps found. You can manually enter a sitemap URL.</p>
                  <div className="mt-4">
                    <Input
                      placeholder="https://example.com/sitemap.xml"
                      value={selectedSitemap}
                      onChange={(e) => setSelectedSitemap(e.target.value)}
                      className="mb-4"
                    />
                    <Button onClick={() => setCurrentStep(2)} disabled={!selectedSitemap}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Sitemap Parsing */}
        {currentStep === 2 && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Parsing Sitemap</CardTitle>
              <CardDescription>
                Found {parsedUrls.length} URLs in {selectedSitemap}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                  <p>Parsing sitemap...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>{parsedUrls.length}</strong> URLs found
                    </p>
                  </div>
                  <Button onClick={() => setCurrentStep(3)}>
                    Continue to Rules
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Rules Configuration */}
        {currentStep === 3 && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Configure Rules</span>
                </CardTitle>
                <CardDescription>
                  Choose preset rules or create custom include/exclude patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Preset Rules */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Preset Rules</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.keys(PRESET_RULES).map((preset) => (
                        <Button
                          key={preset}
                          variant={selectedPreset === preset ? 'default' : 'outline'}
                          onClick={() => handlePresetChange(preset)}
                          className="capitalize"
                        >
                          {preset}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Rules */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">Custom Rules</h3>
                      <Button size="sm" onClick={addCustomRule}>
                        Add Rule
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {rules.map((rule, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                          <select
                            value={rule.type}
                            onChange={(e) => updateRule(index, 'type', e.target.value as 'include' | 'exclude')}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="include">Include</option>
                            <option value="exclude">Exclude</option>
                          </select>
                          <Input
                            placeholder="Pattern (regex)"
                            value={rule.pattern}
                            onChange={(e) => updateRule(index, 'pattern', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Description"
                            value={rule.description || ''}
                            onChange={(e) => updateRule(index, 'description', e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeRule(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button onClick={applyRulesAndGenerate} disabled={isLoading}>
                    {isLoading ? 'Generating...' : 'Generate llms.txt'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Results */}
        {currentStep === 4 && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Validation Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Validation Results</span>
                  <Badge variant={scoreBadge.variant}>
                    Score: {scoreBadge.label}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {validationIssues.filter(i => i.severity === 'error').length}
                    </div>
                    <div className="text-sm text-gray-600">Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {validationIssues.filter(i => i.severity === 'warning').length}
                    </div>
                    <div className="text-sm text-gray-600">Warnings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {filteredUrls.length}
                    </div>
                    <div className="text-sm text-gray-600">Valid URLs</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* llms.txt Content */}
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
                    {user ? (
                      <GitHubPRGate user={user} onUpgrade={handleUpgrade}>
                        <Button size="sm">
                          <GitBranch className="h-4 w-4 mr-2" />
                          Create PR
                        </Button>
                      </GitHubPRGate>
                    ) : (
                      <Button size="sm" disabled>
                        <GitBranch className="h-4 w-4 mr-2" />
                        Create PR
                      </Button>
                    )}
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
                      <pre className="text-sm whitespace-pre-wrap">{llmsTxtContent}</pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="raw" className="mt-4">
                    <textarea
                      value={llmsTxtContent}
                      readOnly
                      className="w-full h-64 p-4 border rounded-lg font-mono text-sm"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
