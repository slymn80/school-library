/**
 * License Key Generator for School Library Management System
 *
 * Usage:
 *   npx ts-node scripts/generate-license.ts --school "School Name" --expiry "2025-12-31"
 *   npx ts-node scripts/generate-license.ts --school "School Name" --days 365
 *
 * Options:
 *   --school  School name (required)
 *   --expiry  Expiry date in YYYY-MM-DD format
 *   --days    Number of days from today (default: 365)
 */

import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// IMPORTANT: This key must match the one in electron/main.ts
const LICENSE_SECRET = 'SL-2024-K3y-S3cur3-Libr4ry-Mgmt!';
const ALGORITHM = 'aes-256-gcm';

interface LicenseData {
  licenseId: string;
  schoolName: string;
  expiryDate: string;
  createdAt: string;
  version: number;
}

function generateLicenseId(): string {
  return 'SL-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '-' +
         crypto.randomBytes(4).toString('hex').toUpperCase();
}

function encrypt(data: LicenseData): string {
  const key = crypto.scryptSync(LICENSE_SECRET, 'school-library-salt', 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine iv + authTag + encrypted data into a single base64 string
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'hex')
  ]);

  return combined.toString('base64');
}

function parseArgs(args: string[]): { school?: string; expiry?: string; days?: number } {
  const result: { school?: string; expiry?: string; days?: number } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--school' && args[i + 1]) {
      result.school = args[i + 1];
      i++;
    } else if (args[i] === '--expiry' && args[i + 1]) {
      result.expiry = args[i + 1];
      i++;
    } else if (args[i] === '--days' && args[i + 1]) {
      result.days = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.school) {
    console.error('Error: --school parameter is required');
    console.error('');
    console.error('Usage:');
    console.error('  npx ts-node scripts/generate-license.ts --school "School Name" --expiry "2025-12-31"');
    console.error('  npx ts-node scripts/generate-license.ts --school "School Name" --days 365');
    process.exit(1);
  }

  let expiryDate: string;

  if (args.expiry) {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(args.expiry)) {
      console.error('Error: --expiry must be in YYYY-MM-DD format');
      process.exit(1);
    }
    expiryDate = args.expiry;
  } else {
    const days = args.days || 365;
    const date = new Date();
    date.setDate(date.getDate() + days);
    expiryDate = date.toISOString().split('T')[0];
  }

  const licenseData: LicenseData = {
    licenseId: generateLicenseId(),
    schoolName: args.school,
    expiryDate,
    createdAt: new Date().toISOString(),
    version: 1,
  };

  const licenseKey = encrypt(licenseData);

  // Save to Excel file
  const excelPath = path.join(__dirname, '..', 'licenses.xlsx');
  const row = {
    'License ID': licenseData.licenseId,
    'School': licenseData.schoolName,
    'Expiry Date': licenseData.expiryDate,
    'Created At': licenseData.createdAt,
    'Days': args.days || (args.expiry ? '' : 365),
    'License Key': licenseKey,
  };

  let wb: any;
  let rows: any[] = [];

  if (fs.existsSync(excelPath)) {
    wb = XLSX.readFile(excelPath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws);
  } else {
    wb = XLSX.utils.book_new();
  }

  rows.push(row);
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 22 },  // License ID
    { wch: 35 },  // School
    { wch: 14 },  // Expiry Date
    { wch: 26 },  // Created At
    { wch: 8 },   // Days
    { wch: 60 },  // License Key
  ];

  if (wb.SheetNames.length > 0) {
    wb.Sheets[wb.SheetNames[0]] = ws;
  } else {
    XLSX.utils.book_append_sheet(wb, ws, 'Licenses');
  }

  XLSX.writeFile(wb, excelPath);

  console.log('');
  console.log('=== LICENSE KEY GENERATED ===');
  console.log('');
  console.log('License ID:  ', licenseData.licenseId);
  console.log('School:      ', licenseData.schoolName);
  console.log('Expiry Date: ', licenseData.expiryDate);
  console.log('Created At:  ', licenseData.createdAt);
  console.log('');
  console.log('LICENSE KEY:');
  console.log('');
  console.log(licenseKey);
  console.log('');
  console.log(`Saved to: ${excelPath}`);
  console.log('============================');
}

main();
