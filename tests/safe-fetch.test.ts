import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import dns from 'node:dns/promises'
import https from 'node:https'
import net from 'node:net'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { safeFetch } from '../src/lib/safe-fetch'

test('pinned lookup supports Node autoSelectFamily without changing the HTTPS host', async () => {
  mock.method(dns, 'lookup', async () => [{ address: '8.8.8.8', family: 4 }])
  let pinnedLookup: ((host: string, options: { all?: boolean }, callback: (error: NodeJS.ErrnoException | null, addresses: { address: string; family: number }[]) => void) => void) | undefined
  mock.method(https, 'get', (url: URL, options: { lookup: typeof pinnedLookup; headers: Record<string, string> }, callback: (response: PassThrough & { statusCode: number; headers: Record<string, string> }) => void) => {
    assert.equal(url.hostname, 'example.com')
    assert.equal(options.headers?.Host, undefined)
    pinnedLookup = options.lookup
    const request = new EventEmitter() as EventEmitter & { destroy: (error?: Error) => void }
    request.destroy = error => { if (error) request.emit('error', error); request.emit('close') }
    queueMicrotask(() => {
      const response = new PassThrough() as PassThrough & { statusCode: number; headers: Record<string, string> }
      response.statusCode = 200
      response.headers = { 'content-type': 'text/html' }
      callback(response)
      response.end('ok')
      request.emit('close')
    })
    return request
  })
  try { assert.equal((await safeFetch('https://example.com/')).text, 'ok') }
  finally { mock.restoreAll() }

  assert.ok(pinnedLookup)
  const server = net.createServer(socket => socket.end())
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const port = (server.address() as net.AddressInfo).port
    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host: 'example.com', port, autoSelectFamily: true,
        lookup: (host, options, callback) => pinnedLookup!(host, options, (error, addresses) => {
          assert.equal(options.all, true)
          assert.deepEqual(addresses, [{ address: '8.8.8.8', family: 4 }])
          callback(error, [{ address: '127.0.0.1', family: 4 }])
        }),
      })
      socket.on('connect', () => { socket.destroy(); resolve() })
      socket.on('error', reject)
    })
  } finally { server.close() }
})
