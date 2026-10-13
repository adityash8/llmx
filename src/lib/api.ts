import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createHash } from 'node:crypto'

export class ApiError extends Error { constructor(message: string, public status = 400) { super(message) } }
const buckets = new Map<string, { count: number; expires: number }>()
export async function body<T>(request: NextRequest, schema: z.ZodType<T>): Promise<T> {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) throw new ApiError('Cross-origin writes are not allowed',403)
  const key = createHash('sha256').update(request.headers.get('x-real-ip') || 'shared').digest('hex')
  const now = Date.now()
  for (const [key, bucket] of buckets) if (bucket.expires <= now) buckets.delete(key)
  const bucket = buckets.get(key) || { count:0,expires:now+60_000 }
  if (bucket.count >= 10 || buckets.size > 10_000) throw new ApiError('Request limit reached. Try again in a minute.',429)
  bucket.count++; buckets.set(key,bucket)
  const reader = request.body?.getReader(); if (!reader) throw new ApiError('JSON body required')
  let bytes = 0; const chunks: Uint8Array[] = []
  while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.length; if (bytes > 128_000) { await reader.cancel(); throw new ApiError('Request exceeds 128 KB',413) }; chunks.push(chunk.value) }
  try { return schema.parse(JSON.parse(Buffer.concat(chunks).toString())) } catch { throw new ApiError('Check the input format and limits') }
}
export function failure(error: unknown) { return NextResponse.json({ error: error instanceof ApiError ? error.message : 'Request could not complete. Check your input or try again.' },{ status:error instanceof ApiError ? error.status : 400 }) }
export const pageSchema = z.object({ loc:z.string().url().max(2048), lastmod:z.string().max(50).optional() })
export const ruleSchema = z.object({ type:z.enum(['include','exclude']),pattern:z.string().min(1).max(200),priority:z.number().min(0).max(10).optional(),description:z.string().max(300).optional() })
export const generateSchema = z.object({ urls:z.array(pageSchema).min(1).max(500), rules:z.array(ruleSchema).max(30).default([]), options:z.object({siteName:z.string().max(120).optional(),description:z.string().max(500).optional(),siteUrl:z.string().url().optional()}).optional(),safeMode:z.boolean().default(true) })
