import Link from 'next/link'
import { Zap } from 'lucide-react'
export default function Navigation() {
  return <header className="app-nav"><Link className="brand" href="/"><Zap size={23} aria-hidden="true"/>LLMX</Link><nav aria-label="Main"><Link href="/generate">Generator</Link><Link href="/validator">Validator</Link><Link href="/dashboard">Projects</Link><Link href="/install">Install guide</Link></nav><Link href="/auth/login">Sign in</Link></header>
}
