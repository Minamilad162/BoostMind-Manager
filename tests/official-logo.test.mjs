import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const file = (name) => readFileSync(join(root, name));
const src = (name) => file(name).toString('utf8');
const digest = (path) => createHash('sha256').update(file(path)).digest('hex');

test('Official user image is reused byte-for-byte and versioned for CDN freshness', () => {
  assert.ok(existsSync(join(root, 'public/brand/boostmind-technology-official-v122.webp')));
  assert.equal(digest('public/brand/boostmind-technology-official-v122.webp'), digest('public/boostmind-logo.webp'));
  assert.match(src('src/brand.ts'), /boostmind-technology-official-v122\.webp/);
  assert.match(src('index.html'), /boostmind-release.*1\.2\.2-official-logo/);
});

test('The same current logo is wired to login, sidebar, setup, splash and invoice print', () => {
  const app=src('src/App.tsx');
  const invoice=src('src/invoice/InvoiceStudio.tsx');
  assert.equal((app.match(/src=\{BRAND_LOGO_URL\}/g) ?? []).length, 5);
  assert.equal((invoice.match(/src=\{BRAND_LOGO_URL\}/g) ?? []).length, 2);
  assert.ok(app.includes("from './brand'"));
  assert.ok(invoice.includes("from '../brand'"));
  assert.ok(app.includes('className="sidebar-company-brand"'));
  assert.ok(invoice.includes('className="invoice-brand-block"'));
  for(const content of [app, invoice]) {
    assert.ok(!content.includes('src="/boostmind-logo.webp"'));
    assert.ok(!content.includes('src="/boostmind-mark.png"'));
    assert.ok(!content.includes('boostmind-logo.svg'));
  }
});

test('Current official favicon and mobile app icons are bound in HTML', () => {
  for(const asset of ['public/boostmind-favicon-v122.png','public/boostmind-app-icon-v122.png'])
    assert.ok(existsSync(join(root,asset)),asset);
  assert.match(src('index.html'), /href="\/boostmind-favicon-v122\.png"/);
  assert.match(src('index.html'), /href="\/boostmind-app-icon-v122\.png"/);
});
