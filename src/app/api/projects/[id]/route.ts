import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'
import { ownedProject } from '@/lib/projects'
import { body,failure,ApiError } from '@/lib/api'
export async function GET(_request:NextRequest,context:{params:Promise<{id:string}>}) {try{const{project}=await ownedProject((await context.params).id);return NextResponse.json({project})}catch(error){return failure(error)}}
export async function DELETE(request:NextRequest,context:{params:Promise<{id:string}>}){try{await body(request,z.object({confirm:z.literal(true)}));const{project,client,user}=await ownedProject((await context.params).id);const{error}=await client.from('llmx_projects').delete().eq('id',project.id).eq('user_id',user.id);if(error)throw new ApiError('Deletion failed. Retry.',503);return NextResponse.json({deleted:true,message:'Project and its generated data were removed.'})}catch(error){return failure(error)}}
