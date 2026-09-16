# Backend API

This directory reflects the production service layer used by the native clients. The canonical implementation lives in Google Apps Script and should remain the single authoritative source for inventory, transaction, user, audit, and permission checks.

## Core properties

- Central data store: Google Sheets workbook
- API layer: Google Apps Script Web App
- Security: server-side permission checks and validation
- Business logic: stock calculations, transfer status changes, sales processing, and idempotency checks
- Audit trail: all significant events logged in the central sheet

## Native client rule

Native Windows and Android apps must use this API rather than direct spreadsheet access.
