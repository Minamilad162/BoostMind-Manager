import type { ClientRecord, InvoiceStudioLine, InvoiceProject as Project } from './types';

type JsonObject = Record<string, unknown>;

export interface EtaInvoiceImportResult {
  invoiceNumber: string;
  electronicInvoiceReference: string;
  issueDate: string;
  currency: string;
  taxAmount: number;
  issuerName: string;
  issuerTaxRegistrationNumber: string;
  issuerAddress: string;
  receiverName: string;
  receiverTaxRegistrationNumber: string;
  receiverAddress: string;
  lines: InvoiceStudioLine[];
  sourceStatus: string;
  sourceFormat: 'ETA XML' | 'ETA JSON';
  warnings: string[];
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function numberValue(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function positiveNumber(value: unknown, fallback = 1): number {
  const numeric = numberValue(value);
  return numeric != null && numeric > 0 ? numeric : fallback;
}

function isoDate(value: unknown): string {
  const raw = text(value);
  if (!raw) return '';
  const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? '';
}

function formatAddress(value: unknown): string {
  const address = asObject(value);
  const parts = [
    text(address.buildingNumber),
    text(address.street),
    text(address.regionCity),
    text(address.governate),
    text(address.country),
  ].filter(Boolean);
  return [...new Set(parts)].join(', ');
}

function normalizeComparable(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

function digitsOnly(value: string): string {
  return value.replace(/\D+/g, '');
}

function parseEmbeddedDocument(root: JsonObject): JsonObject {
  const embedded = root.document;
  if (typeof embedded === 'string') {
    try {
      return asObject(JSON.parse(embedded));
    } catch {
      throw new Error('The imported file contains an invalid embedded ETA document.');
    }
  }
  if (embedded && typeof embedded === 'object') return asObject(embedded);
  // Also allow a raw ETA document export without the outer search/result wrapper.
  if ('issuer' in root && 'receiver' in root && 'invoiceLines' in root) return root;
  throw new Error('This file does not look like a supported ETA e-Invoice export.');
}

function getLineCurrency(line: JsonObject): string {
  const unitValue = asObject(line.unitValue);
  return text(unitValue.currencySold).toUpperCase();
}

function getLineUnitPrice(line: JsonObject, quantity: number, currency: string): number {
  const netTotal = numberValue(line.netTotal);
  if (netTotal != null && netTotal >= 0 && quantity > 0) return netTotal / quantity;

  const unitValue = asObject(line.unitValue);
  const amountSold = numberValue(unitValue.amountSold);
  const amountEgp = numberValue(unitValue.amountEGP);
  if (currency !== 'EGP' && amountSold != null && amountSold >= 0) return amountSold;
  if (amountEgp != null && amountEgp >= 0) return amountEgp;

  const salesTotal = numberValue(line.salesTotal);
  return salesTotal != null && salesTotal >= 0 && quantity > 0 ? salesTotal / quantity : 0;
}

function xmlText(root: Document | Element, tagName: string): string {
  return root.getElementsByTagName(tagName)[0]?.textContent?.trim() ?? '';
}

function decodeXmlEntities(value: string): string {
  const named: Record<string, string> = { quot: '"', apos: "'", amp: '&', lt: '<', gt: '>' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|quot|apos|amp|lt|gt);/gi, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

function xmlTextFallback(rawText: string, tagName: string): string {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = rawText.match(new RegExp(`<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`, 'i'));
  if (!match) return '';
  const raw = match[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
  return decodeXmlEntities(raw).trim();
}

function embeddedEtaDocumentFallback(rawText: string): string {
  // ETA search/export XML uses <document> both as the outer wrapper and for the
  // embedded JSON payload. Match only a document node whose content starts with
  // a JSON object so the outer wrapper is never mistaken for the payload.
  const match = rawText.match(/<document(?:\s[^>]*)?>\s*(\{[\s\S]*?\})\s*<\/document>/i);
  return match ? decodeXmlEntities(match[1]).trim() : '';
}

function parseEtaXml(rawText: string): JsonObject {
  let readTag: (tagName: string) => string;
  let embeddedText = '';
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const xml = parser.parseFromString(rawText, 'application/xml');
    if (xml.getElementsByTagName('parsererror').length) throw new Error('The selected file is not valid XML.');
    readTag = (tagName) => xmlText(xml, tagName);
    embeddedText = Array.from(xml.getElementsByTagName('document'))
      .map((node) => node.textContent?.trim() ?? '')
      .find((value) => value.startsWith('{')) ?? '';
  } else {
    // Node/test fallback. Production browsers use DOMParser; the fallback keeps the
    // parser deterministic and testable without introducing an XML dependency.
    if (!rawText.trim().startsWith('<')) throw new Error('The selected file is not valid XML.');
    readTag = (tagName) => xmlTextFallback(rawText, tagName);
    embeddedText = embeddedEtaDocumentFallback(rawText);
  }

  if (embeddedText) {
    let embedded: JsonObject;
    try {
      embedded = asObject(JSON.parse(embeddedText));
    } catch {
      throw new Error('The ETA XML contains an embedded document that could not be decoded.');
    }
    return {
      uuid: readTag('uuid'),
      submissionUUID: readTag('submissionUUID'),
      longId: readTag('longId'),
      internalId: readTag('internalId'),
      typeName: readTag('typeName'),
      issuerId: readTag('issuerId'),
      issuerName: readTag('issuerName'),
      receiverId: readTag('receiverId'),
      receiverName: readTag('receiverName'),
      dateTimeIssued: readTag('dateTimeIssued'),
      dateTimeReceived: readTag('dateTimeReceived'),
      totalSales: readTag('totalSales'),
      totalDiscount: readTag('totalDiscount'),
      netAmount: readTag('netAmount'),
      total: readTag('total'),
      status: readTag('status') || readTag('validationResults'),
      document: embedded,
    };
  }

  // Fallback for a raw XML-shaped ETA invoice where issuer/receiver/lines are nodes.
  // The common ETA download currently embeds JSON inside <document>; fail clearly for
  // other schemas instead of guessing values silently.
  throw new Error('This ETA XML format is not supported yet because it does not contain the expected embedded <document> payload.');
}

function parseEtaRoot(rawText: string, fileName = ''): { root: JsonObject; sourceFormat: 'ETA XML' | 'ETA JSON' } {
  const trimmed = rawText.trim();
  const looksXml = fileName.toLowerCase().endsWith('.xml') || trimmed.startsWith('<');
  if (looksXml) return { root: parseEtaXml(rawText), sourceFormat: 'ETA XML' };
  try {
    return { root: asObject(JSON.parse(rawText)), sourceFormat: 'ETA JSON' };
  } catch {
    throw new Error('The selected file is neither valid ETA XML nor valid JSON.');
  }
}

export function parseEtaInvoiceFile(rawText: string, fileName = ''): EtaInvoiceImportResult {
  const { root, sourceFormat } = parseEtaRoot(rawText, fileName);
  const document = parseEmbeddedDocument(root);
  const documentType = text(document.documentType || root.typeName).toLowerCase();
  if (documentType && documentType !== 'i') {
    throw new Error('The selected ETA document is not an invoice document.');
  }

  const issuer = asObject(document.issuer);
  const receiver = asObject(document.receiver);
  const rawLines = asArray(document.invoiceLines).map(asObject);
  if (!rawLines.length) throw new Error('The ETA invoice does not contain invoice lines.');

  const lineCurrencies = rawLines.map(getLineCurrency).filter(Boolean);
  const uniqueCurrencies = [...new Set(lineCurrencies)];
  const currency = uniqueCurrencies[0] || 'EGP';

  const lines = rawLines.map((line, index): InvoiceStudioLine => {
    const quantity = positiveNumber(line.quantity);
    const lineCurrency = getLineCurrency(line) || currency;
    return {
      id: crypto.randomUUID(),
      workItemId: null,
      description: text(line.description) || `Imported item ${index + 1}`,
      quantity,
      unitPrice: getLineUnitPrice(line, quantity, lineCurrency),
      sortOrder: index,
    };
  });

  const taxTotals = asArray(document.taxTotals).map(asObject);
  const explicitTax = taxTotals.reduce((sum, row) => sum + (numberValue(row.amount) ?? 0), 0);
  const totalAmount = numberValue(document.totalAmount ?? root.total);
  const netAmount = numberValue(document.netAmount ?? root.netAmount);
  const calculatedTax = totalAmount != null && netAmount != null ? Math.max(0, totalAmount - netAmount) : 0;
  const taxAmount = explicitTax > 0 ? explicitTax : calculatedTax;

  const invoiceNumber = text(document.internalID || root.internalId);
  const electronicInvoiceReference = text(root.uuid || root.longId || root.submissionUUID);
  const sourceStatus = text(root.status || asObject(root.validationResults).status);
  const warnings: string[] = [];

  if (uniqueCurrencies.length > 1) warnings.push(`The ETA file contains more than one currency (${uniqueCurrencies.join(', ')}). Review the imported line values before saving.`);
  if (sourceStatus && sourceStatus.toLowerCase() !== 'valid') warnings.push(`ETA document status is ${sourceStatus}; review it before using this draft.`);

  const importedSubtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  if (netAmount != null && Math.abs(importedSubtotal - netAmount) > 0.02) {
    warnings.push('Imported line subtotal does not exactly match the ETA net amount. Review discounts/fees before issuing the BoostMind invoice.');
  }

  return {
    invoiceNumber,
    electronicInvoiceReference,
    issueDate: isoDate(document.dateTimeIssued || root.dateTimeIssued),
    currency,
    taxAmount,
    issuerName: text(issuer.name || root.issuerName),
    issuerTaxRegistrationNumber: text(issuer.id || root.issuerId),
    issuerAddress: formatAddress(issuer.address),
    receiverName: text(receiver.name || root.receiverName),
    receiverTaxRegistrationNumber: text(receiver.id || root.receiverId),
    receiverAddress: formatAddress(receiver.address),
    lines,
    sourceStatus,
    sourceFormat,
    warnings,
  };
}

// Backward-compatible helper retained for older callers/tests.
export function parseEtaInvoiceJson(rawText: string): EtaInvoiceImportResult {
  return parseEtaInvoiceFile(rawText, 'invoice.json');
}

export function findClientForEtaImport(clients: ClientRecord[], taxRegistrationNumber: string, receiverName: string): ClientRecord | undefined {
  const taxId = digitsOnly(taxRegistrationNumber);
  if (taxId) {
    const taxMatches = clients.filter((client) => [client.taxRegistrationNumber, client.taxNumber].some((value) => digitsOnly(value) === taxId));
    if (taxMatches.length === 1) return taxMatches[0];
  }

  const normalizedName = normalizeComparable(receiverName);
  if (!normalizedName) return undefined;
  const nameMatches = clients.filter((client) => [client.legalName, client.commercialName].some((value) => normalizeComparable(value) === normalizedName));
  return nameMatches.length === 1 ? nameMatches[0] : undefined;
}

function matchTokens(value: string): string[] {
  const stopWords = new Set(['project', 'invoice', 'installment', 'payment', 'phase']);
  return value
    .normalize('NFKC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !stopWords.has(token));
}

function projectDescriptionScore(project: Project, rawDescription: string): number {
  const description = normalizeComparable(rawDescription);
  const projectName = normalizeComparable(project.name);
  const projectCode = normalizeComparable(project.code ?? '');
  if (!description || !projectName) return 0;
  if (description.includes(projectName) || projectName.includes(description)) return 1.2;
  if (projectCode && description.includes(projectCode)) return 1.15;

  const projectTokens = [...new Set(matchTokens(project.name))];
  const descriptionTokens = new Set(matchTokens(rawDescription));
  if (!projectTokens.length || !descriptionTokens.size) return 0;
  const matched = projectTokens.filter((token) => descriptionTokens.has(token)).length;
  const coverage = matched / projectTokens.length;
  // Require at least two meaningful matching tokens when the project has multiple
  // words so a single generic term is never enough to auto-link an invoice.
  const minimumMatches = projectTokens.length === 1 ? 1 : 2;
  return matched >= minimumMatches && coverage >= 0.6 ? coverage : 0;
}

export function findProjectForEtaImport(projects: Project[], importedLineDescriptions: string[]): Project | undefined {
  if (!projects.length) return undefined;
  if (projects.length === 1) return projects[0];

  const scored = projects.map((project) => ({
    project,
    score: importedLineDescriptions.reduce((best, description) => Math.max(best, projectDescriptionScore(project, description)), 0),
  })).filter((row) => row.score > 0).sort((a, b) => b.score - a.score);

  if (!scored.length) return undefined;
  if (scored.length === 1) return scored[0].project;
  // Do not guess when two projects are effectively tied. The user can choose the
  // project explicitly while all other ETA fields stay prefilled.
  return scored[0].score - scored[1].score >= 0.15 ? scored[0].project : undefined;
}
