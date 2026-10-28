import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const out=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return out({error:'Method not allowed'},405);
 try{const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return out({error:'Unauthorized'},401);
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const userClient=createClient(url,anon,{auth:{persistSession:false},global:{headers:{Authorization:auth}}});
 const {data:{user},error}=await userClient.auth.getUser(auth.slice(7));if(error||!user)return out({error:'Unauthorized'},401);
 const db=createClient(url,key,{auth:{persistSession:false}});
 const {data:actor}=await db.from('profiles').select('role,active').eq('id',user.id).maybeSingle();if(actor?.role!=='admin'||!actor.active)return out({error:'Forbidden'},403);
 const input=await req.json();const id=String(input.id||''),role=String(input.role||''),active=Boolean(input.active);
 if(!/^[0-9a-f-]{36}$/i.test(id)||!['admin','developer'].includes(role))return out({error:'Invalid member'},400);
 if(id===user.id)return out({error:'You cannot change your own admin access'},400);
 const {data:target}=await db.from('profiles').select('id,role,active').eq('id',id).maybeSingle();if(!target)return out({error:'Member not found'},404);
 const {error:updateError}=await db.from('profiles').update({role,active}).eq('id',id);if(updateError)throw updateError;
 await db.from('audit_events').insert({actor_id:user.id,action:'member.access_changed',entity_type:'profile',entity_id:id,details:{from_role:target.role,to_role:role,from_active:target.active,to_active:active}});
 return out({ok:true});
 }catch{return out({error:'Unable to update member'},500);}
});
