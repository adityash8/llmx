import { NextRequest, NextResponse } from 'next/server'
import { detectSitemap, parseSitemap } from '@/lib/sitemap'

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json()
    
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Detect sitemaps
    const sitemaps = await detectSitemap(domain)
    
    if (sitemaps.length === 0) {
      return NextResponse.json({ 
        sitemaps: [],
        message: 'No sitemaps found' 
      })
    }

    // Parse the first sitemap
    const result = await parseSitemap(sitemaps[0], 100) // Limit to 100 URLs for demo

    return NextResponse.json({
      sitemaps,
      selectedSitemap: sitemaps[0],
      urls: result.urls,
      analysis: result.analysis
    })

  } catch (error) {
    console.error('Error processing sitemap:', error)
    return NextResponse.json(
      { error: 'Failed to process sitemap' }, 
      { status: 500 }
    )
  }
}
