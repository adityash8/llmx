import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { GET } from '../src/app/auth/callback/route'

test('missing and invalid confirmation codes show the fixed login error without reflecting the code', async () => {
  const missing = await GET(new NextRequest('https://llmx.example/auth/callback'))
  assert.equal(missing.headers.get('location'), 'https://llmx.example/auth/login?error=callback')

  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const previousFetch = globalThis.fetch
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-test-key'
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
    const invalid = await GET(new NextRequest('https://llmx.example/auth/callback?code=private-marker'))
    assert.equal(invalid.headers.get('location'), 'https://llmx.example/auth/login?error=callback')
    assert.ok(!invalid.headers.get('location')?.includes('private-marker'))
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousKey
  }
})
