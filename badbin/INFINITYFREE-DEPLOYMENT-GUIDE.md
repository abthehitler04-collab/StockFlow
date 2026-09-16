# BadBin After-Sales Intelligence — InfinityFree Production Deployment Guide

This guide provides step-by-step instructions to upload and host the **BadBin After-Sales Intelligence** platform on **InfinityFree** (or any cPanel / Apache / PHP shared web hosting service).

---

## 📦 What is in this Release?

The build is completely **self-contained and production-optimized**:
- **Zero Server Setup**: Runs entirely in modern browsers using fast client-side reactivity and HTML5 `localStorage`. No MySQL database creation, no PHP version conflicts, and no server crashes.
- **Portability**: All asset links use relative paths (`./assets/...`). The app works seamlessly whether hosted at the domain root (`yourdomain.com/`) or within a subfolder (`yourdomain.com/bbn/`).
- **Clean Bundle**: All debug scripts, Manus wrappers, and development inspectors have been completely stripped out. `index.html` is a clean, 750-byte lightweight entry point.
- **Apache `.htaccess` Preconfigured**: Contains Gzip/DEFLATE compression, cache expiry headers for lightning-fast loads, and SPA routing fallback.

---

## 📂 Production Files Checklist

When uploading to InfinityFree's `htdocs` directory, you only need the **top-level production files**:

| File / Folder | Purpose |
| :--- | :--- |
| 📁 `assets/` | Compiled JavaScript, CSS, and WebP icons/textures |
| 📄 `index.html` | The main application entry point |
| 📄 `.htaccess` | Apache rules for caching, gzip compression & SPA fallback |
| 📄 `manifest.webmanifest` | PWA installation descriptor (enables "Add to Home Screen") |
| 📄 `robots.txt` | Crawler indexing policy |

> [!TIP]
> **Do NOT upload** the `source/` folder or `2AS_IMS_Android_Release/` folder to InfinityFree. Those contain editable project source code and local build tools.

---

## 🚀 Deployment Methods

### Option 1: InfinityFree Web File Manager (Recommended)

1. Log into your **InfinityFree Client Area** ([dash.infinityfree.com](https://dash.infinityfree.com)).
2. Select your hosting account and click **File Manager** (or **vPanel -> Online File Manager**).
3. Open the `htdocs/` directory.
4. If there are default placeholder files (such as `default.php`), select and delete them.
5. On your computer, select:
   - `assets/` (folder)
   - `index.html`
   - `.htaccess`
   - `manifest.webmanifest`
   - `robots.txt`
6. Compress these 5 items into a single ZIP file (e.g. `badbin-upload.zip`).
7. In the InfinityFree File Manager, click **Upload** -> **Upload Zip** and choose `badbin-upload.zip`.
8. Once uploaded, right-click the zip inside `htdocs` and choose **Extract**.
9. **Verify**: Check that `index.html` is located directly in `htdocs/index.html` (not inside `htdocs/badbin-upload/index.html`).

---

### Option 2: Upload via FTP (FileZilla / WinSCP)

1. In your InfinityFree Dashboard, locate your **FTP Details**:
   - **FTP Host**: (e.g. `ftpupload.net`)
   - **FTP Username**: (e.g. `if0_12345678`)
   - **FTP Password**: Your account password
   - **Port**: `21`
2. Open **FileZilla** and enter these credentials to connect.
3. In the **Remote Site** panel (right), double-click into `/htdocs`.
4. In the **Local Site** panel (left), navigate to your `bbn` folder.
5. Select:
   - `assets`
   - `index.html`
   - `.htaccess`
   - `manifest.webmanifest`
   - `robots.txt`
6. Right-click and choose **Upload**.
7. Wait for all files to finish uploading.

---

## 📱 Features Available Immediately After Upload

1. **Intake Unit (`+ New Unit` / `Intake Unit`)**:
   - Add new defective returns with model autocompletion, 15-digit IMEI duplicate checking, partner tag, and defect classification.
2. **Interactive Triage & Handoff Drawer**:
   - Click any unit in the register to inspect its full provenance.
   - Click **Edit Unit / Change Handoff** to re-route units to *"GoodBin - Repaired"*, *"OPT to Service"*, *"To Service Internal"*, or *"Sold to Shanto"*.
3. **IMEI Barcode Scanner (Press `S` or click `Quick Scan`)**:
   - Instant search for physical warehouse handling. Supports barcode reader guns with Enter/Return auto-advance.
   - Quick 1-click status transitions and live audit trail.
4. **Service Transfer Manifest / Gate Pass (`Manifest`)**:
   - Select units using the checkboxes, click **Manifest**, and generate an official printable transfer document with formal certified count and 3 signature blocks (Warehouse, Courier, Service Center).
5. **Batch Actions Dock**:
   - Select multiple units in the Register to bulk-update their destination, bulk-export them as CSV, or bulk-print manifests.
6. **CSV Import & Backup Center (`Import / Backup`)**:
   - Upload future BadBin sheets from Excel (.csv) to append or replace records.
   - Download complete JSON database backups.
   - 1-click **Reset to Default 120 Units** to restore the baseline dataset anytime.
7. **Day Shift & Night Shift (Dark Mode)**:
   - Click the Sun/Moon toggle in the sidebar or mobile header for high-contrast tactical operation in warehouse environments.

---

## 🔍 Verification & Troubleshooting

- **Page is blank or 404?**
  Ensure `index.html` was extracted directly inside `htdocs/` and not inside a subfolder like `htdocs/bbn/index.html`.
- **Assets not loading?**
  Check that the `assets/` folder is uploaded alongside `index.html` and contains the `.js`, `.css`, and `.webp` files.
- **Do I need to configure MySQL or PHP in InfinityFree?**
  No. BadBin is designed as an ultra-reliable client-side operations cockpit with `localStorage` persistence. It requires zero database setup and has zero maintenance overhead.
