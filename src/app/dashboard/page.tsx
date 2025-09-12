'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  ExternalLink, 
  Calendar,
  TrendingUp,
  Settings,
  FileText,
  GitBranch,
  AlertTriangle
} from 'lucide-react'
import Navigation from '@/components/navigation'
import { Project, User } from '@/types'
import { getCurrentUser, getUserProjects } from '@/lib/supabase'

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await getCurrentUser()
        
        if (!currentUser) {
          router.push('/auth/login')
          return
        }

        setUser(currentUser)
        
        const userProjects = await getUserProjects(currentUser.id)
        setProjects(userProjects)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        setError('Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleCreateProject = () => {
    window.location.href = '/generate'
  }

  const handleViewProject = (projectId: string) => {
    window.location.href = `/project/${projectId}`
  }

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: 'A+', variant: 'success' as const }
    if (score >= 80) return { label: 'A', variant: 'success' as const }
    if (score >= 70) return { label: 'B', variant: 'warning' as const }
    if (score >= 60) return { label: 'C', variant: 'warning' as const }
    return { label: 'D', variant: 'error' as const }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p>Loading dashboard...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-red-700 mt-2">{error}</p>
              <Button 
                className="mt-4" 
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Manage your llms.txt projects</p>
          </div>
          <div className="flex space-x-4">
            <Button variant="outline" onClick={() => window.location.href = '/validator'}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Public Validator
            </Button>
            <Button onClick={handleCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.length > 0 ? Math.round(projects.reduce((acc, p) => acc + (p.score || 0), 0) / projects.length) : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <GitBranch className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active PRs</p>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Last Updated</p>
                  <p className="text-sm font-bold text-gray-900">
                    {projects.length > 0 ? new Date(Math.max(...projects.map(p => new Date(p.updated_at).getTime()))).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Your Projects</h2>
            <Badge variant="secondary">
              {user?.plan || 'free'} plan
            </Badge>
          </div>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                  <p className="text-gray-600 mb-6">
                    Create your first llms.txt project to get started
                  </p>
                  <Button onClick={handleCreateProject}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {projects.map((project) => {
                const scoreBadge = getScoreBadge(project.score || 0)
                return (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {project.name}
                            </h3>
                            {project.score && (
                              <Badge variant={scoreBadge.variant}>
                                {scoreBadge.label}
                              </Badge>
                            )}
                            {project.is_public && (
                              <Badge variant="outline">Public</Badge>
                            )}
                          </div>
                          <p className="text-gray-600 mb-2">{project.domain}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                            <span>Updated: {new Date(project.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewProject(project.id)}
                          >
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/generate'}>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Plus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Create New Project</h3>
                    <p className="text-sm text-gray-600">Generate a new llms.txt file</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/validator'}>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <ExternalLink className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Public Validator</h3>
                    <p className="text-sm text-gray-600">Check any domain's AI readiness</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/pricing'}>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Upgrade Plan</h3>
                    <p className="text-sm text-gray-600">Unlock advanced features</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
