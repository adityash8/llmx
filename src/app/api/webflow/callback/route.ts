import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/webflow'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard?error=${error}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard?error=missing_parameters', request.url)
    )
  }

  try {
    const supabase = await createClient()

    const { data: oauthState } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('provider', 'webflow')
      .single()

    if (!oauthState) {
      return NextResponse.redirect(
        new URL('/dashboard?error=invalid_state', request.url)
      )
    }

    if (new Date(oauthState.expires_at) < new Date()) {
      return NextResponse.redirect(
        new URL('/dashboard?error=expired_state', request.url)
      )
    }

    const clientId = process.env.WEBFLOW_CLIENT_ID!
    const clientSecret = process.env.WEBFLOW_CLIENT_SECRET!
    const redirectUri = process.env.NEXT_PUBLIC_WEBFLOW_REDIRECT_URI!

    const tokens = await exchangeCodeForTokens(
      code,
      clientId,
      clientSecret,
      redirectUri
    )

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null

    await supabase
      .from('webflow_tokens')
      .upsert({
        user_id: oauthState.user_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt?.toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    await supabase
      .from('oauth_states')
      .delete()
      .eq('state', state)

    return NextResponse.redirect(
      new URL('/dashboard/webflow/sites', request.url)
    )
  } catch (error) {
    console.error('Error in Webflow OAuth callback:', error)
    return NextResponse.redirect(
      new URL('/dashboard?error=oauth_failed', request.url)
    )
  }
}
