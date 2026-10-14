import { createCipheriv,createDecipheriv,randomBytes } from 'node:crypto'
import { ApiError } from './api'
export async function consumeGithubQuota(userId:string,rpc:(name:string,args:{p_user:string})=>PromiseLike<{data:boolean|null;error:unknown}>) {
  const usage=await rpc('llmx_consume_usage',{p_user:userId})
  if(usage.error)throw new ApiError('Usage limit storage unavailable',503)
  if(!usage.data)throw new ApiError('Daily integration limit reached (10)',429)
}
function key(){const value=process.env.LLMX_TOKEN_ENCRYPTION_KEY;if(!value||!/^[a-f0-9]{64}$/i.test(value))throw new ApiError('GitHub token encryption is not configured.',503);return Buffer.from(value,'hex')}
export function encryptToken(token:string){const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key(),iv);const data=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),data].map(b=>b.toString('base64')).join('.')}
export function decryptToken(value:string){const[iv,tag,data]=value.split('.').map(s=>Buffer.from(s,'base64'));const cipher=createDecipheriv('aes-256-gcm',key(),iv);cipher.setAuthTag(tag);return Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8')}
export async function githubApi(path:string,token:string,method='GET',body?:unknown,fetcher=fetch){
  const response=await fetcher(`https://api.github.com${path}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10_000),redirect:'error'})
  if(!response.ok)throw new ApiError(`GitHub returned HTTP ${response.status}. Check repository access and retry.`,502)
  return response.json()
}
export async function createGithubPR(token:string,owner:string,repo:string,path:string,content:string,fetcher=fetch){
  const root=`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  const info=await githubApi(root,token,'GET',undefined,fetcher)
  const branch=info.default_branch
  const ref=await githubApi(`${root}/git/ref/heads/${encodeURIComponent(branch)}`,token,'GET',undefined,fetcher)
  const newBranch=`llmx-${Date.now()}-${randomBytes(4).toString('hex')}`
  await githubApi(`${root}/git/refs`,token,'POST',{ref:`refs/heads/${newBranch}`,sha:ref.object.sha},fetcher)
  let sha:string|undefined
  const check=await fetcher(`https://api.github.com${root}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(10_000),redirect:'error'})
  if(check.ok)sha=(await check.json()).sha
  else if(check.status!==404)throw new ApiError('Could not check the existing file on GitHub',502)
  await githubApi(`${root}/contents/${path.split('/').map(encodeURIComponent).join('/')}`,token,'PUT',{message:'Update llms.txt with LLMX',branch:newBranch,content:Buffer.from(content).toString('base64'),...(sha?{sha}:{})},fetcher)
  const pr=await githubApi(`${root}/pulls`,token,'POST',{title:'Update llms.txt',head:newBranch,base:branch,body:'Markdown site guidance generated with LLMX. Review the page selection and deploy through your usual process.'},fetcher)
  if(typeof pr.html_url!=='string'||!pr.html_url.startsWith('https://github.com/'))throw new ApiError('GitHub did not return a pull request URL',502)
  return {url:pr.html_url,number:pr.number}
}
