import type {Client,Feature,Project} from '../lib/types';
export interface BillingProfile {
  id: string;
  organizationId: string;
  displayName: string;
  legalName: string;
  address: string;
  taxNumber: string;
  taxRegistrationNumber: string;
  commercialRegistrationNumber: string;
  email: string;
  phone: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  defaultPaymentTerms: string;
  defaultFooter: string;
}

export interface InvoiceStudioLine {
  id: string;
  workItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  sortOrder: number;
}

export interface InvoicePresentation {
  title: string;
  sellerDisplayName: string;
  sellerLegalName: string;
  sellerAddress: string;
  sellerTaxNumber: string;
  sellerTaxRegistrationNumber: string;
  sellerCommercialRegistrationNumber: string;
  sellerEmail: string;
  sellerPhone: string;
  buyerName: string;
  buyerAddress: string;
  buyerTaxNumber: string;
  buyerTaxRegistrationNumber: string;
  buyerCommercialRegistrationNumber: string;
  buyerEmail: string;
  attentionTo: string;
  purchaseOrderReference: string;
  projectDisplayName: string;
  projectDescription: string;
  paymentTerms: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  taxLabel: string;
  publicNotes: string;
  showCbeExchangeNote: boolean;
  cbeExchangeNote: string;
  footer: string;
}

export interface InvoiceStudioDocument {
  id: string;
  projectId: string;
  clientId: string;
  invoiceNumber: string;
  electronicInvoiceReference: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  notes: string;
  lines: InvoiceStudioLine[];
  presentation: InvoicePresentation;
}

export interface InvoiceBalance {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  invoiceNumber: string;
  electronicInvoiceReference: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  total: number;
  collected: number;
  outstanding: number;
  status: string;
}

export interface ClientRecord {
 id:string; legalName:string; commercialName:string; address:string; billingEmail:string; phone:string;
 taxNumber:string;taxRegistrationNumber:string;commercialRegistrationNumber:string;primaryContact:string;
 status:'Active'|'Inactive';
}
export interface AdditionalService {
 id:string;projectId:string;name:string;status:'Active'|'Cancelled';type:'Feature';
}
export interface InvoiceProject {
 id:string; name:string; description?:string; clientId:string|null;client:string;code:string; currency?:string;
}
export function convertClients(clients:Client[]):ClientRecord[]{return clients.map(c=>({
 id:c.id,legalName:c.legal_name||c.company||c.name,commercialName:c.company||c.name,
 address:c.address||'',billingEmail:c.email||'',phone:c.phone||'',taxNumber:c.tax_number||'',
 taxRegistrationNumber:c.tax_registration_number||'',commercialRegistrationNumber:c.commercial_registration_number||'',
 primaryContact:c.primary_contact||c.name,status:'Active',
}));}
export function convertProjects(projects:Project[]):InvoiceProject[]{return projects.map((p)=>({
 id:p.id,name:p.name,description:p.description||'',clientId:p.client_id,client:'',code:'',currency:p.currency,
}));}
export function convertFeatures(features:Feature[]):AdditionalService[]{return features.map(f=>({id:f.id,projectId:f.project_id,name:f.title,status:'Active',type:'Feature'}));}
