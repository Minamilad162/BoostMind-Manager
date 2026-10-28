import {requireDb} from './supabase';
import type {Client,CredentialMeta,Distribution,Expense,Feature,Membership,Payment,Profile,Project,ProjectLink,Task,Workspace} from './types';
async function all<T>(table:string,select='*'):Promise<T[]>{const {data,error}=await requireDb().from(table).select(select).order(table==='project_links'?'updated_at':'created_at',{ascending:false});if(error)throw error;return (data??[]) as T[];}
export async function loadWorkspace(isAdmin:boolean):Promise<Workspace>{
 const [profiles,rawProjects,memberships,features,tasks,clients,payments,expenses,distributions,links,financials]=await Promise.all([
 all<Profile>('profiles'),all<Project>('projects'),all<Membership>('project_memberships'),all<Feature>('features'),all<Task>('tasks'),
 isAdmin?all<Client>('clients'):Promise.resolve([]),isAdmin?all<Payment>('payments'):Promise.resolve([]),isAdmin?all<Expense>('expenses'):Promise.resolve([]),isAdmin?all<Distribution>('distributions'):Promise.resolve([]),isAdmin?all<ProjectLink>('project_links','*'):Promise.resolve([]),isAdmin?requireDb().from('project_financials').select('project_id,contract_amount,currency,amount_usd,amount_egp').then(({data,error})=>{if(error)throw error;return (data??[]) as {project_id:string;contract_amount:number;currency:Project['currency'];amount_usd:number|null;amount_egp:number|null}[];}):Promise.resolve([])
 ]);const projects=rawProjects.map(p=>({...p,...(financials.find(x=>x.project_id===p.id)||{contract_amount:0,currency:'EGP',amount_usd:null,amount_egp:null})} as Project));return {profiles,projects,memberships,features,tasks,clients,payments,expenses,distributions,links};
}
export async function createRecord(table:string,record:Record<string,unknown>){const {error}=await requireDb().from(table).insert(record);if(error)throw error;}
export async function editRecord(table:string,id:string,record:Record<string,unknown>){const {error}=await requireDb().from(table).update(record).eq('id',id);if(error)throw error;}
export async function deleteRecord(table:string,id:string){const {error}=await requireDb().from(table).delete().eq('id',id);if(error)throw error;}
export async function setMyTaskStatus(taskId:string,status:Task['status']){const {error}=await requireDb().rpc('update_my_task_status',{p_task_id:taskId,p_status:status});if(error)throw error;}
export async function setProjectMember(projectId:string,userId:string,assigned:boolean){const {error}=await requireDb().rpc('set_project_member',{p_project_id:projectId,p_user_id:userId,p_assigned:assigned});if(error)throw error;}
export async function saveProjectLinks(projectId:string,input:Omit<ProjectLink,'id'|'project_id'|'updated_at'>){const {error}=await requireDb().from('project_links').upsert({project_id:projectId,...input},{onConflict:'project_id'});if(error)throw error;}
/** Admin-only PostgREST credentials. Server-side RLS is the security boundary. */
export async function listProjectCredentials(projectId:string):Promise<CredentialMeta[]>{
 const {data,error}=await requireDb().from('credential_records')
  .select('id,project_id,label,service,username,secret_text,access_url,created_at,updated_at')
  .eq('project_id',projectId).order('created_at',{ascending:false});
 if(error)throw error;
 return (data??[]) as CredentialMeta[];
}
export async function createProjectCredential(input:{project_id:string;label:string;service:string;username:string;access_url:string|null;secret_text:string|null}):Promise<void>{
 const label=input.label.trim(),service=input.service.trim(),username=input.username.trim();
 const secret=input.secret_text||null,accessUrl=input.access_url?.trim()||null;
 if(!input.project_id||!label||!service||label.length>160||service.length>100||username.length>300||
    (secret!==null&&secret.length>4000)||(!secret&&!accessUrl))
  throw new Error('Choose a project, enter a title and category, and add at least a link or password.');
 if(accessUrl){
  let url:URL;
  try{url=new URL(accessUrl);}catch{throw new Error('Enter a valid http or https URL.');}
  if(!['http:','https:'].includes(url.protocol)||accessUrl.length>2048||/\s/.test(accessUrl))
   throw new Error('Only valid http/https URLs are allowed (up to 2048 characters).');
 }
 const {error}=await requireDb().from('credential_records').insert({project_id:input.project_id,label,service,username,access_url:accessUrl,secret_text:secret});
 if(error)throw error;
}
export async function deleteProjectCredential(projectId:string,credentialId:string):Promise<void>{
 const {error}=await requireDb().from('credential_records').delete().eq('id',credentialId).eq('project_id',projectId);
 if(error)throw error;
}
export async function inviteMember(email:string,name:string,role:'admin'|'developer'){const {data,error}=await requireDb().functions.invoke('invite-member',{body:{email,name,role}});if(error)throw error;if(data?.error)throw new Error(String(data.error));return data;}
export type {CredentialMeta};

export async function saveProject(input: {id:string|null;name:string;description:string|null;client_id:string|null;owner_id:string|null;status:string;contract_amount:number;amount_usd:number;amount_egp:number;currency:string;contract_date:string;due_date:string|null}){const {error}=await requireDb().rpc('save_project',{p_id:input.id,p_name:input.name,p_description:input.description,p_client_id:input.client_id,p_owner_id:input.owner_id,p_status:input.status,p_contract_amount:input.contract_amount,p_amount_usd:input.amount_usd,p_amount_egp:input.amount_egp,p_currency:input.currency,p_contract_date:input.contract_date,p_due_date:input.due_date});if(error)throw error;}
export async function manageMember(id:string,role:'admin'|'developer',active:boolean){const{data,error}=await requireDb().functions.invoke('manage-member',{body:{id,role,active}});if(error)throw error;if(data?.error)throw new Error(String(data.error));return data;}
