import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateLlmsTxt, validateLlmsTxt } from '../src/lib/llms-txt'
import { filterUrlsByRules, selectProjectUrls } from '../src/lib/rules'
import { publicUrl, publicRedirect, safeFetch } from '../src/lib/safe-fetch'
import { inspectPage, validateUrls } from '../src/lib/validation'
import { parseSitemapXml } from '../src/lib/sitemap'
import { createGithubPR, decryptToken, encryptToken, consumeGithubQuota } from '../src/lib/github'
import { projectSchema } from '../src/lib/projects'
import { normalizeDomain } from '../src/lib/sitemap'

const pages = [
  { loc: 'https://example.com/docs/start', lastmod: '2026-01-01' },
  { loc: 'https://example.com/help/faq' },
  { loc: 'https://example.com/docs/search' },
  { loc: 'https://example.com/pricing' },
]

test('include rules use OR, exclusions win, and proposal output validates', () => {
  const rules = [
    { type: 'include' as const, pattern: '/docs/' },
    { type: 'include' as const, pattern: '/help/' },
    { type: 'exclude' as const, pattern: 'glob:/docs/search' },
  ]
  const selected = filterUrlsByRules(pages, rules)
  assert.deepEqual(selected.map(page => page.loc), [pages[0].loc, pages[1].loc])
  const file = generateLlmsTxt(selected, rules, { siteName: 'Example', description: 'Documentation' })
  assert.match(file.fullContent, /^# Example\n\n> Documentation\n\n## Pages/m)
  assert.equal(validateLlmsTxt(file.fullContent).isValid, true)
  assert.equal(JSON.parse(file.jsonSection).pages.length, 2)
  assert.match(file.robotsSection, /nonstandard/i)
  assert.equal(validateLlmsTxt(`${file.fullContent}\nDisallow: /`).isValid, false)
  assert.equal(validateLlmsTxt('# Site\n\n- [Broken](https://example.com)').isValid, false)
})

test('safe fetch rejects private targets and unsupported ports before network access', async () => {
  for (const value of ['http://127.0.0.1/', 'http://10.0.0.1/', 'http://[::1]/', 'http://169.254.169.254/latest/meta-data/', 'http://example.com:8080/']) {
    assert.throws(() => publicUrl(value))
    await assert.rejects(() => safeFetch(value))
  }
})

test('public fetch, project domains, and every redirect require HTTPS', async () => {
  assert.throws(() => publicUrl('http://example.com/path'), /HTTPS/)
  assert.throws(() => normalizeDomain('http://example.com'), /HTTPS/)
  assert.equal(normalizeDomain('example.com'), 'https://example.com')
  const current = publicUrl('https://example.com/sitemap.xml')
  assert.throws(() => publicRedirect('http://example.com/next', current), /HTTPS/)
  assert.throws(() => publicRedirect('//example.com:80/next', current), /HTTPS/)
  assert.equal(publicRedirect('/next', current), 'https://example.com/next')
  await assert.rejects(() => safeFetch('http://example.com/path'), /HTTPS/)
})

test('saved checkbox exclusions survive sitemap URL normalization and remain separate from text rules', () => {
  const rules = [{ type: 'exclude' as const, pattern: '/search' }]
  const saved = projectSchema.parse({ name:'Example',domain:'https://example.com',urls:pages,rules,excludedUrls:['https://EXAMPLE.com:443/docs/start/'],content:'# Example' })
  const refreshed = [
    { loc:'https://example.com/docs/start' },
    { loc:'https://example.com/docs/added' },
    { loc:'https://example.com/docs/search' },
  ]
  assert.deepEqual(selectProjectUrls(refreshed,saved.rules,saved.excludedUrls).map(page=>page.loc), ['https://example.com/docs/added'])
  assert.deepEqual(saved.rules,rules)
})

test('durable provider quota rejects replay and storage errors before any provider read', async () => {
  let used = 0; let reads = 0
  const rpc = async (_name:string,args:{p_user:string}) => {assert.equal(args.p_user,'user-one');return {data:++used<=10,error:null}}
  for(let i=0;i<10;i++){await consumeGithubQuota('user-one',rpc);reads++}
  await assert.rejects(() => consumeGithubQuota('user-one',rpc), {status:429})
  assert.equal(reads,10)
  assert.equal(used,11)
  await assert.rejects(() => consumeGithubQuota('user-one',async()=>({data:null,error:new Error('storage offline')})), {status:503})
  assert.equal(reads,10)
})

test('sitemap parser bounds entries and rejects entity declarations', () => {
  const xml = `<urlset>${Array.from({ length: 8 }, (_, i) => `<url><loc>https://example.com/${i}</loc></url>`).join('')}</urlset>`
  const parsed = parseSitemapXml(xml, 3)
  assert.equal(parsed.urls.length, 3)
  assert.equal(parsed.analysis.totalUrls, 8)
  assert.throws(() => parseSitemapXml('<!DOCTYPE x><urlset></urlset>'))
})

test('validation excludes failed, canonical and robots blocked pages in safe mode', async () => {
  const selected = pages.slice(0, 2)
  const result = await validateUrls(selected, async url => url.endsWith('robots.txt')
    ? { status: 200, text: 'User-agent: *\nDisallow: /help', headers: {}, url }
    : { status: 200, text: url.includes('/docs/') ? '<link rel="canonical" href="/docs/other">' : '', headers: {}, url })
  assert.equal(result.checked, 2)
  assert.equal(result.safeUrls.length, 0)
  assert.ok(result.issues.some(issue => issue.type === 'canonical'))
  assert.ok(result.issues.some(issue => issue.type === 'robots'))
  const stale = inspectPage(pages[0], { status: 404, text: '', headers: {}, url: pages[0].loc }, '', Date.parse('2027-12-01'))
  assert.ok(stale.some(issue => issue.type === 'status' && issue.severity === 'error'))
  assert.ok(stale.some(issue => issue.type === 'freshness'))
})

test('GitHub adapter refuses a provider error without reporting a PR', async () => {
  await assert.rejects(() => createGithubPR('opaque', 'owner', 'repo', 'public/llms.txt', '# Site', async () => new Response('{}', { status: 403 })), /GitHub returned HTTP 403/)
})

test('integration token encryption requires a configured key and round trips without plaintext storage', () => {
  const previous = process.env.LLMX_TOKEN_ENCRYPTION_KEY
  try {
    delete process.env.LLMX_TOKEN_ENCRYPTION_KEY
    assert.throws(() => encryptToken('secret'))
    process.env.LLMX_TOKEN_ENCRYPTION_KEY = 'a'.repeat(64)
    const stored = encryptToken('secret')
    assert.ok(!stored.includes('secret'))
    assert.equal(decryptToken(stored), 'secret')
  } finally {
    if (previous === undefined) delete process.env.LLMX_TOKEN_ENCRYPTION_KEY
    else process.env.LLMX_TOKEN_ENCRYPTION_KEY = previous
  }
})

test('private project payload cannot choose its owner or verified state', () => {
  const parsed = projectSchema.parse({
    name: 'Example', domain: 'https://example.com', urls: [{ loc: 'https://example.com/docs' }],
    content: '# Example', user_id: 'attacker-chosen', verified_at: '2026-01-01T00:00:00Z',
  })
  assert.equal('user_id' in parsed, false)
  assert.equal('verified_at' in parsed, false)
})
