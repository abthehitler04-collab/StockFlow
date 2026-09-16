# Release Process

## Purpose

This document describes how to prepare a production release from the centralized StockFlow + BadBin platform and the future native Android/Windows client migration.

## Current release status

The repository currently contains a web-based centralized platform with Google Apps Script and Google Sheets integration. This is a production-ready web foundation, but native app artifacts still need to be implemented.

## Release checklist

- Validate backend API connectivity.
- Verify the Google Apps Script deployment URL is set.
- Run repository validation tests.
- Confirm the app version metadata is updated.
- Review audit and inventory flow.
- Prepare Android release APK/AAB.
- Prepare Windows installer or MSIX package.
- Sign packages securely and keep secrets out of source control.
- Publish release notes and deployment guide.

## Semantic versioning

Use the pattern:

Major.Minor.Patch

Example: 1.0.0

## Change log

Document each release with version, date, summary of changes, bug fixes, compatibility notes, and known issues.
