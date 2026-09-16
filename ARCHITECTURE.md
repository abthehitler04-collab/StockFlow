# Architecture Overview

## Production target architecture

The final system is designed around a shared centralized platform:

- Windows client
- Android client
- Shared Google Apps Script backend
- Google Sheets as the source of truth

## Layering

1. Client layer
   - Native Windows desktop app
   - Native Android app
2. Integration layer
   - Shared API client
   - Secure authentication and session handling
3. Business logic layer
   - Google Apps Script server-side validation and authorization
4. Data layer
   - Google Sheets master workbook and audit sheets

## Security and integrity

- No client may independently calculate or enforce stock mutation rules.
- All inventory-changing operations must pass through the backend.
- Operation IDs are required for all transaction-changing requests.
- Permission enforcement occurs on the server side.

## Current repository status

This repo contains a mature web implementation and strong backend logic, which is suitable as the starting point for the native migration.
