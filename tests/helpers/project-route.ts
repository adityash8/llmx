import { mock } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'

let owner = 'owner-one'
const saved: Record<string, unknown>[] = []
const service = {
  from(table: string) {
    assert.equal(table, 'llmx_projects')
    return {
      insert(row: Record<string, unknown>) {
        saved.push(row)
        return { select() { return { async single() { return { data: { ...row, id: `project-${saved.length}`, verified_at: null }, error: null } } } } }
      },
    }
  },
}
mock.module('../../src/lib/supabase-server.ts', { namedExports: {
  identity: async () => ({ user: { id: owner }, client: { from() { throw new Error('browser client insert was used') } } }),
  adminClient: () => service,
} })
async function main() {
 const { POST } = await import('../../src/app/api/projects/route')
 const claimedProof = 'foreign-owner-published-proof'
 for (const userId of ['owner-one', 'owner-two']) {
  owner = userId
  const request = new NextRequest('https://llmx.example/api/projects', {
    method: 'POST',
    body: JSON.stringify({ name: 'Example', domain: 'https://example.com', urls: [{ loc: 'https://example.com/docs' }], content: '# Example', proof: claimedProof, verified_at: '2026-01-01T00:00:00Z', user_id: 'foreign-owner' }),
  })
  const response = await POST(request)
  assert.equal(response.status, 201)
  const result = await response.json()
  assert.equal(result.project.user_id, userId)
  assert.match(result.project.proof, /^[a-f0-9]{48}$/)
  assert.notEqual(result.project.proof, claimedProof)
  assert.equal(result.project.verified_at, null)
 }
 assert.notEqual(saved[0].proof, saved[1].proof)
 assert.equal(saved.some(row => 'verified_at' in row), false)
 process.stdout.write('route proof verified\n')
}
main().catch(error => { process.stderr.write(String(error)); process.exitCode = 1 })
