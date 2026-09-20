# Windows Client

This directory is reserved for the native Windows desktop client that will consume the centralized Google Apps Script backend. It is intended to host the desktop application project and installer configuration for the production-ready release.

## Planned responsibilities

- Desktop dashboard and inventory management
- Role-aware navigation and advanced search
- Barcode and IMEI workflows
- Transfer approval and dispatch actions
- Sales and payment processing
- Reporting and printing
- Secure API integration against the centralized backend

## Backend contract

The Windows client must communicate with the hosted StockFlow API and must never directly write to Google Sheets.

## Admin-PC self-host mode

The admin PC runs the StockFlow web/API host with Docker Desktop:

```powershell
.\scripts\start-admin-host.ps1 -OpenFirewall -OpenBrowser
```

The admin Windows client is built against `http://127.0.0.1:3000/api/index.php`. Other devices use the same host over the LAN:

```text
http://<ADMIN-PC-IP>:3000/
```

For global access, publish the host through an HTTPS reverse proxy or VPN and use the resulting HTTPS URL. Do not expose the PHP development/storage port directly to the internet.

Stop the host with:

```powershell
.\scripts\stop-admin-host.ps1
```
