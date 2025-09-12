import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 })
    }

    // Get user from session
    const supabase = createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        state
      })
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      return NextResponse.json({ 
        error: 'Failed to exchange code for token' 
      }, { status: 400 })
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    const githubUser = await userResponse.json()

    if (!userResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to fetch GitHub user info' 
      }, { status: 400 })
    }

    // Save GitHub token to user record
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        github_token: tokenData.access_token,
        github_username: githubUser.login
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user with GitHub token:', updateError)
      return NextResponse.json({ 
        error: 'Failed to save GitHub integration' 
      }, { status: 500 })
    }

    // Redirect to dashboard with success message
    return NextResponse.redirect(new URL('/dashboard?github=connected', request.url))

  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const supabase = createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate OAuth URL
    const state = Math.random().toString(36).substring(7)
    const githubOAuthUrl = new URL('https://github.com/login/oauth/authorize')
    githubOAuthUrl.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID!)
    githubOAuthUrl.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL}/api/github/oauth`)
    githubOAuthUrl.searchParams.set('scope', 'repo,user:email')
    githubOAuthUrl.searchParams.set('state', state)

    return NextResponse.json({
      authUrl: githubOAuthUrl.toString()
    })

  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
