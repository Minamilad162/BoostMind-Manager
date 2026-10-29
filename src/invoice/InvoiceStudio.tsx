import { BRAND_LOGO_URL } from '../brand';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react';

import { money } from '../lib/finance';
import { findClientForEtaImport, findProjectForEtaImport, parseEtaInvoiceFile } from './etaInvoiceImport';
import {
  deleteInvoiceRecord,
  getDefaultBillingProfile,
  getInvoiceStudioDocument,
  saveDefaultBillingProfile,
  saveInvoiceDraft,
} from './api';
import type {
  AdditionalService,
  BillingProfile,
  ClientRecord,
  InvoiceBalance,
  InvoicePresentation,
  InvoiceStudioDocument,
  InvoiceStudioLine,
  InvoiceProject as Project,
} from './types';

const DEFAULT_CBE_NOTE = 'For reference purposes, any conversion to Egyptian Pounds shall be based on the official exchange rate published by the Central Bank of Egypt on the invoice issue date.';

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function blankPresentation(): InvoicePresentation {
  return {
    title: '', sellerDisplayName: 'BoostMind', sellerLegalName: '', sellerAddress: '', sellerTaxNumber: '', sellerTaxRegistrationNumber: '',
    sellerCommercialRegistrationNumber: '', sellerEmail: '', sellerPhone: '', buyerName: '', buyerAddress: '', buyerTaxNumber: '', buyerTaxRegistrationNumber: '',
    buyerCommercialRegistrationNumber: '', buyerEmail: '', attentionTo: '', purchaseOrderReference: '', projectDisplayName: '', projectDescription: '', paymentTerms: '', bankName: '',
    accountName: '', accountNumber: '', iban: '', swiftCode: '', taxLabel: 'Tax', publicNotes: '',
    showCbeExchangeNote: false, cbeExchangeNote: DEFAULT_CBE_NOTE, footer: '',
  };
}

function presentationFromProfile(profile: BillingProfile | null): InvoicePresentation {
  const base = blankPresentation();
  if (!profile) return base;
  return {
    ...base,
    sellerDisplayName: profile.displayName,
    sellerLegalName: profile.legalName,
    sellerAddress: profile.address,
    sellerTaxNumber: profile.taxNumber,
    sellerTaxRegistrationNumber: profile.taxRegistrationNumber,
    sellerCommercialRegistrationNumber: profile.commercialRegistrationNumber,
    sellerEmail: profile.email,
    sellerPhone: profile.phone,
    paymentTerms: profile.defaultPaymentTerms,
    bankName: profile.bankName,
    accountName: profile.accountName,
    accountNumber: profile.accountNumber,
    iban: profile.iban,
    swiftCode: profile.swiftCode,
    footer: profile.defaultFooter,
  };
}

function mergeBuyer(presentation: InvoicePresentation, client: ClientRecord | undefined) {
  if (!client) return presentation;
  return {
    ...presentation,
    buyerName: client.legalName || client.commercialName,
    buyerAddress: client.address === '—' ? '' : client.address,
    buyerTaxNumber: client.taxNumber === '—' ? '' : client.taxNumber,
    buyerTaxRegistrationNumber: client.taxRegistrationNumber === '—' ? '' : client.taxRegistrationNumber,
    buyerCommercialRegistrationNumber: client.commercialRegistrationNumber === '—' ? '' : client.commercialRegistrationNumber,
    buyerEmail: client.billingEmail === '—' ? '' : client.billingEmail,
    attentionTo: client.primaryContact === '—' ? '' : client.primaryContact,
  };
}

function mergeProject(presentation: InvoicePresentation, project: Project | undefined) {
  if (!project) return { ...presentation, projectDisplayName: '', projectDescription: '' };
  return {
    ...presentation,
    projectDisplayName: project.name,
    projectDescription: project.description ?? '',
  };
}

function formatInvoiceDate(value: string) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'paid') return 'paid';
  if (normalized === 'overdue') return 'overdue';
  if (normalized === 'partial') return 'partial';
  if (normalized === 'draft') return 'draft';
  return 'issued';
}

function InvoicePreview({ document }: { document: InvoiceStudioDocument }) {
  const p = document.presentation;
  return (
    <article className="invoice-print-root" aria-label={`Invoice ${document.invoiceNumber}`}>
      <header className="invoice-paper-head">
        <div className="invoice-brand-block">
          <img src={BRAND_LOGO_URL} alt="BoostMind Technology" />
          <div className="invoice-seller-mini">
            {p.sellerLegalName ? <strong>{p.sellerLegalName}</strong> : null}
            {p.sellerAddress ? <span>{p.sellerAddress}</span> : null}
            {p.sellerEmail ? <span>{p.sellerEmail}</span> : null}
            {p.sellerPhone ? <span>{p.sellerPhone}</span> : null}
          </div>
        </div>
        <div className="invoice-title-block">
          <span className={`invoice-status ${statusTone(document.status)}`}>{document.status}</span>
        </div>
      </header>

      <section className="invoice-meta-grid">
        <div><span>Invoice No.</span><strong>{document.invoiceNumber || '—'}</strong></div>
        {document.electronicInvoiceReference ? <div><span>Electronic Invoice No.</span><strong>{document.electronicInvoiceReference}</strong></div> : null}
        <div><span>Issue Date</span><strong>{formatInvoiceDate(document.issueDate)}</strong></div>
        <div><span>Due Date</span><strong>{formatInvoiceDate(document.dueDate)}</strong></div>
        {p.purchaseOrderReference ? <div><span>PO / Reference</span><strong>{p.purchaseOrderReference}</strong></div> : null}
      </section>

      <section className="invoice-parties">
        <div>
          <span className="invoice-caption">FROM</span>
          <h3>{p.sellerDisplayName || 'BoostMind'}</h3>
          {p.sellerTaxNumber ? <p><b>Tax No.</b> {p.sellerTaxNumber}</p> : null}
          {p.sellerTaxRegistrationNumber ? <p><b>Tax Registration No.</b> {p.sellerTaxRegistrationNumber}</p> : null}
          {p.sellerCommercialRegistrationNumber ? <p><b>Commercial Registration No.</b> {p.sellerCommercialRegistrationNumber}</p> : null}
        </div>
        <div>
          <span className="invoice-caption">BILL TO</span>
          <h3>{p.buyerName || 'Client'}</h3>
          {p.buyerAddress ? <p>{p.buyerAddress}</p> : null}
          {p.buyerTaxNumber ? <p><b>Tax No.</b> {p.buyerTaxNumber}</p> : null}
          {p.buyerTaxRegistrationNumber ? <p><b>Tax Registration No.</b> {p.buyerTaxRegistrationNumber}</p> : null}
          {p.buyerCommercialRegistrationNumber ? <p><b>Commercial Registration No.</b> {p.buyerCommercialRegistrationNumber}</p> : null}
          {p.attentionTo ? <p><b>Attention:</b> {p.attentionTo}</p> : null}
          {p.buyerEmail ? <p>{p.buyerEmail}</p> : null}
        </div>
      </section>

      {(p.projectDisplayName || p.projectDescription) ? <section className="invoice-project-summary">
        <span className="invoice-caption">PROJECT</span>
        {p.projectDisplayName ? <h3>{p.projectDisplayName}</h3> : null}
        {p.projectDescription ? <p>{p.projectDescription}</p> : null}
      </section> : null}

      <table className="invoice-lines-table">
        <thead><tr><th>#</th><th>Description</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th></tr></thead>
        <tbody>{document.lines.map((line, index) => (
          <tr key={line.id}><td>{index + 1}</td><td>{line.description || '—'}</td><td className="num">{line.quantity}</td><td className="num">{money(line.unitPrice, document.currency)}</td><td className="num"><strong>{money(line.quantity * line.unitPrice, document.currency)}</strong></td></tr>
        ))}</tbody>
      </table>

      <section className="invoice-bottom-grid">
        <div className="invoice-payment-card">
          <span className="invoice-caption">PAYMENT DETAILS</span>
          {p.bankName ? <p><b>Bank</b><span>{p.bankName}</span></p> : null}
          {p.accountName ? <p><b>Account Name</b><span>{p.accountName}</span></p> : null}
          {p.accountNumber ? <p><b>Account No.</b><span className="ltr-value">{p.accountNumber}</span></p> : null}
          {p.iban ? <p><b>IBAN</b><span className="ltr-value">{p.iban}</span></p> : null}
          {p.swiftCode ? <p><b>SWIFT</b><span className="ltr-value">{p.swiftCode}</span></p> : null}
          {p.paymentTerms ? <div className="invoice-payment-terms"><b>Payment Terms</b><span>{p.paymentTerms}</span></div> : null}
        </div>
        <div className="invoice-totals">
          <div><span>Subtotal</span><strong>{money(document.subtotal, document.currency)}</strong></div>
          <div><span>{p.taxLabel || 'Tax'}</span><strong>{money(document.taxAmount, document.currency)}</strong></div>
          <div className="grand-total"><span>Total</span><strong>{money(document.totalAmount, document.currency)}</strong></div>
        </div>
      </section>

      {p.showCbeExchangeNote && p.cbeExchangeNote ? <section className="invoice-exchange-note"><span className="invoice-caption">EXCHANGE RATE NOTE</span><p>{p.cbeExchangeNote}</p></section> : null}
      {p.publicNotes ? <section className="invoice-public-notes"><span className="invoice-caption">NOTES</span><p>{p.publicNotes}</p></section> : null}
      <footer className="invoice-paper-footer"><span>{p.footer || 'Thank you for your business.'}</span><strong>BoostMind</strong></footer>
    </article>
  );
}

function BillingProfileModal({ profile, organizationId, onClose, onSaved }: {
  profile: BillingProfile | null;
  organizationId: string;
  onClose: () => void;
  onSaved: (profile: BillingProfile) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initial = profile ?? {
    id: '', organizationId, displayName: 'BoostMind', legalName: '', address: '', taxNumber: '', taxRegistrationNumber: '', commercialRegistrationNumber: '',
    email: '', phone: '', bankName: '', accountName: '', accountNumber: '', iban: '', swiftCode: '', defaultPaymentTerms: '', defaultFooter: '',
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next: BillingProfile = {
      id: profile?.id ?? '', organizationId,
      displayName: String(form.get('displayName') ?? ''), legalName: String(form.get('legalName') ?? ''), address: String(form.get('address') ?? ''),
      taxNumber: String(form.get('taxNumber') ?? ''), taxRegistrationNumber: String(form.get('taxRegistrationNumber') ?? ''), commercialRegistrationNumber: String(form.get('commercialRegistrationNumber') ?? ''),
      email: String(form.get('email') ?? ''), phone: String(form.get('phone') ?? ''), bankName: String(form.get('bankName') ?? ''),
      accountName: String(form.get('accountName') ?? ''), accountNumber: String(form.get('accountNumber') ?? ''), iban: String(form.get('iban') ?? ''),
      swiftCode: String(form.get('swiftCode') ?? ''), defaultPaymentTerms: String(form.get('defaultPaymentTerms') ?? ''), defaultFooter: String(form.get('defaultFooter') ?? ''),
    };
    if (!next.displayName.trim()) { setError('Display name is required.'); return; }
    setSaving(true); setError(null);
    try {
      const id = await saveDefaultBillingProfile(next);
      onSaved({ ...next, id });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save billing profile.');
    } finally { setSaving(false); }
  };
  return <div className="modal-backdrop" onMouseDown={(event: MouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="record-modal invoice-profile-modal reveal">
      <div className="modal-head"><div><span className="eyebrow">Invoice defaults</span><h2>BoostMind billing profile</h2><p>Saved once, then copied into each invoice as its own snapshot; later changes happen only when you explicitly edit that invoice.</p></div><button className="icon-button" onClick={onClose}>×</button></div>
      <form className="record-form" onSubmit={submit}>
        <div className="form-grid">
          <label><span>Display name *</span><input name="displayName" defaultValue={initial.displayName} required dir="auto" /></label>
          <label><span>Legal name</span><input name="legalName" defaultValue={initial.legalName} dir="auto" /></label>
          <label className="wide"><span>Address</span><input name="address" defaultValue={initial.address} dir="auto" /></label>
          <label><span>Tax number</span><input name="taxNumber" defaultValue={initial.taxNumber} dir="ltr" /></label>
          <label><span>Tax registration number</span><input name="taxRegistrationNumber" defaultValue={initial.taxRegistrationNumber} dir="ltr" /></label>
          <label><span>Commercial registration number</span><input name="commercialRegistrationNumber" defaultValue={initial.commercialRegistrationNumber} dir="ltr" /></label>
          <label><span>Email</span><input name="email" defaultValue={initial.email} type="email" dir="ltr" /></label>
          <label><span>Phone</span><input name="phone" defaultValue={initial.phone} dir="ltr" /></label>
          <label><span>Bank name</span><input name="bankName" defaultValue={initial.bankName} dir="auto" /></label>
          <label><span>Account name</span><input name="accountName" defaultValue={initial.accountName} dir="auto" /></label>
          <label><span>Account number</span><input name="accountNumber" defaultValue={initial.accountNumber} dir="ltr" /></label>
          <label><span>IBAN</span><input name="iban" defaultValue={initial.iban} dir="ltr" /></label>
          <label><span>SWIFT</span><input name="swiftCode" defaultValue={initial.swiftCode} dir="ltr" /></label>
          <label className="wide"><span>Default payment terms</span><textarea name="defaultPaymentTerms" defaultValue={initial.defaultPaymentTerms} rows={2} dir="auto" /></label>
          <label className="wide"><span>Default footer</span><textarea name="defaultFooter" defaultValue={initial.defaultFooter} rows={2} dir="auto" /></label>
        </div>
        {error ? <div className="form-note error">{error}</div> : null}
        <div className="form-actions"><button type="button" className="btn secondary" onClick={onClose}>Cancel</button><button className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save billing profile'}</button></div>
      </form>
    </div>
  </div>;
}

function InvoiceBuilder({ invoiceId, projects, services, clients, billingProfile, invoices, onClose, onSaved }: {
  invoiceId: string | null;
  projects: Project[];
  services: AdditionalService[];
  clients: ClientRecord[];
  billingProfile: BillingProfile | null;
  invoices: InvoiceBalance[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const defaultProject = projects[0];
  const defaultClient = clients.find((row) => row.id === defaultProject?.clientId)
    ?? clients.find((row) => row.commercialName === defaultProject?.client || row.legalName === defaultProject?.client)
    ?? clients[0];
  const [currentId, setCurrentId] = useState(invoiceId);
  const [clientId, setClientId] = useState(defaultClient?.id ?? '');
  const [projectId, setProjectId] = useState(defaultProject?.id ?? '');
  const [invoiceNumber, setInvoiceNumber] = useState(`BM-INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`);
  const [electronicInvoiceReference, setElectronicInvoiceReference] = useState('');
  const [issueDate, setIssueDate] = useState(localDate());
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState(defaultProject?.currency ?? 'EGP');
  const [taxAmount, setTaxAmount] = useState(0);
  const [internalNotes, setInternalNotes] = useState('');
  const [status, setStatus] = useState('draft');
  const [lines, setLines] = useState<InvoiceStudioLine[]>([{ id: crypto.randomUUID(), workItemId: null, description: '', quantity: 1, unitPrice: 0, sortOrder: 0 }]);
  const [presentation, setPresentation] = useState<InvoicePresentation>(() => mergeProject(mergeBuyer(presentationFromProfile(billingProfile), defaultClient), defaultProject));
  const [loading, setLoading] = useState(Boolean(invoiceId));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const client = clients.find((row) => row.id === clientId);
  const clientProjects = useMemo(() => {
    if (!client) return [];
    return projects.filter((row) => row.clientId === client.id || row.client === client.commercialName || row.client === client.legalName);
  }, [client, projects]);
  const project = projects.find((row) => row.id === projectId);
  const scopedServices = services.filter((service) => service.projectId === projectId && service.status !== 'Cancelled');
  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0), [lines]);
  const total = subtotal + Number(taxAmount || 0);
  const editable = status === 'draft' || status === 'issued' || status === 'overdue';
  const locked = !editable;

  useEffect(() => {
    if (!invoiceId) return;
    let active = true;
    setLoading(true);
    void getInvoiceStudioDocument(invoiceId).then((doc) => {
      if (!active) return;
      setCurrentId(doc.id);
      setClientId(doc.clientId);
      setProjectId(doc.projectId);
      setInvoiceNumber(doc.invoiceNumber);
      setElectronicInvoiceReference(doc.electronicInvoiceReference);
      setIssueDate(doc.issueDate);
      setDueDate(doc.dueDate);
      setCurrency(doc.currency);
      setTaxAmount(doc.taxAmount);
      setInternalNotes(doc.notes);
      setStatus(doc.status);
      setLines(doc.lines.length ? doc.lines : [{ id: crypto.randomUUID(), workItemId: null, description: '', quantity: 1, unitPrice: 0, sortOrder: 0 }]);
      setPresentation(doc.presentation);
    }).catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : 'Unable to load invoice.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [invoiceId]);

  useEffect(() => {
    if (invoiceId || !billingProfile) return;
    const defaults = presentationFromProfile(billingProfile);
    setPresentation((current) => ({
      ...current,
      sellerDisplayName: current.sellerDisplayName || defaults.sellerDisplayName,
      sellerLegalName: current.sellerLegalName || defaults.sellerLegalName,
      sellerAddress: current.sellerAddress || defaults.sellerAddress,
      sellerTaxNumber: current.sellerTaxNumber || defaults.sellerTaxNumber,
      sellerTaxRegistrationNumber: current.sellerTaxRegistrationNumber || defaults.sellerTaxRegistrationNumber,
      sellerCommercialRegistrationNumber: current.sellerCommercialRegistrationNumber || defaults.sellerCommercialRegistrationNumber,
      sellerEmail: current.sellerEmail || defaults.sellerEmail,
      sellerPhone: current.sellerPhone || defaults.sellerPhone,
      paymentTerms: current.paymentTerms || defaults.paymentTerms,
      bankName: current.bankName || defaults.bankName,
      accountName: current.accountName || defaults.accountName,
      accountNumber: current.accountNumber || defaults.accountNumber,
      iban: current.iban || defaults.iban,
      swiftCode: current.swiftCode || defaults.swiftCode,
      footer: current.footer || defaults.footer,
    }));
  }, [billingProfile, invoiceId]);

  const updateLine = (id: string, patch: Partial<InvoiceStudioLine>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  const addLine = () => setLines((current) => [...current, { id: crypto.randomUUID(), workItemId: null, description: '', quantity: 1, unitPrice: 0, sortOrder: current.length }]);
  const removeLine = (id: string) => setLines((current) => current.length <= 1 ? current : current.filter((line) => line.id !== id));
  const setP = (key: Exclude<keyof InvoicePresentation, 'showCbeExchangeNote'>, value: string) => setPresentation((current) => ({ ...current, [key]: value }));

  const handleClientChange = (nextClientId: string) => {
    const nextClient = clients.find((row) => row.id === nextClientId);
    const matchingProjects = nextClient
      ? projects.filter((row) => row.clientId === nextClient.id || row.client === nextClient.commercialName || row.client === nextClient.legalName)
      : [];
    const nextProject = matchingProjects[0];
    setClientId(nextClientId);
    setProjectId(nextProject?.id ?? '');
    setCurrency(nextProject?.currency ?? 'EGP');
    setPresentation((current) => mergeProject(mergeBuyer(current, nextClient), nextProject));
  };

  const handleProjectChange = (nextProjectId: string) => {
    const nextProject = projects.find((row) => row.id === nextProjectId);
    const nextClient = nextProject
      ? clients.find((row) => row.id === nextProject.clientId)
        ?? clients.find((row) => row.commercialName === nextProject.client || row.legalName === nextProject.client)
      : client;
    setProjectId(nextProjectId);
    if (nextClient) setClientId(nextClient.id);
    setCurrency(nextProject?.currency ?? currency);
    setPresentation((current) => mergeProject(mergeBuyer(current, nextClient), nextProject));
  };

  const handleEtaFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('ETA XML / JSON import is limited to 5 MB.');
      return;
    }

    setError(null);
    setImportNotice(null);
    setImportWarnings([]);
    try {
      const imported = parseEtaInvoiceFile(await file.text(), file.name);
      const duplicateElectronicInvoice = imported.electronicInvoiceReference
        ? invoices.find((invoice) => invoice.electronicInvoiceReference === imported.electronicInvoiceReference)
        : undefined;
      if (duplicateElectronicInvoice) {
        throw new Error(`This ETA e-Invoice is already in BoostMind as ${duplicateElectronicInvoice.invoiceNumber}.`);
      }
      const matchedClient = findClientForEtaImport(clients, imported.receiverTaxRegistrationNumber, imported.receiverName);
      const matchedClientProjects = matchedClient
        ? projects.filter((row) => row.clientId === matchedClient.id || row.client === matchedClient.commercialName || row.client === matchedClient.legalName)
        : [];
      const matchedProject = findProjectForEtaImport(matchedClientProjects, imported.lines.map((line) => line.description));

      setClientId(matchedClient?.id ?? '');
      setProjectId(matchedProject?.id ?? '');
      const invoiceNumberConflict = imported.invoiceNumber
        ? invoices.some((invoice) => invoice.invoiceNumber.trim().toLowerCase() === imported.invoiceNumber.trim().toLowerCase())
        : false;
      if (imported.invoiceNumber && !invoiceNumberConflict) setInvoiceNumber(imported.invoiceNumber);
      if (imported.electronicInvoiceReference) setElectronicInvoiceReference(imported.electronicInvoiceReference);
      if (imported.issueDate) setIssueDate(imported.issueDate);
      if (imported.currency) setCurrency(imported.currency);
      setTaxAmount(imported.taxAmount);
      setLines(imported.lines);

      setPresentation((current) => {
        const buyerBase = matchedClient
          ? mergeBuyer(current, matchedClient)
          : {
              ...current,
              buyerName: '', buyerAddress: '', buyerTaxNumber: '', buyerTaxRegistrationNumber: '',
              buyerCommercialRegistrationNumber: '', buyerEmail: '', attentionTo: '',
            };
        const projectBase = matchedProject
          ? mergeProject(buyerBase, matchedProject)
          : { ...buyerBase, projectDisplayName: '', projectDescription: '' };
        return {
          ...projectBase,
          sellerLegalName: imported.issuerName || projectBase.sellerLegalName,
          sellerAddress: imported.issuerAddress || projectBase.sellerAddress,
          sellerTaxRegistrationNumber: imported.issuerTaxRegistrationNumber || projectBase.sellerTaxRegistrationNumber,
          buyerName: imported.receiverName || projectBase.buyerName,
          buyerAddress: imported.receiverAddress || projectBase.buyerAddress,
          buyerTaxRegistrationNumber: imported.receiverTaxRegistrationNumber || projectBase.buyerTaxRegistrationNumber,
        };
      });

      const matchText = matchedClient
        ? `Client matched: ${matchedClient.commercialName || matchedClient.legalName}.`
        : 'Client was not matched automatically; choose the linked client before saving.';
      const projectText = matchedProject
        ? ` Project matched: ${matchedProject.name}.`
        : matchedClient ? ' Choose the linked project before saving.' : '';
      setImportNotice(`${imported.sourceFormat} e-Invoice loaded automatically${imported.sourceStatus ? ` · ETA status: ${imported.sourceStatus}` : ''}. ${matchText}${projectText} Review the fields, then save or edit anything you need.`);
      setImportWarnings([
        ...imported.warnings,
        ...(invoiceNumberConflict ? [`ETA internal invoice number ${imported.invoiceNumber} already exists in BoostMind, so the current BoostMind draft number was kept. The ETA UUID was still imported.`] : []),
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to import ETA XML / JSON.');
    }
  };

  const validate = () => {
    if (!clientId) return 'Choose a client.';
    if (!projectId) return 'Choose the linked internal project.';
    if (project && client && !(project.clientId === client.id || project.client === client.commercialName || project.client === client.legalName)) return 'The selected project does not belong to the selected client.';
    if (!invoiceNumber.trim()) return 'Invoice number is required.';
    if (!issueDate) return 'Issue date is required.';
    if (!/^[A-Z]{3}$/.test(currency.trim().toUpperCase())) return 'Invoice currency must be a valid 3-letter currency code.';
    if (presentation.showCbeExchangeNote && !presentation.cbeExchangeNote.trim()) return 'Enter the CBE exchange-rate note or turn the option off.';
    if (!lines.length || lines.some((line) => !line.description.trim() || Number(line.quantity) <= 0 || Number(line.unitPrice) < 0)) return 'Every line needs a description, positive quantity and non-negative rate.';
    if (subtotal <= 0) return 'Invoice subtotal must be greater than zero.';
    if (Number(taxAmount) < 0) return 'Tax cannot be negative.';
    if (!presentation.buyerName.trim()) return 'Bill-to name is required.';
    if (!presentation.sellerDisplayName.trim()) return 'Seller display name is required.';
    return null;
  };

  const persist = async (shouldIssue: boolean) => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    setError(null);
    try {
      const savedId = await saveInvoiceDraft({
        invoiceId: currentId,
        projectId,
        invoiceNumber,
        electronicInvoiceReference,
        issueDate,
        dueDate: dueDate || undefined,
        currency,
        taxAmount: Number(taxAmount),
        notes: internalNotes,
        lines,
        presentation,
      }, shouldIssue);
      setCurrentId(savedId);
      if (shouldIssue) {
        setStatus(dueDate && dueDate < localDate() ? 'overdue' : 'issued');
      } else if (status === 'issued' || status === 'overdue') {
        setStatus(dueDate && dueDate < localDate() ? 'overdue' : 'issued');
      }
      await onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save invoice.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentId) return;
    const warning = electronicInvoiceReference
      ? `Delete invoice ${invoiceNumber}? This removes it from BoostMind only; it does NOT cancel or revoke the ETA electronic invoice ${electronicInvoiceReference}. This action cannot be undone.`
      : `Delete invoice ${invoiceNumber}? This action cannot be undone.`;
    if (!window.confirm(warning)) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteInvoiceRecord(currentId);
      await onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete invoice.');
    } finally {
      setDeleting(false);
    }
  };


  const previewDocument: InvoiceStudioDocument = {
    id: currentId ?? 'preview', projectId, clientId, invoiceNumber, electronicInvoiceReference, issueDate, dueDate, currency,
    subtotal, taxAmount: Number(taxAmount || 0), totalAmount: total, status, notes: internalNotes, lines, presentation,
  };

  return <div className="invoice-studio-backdrop">
    <div className="invoice-studio-shell reveal">
      <header className="invoice-studio-toolbar">
        <div><span className="eyebrow">BoostMind Invoice Studio</span><h2>{currentId ? invoiceNumber : 'New invoice'}</h2><p>{locked ? 'This invoice is locked because it has reached a paid/partial/cancelled financial state.' : status === 'issued' || status === 'overdue' ? 'Issued invoice — edits are allowed and every change is audit logged.' : 'Select the client first, review the auto-filled billing data, then tailor the invoice snapshot.'}</p></div>
        <div className="invoice-studio-actions">
          {!locked && !currentId ? <>
            <input ref={importInputRef} className="invoice-import-input" type="file" accept=".xml,.json,application/xml,text/xml,application/json" onChange={(event) => void handleEtaFileImport(event)} />
            <button className="btn secondary" type="button" disabled={saving || loading} onClick={() => importInputRef.current?.click()}>Import ETA XML / JSON</button>
          </> : null}
          <button className="btn secondary" onClick={() => window.print()}>Print / PDF</button>
          {!locked ? <button className="btn secondary" disabled={saving || loading || deleting} onClick={() => void persist(false)}>{saving ? 'Saving…' : currentId ? 'Save changes' : 'Save draft'}</button> : null}
          {status === 'draft' ? <button className="btn primary" disabled={saving || loading || deleting} onClick={() => void persist(true)}>Issue invoice</button> : null}
          {currentId ? <button className="btn danger" disabled={saving || loading || deleting} onClick={() => void handleDelete()}>{deleting ? 'Deleting…' : 'Delete invoice'}</button> : null}
          <button className="icon-button" onClick={onClose} aria-label="Close Invoice Studio">×</button>
        </div>
      </header>
      <div className="invoice-studio-body">
        <section className="invoice-editor-pane">
          {loading ? <div className="form-note info">Loading invoice…</div> : null}
          {error ? <div className="form-note error">{error}</div> : null}
          {importNotice ? <div className="form-note success">{importNotice}</div> : null}
          {importWarnings.map((warning) => <div className="form-note warning" key={warning}>{warning}</div>)}

          <div className="invoice-editor-section"><div className="invoice-editor-heading"><div><strong>Invoice details</strong><span>Choose the client first, or import an ETA e-Invoice XML / JSON to prefill the draft automatically.</span></div></div><div className="form-grid">
            <label className="wide"><span>Client *</span><select value={clientId} disabled={locked || Boolean(currentId)} onChange={(e) => handleClientChange(e.target.value)}><option value="">Choose client…</option>{clients.filter((row) => row.status === 'Active').map((row) => <option key={row.id} value={row.id}>{row.commercialName} · {row.legalName}</option>)}</select></label>
            <label className="wide"><span>Linked internal project *</span><select value={projectId} disabled={locked || Boolean(currentId) || !clientId} onChange={(e) => handleProjectChange(e.target.value)}><option value="">Choose project…</option>{clientProjects.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label className="wide"><span>Project shown on invoice</span><input value={presentation.projectDisplayName} disabled={locked} onChange={(e) => setP('projectDisplayName', e.target.value)} dir="auto" placeholder="Project / engagement name" /></label>
            <label className="wide"><span>Project description</span><textarea rows={2} value={presentation.projectDescription} disabled={locked} onChange={(e) => setP('projectDescription', e.target.value)} dir="auto" placeholder="Short scope or description shown on the invoice" /></label>
            <label><span>Invoice number *</span><input value={invoiceNumber} disabled={locked} onChange={(e) => setInvoiceNumber(e.target.value)} dir="ltr" /></label>
            <label><span>Electronic invoice no. / UUID</span><input value={electronicInvoiceReference} disabled={locked} onChange={(e) => setElectronicInvoiceReference(e.target.value)} dir="ltr" placeholder="ETA / e-invoice reference" /></label>
            <label><span>Invoice currency</span><input list="invoice-currencies" value={currency} disabled={locked} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} dir="ltr" maxLength={3} /><datalist id="invoice-currencies"><option value="EGP" /><option value="USD" /><option value="EUR" /><option value="GBP" /><option value="SAR" /><option value="AED" /></datalist></label>
            <label><span>Issue date *</span><input type="date" value={issueDate} disabled={locked} onChange={(e) => setIssueDate(e.target.value)} /></label>
            <label><span>Due date</span><input type="date" value={dueDate} disabled={locked} onChange={(e) => setDueDate(e.target.value)} /></label>
            <label><span>PO / Reference</span><input value={presentation.purchaseOrderReference} disabled={locked} onChange={(e) => setP('purchaseOrderReference', e.target.value)} dir="auto" /></label>
            <label><span>Attention to</span><input value={presentation.attentionTo} disabled={locked} onChange={(e) => setP('attentionTo', e.target.value)} dir="auto" /></label>
          </div>{clientId && !clientProjects.length ? <div className="form-note warning">This client has no linked project yet. Create or link a project before issuing the invoice; the printed project name/description can still be customized here.</div> : null}</div>

          <div className="invoice-editor-section"><div className="invoice-editor-heading"><div><strong>Bill to</strong><span>Auto-filled from the selected client and editable as this invoice's frozen snapshot.</span></div></div><div className="form-grid">
            <label className="wide"><span>Client / legal name *</span><input value={presentation.buyerName} disabled={locked} onChange={(e) => setP('buyerName', e.target.value)} dir="auto" /></label>
            <label className="wide"><span>Address</span><input value={presentation.buyerAddress} disabled={locked} onChange={(e) => setP('buyerAddress', e.target.value)} dir="auto" /></label>
            <label><span>Tax number</span><input value={presentation.buyerTaxNumber} disabled={locked} onChange={(e) => setP('buyerTaxNumber', e.target.value)} dir="ltr" /></label>
            <label><span>Tax registration number</span><input value={presentation.buyerTaxRegistrationNumber} disabled={locked} onChange={(e) => setP('buyerTaxRegistrationNumber', e.target.value)} dir="ltr" /></label>
            <label><span>Commercial registration number</span><input value={presentation.buyerCommercialRegistrationNumber} disabled={locked} onChange={(e) => setP('buyerCommercialRegistrationNumber', e.target.value)} dir="ltr" /></label>
            <label><span>Billing email</span><input value={presentation.buyerEmail} disabled={locked} onChange={(e) => setP('buyerEmail', e.target.value)} dir="ltr" /></label>
          </div></div>

          <div className="invoice-editor-section"><div className="invoice-editor-heading"><strong>Line items</strong><button className="text-button" type="button" disabled={locked} onClick={addLine}>＋ Add line</button></div><div className="invoice-line-editor">
            {lines.map((line, index) => <div className="invoice-line-edit-row" key={line.id}>
              <span className="line-index">{index + 1}</span>
              <div className="line-description-fields"><input placeholder="Description" value={line.description} disabled={locked} onChange={(e) => updateLine(line.id, { description: e.target.value })} dir="auto" /><select value={line.workItemId ?? ''} disabled={locked} onChange={(e) => updateLine(line.id, { workItemId: e.target.value || null })}><option value="">Base project / no service</option>{scopedServices.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></div>
              <input className="line-number" type="number" min="0.0001" step="0.0001" value={line.quantity} disabled={locked} onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })} aria-label="Quantity" />
              <input className="line-number" type="number" min="0" step="0.01" value={line.unitPrice} disabled={locked} onChange={(e) => updateLine(line.id, { unitPrice: Number(e.target.value) })} aria-label="Unit price" />
              <strong>{money(line.quantity * line.unitPrice, currency)}</strong>
              <button className="line-remove" type="button" disabled={locked || lines.length <= 1} onClick={() => removeLine(line.id)} aria-label="Remove line">×</button>
            </div>)}
          </div></div>

          <div className="invoice-editor-section"><div className="invoice-editor-heading"><strong>Totals & notes</strong><span>Displayed exactly in the PDF/print layout</span></div><div className="form-grid">
            <label><span>Tax label</span><input value={presentation.taxLabel} disabled={locked} onChange={(e) => setP('taxLabel', e.target.value)} /></label>
            <label><span>Tax amount</span><input type="number" min="0" step="0.01" value={taxAmount} disabled={locked} onChange={(e) => setTaxAmount(Number(e.target.value))} /></label>
            <label className="wide invoice-check-field"><input type="checkbox" checked={presentation.showCbeExchangeNote} disabled={locked} onChange={(e) => setPresentation((current) => ({ ...current, showCbeExchangeNote: e.target.checked, cbeExchangeNote: e.target.checked && !current.cbeExchangeNote.trim() ? DEFAULT_CBE_NOTE : current.cbeExchangeNote }))} /><span>Show Central Bank of Egypt exchange-rate note</span><small>Optional explanatory sentence only — no EGP amount is calculated or displayed.</small></label>
            {presentation.showCbeExchangeNote ? <label className="wide"><span>CBE exchange-rate note</span><textarea rows={2} value={presentation.cbeExchangeNote} disabled={locked} onChange={(e) => setP('cbeExchangeNote', e.target.value)} dir="auto" /></label> : null}
            <label className="wide"><span>Public invoice notes</span><textarea rows={3} value={presentation.publicNotes} disabled={locked} onChange={(e) => setP('publicNotes', e.target.value)} dir="auto" /></label>
            <label className="wide"><span>Internal notes</span><textarea rows={2} value={internalNotes} disabled={locked} onChange={(e) => setInternalNotes(e.target.value)} dir="auto" /></label>
          </div></div>

          <div className="invoice-editor-section"><div className="invoice-editor-heading"><strong>Payment / transfer details</strong><span>Change them per invoice without changing the company default</span></div><div className="form-grid">
            <label><span>Bank</span><input value={presentation.bankName} disabled={locked} onChange={(e) => setP('bankName', e.target.value)} dir="auto" /></label>
            <label><span>Account name</span><input value={presentation.accountName} disabled={locked} onChange={(e) => setP('accountName', e.target.value)} dir="auto" /></label>
            <label><span>Account number</span><input value={presentation.accountNumber} disabled={locked} onChange={(e) => setP('accountNumber', e.target.value)} dir="ltr" /></label>
            <label><span>IBAN</span><input value={presentation.iban} disabled={locked} onChange={(e) => setP('iban', e.target.value)} dir="ltr" /></label>
            <label><span>SWIFT</span><input value={presentation.swiftCode} disabled={locked} onChange={(e) => setP('swiftCode', e.target.value)} dir="ltr" /></label>
            <label className="wide"><span>Payment terms</span><textarea rows={2} value={presentation.paymentTerms} disabled={locked} onChange={(e) => setP('paymentTerms', e.target.value)} dir="auto" /></label>
            <label className="wide"><span>Footer</span><textarea rows={2} value={presentation.footer} disabled={locked} onChange={(e) => setP('footer', e.target.value)} dir="auto" /></label>
          </div></div>
        </section>
        <aside className="invoice-preview-pane"><div className="invoice-preview-label"><span>Live preview</span><strong>{money(total, currency)}</strong></div><InvoicePreview document={previewDocument} /></aside>
      </div>
    </div>
  </div>;
}

export function LegacyInvoiceStudioPage({ projects, services, clients, invoices, onRefresh, initialProjectId }: {
  projects: Project[];
  services: AdditionalService[];
  clients: ClientRecord[];
  invoices: InvoiceBalance[];
  onRefresh: () => Promise<void> | void;
  initialProjectId?: string;
}) {
  const organizationId = 'boostmind';
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [builderId, setBuilderId] = useState<string | null | undefined>(initialProjectId ? null : undefined);
  const [profileWarning, setProfileWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    void getDefaultBillingProfile(organizationId).then((row) => { if (active) setProfile(row); }).catch((caught) => { if (active) setProfileWarning(caught instanceof Error ? caught.message : 'Billing profile is not visible for this role.'); });
    return () => { active = false; };
  }, [organizationId]);

  return <>
    <div className="page-header reveal"><div><div className="eyebrow">Finance / Client Documents</div><h1>Invoices</h1><p>Build professional BoostMind invoices, control what appears on each document, and print or save them as PDF.</p></div><div className="page-actions"><button className="btn secondary" onClick={() => setProfileOpen(true)}>Billing profile</button><button className="btn primary" onClick={() => setBuilderId(null)}>＋ New invoice</button></div></div>
    <div className="invoice-studio-intro reveal reveal-delay-1"><div><img src={BRAND_LOGO_URL} alt="BoostMind Technology" /><div><strong>Professional invoice template</strong><span>Logo, client details, line items, tax, payment terms and transfer information in one clean A4 layout.</span></div></div><span className="soft-pill">Print / PDF ready</span></div>
    {profileWarning ? <div className="data-mode-banner warning"><strong>Billing defaults unavailable</strong><span>{profileWarning} You can still type invoice-specific details manually.</span></div> : null}
    <div className="table-shell reveal reveal-delay-2"><div className="table-scroll"><table className="data-table"><thead><tr><th>Invoice</th><th>Client / Project</th><th>Issue</th><th>Due</th><th>Status</th><th className="num">Total</th><th className="num">Collected</th><th className="num">Outstanding</th><th></th></tr></thead><tbody>
      {invoices.length ? invoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.invoiceNumber}</strong>{invoice.electronicInvoiceReference ? <span className="subline">E-Invoice: {invoice.electronicInvoiceReference}</span> : null}</td><td><strong>{invoice.clientName}</strong><span className="subline">{invoice.projectName}</span></td><td>{invoice.issueDate}</td><td>{invoice.dueDate}</td><td><span className={`invoice-status ${statusTone(invoice.status)}`}>{invoice.status}</span></td><td className="num money">{money(invoice.total, invoice.currency)}</td><td className="num money">{money(invoice.collected, invoice.currency)}</td><td className="num money">{money(invoice.outstanding, invoice.currency)}</td><td><button className="text-button" onClick={() => setBuilderId(invoice.id)}>Open / Print →</button></td></tr>) : <tr><td colSpan={9} className="empty-row">No invoices yet. Create the first professional invoice from Invoice Studio.</td></tr>}
    </tbody></table></div></div>
    {profileOpen ? <BillingProfileModal profile={profile} organizationId={organizationId} onClose={() => setProfileOpen(false)} onSaved={setProfile} /> : null}
    {builderId !== undefined ? <InvoiceBuilder invoiceId={builderId} projects={projects} services={services} clients={clients} billingProfile={profile} invoices={invoices} onClose={() => setBuilderId(undefined)} onSaved={onRefresh} /> : null}
  </>;
}
