const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'google-apps-script/Code.gs'), 'utf8');

function loadBackendHelpers() {
  const context = {
    console,
    Utilities: {
      formatDate: (date) => date.toISOString().slice(0, 10)
    }
  };
  vm.createContext(context);
  vm.runInContext(`${source}\nthis.testHelpers = { normalizeIdentifier_, normalizeSerial_, isValidImei_, normalizeDate_, classifyAuditAction_, resolveRequestUser_ };`, context);
  return context.testHelpers;
}

test('backend normalizes identifiers and validates IMEI checksums', () => {
  const helpers = loadBackendHelpers();

  assert.equal(helpers.normalizeIdentifier_(' 35-209900-176148-1 '), '352099001761481');
  assert.equal(helpers.normalizeSerial_('  ab  12  '), 'AB 12');
  assert.equal(helpers.isValidImei_('352099001761481'), true);
  assert.equal(helpers.isValidImei_('352099001761482'), false);
  assert.equal(helpers.isValidImei_('67230/W6QE00323'), false);
});

test('backend normalizes dates and classifies audit events', () => {
  const helpers = loadBackendHelpers();

  assert.equal(helpers.normalizeDate_('2026-09-21T14:30:00Z', '2026-01-01'), '2026-09-21');
  assert.equal(helpers.normalizeDate_('not-a-date', '2026-01-01'), '2026-01-01');
  assert.equal(helpers.classifyAuditAction_('BACKUP', 'System'), 'CREATE_BACKUP');
  assert.equal(helpers.classifyAuditAction_('anything', 'Transfers'), 'UPDATE');
  assert.equal(helpers.classifyAuditAction_('anything', 'Payments'), 'UPDATE');
});

test('audit classification does not infer business events from module text', () => {
  const helpers = loadBackendHelpers();
  assert.equal(helpers.classifyAuditAction_('PROCESS_SALE', 'Anything'), 'PROCESS_SALE');
  assert.equal(helpers.classifyAuditAction_('BACKUP', 'System'), 'CREATE_BACKUP');
  assert.equal(helpers.classifyAuditAction_('PROCESS_SALE_NOW', 'Sales'), 'UPDATE');
});

test('backend exposes the Phase 2 and Phase 3 API actions', () => {
  assert.match(source, /case 'matchTransferScan'/);
  assert.match(source, /case 'exportAuditReport'/);
  assert.match(source, /case 'reconcilePayment'/);
  assert.match(source, /case 'validateOcrCandidate'/);
});