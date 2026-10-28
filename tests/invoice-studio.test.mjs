import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseEtaInvoiceFile,findClientForEtaImport,findProjectForEtaImport} from '../src/invoice/etaInvoiceImport.ts';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const sql=fs.readFileSync(path.join(root,'supabase/migrations/202610280005_invoice_studio.sql'),'utf8');
const api=fs.readFileSync(path.join(root,'src/invoice/api.ts'),'utf8');
const page=fs.readFileSync(path.join(root,'src/invoice/InvoiceStudio.tsx'),'utf8');
const app=fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
const eta={document:{documentType:'I',internalID:'BM-2026-7',dateTimeIssued:'2026-10-24T13:00:00Z',issuer:{name:'BoostMind',id:'111'},receiver:{name:'Demo Co',id:'222'},invoiceLines:[{description:'Website build',quantity:2,netTotal:500,unitValue:{currencySold:'USD',amountSold:300}}],taxTotals:[{amount:70}],netAmount:500,totalAmount:570},uuid:'uuid-test-123',status:'Valid'};
test('ETA JSON reproduces legacy import line rates and tax without applying discount twice',()=>{
 const result=parseEtaInvoiceFile(JSON.stringify(eta),'demo.json');
 assert.equal(result.invoiceNumber,'BM-2026-7');assert.equal(result.electronicInvoiceReference,'uuid-test-123');
 assert.equal(result.currency,'USD');assert.equal(result.lines.length,1);assert.equal(result.lines[0].unitPrice,250);
 assert.equal(result.taxAmount,70);assert.equal(result.issueDate,'2026-10-24');
});
test('ETA XML with embedded document is imported without submitting data to external service',()=>{
 const source=`<root><uuid>demo-uuid</uuid><status>Valid</status><document>${JSON.stringify(eta.document).replaceAll('&','&amp;')}</document></root>`;
 const result=parseEtaInvoiceFile(source,'demo.xml');assert.equal(result.sourceFormat,'ETA XML');assert.equal(result.lines[0].unitPrice,250);
});
test('ETA import rejects non-invoice documents and empty lines',()=>{
 assert.throws(()=>parseEtaInvoiceFile(JSON.stringify({document:{...eta.document,documentType:'C'}}),'x.json'),/not an invoice/);
 assert.throws(()=>parseEtaInvoiceFile(JSON.stringify({document:{...eta.document,invoiceLines:[]}}),'x.json'),/does not contain invoice lines/);
});
test('Client matching is tax-first and ambiguous names do not auto-select',()=>{
 const clients=[{id:'a',taxRegistrationNumber:'22-2',taxNumber:'',legalName:'Demo Co',commercialName:'Demo'},{id:'b',taxRegistrationNumber:'111',taxNumber:'',legalName:'Demo Co',commercialName:'Other'}];
 assert.equal(findClientForEtaImport(clients,'222','Demo Co')?.id,'a');
 assert.equal(findClientForEtaImport(clients,'','Demo Co'),undefined);
 assert.equal(findProjectForEtaImport([{id:'p',name:'Website Build',code:'001'}],['Website Build'] )?.id,'p');
});
test('financial source of truth stays payments, not newly issued invoice totals',()=>{
 assert.match(sql,/alter table public\.payments add column if not exists invoice_id/);
 assert.match(sql,/Payment exceeds remaining invoice balance/);
 assert.match(sql,/Invoice currency differs from project currency/);
 assert.match(sql,/Invoice project\/client cannot be reassigned/);
 assert.match(sql,/Invoice is locked after linked receipts or finalization/);
 assert.doesNotMatch(sql,/insert into public\.payments/i);
});
test('new tables use RLS and invoice mutation RPCs check active admin',()=>{
 for(const table of ['invoice_billing_profiles','invoices','invoice_lines','invoice_presentations']){
  assert.ok(sql.includes(`alter table public.${table} enable row level security`));
 }
 assert.ok((sql.match(/if not private\.is_admin\(\) then/g)||[]).length>=4);
 assert.match(sql,/revoke all on public\.invoice_billing_profiles,public\.invoices/);
 assert.match(sql,/grant select on public\.invoice_billing_profiles,public\.invoices/);
 assert.match(sql,/jsonb_typeof\(p_lines\).*'array'/);
});
test('full historical Invoice Studio UI and new project integration exist',()=>{
 for(const text of ['Billing profile','Import ETA XML / JSON','Print / PDF','Issue invoice','Save draft','Electronic invoice no.','Tax amount','IBAN','Live preview'])assert.ok(page.includes(text),text);
 assert.match(app,/view==='invoices'/);assert.match(app,/onInvoice=\{openInvoices\}/);
 assert.match(app,/invoice_id:inputValue\(f,'invoice_id'\)/);
 assert.match(api,/save_invoice_document/);assert.match(api,/delete_invoice_document/);
});
