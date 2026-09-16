# Android Client

This directory is reserved for the native Android application that will operate against the same centralized Google Apps Script backend. It is designed to support mobile inventory scanning, offline queueing, and synchronized stock operations.

## Planned responsibilities

- Phone and tablet optimized shopping and warehouse workflows
- IMEI/QR scanning with device camera support
- Offline-aware local database cache
- Secure authentication and session management
- Synchronization queue with idempotent operations
- Mobile reporting and transfer receipt confirmation

## Backend contract

The Android client must connect to the centralized backend API and use idempotent operation IDs for all transaction-mutating requests.
