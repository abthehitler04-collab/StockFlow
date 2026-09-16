================================================================================
BADBIN AFTER-SALES INTELLIGENCE — FULL PRODUCTION RELEASE (INFINITYFREE READY)
================================================================================

This package contains the fully upgraded, self-contained, high-performance
after-sales inventory and operations cockpit.

KEY FEATURES IN THIS FULL RELEASE:
----------------------------------
1. Full Operational CRUD:
   - Intake new returned units with SKU suggestions and 15-digit IMEI validation.
   - Edit unit details, update repair notes, and change destination status.
   - Transition handoffs (OPT Service, Internal Service, GoodBin Repaired, Sold).
   - Delete/archive units with safety confirmation.
   - 1-click Factory Reset to restore original 120 units from Logistics-DATA.xlsx.
2. LocalStorage Persistence:
   - All additions, handoffs, and edits persist automatically in browser storage.
   - No server-side database, MySQL setup, or PHP configuration required.
3. Barcode & IMEI Quick-Scan Hub:
   - Press 'S' or click Quick Scan to immediately find any device by IMEI barcode.
   - 1-click status transitions and live session audit log.
4. Service Transfer Manifest Generator ("Gate Pass"):
   - Generate official printable dispatch manifests for batches sent to service.
   - Formatted itemized table, total certified count, and 3 formal signature lines.
   - Optimized for A4 printing and "Save to PDF".
5. Multi-Select Batch Actions:
   - Checkbox multi-selection in Register table.
   - Floating action dock to bulk-update destination, bulk export CSV, or bulk print manifest.
6. CSV & JSON Import / Backup Center:
   - Import newly logged batches of units directly from CSV/Excel.
   - Download full JSON database backups and restore anytime.
7. Night Shift (Tactical Dark Mode):
   - Switchable between "Bureau of Flow" (Light mineral paper) and "Night Shift Signal" (High-contrast dark).
8. Relative-Path Portability:
   - Built with relative URLs ('./assets/...'). Can run at root domain (htdocs/) OR inside any subfolder (e.g. htdocs/bbn/).
9. Apache .htaccess:
   - Preconfigured with Gzip/Deflate compression, browser caching, MIME types, and clean SPA fallback.

================================================================================
FILES TO UPLOAD TO INFINITYFREE (htdocs)
================================================================================
Upload the following files and folders directly into your InfinityFree 'htdocs/' folder:

  [Folder] assets/                --> Contains CSS, JavaScript, and WebP images
  [File]   index.html             --> Main entry point (clean 750 bytes)
  [File]   .htaccess              --> Apache optimization, caching & compression
  [File]   manifest.webmanifest   --> Progressive Web App manifest
  [File]   robots.txt             --> Web crawlers policy

DO NOT upload the 'source' or '2AS_IMS_Android_Release' folders to InfinityFree.

================================================================================
STEP-BY-STEP UPLOAD INSTRUCTIONS
================================================================================

OPTION A: VIA INFINITYFREE FILE MANAGER (Browser)
1. Log in to your InfinityFree client area at https://dash.infinityfree.com
2. Select your hosting account and click "File Manager".
3. Double-click to open the 'htdocs' directory.
4. Delete default files like 'default.php' or placeholder files if present.
5. Create a ZIP of the production files (index.html, .htaccess, manifest.webmanifest,
   robots.txt, and the assets folder).
6. Click the Upload icon -> "Upload Zip" and choose your zip.
7. Right-click the zip inside htdocs and select "Extract".
8. Ensure 'index.html' is directly inside 'htdocs', not inside an extra nested folder.

OPTION B: VIA FTP (FileZilla / WinSCP)
1. In your InfinityFree dashboard, find your FTP Hostname, Username, and Password.
2. Open FileZilla and connect using Port 21.
3. On the Remote side, open the 'htdocs' folder.
4. On the Local side, select:
   - assets/
   - index.html
   - .htaccess
   - manifest.webmanifest
   - robots.txt
5. Drag and drop them into 'htdocs'.
6. Visit your website domain (e.g., yoursite.infinityfreeapp.com) in any browser!

No build step, no Node.js, and no database credentials needed.
Everything runs with zero maintenance!
