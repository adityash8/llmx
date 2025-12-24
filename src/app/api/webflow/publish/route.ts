import { NextRequest, NextResponse } from 'next/server'
import { WebflowClient } from '@/lib/webflow'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { siteId, content, projectId } = body

    if (!siteId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
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

    const { data: siteData } = await supabase
      .from('webflow_sites')
      .select('*')
      .eq('webflow_site_id', siteId)
      .eq('user_id', user.id)
      .single()

    if (!siteData) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    console.log('Publishing llms.txt to Webflow site:', siteId)

    const fileUrl = await webflow.publishAsset(siteId, 'llms.txt', content)

    console.log('Published llms.txt successfully:', fileUrl)

    await supabase
      .from('projects')
      .update({
        last_published_at: new Date().toISOString(),
        published_file_url: fileUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', user.id)

    const site = await webflow.getSite(siteId)
    const domains = site.previewUrl ? [site.previewUrl] : []

    console.log('Publishing Webflow site to domains:', domains)
    await webflow.publishSite(siteId, domains)

    return NextResponse.json({
      success: true,
      fileUrl,
      publishedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error publishing to Webflow:', error)
    return NextResponse.json(
      {
        error: 'Failed to publish',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
