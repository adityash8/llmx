import { NextRequest, NextResponse } from 'next/server'
import { getWebflowAuthUrl } from '@/lib/webflow'
import { createClient } from '@/lib/supabase-server'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = process.env.WEBFLOW_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_WEBFLOW_REDIRECT_URI

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'Webflow OAuth not configured' },
        { status: 500 }
      )
    }

    const state = randomBytes(32).toString('hex')

    await supabase
      .from('oauth_states')
      .insert({
        state,
        user_id: user.id,
        provider: 'webflow',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })

    const authUrl = getWebflowAuthUrl(clientId, redirectUri, state)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Error initiating Webflow OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    )
  }
}
