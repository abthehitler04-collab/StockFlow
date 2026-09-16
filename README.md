# StockFlow Enterprise + BadBin Centralized System

A unified, multi-user warehouse operations console and after-sales intelligence platform powered by **Google Sheets as the centralized data layer**, **Google Apps Script as the serverless REST API**, and a **standalone Android client** built for independent deployment and GitHub-based automation.

> This repository is now oriented toward a native Android app workflow rather than the legacy InfinityFree static-hosting deployment.

## Independent Android build

The app under [apps/android](apps/android) is a standalone Flutter Android project that can be built locally or through GitHub Actions without depending on the older InfinityFree hosting stack.

### Build locally

```bash
cd apps/android
flutter pub get
flutter build apk --debug
```

### Build in GitHub Actions

GitHub Actions will generate an APK artifact automatically from this repository using the workflow in [.github/workflows/android-build.yml](.github/workflows/android-build.yml).

---

## 🌟 What's New in v2.0.0-centralized

- **One Central Source of Truth**: All operational data (inventory, movements, transfers, POS sales, and BadBin repairs) is now stored in a master Google Spreadsheet shared in real-time across all employees and devices.
- **Concurrency Locking**: Atomic lock service (`LockService.getScriptLock()`) prevents two employees from overwriting stock or creating duplicate transactions simultaneously.
- **Duplicate IMEI / SN Prevention**: Real-time detection across IMEI 1, IMEI 2, and Serial Numbers, showing exact existing facility, holder, and status.
- **Multi-Stage Transfers**: Complete transfer workflow: `Pending` → `Approved` → `Dispatched` → `In Transit` → `Received` → `Complete`, with printable A4 Gate Passes and Delivery Manifests.
- **Offline-Safe Submission Queue**: If internet temporarily disconnects during floor operations, submitted transactions are safely queued with a visual badge and automatically synchronized upon reconnecting.
- **Role-Based Access Control (RBAC)**: Support for Super Admin, Admin, Warehouse Manager, Logistics, Sales Executive, Accounts, Service, and Viewer roles.
- **Clean Production Environment**: Zero hardcoded fake/demo units in production.

---

## 🏛️ System Architecture

```
[ Mobile Phones / Tablets / Desktop Browsers ]
                     │  (HTTPS)
                     ▼
[ InfinityFree Web Host (htdocs) ]
   ├── index.html (StockFlow SPA)
   ├── badbin/ (After-sales Intelligence)
   ├── sw.js (Offline App Shell Cache)
   ├── manifest.webmanifest (PWA)
   └── .htaccess (HTTPS & Security Headers)
                     │
                     │  (Secure Authenticated JSON API calls via text/plain)
                     ▼
[ Google Apps Script Web App API (Code.gs) ]
   ├── Mutex Concurrency Locking (LockService)
   ├── Role & Permission Authorization
   ├── Stock Calculation & Validation Engine
   ├── Audit Logging
   └── Automated Google Drive Backups
                     │
                     ▼
[ Google Sheets Master Database (14 Relational Sheets) ]
   ├── Users
   ├── Products
   ├── Inventory
   ├── IMEI
   ├── Transactions
   ├── Transfers
   ├── Sales
   ├── Customers
   ├── Suppliers
   ├── Locations
   ├── Repairs
   ├── Payments
   ├── Audit_Log
   └── Settings
```

---

## 🚀 Quick Deployment Guide

### Phase 1: Deploy Centralized Google Sheets Database (5 minutes)
1. Open Google Sheets and create a new blank spreadsheet named **`StockFlow Master Database`**.
2. Click **Extensions** → **Apps Script**.
3. Copy all code from [`google-apps-script/Code.gs`](./google-apps-script/Code.gs) and paste it into `Code.gs`.
4. In the function dropdown, select **`setupDatabase`** and click **Run** (grant permissions when prompted). This auto-creates all 14 structured sheets.
5. Click **Deploy** → **New deployment** → Choose **Web app**:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
6. Copy the generated **Web app URL** (`https://script.google.com/macros/s/.../exec`).
*(Detailed guide with screenshots available in [google-apps-script/README-BACKEND-SETUP.md](./google-apps-script/README-BACKEND-SETUP.md))*

---

### Phase 2: Deploy to InfinityFree Hosting (3 minutes)
1. Open your InfinityFree Control Panel and open the **File Manager** (or connect via FTP).
2. Open the **`htdocs/`** directory.
3. Remove the default `index.php` placeholder page if present.
4. Upload all repository files so that `index.html` sits directly inside `htdocs/`:
   ```
   htdocs/
     index.html
     sw.js
     version.json
     manifest.webmanifest
     .htaccess
     robots.txt
     badbin/
       index.html
       .htaccess
       manifest.webmanifest
       robots.txt
       assets/
   ```
5. Visit your domain in any browser.
6. Open **Settings** (or click the **Connect Backend** banner) and paste your Google Apps Script Web App URL.
7. Click **Test & Save Connection**. The status will show **Online · Synced with Google Sheets**.
8. Log in with initial credentials:
   - **Email**: `admin@stockflow.internal`
   - **PIN**: `123456`

---

## 🧪 Local & Production Verification

Run the automated release test script:

```bash
./validate-release.sh
```

The script verifies file integrity, PWA files, syntax correctness, and runs smoke checks on key endpoints.
