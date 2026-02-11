# License Key Generator

This document explains how to generate license keys for the School Library Management System.

The license generator is a **developer-only tool** — it is NOT included in the distributed application. Only the developer/vendor uses this tool to create license keys for customers.

## How It Works

```
Developer                          Customer
─────────                          ────────
generate-license.ts                School Library App
        │                                  │
        ▼                                  ▼
  AES-256-GCM encrypt             License activation page
        │                                  │
        ▼                                  ▼
  License key (base64)  ──────►   Decrypt & validate
                                           │
                                           ▼
                                  App unlocked (PRO)
```

The license key is an AES-256-GCM encrypted JSON payload containing:
- `licenseId` — Unique identifier (e.g. `SL-A1B2C3D4-E5F6G7H8`)
- `schoolName` — Customer's school name
- `expiryDate` — License expiration date
- `createdAt` — Key generation timestamp
- `version` — License format version

## Prerequisites

The generator runs from the project root and requires `ts-node`:

```bash
npm install  # if not already done
```

## Usage

### Option 1: Specify expiry date

```bash
npm run generate-license -- --school "School Name" --expiry "2027-01-01"
```

### Option 2: Specify number of days from today

```bash
npm run generate-license -- --school "School Name" --days 365
```

### Option 3: Default (365 days)

```bash
npm run generate-license -- --school "School Name"
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--school` | Yes | Customer's school name |
| `--expiry` | No | Expiry date in `YYYY-MM-DD` format |
| `--days` | No | Number of days from today (default: 365) |

## Example

```bash
npm run generate-license -- --school "Talgar Private Lyceum No.1" --days 365
```

Output:

```
=== LICENSE KEY GENERATED ===

License ID:   SL-A1B2C3D4-E5F6G7H8
School:       Talgar Private Lyceum No.1
Expiry Date:  2027-02-11
Created At:   2026-02-11T10:30:00.000Z

LICENSE KEY:

k8Jd7fG2nP5qR1tY... (long base64 string)

============================
```

## How the Customer Activates

1. Customer opens the app for the first time
2. License activation page appears with a "Continue with Trial (30 days)" button
3. Customer can paste the license key and click "Activate"
4. Or they can use the trial first and activate later from **Settings > License Information**

## Renewal

When a license expires:
- The app still opens but shows the license activation page
- Customer enters the new license key
- They can also enter it from **Settings > License Information** without being locked out during the session

To generate a renewal key, simply run the generator again with the same school name and a new expiry date.

## Storage

On the customer's machine, license data is stored at:

```
%AppData%/school-library/license.json
```

This file contains:
- `trialStartDate` — When the trial started
- `isActivated` — Whether a license key is active
- `licenseKey` — The encrypted license key (if activated)

## Security Notes

- The encryption key (`LICENSE_SECRET`) is shared between `scripts/generate-license.ts` and `electron/main.ts`
- The license key cannot be forged without knowing this secret
- If you change the secret, all previously generated keys become invalid
- The secret is embedded in the compiled app — for stronger protection, consider code obfuscation

## File Locations

| File | Purpose |
|------|---------|
| `scripts/generate-license.ts` | License key generator (developer tool) |
| `electron/main.ts` | License validation logic (in app) |
| `src/pages/LicensePage.tsx` | License activation UI |
| `src/pages/SettingsPage.tsx` | License info section in settings |
