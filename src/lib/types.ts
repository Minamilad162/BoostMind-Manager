export type Role='admin'|'developer';
export type TaskStatus='todo'|'in_progress'|'review'|'done';
export type TaskPriority='low'|'medium'|'high';
export type ProjectStatus='planning'|'active'|'review'|'completed'|'on_hold';
export type Currency='EGP'|'USD'|'SAR'|'EUR';
export interface Profile { id:string; name:string; email:string; role:Role; active:boolean; created_at:string; }
export interface Client {id:string;name:string;company:string|null;email:string|null;phone:string|null;whatsapp_url:string|null;notes:string|null;created_at:string;legal_name?:string|null;address?:string|null;tax_number?:string|null;tax_registration_number?:string|null;commercial_registration_number?:string|null;primary_contact?:string|null}
export interface Project {id:string;name:string;description:string|null;client_id:string|null;owner_id:string|null;status:ProjectStatus;contract_amount:number;currency:Currency;amount_usd:number|null;amount_egp:number|null;contract_date:string;due_date:string|null;created_at:string;updated_at:string;client?:Client|null;owner?:Profile|null}
export interface Membership{id:string;project_id:string;user_id:string;created_at:string}
export interface Feature{id:string;project_id:string;title:string;description:string|null;created_at:string}
export interface Task{id:string;project_id:string;feature_id:string|null;title:string;description:string|null;assignee_id:string|null;status:TaskStatus;priority:TaskPriority;due_date:string|null;created_at:string;updated_at:string;assignee?:Profile|null}
export interface Payment{id:string;project_id:string;amount:number;amount_usd:number|null;amount_egp:number|null;paid_at:string;method:string|null;reference:string|null;notes:string|null;created_at:string}
export interface Expense{id:string;project_id:string;title:string;category:string;amount:number;amount_usd:number|null;amount_egp:number|null;status:'planned'|'paid';paid_at:string|null;paid_by:'company'|'mina'|'bishoy';notes:string|null;created_at:string}
export interface Distribution{id:string;project_id:string;partner_code:'mina'|'bishoy';kind:'profit'|'reimbursement';amount:number;amount_usd:number|null;amount_egp:number|null;paid_at:string;notes:string|null;created_at:string}
export interface ProjectLink{id:string;project_id:string;website_url:string|null;database_url:string|null;hosting_url:string|null;hosting_provider:string|null;github_url:string|null;updated_at:string}
export interface CredentialMeta{id:string;project_id:string;label:string;service:string;username:string;secret_text:string|null;access_url:string|null;created_at:string;updated_at:string}
export interface Workspace {profiles:Profile[];clients:Client[];projects:Project[];memberships:Membership[];features:Feature[];tasks:Task[];payments:Payment[];expenses:Expense[];distributions:Distribution[];links:ProjectLink[]}
export const EMPTY:Workspace={profiles:[],clients:[],projects:[],memberships:[],features:[],tasks:[],payments:[],expenses:[],distributions:[],links:[]};
export const STATUS_LABEL:Record<TaskStatus,string>={todo:'To Do',in_progress:'In Progress',review:'Under Review',done:'Done'};
export const PROJECT_LABEL:Record<ProjectStatus,string>={planning:'Planning',active:'In Progress',review:'Under Review',completed:'Completed',on_hold:'On Hold'};
