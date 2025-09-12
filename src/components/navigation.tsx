'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Zap, User, LogOut } from 'lucide-react'
import { getCurrentUser, signOut } from '@/lib/supabase'
import { User as UserType } from '@/types'

export default function Navigation() {
  const pathname = usePathname()
  const [user, setUser] = useState<UserType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      setUser(null)
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Zap className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">LLMX</h1>
        </Link>
        
        <nav className="flex items-center space-x-4">
          <Link href="/">
            <Button variant={pathname === '/' ? 'default' : 'ghost'}>
              Home
            </Button>
          </Link>
          <Link href="/validator">
            <Button variant={pathname === '/validator' ? 'default' : 'ghost'}>
              Validator
            </Button>
          </Link>
          <Link href="/generate">
            <Button variant={pathname === '/generate' ? 'default' : 'ghost'}>
              Generate
            </Button>
          </Link>
          {user && (
            <Link href="/dashboard">
              <Button variant={pathname === '/dashboard' ? 'default' : 'ghost'}>
                Dashboard
              </Button>
            </Link>
          )}
          <Link href="/pricing">
            <Button variant={pathname === '/pricing' ? 'default' : 'ghost'}>
              Pricing
            </Button>
          </Link>
          
          {/* Auth buttons */}
          {!isLoading && (
            <div className="flex items-center space-x-2">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">
                    {user.name || user.email}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button>
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
