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

The Windows client must communicate with the same Google Apps Script API used by the centralized web platform and must never directly write to Google Sheets.
