import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const failureResponse = NextResponse.redirect(new URL('/auth/login?error=callback', request.url))
  if (!code || !url || !key) return failureResponse

  let response = NextResponse.redirect(new URL('/dashboard', request.url))
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: cookies => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.redirect(new URL('/dashboard', request.url))
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  try {
    const { error } = await client.auth.exchangeCodeForSession(code)
    return error ? failureResponse : response
  } catch {
    return failureResponse
  }
}
