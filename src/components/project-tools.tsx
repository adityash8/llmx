'use client'
import {useState} from 'react'
import type {LlmsTxtRule,SitemapUrl} from '@/types'
import Link from 'next/link'
export function ProjectTools(props:{name:string;domain:string;urls:SitemapUrl[];rules:LlmsTxtRule[];excludedUrls:string[];content:string}) {
 const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');const[id,setId]=useState('')
 async function save(){setBusy(true);try{const res=await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(props)});const data=await res.json();if(!res.ok)throw new Error(data.error);setId(data.project.id);setMessage('Private project saved. Open Projects to verify your domain and review a GitHub PR.')}catch(err){setMessage(err instanceof Error?err.message:'Save failed. Download remains available.')}finally{setBusy(false)}}
 return <section className="project-tools"><h3>Save privately or export to GitHub</h3><p className="helper">Sign in to save one private project in the free pilot. GitHub PR export requires a connected account and domain proof. A PR does not publish your site.</p><div className="actions"><button className="secondary" disabled={busy||!!id} onClick={save}>{busy?'Saving…':id?'Saved':'Save private project'}</button><Link href="/dashboard">Open projects & GitHub</Link></div>{message&&<p role="status">{message}</p>}</section>
}
