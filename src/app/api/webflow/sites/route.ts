import { NextRequest, NextResponse } from 'next/server'
import { WebflowClient } from '@/lib/webflow'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tokenData } = await supabase
      .from('webflow_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Webflow not connected' },
        { status: 404 }
      )
    }

    const webflow = new WebflowClient(tokenData.access_token)
    const sites = await webflow.getSites()

    const { data: existingSites } = await supabase
      .from('webflow_sites')
      .select('webflow_site_id')
      .eq('user_id', user.id)

    const existingSiteIds = new Set(existingSites?.map(s => s.webflow_site_id) || [])

    const newSites = sites.filter(site => !existingSiteIds.has(site.id))

    if (newSites.length > 0) {
      await supabase
        .from('webflow_sites')
        .insert(
          newSites.map(site => ({
            user_id: user.id,
            webflow_site_id: site.id,
            display_name: site.displayName,
            short_name: site.shortName,
            preview_url: site.previewUrl,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
        )
    }

    return NextResponse.json({ sites })
  } catch (error) {
    console.error('Error fetching Webflow sites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    )
  }
}
