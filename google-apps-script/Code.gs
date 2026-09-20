/**
 * ============================================================================
 * StockFlow + BadBin Enterprise Centralized Engine
 * Google Apps Script Master API & Database Management System
 * Version: 2.0.0-centralized
 * ============================================================================
 * Architecture:
 * - InfinityFree Static Frontend (Client)
 * - Google Apps Script Web App (API & Business Logic)
 * - Google Sheets (Centralized Multi-User Relational Database)
 * ============================================================================
 */

// Global Sheet Names
const SHEETS = {
  USERS: 'Users',
  PRODUCTS: 'Products',
  INVENTORY: 'Inventory',
  IMEI: 'IMEI',
  TRANSACTIONS: 'Transactions',
  TRANSFERS: 'Transfers',
  SALES: 'Sales',
  CUSTOMERS: 'Customers',
  SUPPLIERS: 'Suppliers',
  LOCATIONS: 'Locations',
  REPAIRS: 'Repairs',
  PAYMENTS: 'Payments',
  AUDIT_LOG: 'Audit_Log',
  SETTINGS: 'Settings',
  TASKS: 'Tasks'
};

// Roles & Hierarchies
const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  WAREHOUSE_MGR: 'Warehouse Manager',
  LOGISTICS: 'Logistics',
  SALES_EXEC: 'Sales Executive',
  ACCOUNTS: 'Accounts',
  SERVICE: 'Service',
  VIEWER: 'Viewer'
};

// Permission definitions for server-side authorization
const PERMISSION_MATRIX = {
  'VIEW': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WAREHOUSE_MGR, ROLES.LOGISTICS, ROLES.SALES_EXEC, ROLES.ACCOUNTS, ROLES.SERVICE, ROLES.VIEWER],
  'ADD_MOVEMENT': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WAREHOUSE_MGR, ROLES.LOGISTICS],
  'CREATE_TRANSFER': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WAREHOUSE_MGR, ROLES.LOGISTICS],
  'APPROVE_TRANSFER': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WAREHOUSE_MGR],
  'DISPATCH_TRANSFER': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WAREHOUSE_MGR, ROLES.LOGISTICS],
  'RECEIVE_TRANSFER': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WAREHOUSE_MGR, ROLES.LOGISTICS],
  'PROCESS_SALE': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALES_EXEC],
  'ADJUST_STOCK': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WAREHOUSE_MGR],
  'MANAGE_PRODUCTS': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WAREHOUSE_MGR],
  'MANAGE_REPAIRS': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SERVICE],
  'MANAGE_USERS': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  'RECONCILE_PAYMENT': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTS],
  'MATCH_TRANSFER': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WAREHOUSE_MGR, ROLES.LOGISTICS],
  'EXPORT_AUDIT': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTS],
  'DELETE_DATA': [ROLES.SUPER_ADMIN],
  'EXPORT_DATA': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WAREHOUSE_MGR, ROLES.ACCOUNTS]
};

/**
 * HTTP GET Handler (Health check, JSONP, Quick Sync)
 */
function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action || 'ping';
  
  if (action === 'ping') {
    return jsonResponse({
      success: true,
      message: 'StockFlow Centralized Apps Script API is active',
      version: '2.0.0-centralized',
      timestamp: new Date().toISOString()
    }, params.callback);
  }
  
  if (action === 'syncAll') {
    return jsonResponse(handleSyncAll(params.userEmail || 'system'), params.callback);
  }

  return jsonResponse({
    success: false,
    error: 'Unsupported GET action. Use POST for mutations.'
  }, params.callback);
}

/**
 * HTTP POST Handler (Primary REST Bridge)
 * Accepts application/json or text/plain (avoids CORS preflight in browsers)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Concurrency control: wait up to 30 seconds for lock
  const hasLock = lock.tryLock(30000);
  
  if (!hasLock) {
    return jsonResponse({
      success: false,
      error: 'System is busy with a concurrent transaction. Please retry in a few seconds.'
    });
  }

  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        return jsonResponse({ success: false, error: 'Invalid JSON payload: ' + parseErr.message });
      }
    } else {
      payload = e.parameter || {};
    }

    const action = payload.action;
    const user = payload.user || { email: 'system@stockflow.internal', role: 'Super Admin', name: 'System' };

    if (!action) {
      return jsonResponse({ success: false, error: 'Action parameter is required.' });
    }

    const idempotencyKey = String(payload.idempotencyKey || '').trim();
    if (idempotencyKey) {
      const priorRequest = getRowsAsObjects(SHEETS.AUDIT_LOG).find(row => String(row.targetId) === idempotencyKey);
      if (priorRequest) {
        return jsonResponse({ success: true, duplicateRequest: true, idempotencyKey, message: 'Request already applied.' });
      }
    }

    // Action Router
    let result;
    switch (action) {
      case 'setupDatabase':
        result = setupDatabase();
        break;

      case 'login':
        result = handleLogin(payload);
        break;

      case 'syncAll':
        checkPermission(user.role, 'VIEW');
        result = handleSyncAll(user.email);
        break;

      case 'saveMovement':
        checkPermission(user.role, 'ADD_MOVEMENT');
        result = handleSaveMovement(payload, user);
        break;

      case 'createTransfer':
        checkPermission(user.role, 'CREATE_TRANSFER');
        result = handleCreateTransfer(payload, user);
        break;

      case 'updateTransferStatus':
        result = handleUpdateTransferStatus(payload, user);
        break;

      case 'matchTransferScan':
        checkPermission(user.role, 'MATCH_TRANSFER');
        result = handleMatchTransferScan(payload, user);
        break;

      case 'processSale':
        checkPermission(user.role, 'PROCESS_SALE');
        result = handleProcessSale(payload, user);
        break;

      case 'adjustStock':
        checkPermission(user.role, 'ADJUST_STOCK');
        result = handleAdjustStock(payload, user);
        break;

      case 'saveProduct':
        checkPermission(user.role, 'MANAGE_PRODUCTS');
        result = handleSaveProduct(payload, user);
        break;

      case 'saveImeiBatch':
        checkPermission(user.role, 'ADD_MOVEMENT');
        result = handleSaveImeiBatch(payload, user);
        break;

      case 'checkDuplicateImei':
        result = handleCheckDuplicateImei(payload);
        break;

      case 'saveRepair':
        checkPermission(user.role, 'MANAGE_REPAIRS');
        result = handleSaveRepair(payload, user);
        break;

      case 'bulkImport':
        checkPermission(user.role, 'ADD_MOVEMENT');
        result = handleBulkImport(payload, user);
        break;

      case 'createBackup':
        checkPermission(user.role, 'MANAGE_USERS');
        result = handleCreateBackup(user);
        break;

      case 'getAuditLog':
        result = handleGetAuditLog(payload);
        break;

      case 'exportAuditReport':
        checkPermission(user.role, 'EXPORT_AUDIT');
        result = handleExportAuditReport(payload, user);
        break;

      case 'reconcilePayment':
        checkPermission(user.role, 'RECONCILE_PAYMENT');
        result = handleReconcilePayment(payload, user);
        break;

      case 'validateOcrCandidate':
        result = handleValidateOcrCandidate(payload);
        break;

      case 'saveUser':
        checkPermission(user.role, 'MANAGE_USERS');
        result = handleSaveUser(payload, user);
        break;

      case 'saveTaskBatch':
        checkPermission(user.role, 'MANAGE_USERS');
        result = handleSaveTaskBatch(payload, user);
        break;

      default:
        result = { success: false, error: 'Unknown API action: ' + action };
    }

    if (idempotencyKey && result && result.success !== false) {
      logAudit_({
        user: user.name,
        userRole: user.role,
        action: action,
        module: 'API',
        targetId: idempotencyKey,
        previousValue: '',
        newValue: { applied: true },
        reason: 'Idempotent request applied successfully'
      });
    }

    return jsonResponse(result);

  } catch (err) {
    const apiError = normalizeApiError_(err);
    return jsonResponse({
      success: false,
      error: apiError.message,
      errorCode: apiError.code,
      retryable: apiError.retryable
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Standardized JSON / JSONP Response builder
 */
function jsonResponse(obj, callback) {
  const jsonString = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + jsonString + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(jsonString)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Role Permission Validator
 */
function checkPermission(userRole, permissionRequired) {
  const allowedRoles = PERMISSION_MATRIX[permissionRequired] || [];
  if (!allowedRoles.includes(userRole)) {
    throw new Error(`Permission Denied: Role '${userRole}' is not authorized to perform '${permissionRequired}'.`);
  }
}

/**
 * Generate Secure Unique IDs
 */
function generateId(prefix) {
  const timestamp = Utilities.formatDate(new Date(), 'GMT', 'yyyyMMddHHmmss');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${timestamp}-${rand}`;
}

/**
 * Open or active spreadsheet reference
 */
function getDb() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function normalizeIdentifier_(value) {
  return String(value === undefined || value === null ? '' : value)
    .trim()
    .replace(/[\s-]+/g, '')
    .toUpperCase();
}

function normalizeSerial_(value) {
  return String(value === undefined || value === null ? '' : value)
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function isValidImei_(value) {
  const imei = normalizeIdentifier_(value);
  if (!/^\d{15}$/.test(imei)) return false;

  let sum = 0;
  for (let i = 0; i < imei.length - 1; i++) {
    let digit = Number(imei[i]);
    if ((imei.length - i) % 2 === 0) digit *= 2;
    sum += digit > 9 ? digit - 9 : digit;
  }
  return (sum + Number(imei[imei.length - 1])) % 10 === 0;
}

function normalizeDate_(value, fallback) {
  const candidate = value === undefined || value === null || value === '' ? fallback : value;
  const date = candidate instanceof Date ? candidate : new Date(candidate);
  if (isNaN(date.getTime())) return String(fallback || new Date().toISOString()).slice(0, 10);
  return Utilities.formatDate(date, 'GMT', 'yyyy-MM-dd');
}

function normalizeApiError_(err) {
  const message = err && err.message ? String(err.message) : 'An unexpected server error occurred';
  const isSheetsError = /sheet|spreadsheet|range|service unavailable|quota|timed out/i.test(message);
  return {
    message,
    code: isSheetsError ? 'SHEETS_OPERATION_FAILED' : 'API_REQUEST_FAILED',
    retryable: isSheetsError || /busy|timeout|temporarily/i.test(message)
  };
}

function classifyAuditAction_(action, module) {
  const value = String(action || 'UPDATE').toUpperCase();
  const known = [
    'LOGIN', 'INITIALIZE', 'RECEIVE_STOCK', 'DISPATCH_STOCK', 'CREATE_TRANSFER',
    'UPDATE_TRANSFER_STATUS', 'MATCH_TRANSFER', 'PROCESS_SALE', 'RETURN_SALE', 'RECONCILE_PAYMENT',
    'CREATE_REPAIR', 'UPDATE_REPAIR', 'BACKUP', 'CREATE_BACKUP', 'EXPORT_AUDIT', 'UPDATE'
  ];
  if (value === 'BACKUP') return 'CREATE_BACKUP';
  if (known.includes(value)) return value;
  if (/transfer/i.test(module || value)) return 'UPDATE_TRANSFER_STATUS';
  if (/sale|invoice/i.test(module || value)) return 'PROCESS_SALE';
  if (/repair|service/i.test(module || value)) return 'UPDATE_REPAIR';
  if (/backup/i.test(module || value)) return 'CREATE_BACKUP';
  return 'UPDATE';
}

/**
 * Get Sheet by Name (with auto creation if missing)
 */
function getSheet(name) {
  const ss = getDb();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * Reads all rows from a sheet as an array of objects mapped by header
 */
function getRowsAsObjects(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (!data || data.length <= 1) return [];

  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Skip completely empty rows
    if (!row.some(cell => cell !== '' && cell !== null)) continue;
    const obj = { _rowIndex: i + 1 };
    for (let h = 0; h < headers.length; h++) {
      obj[headers[h]] = row[h];
    }
    rows.push(obj);
  }
  return rows;
}

/**
 * Append object as row to sheet matching headers
 */
function appendRowFromObject(sheetName, obj) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = [];
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i];
    const val = obj[key] !== undefined ? obj[key] : '';
    row.push(typeof val === 'object' ? JSON.stringify(val) : val);
  }
  sheet.appendRow(row);
  return sheet.getLastRow();
}

/**
 * Update row by ID column
 */
function updateRowById(sheetName, idValue, updateObj, idColumnName = 'id') {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;

  const headers = data[0];
  const idColIdx = headers.indexOf(idColumnName);
  if (idColIdx === -1) throw new Error(`Column ${idColumnName} not found in ${sheetName}`);

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idColIdx]) === String(idValue)) {
      const rowRange = sheet.getRange(r + 1, 1, 1, headers.length);
      const currentRow = rowRange.getValues()[0];
      for (let h = 0; h < headers.length; h++) {
        const key = headers[h];
        if (updateObj[key] !== undefined) {
          currentRow[h] = typeof updateObj[key] === 'object' ? JSON.stringify(updateObj[key]) : updateObj[key];
        }
      }
      rowRange.setValues([currentRow]);
      return true;
    }
  }
  return false;
}

// ============================================================================
// DATABASE SETUP & STRUCTURE INITIALIZATION
// ============================================================================

/**
 * Sets up all 14 sheets with headers, formatting, protections, default user, and seed settings.
 * Can be run manually from Apps Script editor or triggered by initial admin setup.
 */
function setupDatabase() {
  const ss = getDb();

  const sheetSchemas = {
    [SHEETS.USERS]: [
      'id', 'name', 'email', 'role', 'location', 'status', 'pinHash', 'lastLogin', 'createdAt'
    ],
    [SHEETS.PRODUCTS]: [
      'id', 'sku', 'brand', 'model', 'variant', 'specs', 'colors', 'countryVariant', 'packageCondition', 'basePrice', 'costPrice', 'lowStockThreshold', 'status', 'updatedAt'
    ],
    [SHEETS.INVENTORY]: [
      'id', 'productId', 'sku', 'brand', 'type', 'house', 'color', 'openingQty', 'inQty', 'outQty', 'transferInQty', 'transferOutQty', 'returnQty', 'repairQty', 'soldQty', 'adjustedQty', 'inHandQty', 'reservedQty', 'lastUpdated'
    ],
    [SHEETS.IMEI]: [
      'id', 'imei1', 'imei2', 'serialNumber', 'productId', 'sku', 'brand', 'color', 'status', 'currentLocation', 'currentHolder', 'sourceType', 'purchaseRef', 'saleInvoiceRef', 'transferRef', 'repairRef', 'intakeDate', 'lastStatusUpdate', 'notes'
    ],
    [SHEETS.TRANSACTIONS]: [
      'id', 'trxRef', 'type', 'sku', 'color', 'house', 'qty', 'imeis', 'sourceLocation', 'destLocation', 'user', 'role', 'reason', 'date', 'timestamp', 'metadata'
    ],
    [SHEETS.TRANSFERS]: [
      'id', 'transferRef', 'requestedBy', 'requestedDate', 'fromLocation', 'toLocation', 'items', 'totalUnits', 'imeis', 'status', 'approvedBy', 'dispatchedBy', 'receivedBy', 'timeline', 'carrier', 'trackingNumber', 'notes', 'updatedAt'
    ],
    [SHEETS.SALES]: [
      'id', 'invoiceNo', 'customerId', 'customerName', 'customerPhone', 'items', 'totalAmount', 'discountAmount', 'netAmount', 'paidAmount', 'dueAmount', 'paymentMethod', 'paymentStatus', 'soldBy', 'location', 'date', 'timestamp', 'notes'
    ],
    [SHEETS.CUSTOMERS]: [
      'id', 'name', 'phone', 'email', 'address', 'totalPurchases', 'outstandingBalance', 'notes', 'createdAt'
    ],
    [SHEETS.SUPPLIERS]: [
      'id', 'name', 'contactPerson', 'phone', 'email', 'address', 'paymentTerms', 'status', 'notes', 'createdAt'
    ],
    [SHEETS.LOCATIONS]: [
      'id', 'name', 'type', 'address', 'manager', 'status'
    ],
    [SHEETS.REPAIRS]: [
      'id', 'ticketNo', 'imei', 'serialNumber', 'model', 'brand', 'color', 'defectType', 'defectNotes', 'receivedFrom', 'currentStatus', 'technician', 'estimatedCost', 'actualCost', 'warrantyStatus', 'destination', 'manifestNo', 'intakeDate', 'completedDate', 'updatedAt'
    ],
    [SHEETS.PAYMENTS]: [
      'id', 'paymentRef', 'invoiceNo', 'type', 'amount', 'paymentMethod', 'referenceNo', 'receivedBy', 'date', 'timestamp', 'notes'
    ],
    [SHEETS.AUDIT_LOG]: [
      'id', 'timestamp', 'user', 'userRole', 'action', 'module', 'targetId', 'previousValue', 'newValue', 'reason', 'ipAddress', 'deviceInfo'
    ],
    [SHEETS.SETTINGS]: [
      'key', 'value', 'description', 'updatedBy', 'updatedAt'
    ],
    [SHEETS.TASKS]: [
      'id', 'title', 'assigneeEmail', 'status', 'createdBy', 'createdAt', 'completedAt'
    ]
  };

  for (const sheetName in sheetSchemas) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    const headers = sheetSchemas[sheetName];
    
    // If empty or new, set headers
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#172334')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  }

  // Remove default "Sheet1" if empty
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1 && sheet1.getLastRow() === 0) {
    try { ss.deleteSheet(sheet1); } catch (e) {}
  }

  // Populate Default Locations if empty
  const locSheet = getSheet(SHEETS.LOCATIONS);
  if (locSheet.getLastRow() <= 1) {
    const defaultLocations = [
      ['LOC-001', 'Main House', 'Warehouse', 'Central Warehouse Bay 1', 'Warehouse Manager', 'Active'],
      ['LOC-002', 'New House', 'Warehouse', 'North Annex Facility', 'Warehouse Manager', 'Active'],
      ['LOC-003', '2nd Floor', 'Warehouse', 'Upper Storage Mezzanine', 'Warehouse Manager', 'Active'],
      ['LOC-004', 'Temporary House A', 'Warehouse', 'Overflow Logistics Staging A', 'Logistics', 'Active'],
      ['LOC-005', 'Temporary House B', 'Warehouse', 'Overflow Logistics Staging B', 'Logistics', 'Active'],
      ['LOC-006', 'Retail Counter', 'Store', 'Front Office Retail Point', 'Sales Lead', 'Active'],
      ['LOC-007', 'Service Center (BadBin)', 'Service Center', 'Technical Lab & Repairs', 'Head Technician', 'Active']
    ];
    for (const loc of defaultLocations) {
      locSheet.appendRow(loc);
    }
  }

  // Populate Default Super Admin User if empty
  const userSheet = getSheet(SHEETS.USERS);
  if (userSheet.getLastRow() <= 1) {
    userSheet.appendRow([
      'USR-001',
      'System Super Admin',
      'admin@stockflow.internal',
      ROLES.SUPER_ADMIN,
      'Main House',
      'Active',
      hashPin('123456'), // Default initial PIN: 123456
      new Date().toISOString(),
      new Date().toISOString()
    ]);
  }

  // Populate Default Settings if empty
  const settingsSheet = getSheet(SHEETS.SETTINGS);
  if (settingsSheet.getLastRow() <= 1) {
    const defaultSettings = [
      ['COMPANY_NAME', 'StockFlow Logistics & Mobile Distribution', 'Official Company Name', 'Admin', new Date().toISOString()],
      ['CURRENCY_SYMBOL', '৳', 'Currency Symbol for POS & Valuation', 'Admin', new Date().toISOString()],
      ['LOW_STOCK_DEFAULT', '10', 'Threshold for low stock warnings', 'Admin', new Date().toISOString()],
      ['APP_VERSION', '2.0.0-centralized', 'Active Production Version', 'Admin', new Date().toISOString()],
      ['ALLOW_NEGATIVE_STOCK', 'false', 'Prevent stock balance dropping below 0', 'Admin', new Date().toISOString()],
      ['AUTO_BACKUP_DAYS', '7', 'Scheduled Drive backup frequency', 'Admin', new Date().toISOString()]
    ];
    for (const s of defaultSettings) {
      settingsSheet.appendRow(s);
    }
  }

  logAudit_({
    user: 'System',
    userRole: ROLES.SUPER_ADMIN,
    action: 'INITIALIZE',
    module: 'Database',
    targetId: 'MasterSheets',
    previousValue: '',
    newValue: 'All 14 sheets initialized successfully',
    reason: 'Database setup completed'
  });

  return {
    success: true,
    message: 'StockFlow Google Sheets Master Database initialized successfully with all 14 sheets, default locations, and default Super Admin user.'
  };
}

/**
 * Simple secure PIN hasher
 */
function hashPin(pin) {
  const raw = 'stockflow_salt_v2_' + String(pin).trim();
  const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return signature.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// AUDIT LOGGING HELPER
// ============================================================================

function logAudit_(entry) {
  try {
    const auditSheet = getSheet(SHEETS.AUDIT_LOG);
    auditSheet.appendRow([
      generateId('AUD'),
      new Date().toISOString(),
      entry.user || 'Unknown',
      entry.userRole || 'Viewer',
      classifyAuditAction_(entry.action, entry.module),
      entry.module || 'System',
      entry.targetId || '',
      typeof entry.previousValue === 'object' ? JSON.stringify(entry.previousValue) : String(entry.previousValue || ''),
      typeof entry.newValue === 'object' ? JSON.stringify(entry.newValue) : String(entry.newValue || ''),
      entry.reason || '',
      entry.ipAddress || '',
      entry.deviceInfo || ''
    ]);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// ============================================================================
// CORE API HANDLERS
// ============================================================================

/**
 * User Login Handler
 */
function handleLogin(payload) {
  const email = (payload.email || '').trim().toLowerCase();
  const pin = (payload.pin || '').trim();

  if (!email || !pin) {
    return { success: false, error: 'Email and PIN are required.' };
  }

  const users = getRowsAsObjects(SHEETS.USERS);
  const user = users.find(u => String(u.email).toLowerCase() === email && u.status === 'Active');

  if (!user) {
    return { success: false, error: 'Invalid user email or account inactive.' };
  }

  const hashed = hashPin(pin);
  if (user.pinHash && String(user.pinHash) !== hashed) {
    return { success: false, error: 'Invalid PIN. Please try again.' };
  }

  // Update last login
  updateRowById(SHEETS.USERS, user.id, { lastLogin: new Date().toISOString() });

  logAudit_({
    user: user.name,
    userRole: user.role,
    action: 'LOGIN',
    module: 'Users',
    targetId: user.id,
    previousValue: '',
    newValue: 'Session Authenticated',
    reason: 'User logged in successfully'
  });

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location
    }
  };
}

/**
 * Sync All Operational Datasets
 * Fetches consistent snapshot from Google Sheets
 */
function handleSyncAll(userEmail) {
  const users = getRowsAsObjects(SHEETS.USERS).map(u => ({
    id: u.id, name: u.name, email: u.email, role: u.role, location: u.location, status: u.status
  }));
  const products = getRowsAsObjects(SHEETS.PRODUCTS);
  const inventory = getRowsAsObjects(SHEETS.INVENTORY);
  const imei = getRowsAsObjects(SHEETS.IMEI);
  const transactions = getRowsAsObjects(SHEETS.TRANSACTIONS);
  const transfers = getRowsAsObjects(SHEETS.TRANSFERS);
  const sales = getRowsAsObjects(SHEETS.SALES);
  const customers = getRowsAsObjects(SHEETS.CUSTOMERS);
  const suppliers = getRowsAsObjects(SHEETS.SUPPLIERS);
  const locations = getRowsAsObjects(SHEETS.LOCATIONS);
  const repairs = getRowsAsObjects(SHEETS.REPAIRS);
  const settingsRows = getRowsAsObjects(SHEETS.SETTINGS);
  const tasks = getRowsAsObjects(SHEETS.TASKS);
  const settings = {};
  settingsRows.forEach(s => { settings[s.key] = s.value; });

  return {
    success: true,
    timestamp: new Date().toISOString(),
    data: {
      users,
      products,
      inventory,
      imei,
      transactions,
      transfers,
      sales,
      customers,
      suppliers,
      locations,
      repairs,
      settings,
      tasks
    }
  };
}

/**
 * Duplicate IMEI / Serial Number Detector
 * Checks imei1, imei2, and serialNumber across centralized database
 */
function handleCheckDuplicateImei(payload) {
  const imei1 = normalizeIdentifier_(payload.imei1);
  const imei2 = normalizeIdentifier_(payload.imei2);
  const sn = normalizeSerial_(payload.serialNumber);
  const excludeId = payload.excludeId || '';

  if (!imei1 && !imei2 && !sn) {
    return { success: true, isDuplicate: false };
  }

  const invalidImeis = [imei1, imei2].filter(value => value && !isValidImei_(value));
  if (invalidImeis.length > 0) {
    return {
      success: false,
      isDuplicate: false,
      error: 'IMEI must be exactly 15 digits and pass the Luhn checksum.',
      errorCode: 'INVALID_IMEI'
    };
  }
  if (imei1 && imei2 && imei1 === imei2) {
    return { success: false, isDuplicate: true, error: 'IMEI 1 and IMEI 2 cannot be identical.', errorCode: 'DUPLICATE_INPUT' };
  }

  const imeiRows = getRowsAsObjects(SHEETS.IMEI);
  const duplicates = [];
  const requested = new Map();
  if (imei1) requested.set(imei1, 'IMEI 1');
  if (imei2) requested.set(imei2, 'IMEI 2');
  if (sn) requested.set(sn, 'Serial Number');

  for (const row of imeiRows) {
    if (excludeId && String(row.id) === String(excludeId)) continue;

    const existing = [
      { field: 'IMEI 1', value: normalizeIdentifier_(row.imei1) },
      { field: 'IMEI 2', value: normalizeIdentifier_(row.imei2) },
      { field: 'Serial Number', value: normalizeSerial_(row.serialNumber) }
    ];
    const match = existing.find(item => item.value && requested.has(item.value));
    const matchedField = match ? requested.get(match.value) : null;
    const matchedValue = match ? match.value : null;

    if (matchedField) {
      duplicates.push({
        matchedField,
        matchedValue,
        existingId: row.id,
        sku: row.sku,
        brand: row.brand,
        color: row.color,
        status: row.status,
        currentLocation: row.currentLocation,
        currentHolder: row.currentHolder,
        sourceType: row.sourceType,
        intakeDate: row.intakeDate
      });
    }
  }

  return {
    success: true,
    isDuplicate: duplicates.length > 0,
    duplicates
  };
}

/**
 * Handle Save Stock Movement (IN or OUT)
 * Atomic verification and recalculation
 */
function handleSaveMovement(payload, user) {
  const { sku, brand, type, house, color, direction, qty, note, imeis, date } = payload;
  const numQty = Number(qty);

  if (!sku || !house || !color || !direction || isNaN(numQty) || numQty <= 0) {
    return { success: false, error: 'SKU, house, color, direction, and valid positive quantity are required.' };
  }

  const inventoryRows = getRowsAsObjects(SHEETS.INVENTORY);
  let invRow = inventoryRows.find(i => 
    i.sku === sku && i.house === house && i.color === color && (type ? i.type === type : true)
  );

  const now = new Date().toISOString();
  const movementDate = normalizeDate_(date, now);
  const trxRef = generateId('TRX');

  const normalizedImeis = Array.isArray(imeis) ? imeis.map(record => ({
    imei1: normalizeIdentifier_(record && record.imei1 !== undefined ? record.imei1 : record),
    imei2: normalizeIdentifier_(record && record.imei2),
    serialNumber: normalizeSerial_(record && record.serialNumber)
  })) : [];
  if (normalizedImeis.some(record => record.imei1 && !isValidImei_(record.imei1))) {
    return { success: false, error: 'Each IMEI must be exactly 15 digits and pass the Luhn checksum.', errorCode: 'INVALID_IMEI' };
  }
  const duplicateValues = normalizedImeis.flatMap(record => [record.imei1, record.imei2, record.serialNumber]).filter(Boolean);
  if (new Set(duplicateValues).size !== duplicateValues.length) {
    return { success: false, error: 'The submitted IMEI/serial values contain duplicates.', errorCode: 'DUPLICATE_INPUT' };
  }
  for (const record of normalizedImeis) {
    const duplicateResult = handleCheckDuplicateImei(record);
    if (!duplicateResult.success || duplicateResult.isDuplicate) return duplicateResult;
  }

  let currentOpening = 0, currentIn = 0, currentOut = 0, currentTransferIn = 0, currentTransferOut = 0, currentReturn = 0, currentRepair = 0, currentSold = 0, currentAdjusted = 0;

  if (invRow) {
    currentOpening = Number(invRow.openingQty || 0);
    currentIn = Number(invRow.inQty || 0);
    currentOut = Number(invRow.outQty || 0);
    currentTransferIn = Number(invRow.transferInQty || 0);
    currentTransferOut = Number(invRow.transferOutQty || 0);
    currentReturn = Number(invRow.returnQty || 0);
    currentRepair = Number(invRow.repairQty || 0);
    currentSold = Number(invRow.soldQty || 0);
    currentAdjusted = Number(invRow.adjustedQty || 0);
  }

  const inHandBefore = currentOpening + currentIn - currentOut + currentTransferIn - currentTransferOut + currentReturn - currentSold + currentAdjusted;

  // Validation: Negative stock prevention
  if (direction === 'OUT' && numQty > inHandBefore) {
    return {
      success: false,
      error: `Blocked: Insufficient available stock for ${sku} (${color}) at ${house}. Available: ${inHandBefore}, Requested: ${numQty}.`
    };
  }

  let newIn = currentIn;
  let newOut = currentOut;
  if (direction === 'IN') {
    newIn += numQty;
  } else {
    newOut += numQty;
  }

  const inHandAfter = currentOpening + newIn - newOut + currentTransferIn - currentTransferOut + currentReturn - currentSold + currentAdjusted;

  if (invRow) {
    updateRowById(SHEETS.INVENTORY, invRow.id, {
      inQty: newIn,
      outQty: newOut,
      inHandQty: inHandAfter,
      lastUpdated: now
    });
  } else {
    appendRowFromObject(SHEETS.INVENTORY, {
      id: generateId('INV'),
      productId: payload.productId || '',
      sku,
      brand: brand || '',
      type: type || 'Regular',
      house,
      color,
      openingQty: 0,
      inQty: newIn,
      outQty: newOut,
      transferInQty: 0,
      transferOutQty: 0,
      returnQty: 0,
      repairQty: 0,
      soldQty: 0,
      adjustedQty: 0,
      inHandQty: inHandAfter,
      reservedQty: 0,
      lastUpdated: now
    });
  }

  // Update IMEI registers if provided
  if (Array.isArray(imeis) && imeis.length > 0) {
    for (const imeiRecord of normalizedImeis) {
      const imei1 = imeiRecord.imei1;
      const existingImeis = getRowsAsObjects(SHEETS.IMEI);
      const match = existingImeis.find(i => normalizeIdentifier_(i.imei1) === imei1 || normalizeIdentifier_(i.imei2) === imei1 || normalizeSerial_(i.serialNumber) === imeiRecord.serialNumber);

      if (direction === 'IN') {
        if (match) {
          updateRowById(SHEETS.IMEI, match.id, {
            status: payload.sourceType === 'RETURN' ? 'Returned' : 'In Stock',
            currentLocation: house,
            currentHolder: user.name,
            sourceType: payload.sourceType === 'RETURN' ? 'Sales Return' : (match.sourceType || 'Movement IN'),
            saleInvoiceRef: payload.returnSaleInvoiceRef || match.saleInvoiceRef || '',
            lastStatusUpdate: now
          });
        } else {
          appendRowFromObject(SHEETS.IMEI, {
            id: generateId('IMEI'),
            imei1,
            imei2: imeiRecord.imei2,
            serialNumber: imeiRecord.serialNumber,
            productId: payload.productId || '',
            sku,
            brand: brand || '',
            color,
            status: 'In Stock',
            currentLocation: house,
            currentHolder: user.name,
            sourceType: payload.sourceType === 'RETURN' ? 'Sales Return' : 'Movement IN',
            purchaseRef: trxRef,
            saleInvoiceRef: payload.returnSaleInvoiceRef || '',
            transferRef: '',
            repairRef: '',
            intakeDate: movementDate,
            lastStatusUpdate: now,
            notes: note || ''
          });
        }
      } else {
        // OUT
        if (match) {
          updateRowById(SHEETS.IMEI, match.id, {
            status: 'Dispatched',
            currentLocation: 'Dispatched (' + house + ')',
            currentHolder: user.name,
            lastStatusUpdate: now,
            notes: (match.notes ? match.notes + '; ' : '') + 'Dispatched: ' + trxRef
          });
        }
      }
    }
  }

  // Record Transaction
  appendRowFromObject(SHEETS.TRANSACTIONS, {
    id: generateId('TRX_ROW'),
    trxRef,
    type: direction,
    sku,
    color,
    house,
    qty: numQty,
    imeis: normalizedImeis.map(i => i.imei1 || i.serialNumber).filter(Boolean).join(', '),
    sourceLocation: direction === 'OUT' ? house : '',
    destLocation: direction === 'IN' ? house : '',
    user: user.name,
    role: user.role,
    reason: note || (payload.sourceType === 'RETURN' ? 'Sales return received' : 'Manual Stock Movement'),
    date: movementDate,
    timestamp: now,
    metadata: { inHandBefore, inHandAfter }
  });

  // Audit Log
  logAudit_({
    user: user.name,
    userRole: user.role,
    action: payload.sourceType === 'RETURN' ? 'RETURN_SALE' : (direction === 'IN' ? 'RECEIVE_STOCK' : 'DISPATCH_STOCK'),
    module: 'Inventory',
    targetId: trxRef,
    previousValue: { inHand: inHandBefore },
    newValue: { inHand: inHandAfter, delta: direction === 'IN' ? numQty : -numQty },
    reason: note || 'Movement recorded'
  });

  return {
    success: true,
    trxRef,
    sku,
    color,
    house,
    inHandBefore,
    inHandAfter,
    message: `${direction} movement of ${numQty} units saved successfully.`
  };
}

/**
 * Handle Multi-Stage Transfer Creation
 * Sets status: Pending
 */
function handleCreateTransfer(payload, user) {
  const { fromLocation, toLocation, items, notes, carrier, trackingNumber } = payload;

  if (!fromLocation || !toLocation || !items || !items.length) {
    return { success: false, error: 'From location, to location, and transfer items are required.' };
  }
  if (fromLocation === toLocation) {
    return { success: false, error: 'Source and destination locations cannot be identical.' };
  }

  const transferRef = generateId('TRF');
  const now = new Date().toISOString();
  const totalUnits = items.reduce((sum, itm) => sum + Number(itm.qty || 0), 0);

  const initialTimeline = [{
    status: 'Pending',
    updatedBy: user.name,
    timestamp: now,
    notes: 'Transfer requested by ' + user.name
  }];

  const imeisList = items.flatMap(i => Array.isArray(i.imeis) ? i.imeis : []).join(', ');

  appendRowFromObject(SHEETS.TRANSFERS, {
    id: generateId('TRF_ROW'),
    transferRef,
    requestedBy: user.name,
    requestedDate: now.slice(0, 10),
    fromLocation,
    toLocation,
    items,
    totalUnits,
    imeis: imeisList,
    status: 'Pending',
    approvedBy: '',
    dispatchedBy: '',
    receivedBy: '',
    timeline: initialTimeline,
    carrier: carrier || '',
    trackingNumber: trackingNumber || '',
    notes: notes || '',
    updatedAt: now
  });

  logAudit_({
    user: user.name,
    userRole: user.role,
    action: 'CREATE_TRANSFER',
    module: 'Transfers',
    targetId: transferRef,
    previousValue: '',
    newValue: { fromLocation, toLocation, totalUnits, status: 'Pending' },
    reason: notes || 'New transfer initiated'
  });

  return {
    success: true,
    transferRef,
    status: 'Pending',
    message: `Transfer ${transferRef} created and awaiting manager approval.`
  };
}

/**
 * Handle Transfer Status Transitions
 * Workflow: Pending -> Approved -> Processing -> Dispatched -> In Transit -> Received -> Complete
 */
function handleUpdateTransferStatus(payload, user) {
  const { transferRef, newStatus, carrier, trackingNumber, notes } = payload;
  const validStatuses = ['Pending', 'Approved', 'Processing', 'Dispatched', 'In Transit', 'Received', 'Complete', 'Cancelled', 'Failed'];

  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: 'Invalid transfer status: ' + newStatus };
  }

  const transfers = getRowsAsObjects(SHEETS.TRANSFERS);
  const trf = transfers.find(t => t.transferRef === transferRef);
  if (!trf) {
    return { success: false, error: 'Transfer not found: ' + transferRef };
  }

  // Check Permissions based on status
  if (newStatus === 'Approved') checkPermission(user.role, 'APPROVE_TRANSFER');
  if (['Dispatched', 'In Transit'].includes(newStatus)) checkPermission(user.role, 'DISPATCH_TRANSFER');
  if (['Received', 'Complete'].includes(newStatus)) checkPermission(user.role, 'RECEIVE_TRANSFER');

  const now = new Date().toISOString();
  let timeline = [];
  try {
    timeline = typeof trf.timeline === 'string' ? JSON.parse(trf.timeline) : (trf.timeline || []);
  } catch (e) {
    timeline = [];
  }

  timeline.push({
    status: newStatus,
    updatedBy: user.name,
    timestamp: now,
    notes: notes || `Status changed to ${newStatus}`
  });

  const updateFields = {
    status: newStatus,
    timeline,
    updatedAt: now
  };

  if (carrier) updateFields.carrier = carrier;
  if (trackingNumber) updateFields.trackingNumber = trackingNumber;
  if (newStatus === 'Approved') updateFields.approvedBy = user.name;
  if (newStatus === 'Dispatched') updateFields.dispatchedBy = user.name;
  if (['Received', 'Complete'].includes(newStatus)) updateFields.receivedBy = user.name;

  // If status transitions to Complete, finalize stock migration between houses
  if (newStatus === 'Complete' && trf.status !== 'Complete') {
    let items = [];
    try {
      items = typeof trf.items === 'string' ? JSON.parse(trf.items) : (trf.items || []);
    } catch (e) {
      items = [];
    }

    const inventoryRows = getRowsAsObjects(SHEETS.INVENTORY);

    for (const itm of items) {
      const qty = Number(itm.qty || 0);
      const sku = itm.sku;
      const color = itm.color;

      // Deduct TransferOut from source
      let srcInv = inventoryRows.find(i => i.sku === sku && i.house === trf.fromLocation && i.color === color);
      if (srcInv) {
        const tOut = Number(srcInv.transferOutQty || 0) + qty;
        const inHand = Number(srcInv.openingQty || 0) + Number(srcInv.inQty || 0) - Number(srcInv.outQty || 0) + Number(srcInv.transferInQty || 0) - tOut + Number(srcInv.returnQty || 0) - Number(srcInv.soldQty || 0) + Number(srcInv.adjustedQty || 0);
        updateRowById(SHEETS.INVENTORY, srcInv.id, {
          transferOutQty: tOut,
          inHandQty: inHand,
          lastUpdated: now
        });
      }

      // Add TransferIn to destination
      let destInv = inventoryRows.find(i => i.sku === sku && i.house === trf.toLocation && i.color === color);
      if (destInv) {
        const tIn = Number(destInv.transferInQty || 0) + qty;
        const inHand = Number(destInv.openingQty || 0) + Number(destInv.inQty || 0) - Number(destInv.outQty || 0) + tIn - Number(destInv.transferOutQty || 0) + Number(destInv.returnQty || 0) - Number(destInv.soldQty || 0) + Number(destInv.adjustedQty || 0);
        updateRowById(SHEETS.INVENTORY, destInv.id, {
          transferInQty: tIn,
          inHandQty: inHand,
          lastUpdated: now
        });
      } else {
        appendRowFromObject(SHEETS.INVENTORY, {
          id: generateId('INV'),
          productId: '',
          sku,
          brand: itm.brand || '',
          type: itm.type || 'Regular',
          house: trf.toLocation,
          color,
          openingQty: 0,
          inQty: 0,
          outQty: 0,
          transferInQty: qty,
          transferOutQty: 0,
          returnQty: 0,
          repairQty: 0,
          soldQty: 0,
          adjustedQty: 0,
          inHandQty: qty,
          reservedQty: 0,
          lastUpdated: now
        });
      }

      // Update IMEI locations if listed
      if (trf.imeis) {
        const imeiArr = trf.imeis.split(',').map(s => s.trim()).filter(Boolean);
        const allImeis = getRowsAsObjects(SHEETS.IMEI);
        for (const imeiStr of imeiArr) {
          const matched = allImeis.find(im => String(im.imei1).trim() === imeiStr);
          if (matched) {
            updateRowById(SHEETS.IMEI, matched.id, {
              status: 'In Stock',
              currentLocation: trf.toLocation,
              transferRef: trf.transferRef,
              lastStatusUpdate: now
            });
          }
        }
      }
    }
  }

  updateRowById(SHEETS.TRANSFERS, trf.id, updateFields);

  logAudit_({
    user: user.name,
    userRole: user.role,
    action: 'UPDATE_TRANSFER_STATUS',
    module: 'Transfers',
    targetId: transferRef,
    previousValue: trf.status,
    newValue: newStatus,
    reason: notes || `Transfer status moved to ${newStatus}`
  });

  return {
    success: true,
    transferRef,
    previousStatus: trf.status,
    newStatus,
    message: `Transfer ${transferRef} updated to ${newStatus}.`
  };
}

/**
 * Match a scanned transfer manifest against the server-side expected IMEI set.
 */
function handleMatchTransferScan(payload, user) {
  const transferRef = String(payload.transferRef || '').trim();
  const scanned = (Array.isArray(payload.scannedImeis) ? payload.scannedImeis : [])
    .map(normalizeIdentifier_)
    .filter(Boolean);
  if (!transferRef || scanned.length === 0) {
    return { success: false, error: 'Transfer reference and scanned IMEI values are required.' };
  }

  const transfer = getRowsAsObjects(SHEETS.TRANSFERS).find(row => String(row.transferRef) === transferRef);
  if (!transfer) return { success: false, error: 'Transfer not found: ' + transferRef };

  const expected = String(transfer.imeis || '').split(',').map(normalizeIdentifier_).filter(Boolean);
  const expectedSet = new Set(expected);
  const scannedSet = new Set(scanned);
  const missing = expected.filter(value => !scannedSet.has(value));
  const unexpected = scanned.filter(value => !expectedSet.has(value));
  const duplicateScans = scanned.filter((value, index) => scanned.indexOf(value) !== index);
  const matched = missing.length === 0 && unexpected.length === 0 && duplicateScans.length === 0 && scannedSet.size === expectedSet.size;

  logAudit_({
    user: user.name,
    userRole: user.role,
    action: 'MATCH_TRANSFER',
    module: 'Transfers',
    targetId: transferRef,
    previousValue: { expectedCount: expected.length },
    newValue: { scannedCount: scanned.length, matched, missing, unexpected, duplicateScans },
    reason: matched ? 'Transfer scan matched manifest' : 'Transfer scan mismatch detected'
  });

  return { success: true, matched, transferRef, expected, scanned, missing, unexpected, duplicateScans };
}

/**
 * Handle POS / Retail Sale
 * Creates invoice, deducts sold stock, registers sale and customer info
 */
function handleProcessSale(payload, user) {
  const { customerName, customerPhone, items, paymentMethod, paidAmount, discountAmount, notes, location } = payload;

  if (!items || !items.length) {
    return { success: false, error: 'Cart is empty. Select items to sell.' };
  }

  const invoiceNo = generateId('INV-POS');
  const now = new Date().toISOString();
  const saleDate = normalizeDate_(payload.date, now);
  const saleLocation = location || user.location || 'Retail Counter';

  let subtotal = 0;
  items.forEach(itm => {
    subtotal += Number(itm.price || 0) * Number(itm.qty || 1);
  });

  const discount = Number(discountAmount || 0);
  const netAmount = Math.max(0, subtotal - discount);
  const paid = Number(paidAmount !== undefined ? paidAmount : netAmount);
  const due = Math.max(0, netAmount - paid);
  const paymentStatus = due === 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Due');

  // Validate and deduct stock for each line
  const inventoryRows = getRowsAsObjects(SHEETS.INVENTORY);
  for (const itm of items) {
    const sku = itm.sku;
    const color = itm.color;
    const qty = Number(itm.qty || 1);

    const inv = inventoryRows.find(i => i.sku === sku && i.house === saleLocation && i.color === color);
    if (!inv) {
      return { success: false, error: `Stock line for ${sku} (${color}) not found at ${saleLocation}.` };
    }

    const inHand = Number(inv.openingQty || 0) + Number(inv.inQty || 0) - Number(inv.outQty || 0) + Number(inv.transferInQty || 0) - Number(inv.transferOutQty || 0) + Number(inv.returnQty || 0) - Number(inv.soldQty || 0) + Number(inv.adjustedQty || 0);

    if (qty > inHand) {
      return { success: false, error: `Insufficient stock for ${sku} (${color}). Available: ${inHand}, Requested: ${qty}.` };
    }
  }

  // Deduct stock and update IMEI status
  for (const itm of items) {
    const sku = itm.sku;
    const color = itm.color;
    const qty = Number(itm.qty || 1);
    const inv = inventoryRows.find(i => i.sku === sku && i.house === saleLocation && i.color === color);

    const newSold = Number(inv.soldQty || 0) + qty;
    const newInHand = Number(inv.openingQty || 0) + Number(inv.inQty || 0) - Number(inv.outQty || 0) + Number(inv.transferInQty || 0) - Number(inv.transferOutQty || 0) + Number(inv.returnQty || 0) - newSold + Number(inv.adjustedQty || 0);

    updateRowById(SHEETS.INVENTORY, inv.id, {
      soldQty: newSold,
      inHandQty: newInHand,
      lastUpdated: now
    });

    // Mark IMEIs as Sold
    if (Array.isArray(itm.imeis)) {
      const allImeis = getRowsAsObjects(SHEETS.IMEI);
      for (const imeiVal of itm.imeis) {
        const found = allImeis.find(im => String(im.imei1).trim() === String(imeiVal).trim());
        if (found) {
          updateRowById(SHEETS.IMEI, found.id, {
            status: 'Sold',
            saleInvoiceRef: invoiceNo,
            currentLocation: 'Sold (' + (customerName || 'Customer') + ')',
            lastStatusUpdate: now
          });
        }
      }
    }

    // Record Transaction OUT
    appendRowFromObject(SHEETS.TRANSACTIONS, {
      id: generateId('TRX_ROW'),
      trxRef: invoiceNo,
      type: 'SALE',
      sku,
      color,
      house: saleLocation,
      qty,
      imeis: Array.isArray(itm.imeis) ? itm.imeis.join(', ') : '',
      sourceLocation: saleLocation,
      destLocation: 'Customer',
      user: user.name,
      role: user.role,
      reason: 'POS Sale: ' + invoiceNo,
      date: saleDate,
      timestamp: now,
      metadata: { invoiceNo, customerName }
    });
  }

  // Record Sale Row
  appendRowFromObject(SHEETS.SALES, {
    id: generateId('SALE_ROW'),
    invoiceNo,
    customerId: payload.customerId || '',
    customerName: customerName || 'Walk-in Customer',
    customerPhone: customerPhone || '',
    items,
    totalAmount: subtotal,
    discountAmount: discount,
    netAmount,
    paidAmount: paid,
    dueAmount: due,
    paymentMethod: paymentMethod || 'Cash',
    paymentStatus,
    soldBy: user.name,
    location: saleLocation,
    date: saleDate,
    timestamp: now,
    notes: notes || ''
  });

  // Record Payment
  if (paid > 0) {
    appendRowFromObject(SHEETS.PAYMENTS, {
      id: generateId('PAY'),
      paymentRef: generateId('PAYREF'),
      invoiceNo,
      type: 'Customer Payment',
      amount: paid,
      paymentMethod: paymentMethod || 'Cash',
      referenceNo: payload.paymentRefNo || '',
      receivedBy: user.name,
      date: saleDate,
      timestamp: now,
      notes: 'Payment for ' + invoiceNo
    });
  }

  logAudit_({
    user: user.name,
    userRole: user.role,
    action: 'PROCESS_SALE',
    module: 'Sales',
    targetId: invoiceNo,
    previousValue: '',
    newValue: { netAmount, paid, due, itemsCount: items.length },
    reason: 'POS Sale completed'
  });

  return {
    success: true,
    invoiceNo,
    netAmount,
    paid,
    due,
    paymentStatus,
    message: `Sale completed with invoice ${invoiceNo}.`
  };
}

function handleReconcilePayment(payload, user) {
  const invoiceNo = String(payload.invoiceNo || '').trim();
  if (!invoiceNo) return { success: false, error: 'Invoice number is required.' };

  const sales = getRowsAsObjects(SHEETS.SALES);
  const sale = sales.find(row => String(row.invoiceNo) === invoiceNo);
  if (!sale) return { success: false, error: 'Invoice not found: ' + invoiceNo };

  const payments = getRowsAsObjects(SHEETS.PAYMENTS)
    .filter(row => String(row.invoiceNo) === invoiceNo);
  const paidAmount = payments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const netAmount = Number(sale.netAmount || sale.totalAmount || 0);
  const dueAmount = Math.max(0, netAmount - paidAmount);
  const paymentStatus = dueAmount === 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Due');

  updateRowById(SHEETS.SALES, sale.id, { paidAmount, dueAmount, paymentStatus });
  logAudit_({
    user: user.name,
    userRole: user.role,
    action: 'RECONCILE_PAYMENT',
    module: 'Payments',
    targetId: invoiceNo,
    previousValue: { paidAmount: sale.paidAmount, dueAmount: sale.dueAmount, paymentStatus: sale.paymentStatus },
    newValue: { paidAmount, dueAmount, paymentStatus },
    reason: 'Payment ledger reconciled against invoice'
  });

  return { success: true, invoiceNo, paidAmount, dueAmount, paymentStatus, paymentCount: payments.length };
}

function handleValidateOcrCandidate(payload) {
  const candidate = {
    imei1: normalizeIdentifier_(payload.imei1),
    imei2: normalizeIdentifier_(payload.imei2),
    serialNumber: normalizeSerial_(payload.serialNumber),
    sku: String(payload.sku || '').trim()
  };
  const validation = {
    imei1Valid: !candidate.imei1 || isValidImei_(candidate.imei1),
    imei2Valid: !candidate.imei2 || isValidImei_(candidate.imei2),
    fieldsPresent: Boolean(candidate.imei1 || candidate.imei2 || candidate.serialNumber || candidate.sku)
  };
  if (!validation.imei1Valid || !validation.imei2Valid) {
    return { success: false, verified: false, candidate, validation, error: 'OCR result requires a valid 15-digit IMEI or manual correction.', errorCode: 'OCR_REVIEW_REQUIRED' };
  }
  const duplicate = handleCheckDuplicateImei(candidate);
  return { success: duplicate.success, verified: !duplicate.isDuplicate, candidate, validation, duplicate };
}

/**
 * Handle BadBin Repair Intake & Status Updates
 */
function handleSaveRepair(payload, user) {
  const { id, imei, serialNumber, model, brand, color, defectType, defectNotes, receivedFrom, currentStatus, technician, estimatedCost, actualCost, warrantyStatus, destination, manifestNo } = payload;

  const now = new Date().toISOString();
  let repairId = id;
  let ticketNo = payload.ticketNo;

  if (repairId) {
    // Update existing repair ticket
    const updateObj = {
      defectType,
      defectNotes,
      currentStatus,
      technician: technician || '',
      estimatedCost: estimatedCost || 0,
      actualCost: actualCost || 0,
      warrantyStatus: warrantyStatus || '',
      destination: destination || '',
      manifestNo: manifestNo || '',
      updatedAt: now
    };
    if (currentStatus === 'Repaired' || currentStatus === 'Dispatched') {
      updateObj.completedDate = now.slice(0, 10);
    }
    updateRowById(SHEETS.REPAIRS, repairId, updateObj);

    // If repair marked as GoodBin - Repaired, update IMEI record
    if (currentStatus === 'Repaired' || destination === 'GoodBin - Repaired') {
      const allImeis = getRowsAsObjects(SHEETS.IMEI);
      const matched = allImeis.find(i => String(i.imei1).trim() === String(imei).trim());
      if (matched) {
        updateRowById(SHEETS.IMEI, matched.id, {
          status: 'In Stock',
          currentLocation: 'Main House',
          lastStatusUpdate: now,
          notes: (matched.notes ? matched.notes + '; ' : '') + 'Repaired via BadBin: ' + (ticketNo || repairId)
        });
      }
    }
  } else {
    // Create new repair ticket
    repairId = generateId('REP');
    ticketNo = 'BB-' + Utilities.formatDate(new Date(), 'GMT', 'yyyyMMdd') + '-' + Math.floor(100 + Math.random() * 900);

    appendRowFromObject(SHEETS.REPAIRS, {
      id: repairId,
      ticketNo,
      imei: imei || '',
      serialNumber: serialNumber || '',
      model: model || '',
      brand: brand || '',
      color: color || '',
      defectType: defectType || 'General Triage',
      defectNotes: defectNotes || '',
      receivedFrom: receivedFrom || 'Floor / Intake',
      currentStatus: currentStatus || 'Received',
      technician: technician || '',
      estimatedCost: estimatedCost || 0,
      actualCost: actualCost || 0,
      warrantyStatus: warrantyStatus || 'In Warranty',
      destination: destination || 'Service Lab',
      manifestNo: manifestNo || '',
      intakeDate: now.slice(0, 10),
      completedDate: '',
      updatedAt: now
    });
  }

  logAudit_({
    user: user.name,
    userRole: user.role,
    action: id ? 'UPDATE_REPAIR' : 'CREATE_REPAIR',
    module: 'Repairs',
    targetId: ticketNo || repairId,
    previousValue: id ? { id } : '',
    newValue: { status: currentStatus, defectType, model },
    reason: 'BadBin repair workflow update'
  });

  return {
    success: true,
    repairId,
    ticketNo,
    message: `Repair record ${ticketNo} saved.`
  };
}

/**
 * Handle Stock Adjustment (Physical counting & reconciliation)
 */
function handleAdjustStock(payload, user) {
  const { sku, house, color, newInHandQty, reason } = payload;
  const targetQty = Number(newInHandQty);

  if (!sku || !house || !color || isNaN(targetQty) || targetQty < 0) {
    return { success: false, error: 'SKU, house, color, and a valid non-negative count are required.' };
  }

  const inventoryRows = getRowsAsObjects(SHEETS.INVENTORY);
  let inv = inventoryRows.find(i => i.sku === sku && i.house === house && i.color === color);

  const now = new Date().toISOString();
  let inHandBefore = 0;
  let currentAdjusted = 0;

  if (inv) {
    currentAdjusted = Number(inv.adjustedQty || 0);
    inHandBefore = Number(inv.openingQty || 0) + Number(inv.inQty || 0) - Number(inv.outQty || 0) + Number(inv.transferInQty || 0) - Number(inv.transferOutQty || 0) + Number(inv.returnQty || 0) - Number(inv.soldQty || 0) + currentAdjusted;
  }

  const diff = targetQty - inHandBefore;
  const newAdjusted = currentAdjusted + diff;

  if (inv) {
    updateRowById(SHEETS.INVENTORY, inv.id, {
      adjustedQty: newAdjusted,
      inHandQty: targetQty,
      lastUpdated: now
    });
  } else {
    appendRowFromObject(SHEETS.INVENTORY, {
      id: generateId('INV'),
      productId: '',
      sku,
      brand: payload.brand || '',
      type: payload.type || 'Regular',
      house,
      color,
      openingQty: 0,
      inQty: 0,
      outQty: 0,
      transferInQty: 0,
      transferOutQty: 0,
      returnQty: 0,
      repairQty: 0,
      soldQty: 0,
      adjustedQty: targetQty,
      inHandQty: targetQty,
      reservedQty: 0,
      lastUpdated: now
    });
  }

  appendRowFromObject(SHEETS.TRANSACTIONS, {
    id: generateId('TRX_ROW'),
    trxRef: generateId('ADJ'),
    type: 'ADJUSTMENT',
    sku,
    color,
    house,
    qty: Math.abs(diff),
    imeis: '',
    sourceLocation: house,
    destLocation: house,
    user: user.name,
    role: user.role,
    reason: reason || 'Physical inventory reconciliation',
    date: now.slice(0, 10),
    timestamp: now,
    metadata: { inHandBefore, inHandAfter: targetQty, diff }
  });

  logAudit_({
    user: user.name,
    userRole: user.role,
    action: 'ADJUST_STOCK',
    module: 'Inventory',
    targetId: `${sku}-${color}-${house}`,
    previousValue: { inHand: inHandBefore },
    newValue: { inHand: targetQty, diff },
    reason: reason || 'Physical stock reconciliation'
  });

  return {
    success: true,
    sku,
    color,
    house,
    inHandBefore,
    inHandAfter: targetQty,
    diff,
    message: `Stock for ${sku} (${color}) reconciled from ${inHandBefore} to ${targetQty}.`
  };
}

/**
 * Handle Product Master Save
 */
function handleSaveProduct(payload, user) {
  const { id, sku, brand, model, variant, specs, colors, countryVariant, packageCondition, basePrice, costPrice, lowStockThreshold, status } = payload;

  if (!sku || !brand) {
    return { success: false, error: 'Product SKU and Brand are required.' };
  }

  const now = new Date().toISOString();
  if (id) {
    updateRowById(SHEETS.PRODUCTS, id, {
      sku,
      brand,
      model: model || '',
      variant: variant || '',
      specs: specs || '',
      colors: Array.isArray(colors) ? colors.join(', ') : (colors || ''),
      countryVariant: countryVariant || '',
      packageCondition: packageCondition || 'New / Sealed',
      basePrice: Number(basePrice || 0),
      costPrice: Number(costPrice || 0),
      lowStockThreshold: Number(lowStockThreshold || 10),
      status: status || 'Active',
      updatedAt: now
    });
  } else {
    appendRowFromObject(SHEETS.PRODUCTS, {
      id: generateId('PROD'),
      sku,
      brand,
      model: model || '',
      variant: variant || '',
      specs: specs || '',
      colors: Array.isArray(colors) ? colors.join(', ') : (colors || ''),
      countryVariant: countryVariant || '',
      packageCondition: packageCondition || 'New / Sealed',
      basePrice: Number(basePrice || 0),
      costPrice: Number(costPrice || 0),
      lowStockThreshold: Number(lowStockThreshold || 10),
      status: status || 'Active',
      updatedAt: now
    });
  }

  logAudit_({
    user: user.name,
    userRole: user.role,
    action: id ? 'UPDATE_PRODUCT' : 'CREATE_PRODUCT',
    module: 'Products',
    targetId: sku,
    previousValue: id ? { id } : '',
    newValue: { sku, brand, model },
    reason: 'Product master updated'
  });

  return { success: true, message: `Product ${sku} saved successfully.` };
}

/**
 * Handle Bulk Import with Row-by-Row Validation
 */
function handleBulkImport(payload, user) {
  const rows = payload.rows || [];
  if (!rows.length) {
    return { success: false, error: 'No rows provided for import.' };
  }

  const errors = [];
  const validRows = [];
  const existingImeis = getRowsAsObjects(SHEETS.IMEI);
  const existingImeiSet = new Set(existingImeis.flatMap(i => [String(i.imei1).trim(), String(i.imei2).trim(), String(i.serialNumber).trim()].filter(Boolean)));

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;
    const sku = (row.sku || '').trim();
    const house = (row.house || 'Main House').trim();
    const color = (row.color || 'Standard').trim();
    const qty = Number(row.qty || 1);
    const imei1 = (row.imei1 || '').trim();

    if (!sku) {
      errors.push({ row: rowNum, error: 'Missing required SKU / Model Name.' });
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      errors.push({ row: rowNum, error: 'Quantity must be a positive number.' });
      return;
    }
    if (imei1 && existingImeiSet.has(imei1)) {
      errors.push({ row: rowNum, error: `Duplicate IMEI 1 '${imei1}' already exists in central database.` });
      return;
    }

    validRows.push({ ...row, sku, house, color, qty, imei1 });
  });

  if (errors.length > 0) {
    return {
      success: false,
      error: `Validation failed on ${errors.length} rows. Please correct errors and retry.`,
      rowErrors: errors
    };
  }

  // If all valid, process entries
  validRows.forEach(item => {
    handleSaveMovement({
      sku: item.sku,
      brand: item.brand || 'Generic',
      type: item.type || 'Regular',
      house: item.house,
      color: item.color,
      direction: 'IN',
      qty: item.qty,
      note: 'Bulk Data Import',
      imeis: item.imei1 ? [{ imei1: item.imei1, imei2: item.imei2, serialNumber: item.serialNumber }] : []
    }, user);
  });

  return {
    success: true,
    importedCount: validRows.length,
    message: `Successfully validated and imported ${validRows.length} inventory lines.`
  };
}

/**
 * Handle Automated Drive Backup
 */
function handleCreateBackup(user) {
  const ss = getDb();
  const fileId = ss.getId();
  const file = DriveApp.getFileById(fileId);
  const dateStr = Utilities.formatDate(new Date(), 'GMT', 'yyyy-MM-dd_HH-mm');
  const backupName = `StockFlow_Backup_${dateStr}`;
  const copy = file.makeCopy(backupName);

  logAudit_({
    user: user.name,
    userRole: user.role,
    action: 'BACKUP',
    module: 'System',
    targetId: copy.getId(),
    previousValue: '',
    newValue: backupName,
    reason: 'Centralized database snapshot taken'
  });

  return {
    success: true,
    backupName,
    backupFileId: copy.getId(),
    url: copy.getUrl(),
    message: `Database backup created: ${backupName}`
  };
}

/**
 * Fetch Filtered Audit Log
 */
function handleGetAuditLog(payload) {
  const logs = getRowsAsObjects(SHEETS.AUDIT_LOG);
  const limit = Number(payload.limit || 100);
  const sorted = logs.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  return {
    success: true,
    logs: sorted.slice(0, limit)
  };
}

function handleExportAuditReport(payload, user) {
  const logs = handleGetAuditLog({ limit: 10000 }).logs;
  const from = payload.from ? normalizeDate_(payload.from, payload.from) : '';
  const to = payload.to ? normalizeDate_(payload.to, payload.to) : '';
  const filtered = logs.filter(log => {
    const date = normalizeDate_(log.timestamp, log.timestamp);
    return (!from || date >= from) && (!to || date <= to);
  });
  const headers = ['timestamp', 'user', 'userRole', 'action', 'module', 'targetId', 'reason'];
  const csv = [headers.join(',')].concat(filtered.map(log => headers.map(header => `"${String(log[header] || '').replace(/"/g, '""')}"`).join(','))).join('\n');
  logAudit_({
    user: user.name,
    userRole: user.role,
    action: 'EXPORT_AUDIT',
    module: 'Audit',
    targetId: 'AuditReport',
    previousValue: '',
    newValue: { rows: filtered.length, from, to },
    reason: 'Audit report exported'
  });
  return { success: true, format: 'csv', rows: filtered.length, csv };
}

/**
 * Save / Manage User
 */
function handleSaveUser(payload, user) {
  const { id, name, email, role, location, pin, status } = payload;
  if (!name || !email || !role) {
    return { success: false, error: 'Name, email, and role are required.' };
  }

  const now = new Date().toISOString();
  if (id) {
    const updateObj = {
      name,
      email: email.toLowerCase().trim(),
      role,
      location: location || 'Main House',
      status: status || 'Active'
    };
    if (pin) updateObj.pinHash = hashPin(pin);
    updateRowById(SHEETS.USERS, id, updateObj);
  } else {
    appendRowFromObject(SHEETS.USERS, {
      id: generateId('USR'),
      name,
      email: email.toLowerCase().trim(),
      role,
      location: location || 'Main House',
      status: status || 'Active',
      pinHash: hashPin(pin || '123456'),
      lastLogin: '',
      createdAt: now
    });
  }

  logAudit_({
    user: user.name,
    userRole: user.role,
    action: id ? 'UPDATE_USER' : 'CREATE_USER',
    module: 'Users',
    targetId: email,
    previousValue: id ? { id } : '',
    newValue: { name, role, email },
    reason: 'User management update'
  });

  return { success: true, message: `User account for ${name} saved.` };
}

function handleSaveTaskBatch(payload, user) {
  const assigneeEmail = String(payload.assigneeEmail || '').trim().toLowerCase();
  const titles = Array.isArray(payload.tasks) ? payload.tasks : [];
  if (!assigneeEmail || !titles.length) {
    return { success: false, error: 'Assignee email and at least one task are required.' };
  }

  const now = new Date().toISOString();
  const tasks = titles
    .map(title => String(title || '').trim())
    .filter(Boolean)
    .map(title => ({
      id: generateId('TSK'),
      title,
      assigneeEmail,
      status: 'Open',
      createdBy: user.email || user.name,
      createdAt: now,
      completedAt: ''
    }));

  tasks.forEach(task => appendRowFromObject(SHEETS.TASKS, task));
  logAudit_({
    user: user.name,
    userRole: user.role,
    action: 'CREATE_TASK_BATCH',
    module: 'Tasks',
    targetId: assigneeEmail,
    previousValue: '',
    newValue: { count: tasks.length },
    reason: 'Bulk task assignment'
  });
  return { success: true, tasks, message: `${tasks.length} task(s) assigned.` };
}
