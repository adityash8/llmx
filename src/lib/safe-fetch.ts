import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import https from 'node:https'

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 6) {
    // Only global unicast; exclude transition mechanisms and embedded IPv4.
    return /^[23][0-9a-f]{3}:/i.test(address) && !/^200[12]:/i.test(address) && !/^2001:db8:/i.test(address) && !address.includes('.')
  }
  if (isIP(address) !== 4) return false
  const [a, b] = address.split('.').map(Number)
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || b === 2)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && [18,19,51].includes(b)) || (a === 203 && b === 0))
}
export function publicUrl(value: string): URL {
  if (value.length > 2048) throw new Error('URL is too long')
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Use a public HTTPS URL without credentials or custom ports')
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  if (!hostname.includes('.') && !isIP(hostname)) throw new Error('Use a public domain')
  if (isIP(hostname) && !isPublicAddress(hostname)) throw new Error('Private network addresses are not allowed')
  url.hash = ''
  return url
}
export function publicRedirect(location: string, current: URL): string {
  return publicUrl(new URL(location, current).href).href
}
export type SafeResponse = { status: number; text: string; headers: Record<string, string>; url: string }
export async function safeFetch(value: string, options: { maxBytes?: number; deadline?: number; redirects?: number } = {}): Promise<SafeResponse> {
  const url = publicUrl(value)
  const deadline = options.deadline ?? Date.now() + 8000
  const remaining = deadline - Date.now()
  if (remaining <= 0) throw new Error('Fetch deadline exceeded')
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  let dnsTimer: ReturnType<typeof setTimeout> | undefined
  const addresses = await Promise.race([lookup(hostname, { all: true }), new Promise<never>((_, reject) => { dnsTimer = setTimeout(() => reject(new Error('DNS timeout')), remaining); dnsTimer.unref() })]).finally(() => clearTimeout(dnsTimer))
  if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new Error('Private network addresses are not allowed')
  const address = addresses[0]
  const response = await new Promise<SafeResponse>((resolve, reject) => {
    const req = https.get(url, {
      agent: false,
      lookup: (_name, lookupOptions, callback) => lookupOptions.all
        ? callback(null, [{ address: address.address, family: address.family }])
        : callback(null, address.address, address.family),
      headers: { 'User-Agent': 'LLMX/2.0', Accept: 'text/html,text/plain,application/xml', 'Accept-Encoding': 'identity' },
    }, res => {
      const chunks: Buffer[] = []; let bytes = 0
      const headers: Record<string, string> = {}
      for (const [key, val] of Object.entries(res.headers)) if (val) headers[key] = Array.isArray(val) ? val.join(',') : val
      res.on('data', chunk => {
        bytes += chunk.length
        if (bytes > (options.maxBytes ?? 1_000_000)) { req.destroy(new Error('Response exceeds size limit')); return }
        chunks.push(chunk)
      })
      res.on('error', reject)
      res.on('end', () => resolve({ status: res.statusCode ?? 502, headers, text: Buffer.concat(chunks).toString('utf8'), url: url.href }))
    })
    const timer = setTimeout(() => req.destroy(new Error('Fetch timeout')), Math.max(1, deadline - Date.now()))
    req.on('close', () => clearTimeout(timer)); req.on('error', reject)
  })
  if ([301,302,303,307,308].includes(response.status) && response.headers.location) {
    const redirects = options.redirects ?? 0
    if (redirects >= 3) throw new Error('Redirect limit exceeded')
    return safeFetch(publicRedirect(response.headers.location, url), { ...options, deadline, redirects: redirects + 1 })
  }
  return response
}
