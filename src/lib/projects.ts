import { z } from 'zod'
import { ApiError, pageSchema,ruleSchema } from './api'
import { identity } from './supabase-server'
export const projectSchema = z.object({name:z.string().min(1).max(120),domain:z.string().url().max(2048),urls:z.array(pageSchema).min(1).max(500),rules:z.array(ruleSchema).max(30).default([]),excludedUrls:z.array(z.string().url().max(2048)).max(500).default([]),content:z.string().min(1).max(100_000)})
export async function ownedProject(id:string) {
  if(!z.uuid().safeParse(id).success)throw new ApiError('Project not found',404)
  const {client,user}=await identity()
  const {data:project,error}=await client.from('llmx_projects').select('*').eq('id',id).eq('user_id',user.id).single()
  if(error||!project)throw new ApiError('Project not found',404)
  return {client,user,project}
}
