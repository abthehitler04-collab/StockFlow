STOCKFLOW + BADBIN — UNIFIED INFINITYFREE RELEASE
=================================================

This is the complete static production package. StockFlow is the main operations console and BadBin is integrated as its After-sales workspace. Both applications run from the same domain and require no database, PHP, Node.js, or external services.

UPLOAD
------
1. Open your InfinityFree account and File Manager.
2. Open the hosting account's htdocs folder.
3. Upload this ZIP and choose Extract, or upload the contents directly.
4. Confirm that index.html and .htaccess are directly inside htdocs, with the badbin/ folder beside them.
5. Open your domain. The StockFlow console is the homepage; choose After-sales in the sidebar or mobile navigation to open BadBin.

PACKAGE CONTENTS
----------------
index.html       Unified StockFlow shell and dashboard
badbin/          Integrated BadBin after-sales app, bundle, assets, and manifest
.htaccess        Root routing, compression, caching, and security headers
README-INFINITYFREE.txt  This deployment guide

DATA & BACKUPS
--------------
Both workspaces are local-first and store data in the current browser's localStorage. StockFlow has a Data center for CSV/JSON export and restore. BadBin includes its own backup/import tools. Export backups before clearing browser data or changing devices. Data is not shared between browsers or users because this release has no server-side database.

TROUBLESHOOTING
---------------
If a page shows an old version, hard-refresh the browser after upload. Do not place the contents inside an extra nested folder: index.html must be directly in htdocs. If InfinityFree shows a default page, remove its default index file and re-extract this package.
