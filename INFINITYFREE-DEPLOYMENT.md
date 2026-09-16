# InfinityFree Production Deployment Checklist

## Upload Layout

Upload the repository contents into `htdocs` with this exact layout:

```text
htdocs/
  index.html
  sw.js
  version.json
  manifest.webmanifest
  .htaccess
  robots.txt
  google-apps-script/
    Code.gs
    README-BACKEND-SETUP.md
  badbin/
    index.html
    .htaccess
    manifest.webmanifest
    robots.txt
    assets/
      index-Final20260916.js
      index-CktYb_0n.css
      badbin-flow-atlas.webp
      badbin-paper-grain.webp
      badbin-route-mark.webp
      badbin-route-texture.webp
```

> **IMPORTANT**: Do not upload inside a nested `stockflow/` folder inside `htdocs/`. The file `index.html` must be directly at `htdocs/index.html`.

---

## Deployment Steps

1. **File Manager / FTP Upload**:
   - In InfinityFree Control Panel, open File Manager and open `htdocs`.
   - Delete the provider's default `index.php` or parking page if present.
   - Upload the files and folders listed above.
2. **First Visit**:
   - Open your domain: `https://your-domain.infinityfreeapp.com`.
   - StockFlow will load in clean production mode with the PWA service worker active.
3. **Connect Centralized Backend**:
   - Click **Connect Now** on the top notification banner (or navigate to **Settings**).
   - Enter your deployed Google Apps Script Web App URL.
   - Click **Test & Save Connection**.
   - Authenticate with the default Super Admin:
     - **Email**: `admin@stockflow.internal`
     - **PIN**: `123456`
4. **Verification**:
   - Verify `/` loads StockFlow with sync badge showing **Online · Synced**.
   - Verify `/badbin/` loads After-Sales intelligence.
   - Verify PWA install prompt is available.
   - Test a sample IN movement; check your Google Sheet `Transactions` tab to verify live synchronization!
