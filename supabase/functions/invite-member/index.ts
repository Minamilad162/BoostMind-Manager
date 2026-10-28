import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const out=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return out({error:'Method not allowed'},405);
 try{const token=req.headers.get('Authorization');if(!token?.startsWith('Bearer '))return out({error:'Unauthorized'},401);
 const url=Deno.env.get('SUPABASE_URL')!,pub=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const userClient=createClient(url,pub,{global:{headers:{Authorization:token}},auth:{persistSession:false}});
 const {data:{user},error}=await userClient.auth.getUser(token.slice(7));if(error||!user)return out({error:'Unauthorized'},401);
 const server=createClient(url,service,{auth:{persistSession:false}});
 const {data:operator}=await server.from('profiles').select('role,active').eq('id',user.id).maybeSingle();if(operator?.role!=='admin'||!operator.active)return out({error:'Forbidden'},403);
 const input=await req.json(),email=String(input.email||'').trim().toLowerCase(),name=String(input.name||'').trim(),role=String(input.role||'developer');
 if(!/^\S+@\S+\.\S+$/.test(email)||name.length<2||name.length>120||!['admin','developer'].includes(role))return out({error:'Invalid user fields'},400);
 const invited=await server.auth.admin.inviteUserByEmail(email,{data:{name}});if(invited.error)return out({error:invited.error.message},400);
 const id=invited.data.user?.id;if(!id)return out({error:'Unable to create account'},500);
 // The auth trigger creates a developer profile. Only this trusted function can promote to admin.
 const {error:upsertError}=await server.from('profiles').upsert({id,name,email,role,active:true},{onConflict:'id'});
 if(upsertError)return out({error:'Invite created; profile role needs admin review'},500);
 await server.from('audit_events').insert({actor_id:user.id,action:'member.invited',entity_type:'profile',entity_id:id,details:{role}});
 return out({ok:true});
 }catch{return out({error:'Unable to invite user'},500);}
});
