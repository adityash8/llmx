'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  GitBranch, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { getCurrentUser } from '@/lib/supabase'

interface GitHubPRProps {
  llmsTxtContent: string
  domain: string
  onSuccess?: (prUrl: string) => void
  onError?: (error: string) => void
}

export default function GitHubPR({ llmsTxtContent, domain, onSuccess, onError }: GitHubPRProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [repository, setRepository] = useState('')
  const [branch, setBranch] = useState('main')
  const [prUrl, setPrUrl] = useState('')

  useEffect(() => {
    const checkGitHubConnection = async () => {
      try {
        const user = await getCurrentUser()
        setIsConnected(!!user?.githubToken)
      } catch (error) {
        console.error('Error checking GitHub connection:', error)
      }
    }

    checkGitHubConnection()
  }, [])

  const handleConnectGitHub = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/github/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Redirect to GitHub OAuth
        window.location.href = data.authUrl
      } else {
        onError?.(data.error || 'Failed to initiate GitHub connection')
      }
    } catch (error) {
      onError?.('Failed to connect to GitHub')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePR = async () => {
    if (!repository.trim()) {
      onError?.('Please enter a repository name')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository,
          branch,
          content: llmsTxtContent,
          domain
        })
      })

      const data = await response.json()

      if (response.ok) {
        setPrUrl(data.prUrl)
        onSuccess?.(data.prUrl)
      } else {
        onError?.(data.error || 'Failed to create PR')
      }
    } catch (error) {
      onError?.('Failed to create PR')
    } finally {
      setIsLoading(false)
    }
  }

  if (prUrl) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">PR Created Successfully!</h3>
              <p className="text-green-700 text-sm">
                Your llms.txt file has been submitted as a pull request.
              </p>
            </div>
            <Button 
              size="sm" 
              onClick={() => window.open(prUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View PR
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5" />
            <span>Create GitHub PR</span>
          </CardTitle>
          <CardDescription>
            Connect your GitHub account to automatically create a pull request with your llms.txt file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Pro Feature</span>
              </div>
              <p className="text-blue-700 text-sm mt-1">
                GitHub PR creation is available for Pro and Agency plans.
              </p>
            </div>
            
            <Button 
              onClick={handleConnectGitHub} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <GitBranch className="h-4 w-4 mr-2" />
              )}
              Connect GitHub Account
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <GitBranch className="h-5 w-5" />
          <span>Create Pull Request</span>
        </CardTitle>
        <CardDescription>
          Create a pull request to add your llms.txt file to your repository
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repository
            </label>
            <Input
              placeholder="owner/repository"
              value={repository}
              onChange={(e) => setRepository(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: username/repository-name
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Branch
            </label>
            <Input
              placeholder="main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">What will be created:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• New branch: llmx-update-{Date.now()}</li>
              <li>• File: llms.txt (root directory)</li>
              <li>• PR title: "Add llms.txt for AI content discovery"</li>
              <li>• PR description: Generated automatically</li>
            </ul>
          </div>

          <Button 
            onClick={handleCreatePR} 
            disabled={isLoading || !repository.trim()}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <GitBranch className="h-4 w-4 mr-2" />
            )}
            Create Pull Request
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
