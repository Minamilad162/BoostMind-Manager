import {requireDb} from '../lib/supabase';
import type {BillingProfile,InvoiceBalance,InvoicePresentation,InvoiceStudioLine,InvoiceStudioDocument} from './types';
import type {Client,Project} from '../lib/types';

const str=(v:unknown)=>v==null?'':String(v);
const num=(v:unknown)=>Number(v)||0;
const fields:Record<keyof InvoicePresentation,string>={
 title:'title',sellerDisplayName:'seller_display_name',sellerLegalName:'seller_legal_name',sellerAddress:'seller_address',sellerTaxNumber:'seller_tax_number',sellerTaxRegistrationNumber:'seller_tax_registration_number',sellerCommercialRegistrationNumber:'seller_commercial_registration_number',sellerEmail:'seller_email',sellerPhone:'seller_phone',buyerName:'buyer_name',buyerAddress:'buyer_address',buyerTaxNumber:'buyer_tax_number',buyerTaxRegistrationNumber:'buyer_tax_registration_number',buyerCommercialRegistrationNumber:'buyer_commercial_registration_number',buyerEmail:'buyer_email',attentionTo:'attention_to',purchaseOrderReference:'purchase_order_reference',projectDisplayName:'project_display_name',projectDescription:'project_description',paymentTerms:'payment_terms',bankName:'bank_name',accountName:'account_name',accountNumber:'account_number',iban:'iban',swiftCode:'swift_code',taxLabel:'tax_label',publicNotes:'public_notes',showCbeExchangeNote:'show_cbe_exchange_note',cbeExchangeNote:'cbe_exchange_note',footer:'footer'
};
const profileFields:Record<Exclude<keyof BillingProfile,'id'|'organizationId'>,string>={displayName:'display_name',legalName:'legal_name',address:'address',taxNumber:'tax_number',taxRegistrationNumber:'tax_registration_number',commercialRegistrationNumber:'commercial_registration_number',email:'email',phone:'phone',bankName:'bank_name',accountName:'account_name',accountNumber:'account_number',iban:'iban',swiftCode:'swift_code',defaultPaymentTerms:'default_payment_terms',defaultFooter:'default_footer'};
function camelProfile(row:Record<string,unknown>):BillingProfile{
 const result:Record<string,unknown>={id:str(row.id),organizationId:'boostmind'};
 for(const [key,column] of Object.entries(profileFields))result[key]=str(row[column]);
 return result as unknown as BillingProfile;
}
export async function getDefaultBillingProfile(_organizationId:string):Promise<BillingProfile|null>{
 const {data,error}=await requireDb().from('invoice_billing_profiles').select('*').maybeSingle();
 if(error)throw error;return data?camelProfile(data):null;
}
export async function saveDefaultBillingProfile(input:Omit<BillingProfile,'id'>):Promise<string>{
 const payload:Record<string,unknown>={};for(const [key,col] of Object.entries(profileFields))payload[col]=input[key as keyof typeof profileFields];
 const {data,error}=await requireDb().rpc('save_invoice_billing_profile',{p_profile:payload});
 if(error)throw error;return String(data);
}
export interface SaveDraftInput{
 invoiceId?:string|null;projectId:string;invoiceNumber:string;electronicInvoiceReference?:string;issueDate:string;dueDate?:string;
 currency:string;taxAmount:number;notes?:string;lines:InvoiceStudioLine[];presentation:InvoicePresentation;
}
function snapshotForSave(p:InvoicePresentation):Record<string,unknown>{
 const snapshot:Record<string,unknown>={};for(const [key,column] of Object.entries(fields))snapshot[column]=p[key as keyof InvoicePresentation];
 return snapshot;
}
export function decodePresentation(row:Record<string,unknown>):InvoicePresentation{
 const result:Record<string,unknown>={};for(const [key,column] of Object.entries(fields))result[key]=key==='showCbeExchangeNote'?Boolean(row[column]):str(row[column]);
 return result as unknown as InvoicePresentation;
}
export async function saveInvoiceDraft(input:SaveDraftInput,issue=false):Promise<string>{
 const {data,error}=await requireDb().rpc('save_invoice_document',{
  p_invoice_id:input.invoiceId||null,p_project_id:input.projectId,p_invoice_number:input.invoiceNumber.trim(),
  p_electronic_invoice_reference:input.electronicInvoiceReference?.trim()||null,
  p_issue_date:input.issueDate,p_due_date:input.dueDate||null,p_currency:input.currency.toUpperCase(),p_tax_amount:input.taxAmount,
  p_notes:input.notes||'',p_lines:input.lines.map((line,index)=>({feature_id:line.workItemId,description:line.description.trim(),quantity:line.quantity,unit_price:line.unitPrice,sort_order:index})),
  p_presentation:snapshotForSave(input.presentation),p_issue:issue
 });
 if(error)throw error;return String(data);
}
export async function issueInvoice(invoiceId:string):Promise<void>{
 const {error}=await requireDb().rpc('issue_invoice_document',{p_invoice_id:invoiceId});if(error)throw error;
}
export async function deleteInvoiceRecord(invoiceId:string):Promise<void>{
 const {error}=await requireDb().rpc('delete_invoice_document',{p_invoice_id:invoiceId});if(error)throw error;
}
export async function getInvoiceStudioDocument(id:string):Promise<InvoiceStudioDocument>{
 const client=requireDb();const [invoice,lines,presentation]=await Promise.all([
  client.from('invoices').select('*').eq('id',id).single(),
  client.from('invoice_lines').select('*').eq('invoice_id',id).order('sort_order'),
  client.from('invoice_presentations').select('snapshot').eq('invoice_id',id).maybeSingle()
 ]);
 if(invoice.error)throw invoice.error;if(lines.error)throw lines.error;if(presentation.error)throw presentation.error;
 const d=invoice.data;
 return {id:d.id,projectId:d.project_id,clientId:d.client_id,invoiceNumber:d.invoice_number,
  electronicInvoiceReference:d.electronic_invoice_reference||'',issueDate:d.issue_date,dueDate:d.due_date||'',currency:d.currency,
  subtotal:num(d.subtotal),taxAmount:num(d.tax_amount),totalAmount:num(d.total_amount),status:d.status,
  notes:d.notes||'',lines:(lines.data||[]).map((line)=>({id:line.id,workItemId:line.feature_id||null,description:line.description,quantity:num(line.quantity),unitPrice:num(line.unit_price),sortOrder:line.sort_order})),
  presentation:decodePresentation((presentation.data?.snapshot||{}) as Record<string,unknown>)};
}
export async function listInvoices(projects:Project[],clients:Client[]):Promise<InvoiceBalance[]>{
 const {data,error}=await requireDb().from('invoice_balances').select('*').order('issue_date',{ascending:false});if(error)throw error;
 return (data||[]).map(row=>({id:row.id,projectId:row.project_id,projectName:projects.find(p=>p.id===row.project_id)?.name||'—',
  clientName:clients.find(c=>c.id===row.client_id)?.company||clients.find(c=>c.id===row.client_id)?.name||'—',
  invoiceNumber:row.invoice_number,electronicInvoiceReference:row.electronic_invoice_reference||'',issueDate:row.issue_date,dueDate:row.due_date||'',currency:row.currency,
  total:num(row.total_amount),collected:num(row.collected),outstanding:num(row.outstanding),status:row.status}));
}
