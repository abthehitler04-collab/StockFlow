# Native App Migration Audit

## Executive Summary

This repository already contains a strong centralized operational platform based on a web frontend, Google Apps Script APIs, and Google Sheets as the source of truth. The existing implementation is not a native Android/Windows application stack, but it already contains core business logic, centralized authorization, stock validation, IMEI tracking, and synchronized operational data that can be reused for a proper native client architecture.

## Existing Implementation Review

### StockFlow core strengths

- Centralized backend in Google Apps Script with Google Sheets as the master database.
- Shared multi-user inventory state and transaction logic.
- IMEI/serial duplicate validation and stock movement handlers.
- Transfer lifecycle support with approval, dispatch, receipt, and completion.
- Audit logging and permission matrix for server-side authorization.
- Offline-safe queue behavior in the browser client.

### BadBin strengths

- Standalone after-sales operations interface.
- Focus on repair intake, service tracking, and post-sale workflows.
- Reusable patterns for repair status and service operations.

## Reusable Business Logic

- Role and permission handling: `PERMISSION_MATRIX` and `checkPermission()`.
- Stock movement validation: `handleSaveMovement()`.
- Duplicate IMEI detection: `handleCheckDuplicateImei()`.
- Transfer lifecycle: `handleCreateTransfer()` and `handleUpdateTransferStatus()`.
- Transaction and audit logging through `appendRowFromObject()` and `logAudit_()`.
- Database bootstrap and standardized sheet schema generation.

## Reusable Models

The current repository uses row-based sheet objects rather than formal typed models; the native migration should promote these concepts into typed domain models:

- User
- Employee
- Role
- Permission
- Product
- InventoryItem
- IMEI
- SerialNumber
- Location
- Transaction
- Transfer
- Sale
- Invoice
- Payment
- Customer
- Supplier
- Repair
- ServiceRecord
- AuditLog
- Notification
- Settings

## Existing Bugs and Gaps

1. The repository is browser-based, not real native Windows or Android clients.
2. The code uses spreadsheet rows as primary data structures rather than strongly typed domain objects.
3. No real Flutter/Dart or Windows application implementation exists.
4. No Android app source, package config, release build pipeline, or signed artifact generation exists.
5. No Windows desktop client exists; there is only a web dashboard experience.
6. Native client-specific requirements such as IMEI scanning, barcode workflows, local offline queues, and mobile-first UI are not implemented as native features.
7. The project includes a production web app but not the required native app stack described in the master prompt.
8. A full production release workflow for Android APK/AAB and Windows installer is absent.

## Required Migration

The application architecture should be migrated to:

- Shared backend contract: Google Apps Script API remains the authoritative source of truth.
- Native clients: Android and Windows clients consume the same central service and do not write to Sheets directly.
- Shared domain layer: typed models and validation rules shared across clients.
- Local cache and sync queue for Android offline support.
- Production release pipeline for Android packaging and Windows installer generation.

## Compatibility Problems to Resolve

- Web app assumptions are not equivalent to native app workflows.
- Sheet schema is business-oriented but not full ERP product inventory modeling for native mobile operations.
- Authentication is PIN-based and browser-optimized, not a secure mobile-native token lifecycle.
- Report and dashboard logic will need explicit device-specific UI and data partitioning.
- A proper native release process must be introduced for APK/AAB and MSIX/inno/exe packaging.

## Recommended Architecture for Final Delivery

- Android: native Android client with local SQLite cache and sync queue, using a secure authenticated API client.
- Windows: native desktop client with desktop table views, search, reporting, and installer packaging.
- Shared backend: Google Apps Script Web App and Sheets remains the central data store.
- Shared validation: all critical business rule validation remains on the server.

## Conclusion

The existing project is a strong foundation for a centralized ERP-style business system, but it does not yet satisfy the requirement for fully native Windows and Android applications. It is best treated as the backend and business-rule base, with a real native client migration planned on top of the same Google Apps Script services.
