const fs = require('fs');
const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');

function expectFile(relativePath) {
  const fullPath = path.join(root, relativePath);
  assert.ok(fs.existsSync(fullPath), `Missing required file: ${relativePath}`);
}

test('migration audit exists and documents the required native architecture', () => {
  expectFile('NATIVE_APP_MIGRATION_AUDIT.md');
  const audit = fs.readFileSync(path.join(root, 'NATIVE_APP_MIGRATION_AUDIT.md'), 'utf8');
  assert.match(audit, /StockFlow/i);
  assert.match(audit, /BadBin/i);
  assert.match(audit, /Google Apps Script/i);
});

test('shared domain models are present for the centralized data model', () => {
  expectFile('shared/models/index.js');
  const modelFile = fs.readFileSync(path.join(root, 'shared/models/index.js'), 'utf8');
  const neededModels = ['User', 'InventoryItem', 'IMEI', 'Transfer', 'Sale', 'Payment', 'Repair'];
  for (const modelName of neededModels) {
    assert.ok(modelFile.includes(modelName), `Model missing: ${modelName}`);
  }
});

test('native app project structure exists for windows and android clients', () => {
  expectFile('apps/windows/README.md');
  expectFile('apps/android/README.md');
  expectFile('backend/apps-script/README.md');
});

test('production docs exist for deployment and release workflow', () => {
  expectFile('ARCHITECTURE.md');
  expectFile('FINAL_NATIVE_APPLICATION_REPORT.md');
  expectFile('RELEASE_PROCESS.md');
});
