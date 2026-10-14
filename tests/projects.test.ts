import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const sql = readFileSync(new URL('../supabase/llmx.sql', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../supabase/migrations/20261013000000_restrict_llmx_project_insert.sql', import.meta.url), 'utf8')

test('fresh and corrective SQL deny client inserts while preserving owner read and delete', () => {
  assert.doesNotMatch(sql, /create policy llmx_owner_insert|grant[^;]*\binsert\b[^;]*to authenticated/i)
  assert.match(sql, /revoke insert on public\.llmx_projects from anon,authenticated/i)
  assert.match(migration, /drop policy if exists llmx_owner_insert on public\.llmx_projects/i)
  assert.match(migration, /revoke insert on public\.llmx_projects from anon,authenticated/i)
  assert.match(sql, /create policy llmx_owner_read on public\.llmx_projects for select to authenticated using\(user_id=auth\.uid\(\)\)/i)
  assert.match(sql, /create policy llmx_owner_delete on public\.llmx_projects for delete to authenticated using\(user_id=auth\.uid\(\)\)/i)
  assert.match(sql, /grant select,delete on public\.llmx_projects to authenticated/i)
  assert.match(sql, /unique\(user_id\)/i)
})

test('project route creates owner rows with server proof', async () => {
  const { stdout } = await promisify(execFile)('node', [
    '--experimental-test-module-mocks', '--import', 'tsx', fileURLToPath(new URL('./helpers/project-route.ts', import.meta.url)),
  ], { cwd: fileURLToPath(new URL('..', import.meta.url)) })
  assert.match(stdout, /route proof verified/)
})
