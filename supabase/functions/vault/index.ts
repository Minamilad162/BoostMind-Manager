// Server-side AES-256-GCM vault. No ciphertext/key material is exposed through PostgREST.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const bytes=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const b64=(a:Uint8Array)=>btoa(String.fromCharCode(...a));
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return respond({error:'Method not allowed'},405);
 try{
  const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return respond({error:'Unauthorized'},401);
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const publicClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data:{user},error:userError}=await publicClient.auth.getUser(auth.slice(7));if(userError||!user)return respond({error:'Unauthorized'},401);
  const admin=createClient(url,service,{auth:{persistSession:false}});
  const {data:profile}=await admin.from('profiles').select('role,active').eq('id',user.id).maybeSingle();
  if(!profile?.active||profile.role!=='admin')return respond({error:'Forbidden'},403);
  const payload=await req.json();const action=String(payload.action||'');const projectId=String(payload.project_id||'');
  if(!/^[0-9a-f-]{36}$/i.test(projectId))return respond({error:'Invalid project'},400);
  const {data:project}=await admin.from('projects').select('id').eq('id',projectId).maybeSingle();if(!project)return respond({error:'Project not found'},404);
  const log=async(kind:string,id:string)=>{await admin.from('audit_events').insert({actor_id:user.id,action:kind,entity_type:'credential',entity_id:id,details:{project_id:projectId}});};
  if(action==='list'){
   const {data,error}=await admin.from('credential_records').select('id,project_id,label,service,username,created_at,updated_at').eq('project_id',projectId).order('created_at',{ascending:false});if(error)throw error;return respond({items:data});
  }
  if(action==='delete'){
   const id=String(payload.id||'');const {data,error}=await admin.from('credential_records').delete().eq('id',id).eq('project_id',projectId).select('id').maybeSingle();if(error)throw error;if(!data)return respond({error:'Entry not found'},404);await log('credential.deleted',id);return respond({ok:true});
  }
  const keyRaw=Deno.env.get('BOOSTMIND_VAULT_KEY');if(!keyRaw)return respond({error:'Vault encryption is not configured'},503);
  const keyBytes=bytes(keyRaw);if(keyBytes.length!==32)return respond({error:'Vault key must contain 32 bytes'},503);
  const key=await crypto.subtle.importKey('raw',keyBytes,'AES-GCM',false,['encrypt','decrypt']);
  if(action==='reveal'){
   const id=String(payload.id||'');const {data,error}=await admin.from('credential_records').select('ciphertext,iv').eq('id',id).eq('project_id',projectId).maybeSingle();if(error)throw error;if(!data)return respond({error:'Entry not found'},404);
   const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(data.iv),additionalData:new TextEncoder().encode(projectId)},key,bytes(data.ciphertext));
   await log('credential.revealed',id);return respond({secret:new TextDecoder().decode(plain)});
  }
  if(action==='create'){
   const label=String(payload.label||'').trim(),serviceName=String(payload.service||'').trim(),username=String(payload.username||'').trim(),password=String(payload.secret||'');
   if(!label||!serviceName||!password||label.length>160||serviceName.length>100||username.length>300||password.length>4000)return respond({error:'Invalid credential fields'},400);
   const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(projectId)},key,new TextEncoder().encode(password));
   const {data,error}=await admin.from('credential_records').insert({project_id:projectId,label,service:serviceName,username,ciphertext:b64(new Uint8Array(encrypted)),iv:b64(iv)}).select('id').single();if(error)throw error;
   await log('credential.created',data.id);return respond({ok:true});
  }
  return respond({error:'Unsupported action'},400);
 }catch(e){return respond({error:e instanceof Error&&/decrypt|operation-specific/i.test(e.message)?'Unable to decrypt credential':'Vault operation failed'},500);}
});
