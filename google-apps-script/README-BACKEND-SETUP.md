# Google Sheets & Google Apps Script Backend Setup Guide

This guide walks you through deploying the centralized Google Sheets master database and Google Apps Script API.

---

## Architecture Overview

```
[Web / Mobile Clients]  
       │ (HTTPS POST / GET via text/plain to avoid preflight issues)
       ▼
[Google Apps Script Web App API] (Code.gs)
       │ (Atomic LockService Mutex & Role-Based Access Control)
       ▼
[Google Sheets Master Database] (14 Structured Sheets)
```

---

## Step 1: Create the Google Spreadsheet

1. Open [Google Sheets](https://sheets.google.com).
2. Click **Blank spreadsheet**.
3. Name your spreadsheet: **`StockFlow Master Database`**.

---

## Step 2: Open the Apps Script Editor

1. Inside your spreadsheet, click **Extensions** in the top menu.
2. Click **Apps Script**.
3. Rename the Apps Script project to **`StockFlow Backend API`**.

### Automated project connection

This repository is already linked to the Apps Script project ID through
`google-apps-script/.clasp.json`. From the repository root, authenticate once
with Google and push the checked-in `Code.gs`:

```powershell
npm run apps-script:login
npm run apps-script:push
```

To create a new deployment after pushing:

```powershell
npm run apps-script:deploy
```

The deployment access policy still must be set in Apps Script to **Execute as
Me** and **Anyone**. The CLI cannot safely grant that public access policy on
your behalf.

---

## Step 3: Paste the Code

1. In the Apps Script code editor, delete any placeholder code in `Code.gs`.
2. Copy the complete contents of [`google-apps-script/Code.gs`](file:///c:/Users/abthe/Desktop/stockflow/google-apps-script/Code.gs) and paste it into `Code.gs`.
3. Click the **Save** disk icon (or press `Ctrl+S` / `Cmd+S`).

---

## Step 4: Run Initial Setup (`setupDatabase`)

1. In the toolbar at the top of the Apps Script editor, locate the **Run** dropdown (it may default to `doGet` or `myFunction`).
2. Select **`setupDatabase`** from the function dropdown.
3. Click **Run**.
4. Google will ask for authorization:
   - Click **Review permissions**.
   - Select your Google Account.
   - Click **Advanced** → Click **Go to StockFlow Backend API (unsafe)**.
   - Click **Allow**.
5. The function will execute and print:
   > `StockFlow Google Sheets Master Database initialized successfully with all 14 sheets, default locations, and default Super Admin user.`
6. Return to your spreadsheet tab. You will see that all **14 sheets** have been automatically generated with frozen, styled header rows:
   - `Users` (includes initial Super Admin: `admin@stockflow.internal`, default PIN `123456`)
   - `Products`
   - `Inventory`
   - `IMEI`
   - `Transactions`
   - `Transfers`
   - `Sales`
   - `Customers`
   - `Suppliers`
   - `Locations` (pre-populated with your 7 warehouse/staging locations)
   - `Repairs` (BadBin after-sales storage)
   - `Payments`
   - `Audit_Log`
   - `Settings`

---

## Step 5: Deploy as Web App

1. In the upper right corner of the Apps Script editor, click the blue **Deploy** button → select **New deployment**.
2. Click the gear icon ⚙️ next to "Select type" → choose **Web app**.
3. Fill in the deployment details:
   - **Description**: `StockFlow Production API v2`
   - **Execute as**: **`Me (your_email@gmail.com)`** *(Crucial: allows frontend to access the sheet without requiring each employee to have a Google Cloud account)*
   - **Who has access**: **`Anyone`** *(Crucial: allows the InfinityFree frontend web application to communicate with the API)*
4. Click **Deploy**.
5. Copy the **Web app URL**. It looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

---

## Step 6: Connect StockFlow to Your Backend

1. Open StockFlow in your browser.
2. Go to **Settings** (or click the **Connect Backend** banner).
3. Paste your **Web app URL**.
4. Click **Test & Save Connection**.
5. StockFlow will test the connection, perform an initial sync, and display:
   > **`Online · Synced with Google Sheets`**
6. Log in with the default Super Admin credentials:
   - **Email**: `admin@stockflow.internal`
   - **PIN**: `123456`
7. Once logged in, you can add your employees, update locations, set stock lines, and begin operations.
