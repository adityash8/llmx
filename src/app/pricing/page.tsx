import Link from 'next/link'
import Navigation from '@/components/navigation'

export default function PricingPage() {
  return <><Navigation/><main className="workspace prose"><h1>Free pilot</h1><p>Generate and validate up to 500 imported URLs per run, then copy or download your file without an account.</p><p>Sign in to save one private project. Domain verification and GitHub pull requests are available when the site operator configures those integrations. Creating a pull request does not publish your site.</p><p>Paid plans, scheduled refreshes, and billing are not active in this pilot.</p><Link href="/generate">Build an llms.txt file</Link></main></>
}
