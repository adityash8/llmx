'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Zap } from 'lucide-react'

export default function Navigation() {
  const pathname = usePathname()

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
          <Link href="/demo">
            <Button variant={pathname === '/demo' ? 'default' : 'ghost'}>
              Demo
            </Button>
          </Link>
          <Link href="/generate">
            <Button variant={pathname === '/generate' ? 'default' : 'ghost'}>
              Generate
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
