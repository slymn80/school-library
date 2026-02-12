import { app, BrowserWindow, ipcMain, dialog, nativeImage, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import Module from 'module';
import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'school-library-secret-key-2024';
const isDev = process.env.NODE_ENV !== 'production';

// ==========================================
// LICENSE SYSTEM
// ==========================================
const LICENSE_SECRET = 'SL-2024-K3y-S3cur3-Libr4ry-Mgmt!';
const LICENSE_ALGORITHM = 'aes-256-gcm';
const TRIAL_DAYS = 30;

interface LicenseData {
  licenseId: string;
  schoolName: string;
  expiryDate: string;
  createdAt: string;
  version: number;
}

interface LicenseFileData {
  licenseKey?: string;
  trialStartDate?: string;
  isActivated: boolean;
}

interface LicenseStatus {
  isValid: boolean;
  isTrial: boolean;
  isExpired: boolean;
  daysRemaining: number;
  schoolName?: string;
  expiryDate?: string;
  licenseId?: string;
}

function getLicenseFilePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'license.json');
}

function readLicenseFile(): LicenseFileData | null {
  try {
    const filePath = getLicenseFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    log(`Error reading license file: ${e}`);
  }
  return null;
}

function writeLicenseFile(data: LicenseFileData): void {
  try {
    const filePath = getLicenseFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    log(`Error writing license file: ${e}`);
  }
}

function decryptLicenseKey(licenseKey: string): LicenseData | null {
  try {
    const key = crypto.scryptSync(LICENSE_SECRET, 'school-library-salt', 32);
    const combined = Buffer.from(licenseKey, 'base64');

    const iv = combined.subarray(0, 16);
    const authTag = combined.subarray(16, 32);
    const encrypted = combined.subarray(32);

    const decipher = crypto.createDecipheriv(LICENSE_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (e) {
    log(`Error decrypting license key: ${e}`);
    return null;
  }
}

function getLicenseStatus(): LicenseStatus {
  const licenseFile = readLicenseFile();

  // First launch - create trial
  if (!licenseFile) {
    const trialData: LicenseFileData = {
      trialStartDate: new Date().toISOString(),
      isActivated: false,
    };
    writeLicenseFile(trialData);
    return {
      isValid: true,
      isTrial: true,
      isExpired: false,
      daysRemaining: TRIAL_DAYS,
    };
  }

  // Has license key - validate it
  if (licenseFile.isActivated && licenseFile.licenseKey) {
    const licenseData = decryptLicenseKey(licenseFile.licenseKey);
    if (!licenseData) {
      return {
        isValid: false,
        isTrial: false,
        isExpired: true,
        daysRemaining: 0,
      };
    }

    const expiryDate = new Date(licenseData.expiryDate + 'T23:59:59');
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      return {
        isValid: false,
        isTrial: false,
        isExpired: true,
        daysRemaining: 0,
        schoolName: licenseData.schoolName,
        expiryDate: licenseData.expiryDate,
        licenseId: licenseData.licenseId,
      };
    }

    return {
      isValid: true,
      isTrial: false,
      isExpired: false,
      daysRemaining,
      schoolName: licenseData.schoolName,
      expiryDate: licenseData.expiryDate,
      licenseId: licenseData.licenseId,
    };
  }

  // Trial mode
  if (licenseFile.trialStartDate) {
    const trialStart = new Date(licenseFile.trialStartDate);
    const now = new Date();
    const diffMs = now.getTime() - trialStart.getTime();
    const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const daysRemaining = TRIAL_DAYS - daysPassed;

    if (daysRemaining <= 0) {
      return {
        isValid: false,
        isTrial: true,
        isExpired: true,
        daysRemaining: 0,
      };
    }

    return {
      isValid: true,
      isTrial: true,
      isExpired: false,
      daysRemaining,
    };
  }

  // Fallback - invalid
  return {
    isValid: false,
    isTrial: false,
    isExpired: true,
    daysRemaining: 0,
  };
}

function activateLicense(licenseKey: string): { success: boolean; status?: LicenseStatus; error?: string } {
  const licenseData = decryptLicenseKey(licenseKey);

  if (!licenseData) {
    return { success: false, error: 'INVALID_KEY' };
  }

  const expiryDate = new Date(licenseData.expiryDate + 'T23:59:59');
  const now = new Date();
  if (expiryDate.getTime() < now.getTime()) {
    return { success: false, error: 'EXPIRED_KEY' };
  }

  const licenseFile = readLicenseFile() || { isActivated: false };
  licenseFile.licenseKey = licenseKey;
  licenseFile.isActivated = true;
  writeLicenseFile(licenseFile);

  return { success: true, status: getLicenseStatus() };
}

function deactivateLicense(): LicenseStatus {
  const licenseFile = readLicenseFile();
  if (licenseFile) {
    licenseFile.licenseKey = undefined;
    licenseFile.isActivated = false;
    writeLicenseFile(licenseFile);
  }
  return getLicenseStatus();
}

// Logging function for debugging
function getLogPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'app.log');
}

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    const logPath = getLogPath();
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(logPath, logMessage);
  } catch (e) {
    console.error('Failed to write log:', e);
  }
}

process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}\n${error.stack}`);
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled Rejection: ${reason}`);
});

let mainWindow: BrowserWindow | null = null;
type PrismaClientConstructor = new (...args: any[]) => PrismaClient;

let prisma: PrismaClient;
let PrismaClientCtor: PrismaClientConstructor | null = null;

function getPrismaClientCtor(): PrismaClientConstructor {
  if (PrismaClientCtor) {
    return PrismaClientCtor;
  }

  log(`App is packaged: ${app.isPackaged}`);
  log(`Resources path: ${process.resourcesPath}`);

  if (app.isPackaged) {
    const resourcesNodeModules = path.join(process.resourcesPath, 'node_modules');
    const unpackedNodeModules = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules');

    log(`Checking resourcesNodeModules: ${resourcesNodeModules} - exists: ${fs.existsSync(resourcesNodeModules)}`);
    log(`Checking unpackedNodeModules: ${unpackedNodeModules} - exists: ${fs.existsSync(unpackedNodeModules)}`);

    const extraPaths = [resourcesNodeModules, unpackedNodeModules].filter((p) => fs.existsSync(p));

    if (extraPaths.length > 0) {
      process.env.NODE_PATH = [process.env.NODE_PATH, ...extraPaths]
        .filter(Boolean)
        .join(path.delimiter);
      (Module as unknown as { _initPaths: () => void })._initPaths();
      log(`NODE_PATH set to: ${process.env.NODE_PATH}`);
    }
  }

  try {
    log('Loading Prisma client...');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    PrismaClientCtor = require('@prisma/client').PrismaClient as PrismaClientConstructor;
    log('Prisma client loaded successfully');
    return PrismaClientCtor;
  } catch (error: any) {
    log(`Failed to load Prisma client: ${error.message}\n${error.stack}`);
    throw error;
  }
}

function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'library.db');
}

async function initDatabase(): Promise<void> {
  log('Initializing database...');
  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);
  log(`Database path: ${dbPath}`);

  if (!fs.existsSync(dbDir)) {
    log(`Creating directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  process.env.DATABASE_URL = `file:${dbPath}`;
  log(`DATABASE_URL set to: ${process.env.DATABASE_URL}`);

  const PrismaClientClass = getPrismaClientCtor();
  log('Creating Prisma client instance...');
  prisma = new PrismaClientClass();
  log('Prisma client instance created');

  // Check if tables exist, if not create them
  try {
    await prisma.$queryRaw`SELECT 1 FROM User LIMIT 1`;
  } catch (error) {
    console.log('Database tables not found, creating schema...');
    // Create tables using raw SQL
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "username" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "fullName" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'LIBRARIAN',
        "mustChangePassword" INTEGER NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")`;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Category" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "nameKk" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Book" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "title" TEXT NOT NULL,
        "author" TEXT NOT NULL,
        "isbn" TEXT,
        "publisher" TEXT,
        "year" INTEGER,
        "categoryId" INTEGER NOT NULL,
        "shelfLocation" TEXT,
        "inventoryNumber" TEXT NOT NULL,
        "totalCopies" INTEGER NOT NULL DEFAULT 1,
        "availableCopies" INTEGER NOT NULL DEFAULT 1,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Book_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `;
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "Book_inventoryNumber_key" ON "Book"("inventoryNumber")`;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Student" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "fullName" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "grade" TEXT NOT NULL,
        "school" TEXT NOT NULL,
        "branch" TEXT,
        "phone" TEXT,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "Student_studentId_key" ON "Student"("studentId")`;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Loan" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "bookId" INTEGER NOT NULL,
        "studentId" INTEGER NOT NULL,
        "loanDate" DATETIME NOT NULL,
        "dueDate" DATETIME NOT NULL,
        "returnedAt" DATETIME,
        "fee" REAL NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Loan_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Loan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Settings" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "feePerDay" REAL NOT NULL DEFAULT 50,
        "schoolName" TEXT NOT NULL DEFAULT 'Школьная библиотека',
        "schoolNameKk" TEXT NOT NULL DEFAULT 'Мектеп кітапханасы',
        "schoolNameTr" TEXT NOT NULL DEFAULT 'Okul Kütüphanesi',
        "schoolNameEn" TEXT DEFAULT '',
        "schoolLogo" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Add schoolNameTr column if not exists (for existing databases)
    try {
      await prisma.$executeRaw`ALTER TABLE "Settings" ADD COLUMN "schoolNameTr" TEXT DEFAULT 'Talgar Özel 1 Nolu Yatılı Lisesi'`;
      console.log('Added schoolNameTr column');
    } catch (e) {
      // Column already exists, ignore error
    }

    // Update existing settings with default schoolNameTr if null
    try {
      await prisma.$executeRaw`UPDATE "Settings" SET "schoolNameTr" = 'Talgar Özel 1 Nolu Yatılı Lisesi' WHERE "schoolNameTr" IS NULL`;
    } catch (e) {
      // Ignore errors
    }

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "actorUserId" INTEGER NOT NULL,
        "actionType" TEXT NOT NULL,
        "entityType" TEXT NOT NULL,
        "entityId" INTEGER NOT NULL,
        "details" TEXT NOT NULL DEFAULT '{}',
        CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `;

    console.log('Database schema created successfully');
  }

  // Run migrations for existing databases (outside of catch block)
  // Add schoolNameTr column if not exists
  try {
    await prisma.$executeRaw`ALTER TABLE "Settings" ADD COLUMN "schoolNameTr" TEXT DEFAULT 'Talgar Özel 1 Nolu Yatılı Lisesi'`;
    console.log('Added schoolNameTr column to existing database');
  } catch (e) {
    // Column already exists, ignore error
  }

  // Add schoolNameEn column if not exists
  try {
    await prisma.$executeRaw`ALTER TABLE "Settings" ADD COLUMN "schoolNameEn" TEXT DEFAULT ''`;
    console.log('Added schoolNameEn column to existing database');
  } catch (e) {
    // Column already exists, ignore error
  }

  // Add schoolLogo column if not exists
  try {
    await prisma.$executeRaw`ALTER TABLE "Settings" ADD COLUMN "schoolLogo" TEXT`;
    console.log('Added schoolLogo column to existing database');
  } catch (e) {
    // Column already exists, ignore error
  }

  // Add auto backup columns if not exists
  try {
    await prisma.$executeRaw`ALTER TABLE "Settings" ADD COLUMN "autoBackupEnabled" INTEGER DEFAULT 0`;
    console.log('Added autoBackupEnabled column');
  } catch (e) {
    // Column already exists
  }

  try {
    await prisma.$executeRaw`ALTER TABLE "Settings" ADD COLUMN "autoBackupInterval" INTEGER DEFAULT 7`;
    console.log('Added autoBackupInterval column');
  } catch (e) {
    // Column already exists
  }

  try {
    await prisma.$executeRaw`ALTER TABLE "Settings" ADD COLUMN "autoBackupPath" TEXT`;
    console.log('Added autoBackupPath column');
  } catch (e) {
    // Column already exists
  }

  try {
    await prisma.$executeRaw`ALTER TABLE "Settings" ADD COLUMN "lastAutoBackup" DATETIME`;
    console.log('Added lastAutoBackup column');
  } catch (e) {
    // Column already exists
  }

  // Add backup history columns
  try {
    await prisma.$executeRaw`ALTER TABLE "Settings" ADD COLUMN "manualBackupHistory" TEXT DEFAULT '[]'`;
    console.log('Added manualBackupHistory column');
  } catch (e) {
    // Column already exists
  }

  try {
    await prisma.$executeRaw`ALTER TABLE "Settings" ADD COLUMN "restoreHistory" TEXT DEFAULT '[]'`;
    console.log('Added restoreHistory column');
  } catch (e) {
    // Column already exists
  }

  try {
    await prisma.$executeRaw`ALTER TABLE "Settings" ADD COLUMN "autoBackupHistory" TEXT DEFAULT '[]'`;
    console.log('Added autoBackupHistory column');
  } catch (e) {
    // Column already exists
  }

  // Add language column to Book if not exists
  try {
    await prisma.$executeRaw`ALTER TABLE "Book" ADD COLUMN "language" TEXT DEFAULT 'ru'`;
    console.log('Added language column to Book');
  } catch (e) {
    // Column already exists
  }

  // Add rewardPoints column to Student if not exists
  try {
    await prisma.$executeRaw`ALTER TABLE "Student" ADD COLUMN "rewardPoints" INTEGER DEFAULT 0`;
    console.log('Added rewardPoints column to Student');
  } catch (e) {
    // Column already exists
  }

  // Add donated book columns to Book if not exists
  try {
    await prisma.$executeRaw`ALTER TABLE "Book" ADD COLUMN "isDonated" INTEGER DEFAULT 0`;
    console.log('Added isDonated column to Book');
  } catch (e) {
    // Column already exists
  }

  try {
    await prisma.$executeRaw`ALTER TABLE "Book" ADD COLUMN "donorName" TEXT`;
    console.log('Added donorName column to Book');
  } catch (e) {
    // Column already exists
  }

  try {
    await prisma.$executeRaw`ALTER TABLE "Book" ADD COLUMN "donationDate" DATETIME`;
    console.log('Added donationDate column to Book');
  } catch (e) {
    // Column already exists
  }

  // Add coverImage column to Book
  try {
    await prisma.$executeRaw`ALTER TABLE "Book" ADD COLUMN "coverImage" TEXT`;
    console.log('Added coverImage column to Book');
  } catch (e) {
    // Column already exists
  }

  // Add acquisitionType column to Book
  try {
    await prisma.$executeRaw`ALTER TABLE "Book" ADD COLUMN "acquisitionType" TEXT DEFAULT 'purchase'`;
    console.log('Added acquisitionType column to Book');
  } catch (e) {
    // Column already exists
  }

  // Add acquisitionDate column to Book
  try {
    await prisma.$executeRaw`ALTER TABLE "Book" ADD COLUMN "acquisitionDate" DATETIME`;
    console.log('Added acquisitionDate column to Book');
  } catch (e) {
    // Column already exists
  }

  // Add condition column to Book
  try {
    await prisma.$executeRaw`ALTER TABLE "Book" ADD COLUMN "condition" TEXT DEFAULT 'good'`;
    console.log('Added condition column to Book');
  } catch (e) {
    // Column already exists
  }

  // Add photo column to Student
  try {
    await prisma.$executeRaw`ALTER TABLE "Student" ADD COLUMN "photo" TEXT`;
    console.log('Added photo column to Student');
  } catch (e) {
    // Column already exists
  }

  // Create Reservation table
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Reservation" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "bookId" INTEGER NOT NULL,
        "studentId" INTEGER NOT NULL,
        "requestDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "status" TEXT NOT NULL DEFAULT 'waiting',
        "notifiedAt" DATETIME,
        "expiresAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Reservation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Reservation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `;
    console.log('Created Reservation table');
  } catch (e) {
    // Table already exists
  }

  // Add nameTr column to Category if not exists
  try {
    await prisma.$executeRaw`ALTER TABLE "Category" ADD COLUMN "nameTr" TEXT`;
    console.log('Added nameTr column to Category');
  } catch (e) {
    // Column already exists
  }

  // Create Favorite table
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Favorite" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "bookId" INTEGER NOT NULL,
        "studentId" INTEGER NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Favorite_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Favorite_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `;
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_bookId_studentId_key" ON "Favorite"("bookId", "studentId")`;
    console.log('Created Favorite table');
  } catch (e) {
    // Table already exists
  }

  // Add academicYear column to Settings if not exists
  try {
    await prisma.$executeRaw`ALTER TABLE "Settings" ADD COLUMN "academicYear" TEXT DEFAULT '2025-2026'`;
    console.log('Added academicYear column to Settings');
  } catch (e) {
    // Column already exists
  }

  // ==========================================
  // TEXTBOOK DISTRIBUTION MODULE TABLES
  // ==========================================

  // Create Teacher table
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Teacher" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "fullName" TEXT NOT NULL,
        "phone" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('Created Teacher table');
  } catch (e) {
    // Table already exists
  }

  // Create Branch table
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Branch" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "grade" INTEGER NOT NULL,
        "teacherId" INTEGER,
        "studentCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Branch_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `;
    console.log('Created Branch table');
  } catch (e) {
    // Table already exists
  }

  // Create Textbook table
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Textbook" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "author" TEXT,
        "title" TEXT NOT NULL,
        "publicationType" TEXT,
        "direction" TEXT,
        "publisher" TEXT,
        "yearPublished" INTEGER,
        "isbn" TEXT,
        "price" REAL,
        "language" TEXT,
        "gradeFrom" INTEGER NOT NULL DEFAULT 1,
        "gradeTo" INTEGER,
        "totalStock" INTEGER NOT NULL DEFAULT 0,
        "subject" TEXT NOT NULL,
        "availableStock" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "grade" INTEGER NOT NULL DEFAULT 1
      )
    `;
    console.log('Created Textbook table');
  } catch (e) {
    // Table already exists
  }

  // Add missing columns to Textbook table (for databases created with older schema)
  const textbookColumns = [
    { name: 'author', sql: `ALTER TABLE "Textbook" ADD COLUMN "author" TEXT` },
    { name: 'publicationType', sql: `ALTER TABLE "Textbook" ADD COLUMN "publicationType" TEXT` },
    { name: 'direction', sql: `ALTER TABLE "Textbook" ADD COLUMN "direction" TEXT` },
    { name: 'publisher', sql: `ALTER TABLE "Textbook" ADD COLUMN "publisher" TEXT` },
    { name: 'yearPublished', sql: `ALTER TABLE "Textbook" ADD COLUMN "yearPublished" INTEGER` },
    { name: 'isbn', sql: `ALTER TABLE "Textbook" ADD COLUMN "isbn" TEXT` },
    { name: 'price', sql: `ALTER TABLE "Textbook" ADD COLUMN "price" REAL` },
    { name: 'language', sql: `ALTER TABLE "Textbook" ADD COLUMN "language" TEXT` },
    { name: 'gradeFrom', sql: `ALTER TABLE "Textbook" ADD COLUMN "gradeFrom" INTEGER NOT NULL DEFAULT 1` },
    { name: 'gradeTo', sql: `ALTER TABLE "Textbook" ADD COLUMN "gradeTo" INTEGER` },
    { name: 'totalStock', sql: `ALTER TABLE "Textbook" ADD COLUMN "totalStock" INTEGER NOT NULL DEFAULT 0` },
    { name: 'subject', sql: `ALTER TABLE "Textbook" ADD COLUMN "subject" TEXT NOT NULL DEFAULT ''` },
    { name: 'availableStock', sql: `ALTER TABLE "Textbook" ADD COLUMN "availableStock" INTEGER NOT NULL DEFAULT 0` },
  ];
  for (const col of textbookColumns) {
    try {
      await prisma.$executeRawUnsafe(col.sql);
      console.log(`Added ${col.name} column to Textbook`);
    } catch (e) {
      // Column already exists, ignore
    }
  }

  // Create TextbookSet table
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "TextbookSet" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "grade" INTEGER NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('Created TextbookSet table');
  } catch (e) {
    // Table already exists
  }

  // Create TextbookSetItem table
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "TextbookSetItem" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "setId" INTEGER NOT NULL,
        "textbookId" INTEGER NOT NULL,
        CONSTRAINT "TextbookSetItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "TextbookSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "TextbookSetItem_textbookId_fkey" FOREIGN KEY ("textbookId") REFERENCES "Textbook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `;
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "TextbookSetItem_setId_textbookId_key" ON "TextbookSetItem"("setId", "textbookId")`;
    console.log('Created TextbookSetItem table');
  } catch (e) {
    // Table already exists
  }

  // Create TextbookDistribution table
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "TextbookDistribution" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "branchId" INTEGER NOT NULL,
        "setId" INTEGER NOT NULL,
        "academicYear" TEXT NOT NULL,
        "distributedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "returnedAt" DATETIME,
        "status" TEXT NOT NULL DEFAULT 'distributed',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TextbookDistribution_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "TextbookDistribution_setId_fkey" FOREIGN KEY ("setId") REFERENCES "TextbookSet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `;
    console.log('Created TextbookDistribution table');
  } catch (e) {
    // Table already exists
  }

  // Create TextbookDistributionDetail table
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "TextbookDistributionDetail" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "distributionId" INTEGER NOT NULL,
        "textbookId" INTEGER NOT NULL,
        "distributedQty" INTEGER NOT NULL,
        "returnedQty" INTEGER NOT NULL DEFAULT 0,
        "missingQty" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "TextbookDistributionDetail_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "TextbookDistribution" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "TextbookDistributionDetail_textbookId_fkey" FOREIGN KEY ("textbookId") REFERENCES "Textbook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `;
    console.log('Created TextbookDistributionDetail table');
  } catch (e) {
    // Table already exists
  }

  // Add notes column to TextbookDistribution if not exists
  try {
    await prisma.$executeRaw`ALTER TABLE "TextbookDistribution" ADD COLUMN "notes" TEXT`;
    console.log('Added notes column to TextbookDistribution');
  } catch (e) {
    // Column already exists
  }

  // Add returnNotes column to TextbookDistribution if not exists
  try {
    await prisma.$executeRaw`ALTER TABLE "TextbookDistribution" ADD COLUMN "returnNotes" TEXT`;
    console.log('Added returnNotes column to TextbookDistribution');
  } catch (e) {
    // Column already exists
  }

  // Add new columns to Textbook table for 13-field structure
  try {
    await prisma.$executeRaw`ALTER TABLE "Textbook" ADD COLUMN "author" TEXT`;
    console.log('Added author column to Textbook');
  } catch (e) {
    // Column already exists
  }

  try {
    await prisma.$executeRaw`ALTER TABLE "Textbook" ADD COLUMN "publicationType" TEXT`;
    console.log('Added publicationType column to Textbook');
  } catch (e) {
    // Column already exists
  }

  try {
    await prisma.$executeRaw`ALTER TABLE "Textbook" ADD COLUMN "direction" TEXT`;
    console.log('Added direction column to Textbook');
  } catch (e) {
    // Column already exists
  }

  try {
    await prisma.$executeRaw`ALTER TABLE "Textbook" ADD COLUMN "yearPublished" INTEGER`;
    console.log('Added yearPublished column to Textbook');
  } catch (e) {
    // Column already exists
  }

  try {
    await prisma.$executeRaw`ALTER TABLE "Textbook" ADD COLUMN "price" REAL`;
    console.log('Added price column to Textbook');
  } catch (e) {
    // Column already exists
  }

  try {
    await prisma.$executeRaw`ALTER TABLE "Textbook" ADD COLUMN "language" TEXT`;
    console.log('Added language column to Textbook');
  } catch (e) {
    // Column already exists
  }

  // Rename grade to gradeFrom (SQLite doesn't support RENAME COLUMN in older versions, so we copy data)
  try {
    await prisma.$executeRaw`ALTER TABLE "Textbook" ADD COLUMN "gradeFrom" INTEGER NOT NULL DEFAULT 1`;
    await prisma.$executeRaw`UPDATE "Textbook" SET "gradeFrom" = "grade" WHERE "grade" IS NOT NULL`;
    console.log('Added gradeFrom column to Textbook');
  } catch (e) {
    // Column already exists
  }

  try {
    await prisma.$executeRaw`ALTER TABLE "Textbook" ADD COLUMN "gradeTo" INTEGER`;
    console.log('Added gradeTo column to Textbook');
  } catch (e) {
    // Column already exists
  }

  // Create IndividualTextbookDistribution table
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "IndividualTextbookDistribution" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "textbookId" INTEGER NOT NULL,
        "recipientType" TEXT NOT NULL,
        "recipientId" INTEGER NOT NULL,
        "recipientName" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "academicYear" TEXT NOT NULL,
        "distributedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "returnedAt" DATETIME,
        "returnedQty" INTEGER NOT NULL DEFAULT 0,
        "missingQty" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'distributed',
        "notes" TEXT,
        "returnNotes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "IndividualTextbookDistribution_textbookId_fkey" FOREIGN KEY ("textbookId") REFERENCES "Textbook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `;
    console.log('Created IndividualTextbookDistribution table');
  } catch (e) {
    // Table already exists
  }

  // ==========================================
  // CERTIFICATE AWARD MODULE
  // ==========================================

  // Create CertificateAward table
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "CertificateAward" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "type" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "rank" INTEGER NOT NULL,
        "awardee" TEXT NOT NULL,
        "awardeeId" INTEGER,
        "grade" TEXT,
        "booksRead" INTEGER NOT NULL,
        "period" TEXT NOT NULL,
        "academicYear" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('Created CertificateAward table');
  } catch (e) {
    // Table already exists
  }

  // ==========================================
  // LIBRARY EVENTS MODULE
  // ==========================================

  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "LibraryEvent" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "title" TEXT NOT NULL,
        "topic" TEXT,
        "eventDate" DATETIME NOT NULL,
        "eventTime" TEXT,
        "participants" TEXT,
        "content" TEXT,
        "notes" TEXT,
        "photo" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdBy" INTEGER
      )
    `;
    console.log('Created LibraryEvent table');
  } catch (e) {
    // Table already exists
  }

  // Add principalName column to Settings
  try {
    await prisma.$executeRaw`ALTER TABLE "Settings" ADD COLUMN "principalName" TEXT`;
    console.log('Added principalName column to Settings');
  } catch (e) {
    // Column already exists
  }

  // Add librarianName column to Settings
  try {
    await prisma.$executeRaw`ALTER TABLE "Settings" ADD COLUMN "librarianName" TEXT`;
    console.log('Added librarianName column to Settings');
  } catch (e) {
    // Column already exists
  }
}

async function createWindow(): Promise<void> {
  // Determine icon path based on environment
  let iconPath: string;
  if (app.isPackaged) {
    iconPath = path.join(process.resourcesPath, 'icon.png');
  } else {
    iconPath = path.join(__dirname, '../public/icon.png');
  }
  log(`Using icon path: ${iconPath}`);

  // Create native image for icon
  let appIcon;
  try {
    if (fs.existsSync(iconPath)) {
      appIcon = nativeImage.createFromPath(iconPath);
      log(`Icon loaded successfully, size: ${appIcon.getSize().width}x${appIcon.getSize().height}`);
    } else {
      log(`Icon file not found: ${iconPath}`);
    }
  } catch (e) {
    log(`Failed to load icon: ${e}`);
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: appIcon || iconPath,
    show: false,
  });

  // Set icon explicitly for Windows
  if (appIcon && process.platform === 'win32') {
    mainWindow.setIcon(appIcon);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    log(`Loading index.html from: ${indexPath}`);
    mainWindow.loadFile(indexPath);
  }

  // Log any page errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`Page failed to load: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    log(`Console [${level}]: ${message}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize database and create default admin if needed
async function initializeApp(): Promise<void> {
  await initDatabase();

  try {
    // Check if admin exists
    const adminExists = await prisma.user.findFirst({
      where: { username: 'admin' },
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          fullName: 'Administrator',
          role: 'ADMIN',
          mustChangePassword: true,
        },
      });
      console.log('Default admin user created');
    }

    // Create default categories if none exist
    const categoriesExist = await prisma.category.findFirst();
    if (!categoriesExist) {
      await prisma.category.createMany({
        data: [
          { name: 'Художественная литература', nameKk: 'Көркем әдебиет' },
          { name: 'Учебники', nameKk: 'Оқулықтар' },
          { name: 'Научная литература', nameKk: 'Ғылыми әдебиет' },
          { name: 'Энциклопедии', nameKk: 'Энциклопедиялар' },
          { name: 'Детская литература', nameKk: 'Балалар әдебиеті' },
        ],
      });
      console.log('Default categories created');
    }

    // Create default settings if none exist
    const settingsExist = await prisma.settings.findFirst();
    if (!settingsExist) {
      await prisma.settings.create({
        data: {
          feePerDay: 50,
          schoolName: 'Талгарский частный лицей-интернат №1',
          schoolNameKk: 'Талғар №1 жекеменшік мектеп-интернаты',
          schoolNameTr: 'Talgar Özel 1 Nolu Yatılı Lisesi',
        },
      });
      console.log('Default settings created');
    }
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

log('App starting...');

app.whenReady().then(async () => {
  log('App is ready');

  // Remove default menu (File, Edit, View, etc.)
  Menu.setApplicationMenu(null);

  try {
    await initializeApp();
    log('App initialized, creating window...');
    await createWindow();
    log('Window created');

    // Start auto backup scheduler
    startAutoBackupScheduler();
    log('Auto backup scheduler started');
  } catch (error: any) {
    log(`Fatal error during startup: ${error.message}\n${error.stack}`);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    prisma.$disconnect();
    app.quit();
  }
});

// IPC Handlers

// Auth handlers
ipcMain.handle('auth:login', async (_, username: string, password: string) => {
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return { success: false, error: 'USER_NOT_FOUND' };
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return { success: false, error: 'INVALID_PASSWORD' };
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actionType: 'LOGIN',
        entityType: 'USER',
        entityId: user.id,
        details: JSON.stringify({ username: user.username }),
      },
    });

    return {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'LOGIN_ERROR' };
  }
});

ipcMain.handle('auth:changePassword', async (_, userId: number, oldPassword: string, newPassword: string) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: 'USER_NOT_FOUND' };
    }

    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) {
      return { success: false, error: 'INVALID_PASSWORD' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'CHANGE_PASSWORD',
        entityType: 'USER',
        entityId: userId,
        details: JSON.stringify({ username: user.username }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: 'CHANGE_PASSWORD_ERROR' };
  }
});

// Books handlers
ipcMain.handle('books:getAll', async (_, filters?: {
  search?: string;
  categoryId?: number;
  categoryIds?: number[];
  yearFrom?: number;
  yearTo?: number;
  isDonated?: boolean;
  condition?: string;
  acquisitionType?: string;
}) => {
  try {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { author: { contains: filters.search } },
        { isbn: { contains: filters.search } },
        { inventoryNumber: { contains: filters.search } },
      ];
    }
    // Support both single categoryId and multiple categoryIds
    if (filters?.categoryIds && filters.categoryIds.length > 0) {
      where.categoryId = { in: filters.categoryIds };
    } else if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }
    // Year range filter
    if (filters?.yearFrom || filters?.yearTo) {
      where.year = {};
      if (filters.yearFrom) {
        where.year.gte = filters.yearFrom;
      }
      if (filters.yearTo) {
        where.year.lte = filters.yearTo;
      }
    }
    // Donated books filter (legacy - checks acquisitionType)
    if (filters?.isDonated !== undefined && filters.isDonated) {
      where.acquisitionType = { in: ['donation', 'grant'] };
    }
    // Condition filter
    if (filters?.condition) {
      where.condition = filters.condition;
    }
    // Acquisition type filter
    if (filters?.acquisitionType) {
      where.acquisitionType = filters.acquisitionType;
    }

    const books = await prisma.book.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: books };
  } catch (error) {
    console.error('Get books error:', error);
    return { success: false, error: 'GET_BOOKS_ERROR' };
  }
});

ipcMain.handle('books:getById', async (_, id: number) => {
  try {
    const book = await prisma.book.findUnique({
      where: { id },
      include: { category: true },
    });
    return { success: true, data: book };
  } catch (error) {
    console.error('Get book error:', error);
    return { success: false, error: 'GET_BOOK_ERROR' };
  }
});

ipcMain.handle('books:create', async (_, data: any, userId: number) => {
  try {
    const existingBook = await prisma.book.findUnique({
      where: { inventoryNumber: data.inventoryNumber },
    });
    if (existingBook) {
      return { success: false, error: 'INVENTORY_NUMBER_EXISTS' };
    }

    const book = await prisma.book.create({
      data: {
        ...data,
        availableCopies: data.totalCopies,
      },
      include: { category: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'CREATE',
        entityType: 'BOOK',
        entityId: book.id,
        details: JSON.stringify({ title: book.title, inventoryNumber: book.inventoryNumber }),
      },
    });

    return { success: true, data: book };
  } catch (error) {
    console.error('Create book error:', error);
    return { success: false, error: 'CREATE_BOOK_ERROR' };
  }
});

ipcMain.handle('books:update', async (_, id: number, data: any, userId: number) => {
  try {
    if (data.inventoryNumber) {
      const existingBook = await prisma.book.findFirst({
        where: { inventoryNumber: data.inventoryNumber, id: { not: id } },
      });
      if (existingBook) {
        return { success: false, error: 'INVENTORY_NUMBER_EXISTS' };
      }
    }

    const book = await prisma.book.update({
      where: { id },
      data,
      include: { category: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'UPDATE',
        entityType: 'BOOK',
        entityId: book.id,
        details: JSON.stringify({ title: book.title, inventoryNumber: book.inventoryNumber }),
      },
    });

    return { success: true, data: book };
  } catch (error) {
    console.error('Update book error:', error);
    return { success: false, error: 'UPDATE_BOOK_ERROR' };
  }
});

ipcMain.handle('books:delete', async (_, id: number, userId: number) => {
  try {
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) {
      return { success: false, error: 'BOOK_NOT_FOUND' };
    }

    // Check for active loans
    const activeLoans = await prisma.loan.findFirst({
      where: { bookId: id, returnedAt: null },
    });
    if (activeLoans) {
      return { success: false, error: 'BOOK_HAS_ACTIVE_LOANS' };
    }

    await prisma.book.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'DELETE',
        entityType: 'BOOK',
        entityId: id,
        details: JSON.stringify({ title: book.title, inventoryNumber: book.inventoryNumber }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Delete book error:', error);
    return { success: false, error: 'DELETE_BOOK_ERROR' };
  }
});

// Categories handlers
ipcMain.handle('categories:getAll', async () => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return { success: true, data: categories };
  } catch (error) {
    console.error('Get categories error:', error);
    return { success: false, error: 'GET_CATEGORIES_ERROR' };
  }
});

ipcMain.handle('categories:create', async (_, data: { name: string; nameKk: string; nameTr?: string }, userId: number) => {
  try {
    const category = await prisma.category.create({ data });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'CREATE',
        entityType: 'CATEGORY',
        entityId: category.id,
        details: JSON.stringify({ name: category.name }),
      },
    });

    return { success: true, data: category };
  } catch (error) {
    console.error('Create category error:', error);
    return { success: false, error: 'CREATE_CATEGORY_ERROR' };
  }
});

// Students handlers
ipcMain.handle('students:getAll', async (_, filters?: { search?: string; grade?: string }) => {
  try {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { fullName: { contains: filters.search } },
        { studentId: { contains: filters.search } },
      ];
    }
    if (filters?.grade) {
      where.grade = filters.grade;
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { fullName: 'asc' },
    });
    return { success: true, data: students };
  } catch (error) {
    console.error('Get students error:', error);
    return { success: false, error: 'GET_STUDENTS_ERROR' };
  }
});

ipcMain.handle('students:getById', async (_, id: number) => {
  try {
    const student = await prisma.student.findUnique({ where: { id } });
    return { success: true, data: student };
  } catch (error) {
    console.error('Get student error:', error);
    return { success: false, error: 'GET_STUDENT_ERROR' };
  }
});

ipcMain.handle('students:create', async (_, data: any, userId: number) => {
  try {
    const existingStudent = await prisma.student.findUnique({
      where: { studentId: data.studentId },
    });
    if (existingStudent) {
      return { success: false, error: 'STUDENT_ID_EXISTS' };
    }

    const student = await prisma.student.create({ data });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'CREATE',
        entityType: 'STUDENT',
        entityId: student.id,
        details: JSON.stringify({ fullName: student.fullName, studentId: student.studentId }),
      },
    });

    return { success: true, data: student };
  } catch (error) {
    console.error('Create student error:', error);
    return { success: false, error: 'CREATE_STUDENT_ERROR' };
  }
});

ipcMain.handle('students:update', async (_, id: number, data: any, userId: number) => {
  try {
    if (data.studentId) {
      const existingStudent = await prisma.student.findFirst({
        where: { studentId: data.studentId, id: { not: id } },
      });
      if (existingStudent) {
        return { success: false, error: 'STUDENT_ID_EXISTS' };
      }
    }

    const student = await prisma.student.update({
      where: { id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'UPDATE',
        entityType: 'STUDENT',
        entityId: student.id,
        details: JSON.stringify({ fullName: student.fullName, studentId: student.studentId }),
      },
    });

    return { success: true, data: student };
  } catch (error) {
    console.error('Update student error:', error);
    return { success: false, error: 'UPDATE_STUDENT_ERROR' };
  }
});

ipcMain.handle('students:delete', async (_, id: number, userId: number) => {
  try {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return { success: false, error: 'STUDENT_NOT_FOUND' };
    }

    // Check for active loans
    const activeLoans = await prisma.loan.findFirst({
      where: { studentId: id, returnedAt: null },
    });
    if (activeLoans) {
      return { success: false, error: 'STUDENT_HAS_ACTIVE_LOANS' };
    }

    await prisma.student.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'DELETE',
        entityType: 'STUDENT',
        entityId: id,
        details: JSON.stringify({ fullName: student.fullName, studentId: student.studentId }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Delete student error:', error);
    return { success: false, error: 'DELETE_STUDENT_ERROR' };
  }
});

// Loans handlers
ipcMain.handle('loans:getAll', async (_, filters?: { status?: string; studentId?: number }) => {
  try {
    const where: any = {};
    if (filters?.status === 'active') {
      where.returnedAt = null;
    } else if (filters?.status === 'returned') {
      where.returnedAt = { not: null };
    } else if (filters?.status === 'overdue') {
      where.returnedAt = null;
      where.dueDate = { lt: new Date() };
    }
    if (filters?.studentId) {
      where.studentId = filters.studentId;
    }

    const loans = await prisma.loan.findMany({
      where,
      include: {
        book: { include: { category: true } },
        student: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: loans };
  } catch (error) {
    console.error('Get loans error:', error);
    return { success: false, error: 'GET_LOANS_ERROR' };
  }
});

ipcMain.handle('loans:create', async (_, data: any, userId: number) => {
  try {
    const book = await prisma.book.findUnique({ where: { id: data.bookId } });
    if (!book) {
      return { success: false, error: 'BOOK_NOT_FOUND' };
    }
    if (book.availableCopies <= 0) {
      return { success: false, error: 'BOOK_NOT_AVAILABLE' };
    }

    const student = await prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student) {
      return { success: false, error: 'STUDENT_NOT_FOUND' };
    }

    const loan = await prisma.loan.create({
      data: {
        bookId: data.bookId,
        studentId: data.studentId,
        loanDate: new Date(data.loanDate),
        dueDate: new Date(data.dueDate),
      },
      include: {
        book: { include: { category: true } },
        student: true,
      },
    });

    await prisma.book.update({
      where: { id: data.bookId },
      data: { availableCopies: { decrement: 1 } },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'CREATE',
        entityType: 'LOAN',
        entityId: loan.id,
        details: JSON.stringify({
          book: book.title,
          student: student.fullName,
          dueDate: data.dueDate,
        }),
      },
    });

    return { success: true, data: loan };
  } catch (error) {
    console.error('Create loan error:', error);
    return { success: false, error: 'CREATE_LOAN_ERROR' };
  }
});

ipcMain.handle('loans:return', async (_, id: number, userId: number) => {
  try {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { book: true, student: true },
    });
    if (!loan) {
      return { success: false, error: 'LOAN_NOT_FOUND' };
    }
    if (loan.returnedAt) {
      return { success: false, error: 'LOAN_ALREADY_RETURNED' };
    }

    const returnedAt = new Date();
    let fee = 0;
    let rewardPointsEarned = 0;

    if (returnedAt > loan.dueDate) {
      const settings = await prisma.settings.findFirst();
      const feePerDay = settings?.feePerDay || 50;
      const overdueDays = Math.ceil(
        (returnedAt.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      fee = overdueDays * feePerDay;
      // Late return: 5 points (still some credit for returning)
      rewardPointsEarned = 5;
    } else {
      // On-time return: 10 points
      rewardPointsEarned = 10;
    }

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: { returnedAt, fee },
      include: {
        book: { include: { category: true } },
        student: true,
      },
    });

    await prisma.book.update({
      where: { id: loan.bookId },
      data: { availableCopies: { increment: 1 } },
    });

    // Award reward points to student
    await prisma.student.update({
      where: { id: loan.studentId },
      data: { rewardPoints: { increment: rewardPointsEarned } },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'RETURN',
        entityType: 'LOAN',
        entityId: loan.id,
        details: JSON.stringify({
          book: loan.book.title,
          student: loan.student.fullName,
          fee,
          rewardPointsEarned,
        }),
      },
    });

    return { success: true, data: { ...updatedLoan, rewardPointsEarned } };
  } catch (error) {
    console.error('Return loan error:', error);
    return { success: false, error: 'RETURN_LOAN_ERROR' };
  }
});

// Users handlers (Admin only)
ipcMain.handle('users:getAll', async () => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: users };
  } catch (error) {
    console.error('Get users error:', error);
    return { success: false, error: 'GET_USERS_ERROR' };
  }
});

ipcMain.handle('users:create', async (_, data: any, actorUserId: number) => {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existingUser) {
      return { success: false, error: 'USERNAME_EXISTS' };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        fullName: data.fullName,
        role: data.role,
        mustChangePassword: true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId,
        actionType: 'CREATE',
        entityType: 'USER',
        entityId: user.id,
        details: JSON.stringify({ username: user.username, role: user.role }),
      },
    });

    return { success: true, data: user };
  } catch (error) {
    console.error('Create user error:', error);
    return { success: false, error: 'CREATE_USER_ERROR' };
  }
});

ipcMain.handle('users:update', async (_, id: number, data: any, actorUserId: number) => {
  try {
    if (data.username) {
      const existingUser = await prisma.user.findFirst({
        where: { username: data.username, id: { not: id } },
      });
      if (existingUser) {
        return { success: false, error: 'USERNAME_EXISTS' };
      }
    }

    const updateData: any = {
      username: data.username,
      fullName: data.fullName,
      role: data.role,
    };

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId,
        actionType: 'UPDATE',
        entityType: 'USER',
        entityId: user.id,
        details: JSON.stringify({ username: user.username }),
      },
    });

    return { success: true, data: user };
  } catch (error) {
    console.error('Update user error:', error);
    return { success: false, error: 'UPDATE_USER_ERROR' };
  }
});

ipcMain.handle('users:resetPassword', async (_, id: number, newPassword: string, actorUserId: number) => {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword, mustChangePassword: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId,
        actionType: 'RESET_PASSWORD',
        entityType: 'USER',
        entityId: id,
        details: JSON.stringify({}),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, error: 'RESET_PASSWORD_ERROR' };
  }
});

ipcMain.handle('users:delete', async (_, id: number, actorUserId: number) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return { success: false, error: 'USER_NOT_FOUND' };
    }
    if (user.username === 'admin') {
      return { success: false, error: 'CANNOT_DELETE_ADMIN' };
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId,
        actionType: 'DELETE',
        entityType: 'USER',
        entityId: id,
        details: JSON.stringify({ username: user.username }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Delete user error:', error);
    return { success: false, error: 'DELETE_USER_ERROR' };
  }
});

// Settings handlers
ipcMain.handle('settings:get', async () => {
  try {
    // Use raw query to get all columns including dynamically added ones
    const settings = await prisma.$queryRaw`SELECT * FROM "Settings" LIMIT 1`;
    const settingsData = Array.isArray(settings) && settings.length > 0 ? settings[0] : null;
    return { success: true, data: settingsData };
  } catch (error) {
    console.error('Get settings error:', error);
    return { success: false, error: 'GET_SETTINGS_ERROR' };
  }
});

ipcMain.handle('settings:update', async (_, data: any, userId: number) => {
  try {
    // Remove non-updatable fields that may come from the frontend
    const { id, createdAt, updatedAt, ...updateData } = data;

    const existingSettings = await prisma.settings.findFirst();
    let settings;

    if (existingSettings) {
      settings = await prisma.settings.update({
        where: { id: existingSettings.id },
        data: updateData,
      });
    } else {
      settings = await prisma.settings.create({ data: updateData });
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'UPDATE',
        entityType: 'SETTINGS',
        entityId: settings.id,
        details: JSON.stringify(data),
      },
    });

    return { success: true, data: settings };
  } catch (error) {
    console.error('Update settings error:', error);
    return { success: false, error: 'UPDATE_SETTINGS_ERROR' };
  }
});

// Audit log handlers
ipcMain.handle('audit:getAll', async (_, filters?: { actionType?: string; entityType?: string }) => {
  try {
    const where: any = {};
    if (filters?.actionType) {
      where.actionType = filters.actionType;
    }
    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        actorUser: {
          select: { id: true, username: true, fullName: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 500,
    });
    return { success: true, data: logs };
  } catch (error) {
    console.error('Get audit logs error:', error);
    return { success: false, error: 'GET_AUDIT_LOGS_ERROR' };
  }
});

// Backup handlers
ipcMain.handle('backup:create', async (_, userId?: number) => {
  try {
    const dbPath = getDbPath();
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Сохранить резервную копию',
      defaultPath: `library-backup-${new Date().toISOString().split('T')[0]}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'BACKUP_CANCELED' };
    }

    fs.copyFileSync(dbPath, result.filePath);
    log(`Manual backup created: ${result.filePath}`);

    // Add to manual backup history
    addToBackupHistory('manualBackups', {
      date: new Date().toISOString(),
      path: result.filePath,
    });

    // Add audit log
    if (userId) {
      await prisma.auditLog.create({
        data: {
          actorUserId: userId,
          actionType: 'CREATE',
          entityType: 'BACKUP',
          entityId: 0,
          details: JSON.stringify({ path: result.filePath, type: 'manual' }),
        },
      });
      log('Audit log created for backup');
    }

    return { success: true, data: { path: result.filePath } };
  } catch (error) {
    console.error('Create backup error:', error);
    return { success: false, error: 'CREATE_BACKUP_ERROR' };
  }
});

ipcMain.handle('backup:restore', async (_, userId?: number) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Восстановить из резервной копии',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'RESTORE_CANCELED' };
    }

    const sourcePath = result.filePaths[0];
    const dbPath = getDbPath();

    // Disconnect and reconnect after restore
    await prisma.$disconnect();
    fs.copyFileSync(sourcePath, dbPath);
    const PrismaClientClass = getPrismaClientCtor();
    prisma = new PrismaClientClass();

    // Add to restore history (JSON file)
    addToBackupHistory('restores', {
      date: new Date().toISOString(),
      path: sourcePath,
    });

    // Add audit log
    if (userId) {
      await prisma.auditLog.create({
        data: {
          actorUserId: userId,
          actionType: 'UPDATE',
          entityType: 'BACKUP',
          entityId: 0,
          details: JSON.stringify({ path: sourcePath, type: 'restore' }),
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Restore backup error:', error);
    return { success: false, error: 'RESTORE_BACKUP_ERROR' };
  }
});

// Select backup folder for auto backup
ipcMain.handle('backup:selectFolder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Выберите папку для автоматических резервных копий',
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'FOLDER_SELECTION_CANCELED' };
    }

    return { success: true, data: { path: result.filePaths[0] } };
  } catch (error) {
    console.error('Select folder error:', error);
    return { success: false, error: 'SELECT_FOLDER_ERROR' };
  }
});

// Backup history entry type
interface BackupHistoryEntry {
  date: string;
  path?: string;
}

// Extended settings type for auto backup
interface ExtendedSettings {
  id: number;
  autoBackupEnabled?: boolean;
  autoBackupInterval?: number;
  autoBackupPath?: string;
  lastAutoBackup?: Date | string | null;
  manualBackupHistory?: string;
  restoreHistory?: string;
  autoBackupHistory?: string;
}

// Backup history file path
function getBackupHistoryPath(): string {
  return path.join(app.getPath('userData'), 'backup-history.json');
}

// Backup history structure
interface BackupHistoryData {
  manualBackups: BackupHistoryEntry[];
  restores: BackupHistoryEntry[];
  autoBackups: BackupHistoryEntry[];
}

// Read backup history from file
function readBackupHistory(): BackupHistoryData {
  try {
    const filePath = getBackupHistoryPath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    log(`Error reading backup history: ${e}`);
  }
  return { manualBackups: [], restores: [], autoBackups: [] };
}

// Write backup history to file
function writeBackupHistory(data: BackupHistoryData): void {
  try {
    const filePath = getBackupHistoryPath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    log(`Error writing backup history: ${e}`);
  }
}

// Helper function to add entry to backup history (keep last 3)
function addToBackupHistory(field: 'manualBackups' | 'restores' | 'autoBackups', entry: BackupHistoryEntry): void {
  const history = readBackupHistory();
  history[field].unshift(entry);
  history[field] = history[field].slice(0, 3);
  writeBackupHistory(history);
}

// Perform auto backup
async function performAutoBackup(): Promise<void> {
  try {
    const settingsArr = await prisma.$queryRaw`SELECT * FROM "Settings" LIMIT 1` as ExtendedSettings[];
    const settings = settingsArr && settingsArr.length > 0 ? settingsArr[0] : null;
    if (!settings || !settings.autoBackupEnabled || !settings.autoBackupPath) {
      return;
    }

    const intervalDays = settings.autoBackupInterval || 7;
    const lastBackup = settings.lastAutoBackup ? new Date(settings.lastAutoBackup) : null;
    const now = new Date();

    // Check if backup is needed
    if (lastBackup) {
      const daysSinceLastBackup = Math.floor((now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastBackup < intervalDays) {
        return;
      }
    }

    // Check if backup folder exists
    if (!fs.existsSync(settings.autoBackupPath)) {
      fs.mkdirSync(settings.autoBackupPath, { recursive: true });
    }

    // Create backup
    const dbPath = getDbPath();
    const backupFileName = `library-auto-backup-${now.toISOString().split('T')[0]}.db`;
    const backupPath = path.join(settings.autoBackupPath, backupFileName);

    fs.copyFileSync(dbPath, backupPath);
    log(`Auto backup created: ${backupPath}`);

    // Update last backup time using raw query
    await prisma.$executeRaw`UPDATE "Settings" SET "lastAutoBackup" = ${now.toISOString()} WHERE "id" = ${settings.id}`;

    // Add to auto backup history
    addToBackupHistory('autoBackups', {
      date: now.toISOString(),
      path: backupPath,
    });

    // Clean old backups (keep last 10)
    const backupFolder = settings.autoBackupPath;
    const files = fs.readdirSync(backupFolder)
      .filter((f: string) => f.startsWith('library-auto-backup-') && f.endsWith('.db'))
      .map((f: string) => ({
        name: f,
        path: path.join(backupFolder, f),
        time: fs.statSync(path.join(backupFolder, f)).mtime.getTime(),
      }))
      .sort((a: { time: number }, b: { time: number }) => b.time - a.time);

    if (files.length > 10) {
      for (let i = 10; i < files.length; i++) {
        fs.unlinkSync(files[i].path);
        log(`Deleted old backup: ${files[i].name}`);
      }
    }
  } catch (error) {
    log(`Auto backup error: ${error}`);
  }
}

// Run auto backup check on startup and every hour
let autoBackupInterval: NodeJS.Timeout | null = null;

function startAutoBackupScheduler(): void {
  // Run immediately on startup
  performAutoBackup();

  // Then check every hour
  autoBackupInterval = setInterval(() => {
    performAutoBackup();
  }, 60 * 60 * 1000); // 1 hour
}

// Trigger auto backup check (called when settings change)
ipcMain.handle('backup:checkAutoBackup', async () => {
  try {
    await performAutoBackup();
    return { success: true };
  } catch (error) {
    console.error('Check auto backup error:', error);
    return { success: false, error: 'CHECK_AUTO_BACKUP_ERROR' };
  }
});

// Get backup history
ipcMain.handle('backup:getHistory', async () => {
  try {
    const settingsArr = await prisma.$queryRaw`SELECT * FROM "Settings" LIMIT 1` as ExtendedSettings[];
    const settings = settingsArr && settingsArr.length > 0 ? settingsArr[0] : null;
    if (!settings?.autoBackupPath || !fs.existsSync(settings.autoBackupPath)) {
      return { success: true, data: [] };
    }

    const backupFolder = settings.autoBackupPath;
    const files = fs.readdirSync(backupFolder)
      .filter((f: string) => f.endsWith('.db'))
      .map((f: string) => {
        const filePath = path.join(backupFolder, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          date: stats.mtime.toISOString(),
          size: stats.size,
        };
      })
      .sort((a: { date: string }, b: { date: string }) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { success: true, data: files };
  } catch (error) {
    console.error('Get backup history error:', error);
    return { success: false, error: 'GET_BACKUP_HISTORY_ERROR' };
  }
});

// Get backup activity history (from JSON file)
ipcMain.handle('backup:getActivityHistory', async () => {
  try {
    const history = readBackupHistory();
    return { success: true, data: history };
  } catch (error) {
    console.error('Get backup activity history error:', error);
    return { success: false, error: 'GET_ACTIVITY_HISTORY_ERROR' };
  }
});

// Delete a backup file
ipcMain.handle('backup:deleteBackup', async (_, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log(`Deleted backup: ${filePath}`);
      return { success: true };
    }
    return { success: false, error: 'FILE_NOT_FOUND' };
  } catch (error) {
    console.error('Delete backup error:', error);
    return { success: false, error: 'DELETE_BACKUP_ERROR' };
  }
});

// Restore from a specific backup file
ipcMain.handle('backup:restoreFromFile', async (_, filePath: string, userId?: number) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'FILE_NOT_FOUND' };
    }

    const dbPath = getDbPath();

    // Disconnect and reconnect after restore
    await prisma.$disconnect();
    fs.copyFileSync(filePath, dbPath);
    const PrismaClientClass = getPrismaClientCtor();
    prisma = new PrismaClientClass();

    // Add to restore history (JSON file)
    addToBackupHistory('restores', {
      date: new Date().toISOString(),
      path: filePath,
    });

    // Add audit log
    if (userId) {
      await prisma.auditLog.create({
        data: {
          actorUserId: userId,
          actionType: 'UPDATE',
          entityType: 'BACKUP',
          entityId: 0,
          details: JSON.stringify({ path: filePath, type: 'restore' }),
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Restore from file error:', error);
    return { success: false, error: 'RESTORE_BACKUP_ERROR' };
  }
});

// Reports/Statistics handlers
ipcMain.handle('reports:getStatistics', async () => {
  try {
    const totalBooks = await prisma.book.count();
    const totalStudents = await prisma.student.count();
    const activeLoans = await prisma.loan.count({ where: { returnedAt: null } });
    const overdueLoans = await prisma.loan.count({
      where: { returnedAt: null, dueDate: { lt: new Date() } },
    });
    const totalLoansThisMonth = await prisma.loan.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    // Get top student by reward points
    const topStudentResult = await prisma.student.findFirst({
      where: { rewardPoints: { gt: 0 } },
      orderBy: { rewardPoints: 'desc' },
      select: {
        id: true,
        fullName: true,
        grade: true,
        rewardPoints: true,
      },
    });

    return {
      success: true,
      data: {
        totalBooks,
        totalStudents,
        activeLoans,
        overdueLoans,
        totalLoansThisMonth,
        topStudent: topStudentResult || undefined,
      },
    };
  } catch (error) {
    console.error('Get statistics error:', error);
    return { success: false, error: 'GET_STATISTICS_ERROR' };
  }
});

// Update category handler
ipcMain.handle('categories:update', async (_, id: number, data: { name: string; nameKk: string; nameTr?: string }, userId: number) => {
  try {
    const category = await prisma.category.update({
      where: { id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'UPDATE',
        entityType: 'CATEGORY',
        entityId: category.id,
        details: JSON.stringify({ name: category.name }),
      },
    });

    return { success: true, data: category };
  } catch (error) {
    console.error('Update category error:', error);
    return { success: false, error: 'UPDATE_CATEGORY_ERROR' };
  }
});

// Delete category handler
ipcMain.handle('categories:delete', async (_, id: number, userId: number) => {
  try {
    // Check if category has books
    const booksCount = await prisma.book.count({ where: { categoryId: id } });
    if (booksCount > 0) {
      return { success: false, error: 'CATEGORY_HAS_BOOKS' };
    }

    const category = await prisma.category.findUnique({ where: { id } });
    await prisma.category.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'DELETE',
        entityType: 'CATEGORY',
        entityId: id,
        details: JSON.stringify({ name: category?.name }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Delete category error:', error);
    return { success: false, error: 'DELETE_CATEGORY_ERROR' };
  }
});

// Reservation handlers
ipcMain.handle('reservations:getAll', async (_, filters?: { bookId?: number; studentId?: number; status?: string }) => {
  try {
    const where: any = {};
    if (filters?.bookId) where.bookId = filters.bookId;
    if (filters?.studentId) where.studentId = filters.studentId;
    if (filters?.status) where.status = filters.status;

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        book: { include: { category: true } },
        student: true,
      },
      orderBy: { requestDate: 'asc' },
    });
    return { success: true, data: reservations };
  } catch (error) {
    console.error('Get reservations error:', error);
    return { success: false, error: 'GET_RESERVATIONS_ERROR' };
  }
});

ipcMain.handle('reservations:create', async (_, data: { bookId: number; studentId: number }, userId: number) => {
  try {
    // Check if student already has a reservation for this book
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        bookId: data.bookId,
        studentId: data.studentId,
        status: 'waiting',
      },
    });
    if (existingReservation) {
      return { success: false, error: 'RESERVATION_EXISTS' };
    }

    const reservation = await prisma.reservation.create({
      data: {
        bookId: data.bookId,
        studentId: data.studentId,
        requestDate: new Date(),
      },
      include: {
        book: true,
        student: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'CREATE',
        entityType: 'RESERVATION',
        entityId: reservation.id,
        details: JSON.stringify({
          book: reservation.book.title,
          student: reservation.student.fullName,
        }),
      },
    });

    return { success: true, data: reservation };
  } catch (error) {
    console.error('Create reservation error:', error);
    return { success: false, error: 'CREATE_RESERVATION_ERROR' };
  }
});

ipcMain.handle('reservations:cancel', async (_, id: number, userId: number) => {
  try {
    const reservation = await prisma.reservation.update({
      where: { id },
      data: { status: 'cancelled' },
      include: { book: true, student: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'UPDATE',
        entityType: 'RESERVATION',
        entityId: id,
        details: JSON.stringify({ status: 'cancelled' }),
      },
    });

    return { success: true, data: reservation };
  } catch (error) {
    console.error('Cancel reservation error:', error);
    return { success: false, error: 'CANCEL_RESERVATION_ERROR' };
  }
});

ipcMain.handle('reservations:getNextInQueue', async (_, bookId: number) => {
  try {
    const nextReservation = await prisma.reservation.findFirst({
      where: {
        bookId,
        status: 'waiting',
      },
      orderBy: { requestDate: 'asc' },
      include: { student: true },
    });
    return { success: true, data: nextReservation };
  } catch (error) {
    console.error('Get next in queue error:', error);
    return { success: false, error: 'GET_NEXT_IN_QUEUE_ERROR' };
  }
});

// Favorite handlers
ipcMain.handle('favorites:getByStudent', async (_, studentId: number) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { studentId },
      include: {
        book: { include: { category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: favorites };
  } catch (error) {
    console.error('Get favorites error:', error);
    return { success: false, error: 'GET_FAVORITES_ERROR' };
  }
});

ipcMain.handle('favorites:toggle', async (_, bookId: number, studentId: number) => {
  try {
    const existing = await prisma.favorite.findFirst({
      where: { bookId, studentId },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return { success: true, data: { isFavorite: false } };
    } else {
      await prisma.favorite.create({
        data: { bookId, studentId },
      });
      return { success: true, data: { isFavorite: true } };
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    return { success: false, error: 'TOGGLE_FAVORITE_ERROR' };
  }
});

ipcMain.handle('favorites:check', async (_, bookId: number, studentId: number) => {
  try {
    const favorite = await prisma.favorite.findFirst({
      where: { bookId, studentId },
    });
    return { success: true, data: { isFavorite: !!favorite } };
  } catch (error) {
    console.error('Check favorite error:', error);
    return { success: false, error: 'CHECK_FAVORITE_ERROR' };
  }
});

// Book recommendations - based on what similar readers have borrowed
ipcMain.handle('books:getRecommendations', async (_, studentId: number, limit: number = 5) => {
  try {
    // Get books the student has borrowed
    const studentLoans = await prisma.loan.findMany({
      where: { studentId },
      select: { bookId: true },
    });
    const studentBookIds = studentLoans.map(l => l.bookId);

    if (studentBookIds.length === 0) {
      // If student hasn't borrowed anything, return popular books
      const popularBooks = await prisma.loan.groupBy({
        by: ['bookId'],
        _count: { bookId: true },
        orderBy: { _count: { bookId: 'desc' } },
        take: limit,
      });
      const bookIds = popularBooks.map(p => p.bookId);
      const books = await prisma.book.findMany({
        where: { id: { in: bookIds } },
        include: { category: true },
      });
      return { success: true, data: books };
    }

    // Find students who borrowed similar books
    const similarStudents = await prisma.loan.findMany({
      where: {
        bookId: { in: studentBookIds },
        studentId: { not: studentId },
      },
      select: { studentId: true },
      distinct: ['studentId'],
    });
    const similarStudentIds = similarStudents.map(s => s.studentId);

    // Get books those students borrowed that the current student hasn't
    const recommendedLoans = await prisma.loan.findMany({
      where: {
        studentId: { in: similarStudentIds },
        bookId: { notIn: studentBookIds },
      },
      select: { bookId: true },
    });

    // Count occurrences and get top recommendations
    const bookCounts: { [key: number]: number } = {};
    recommendedLoans.forEach(l => {
      bookCounts[l.bookId] = (bookCounts[l.bookId] || 0) + 1;
    });

    const sortedBookIds = Object.entries(bookCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => parseInt(id));

    const books = await prisma.book.findMany({
      where: { id: { in: sortedBookIds } },
      include: { category: true },
    });

    return { success: true, data: books };
  } catch (error) {
    console.error('Get recommendations error:', error);
    return { success: false, error: 'GET_RECOMMENDATIONS_ERROR' };
  }
});

// Advanced statistics handlers
ipcMain.handle('reports:getReadingTrends', async (_, period: 'monthly' | 'yearly' = 'monthly') => {
  try {
    const now = new Date();
    let startDate: Date;
    let groupFormat: string;

    if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      groupFormat = 'month';
    } else {
      startDate = new Date(now.getFullYear() - 4, 0, 1);
      groupFormat = 'year';
    }

    const loans = await prisma.loan.findMany({
      where: {
        loanDate: { gte: startDate },
      },
      select: {
        loanDate: true,
      },
    });

    // Group by period
    const trends: { [key: string]: number } = {};
    loans.forEach(loan => {
      const date = new Date(loan.loanDate);
      let key: string;
      if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = `${date.getFullYear()}`;
      }
      trends[key] = (trends[key] || 0) + 1;
    });

    // Convert to array and sort
    const data = Object.entries(trends)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return { success: true, data };
  } catch (error) {
    console.error('Get reading trends error:', error);
    return { success: false, error: 'GET_READING_TRENDS_ERROR' };
  }
});

ipcMain.handle('reports:getPopularBooks', async (_, limit: number = 10) => {
  try {
    const popularBooks = await prisma.loan.groupBy({
      by: ['bookId'],
      _count: { bookId: true },
      orderBy: { _count: { bookId: 'desc' } },
      take: limit,
    });

    const bookIds = popularBooks.map(p => p.bookId);
    const books = await prisma.book.findMany({
      where: { id: { in: bookIds } },
      include: { category: true },
    });

    const result = popularBooks.map(p => ({
      book: books.find(b => b.id === p.bookId),
      loanCount: p._count.bookId,
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('Get popular books error:', error);
    return { success: false, error: 'GET_POPULAR_BOOKS_ERROR' };
  }
});

ipcMain.handle('reports:getPopularCategories', async (_, limit: number = 10) => {
  try {
    const loans = await prisma.loan.findMany({
      include: { book: { include: { category: true } } },
    });

    const categoryCounts: { [key: number]: { category: any; count: number } } = {};
    loans.forEach(loan => {
      const catId = loan.book.categoryId;
      if (!categoryCounts[catId]) {
        categoryCounts[catId] = { category: loan.book.category, count: 0 };
      }
      categoryCounts[catId].count++;
    });

    const result = Object.values(categoryCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return { success: true, data: result };
  } catch (error) {
    console.error('Get popular categories error:', error);
    return { success: false, error: 'GET_POPULAR_CATEGORIES_ERROR' };
  }
});

ipcMain.handle('reports:getGradeStatistics', async () => {
  try {
    const students = await prisma.student.findMany({
      include: {
        loans: true,
      },
    });

    const gradeStats: { [key: string]: { grade: string; studentCount: number; totalLoans: number; avgLoans: number } } = {};

    students.forEach(student => {
      if (!gradeStats[student.grade]) {
        gradeStats[student.grade] = {
          grade: student.grade,
          studentCount: 0,
          totalLoans: 0,
          avgLoans: 0,
        };
      }
      gradeStats[student.grade].studentCount++;
      gradeStats[student.grade].totalLoans += student.loans.length;
    });

    // Calculate averages
    Object.values(gradeStats).forEach(stat => {
      stat.avgLoans = stat.studentCount > 0 ? Math.round((stat.totalLoans / stat.studentCount) * 10) / 10 : 0;
    });

    const result = Object.values(gradeStats).sort((a, b) => a.grade.localeCompare(b.grade));

    return { success: true, data: result };
  } catch (error) {
    console.error('Get grade statistics error:', error);
    return { success: false, error: 'GET_GRADE_STATISTICS_ERROR' };
  }
});

ipcMain.handle('reports:getClassReport', async (_, grade: string) => {
  try {
    const students = await prisma.student.findMany({
      where: { grade },
      include: {
        loans: {
          include: { book: true },
          orderBy: { loanDate: 'desc' },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const report = students.map(student => {
      const activeLoans = student.loans.filter(l => !l.returnedAt);
      const overdueLoans = activeLoans.filter(l => new Date(l.dueDate) < new Date());
      const returnedLoans = student.loans.filter(l => l.returnedAt);

      return {
        student: {
          id: student.id,
          fullName: student.fullName,
          studentId: student.studentId,
          rewardPoints: student.rewardPoints,
        },
        totalLoans: student.loans.length,
        activeLoans: activeLoans.length,
        overdueLoans: overdueLoans.length,
        returnedLoans: returnedLoans.length,
        recentBooks: student.loans.slice(0, 5).map(l => ({
          title: l.book.title,
          loanDate: l.loanDate,
          returnedAt: l.returnedAt,
        })),
      };
    });

    return { success: true, data: report };
  } catch (error) {
    console.error('Get class report error:', error);
    return { success: false, error: 'GET_CLASS_REPORT_ERROR' };
  }
});

// ==========================================
// TEXTBOOK DISTRIBUTION MODULE IPC HANDLERS
// ==========================================

// Teachers handlers
ipcMain.handle('teachers:getAll', async () => {
  try {
    const teachers = await prisma.teacher.findMany({
      include: { branches: true },
      orderBy: { fullName: 'asc' },
    });
    return { success: true, data: teachers };
  } catch (error) {
    console.error('Get teachers error:', error);
    return { success: false, error: 'GET_TEACHERS_ERROR' };
  }
});

ipcMain.handle('teachers:getById', async (_, id: number) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: { branches: true },
    });
    return { success: true, data: teacher };
  } catch (error) {
    console.error('Get teacher error:', error);
    return { success: false, error: 'GET_TEACHER_ERROR' };
  }
});

ipcMain.handle('teachers:create', async (_, data: { fullName: string; phone?: string }, userId: number) => {
  try {
    const teacher = await prisma.teacher.create({
      data,
      include: { branches: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'CREATE',
        entityType: 'TEACHER',
        entityId: teacher.id,
        details: JSON.stringify({ fullName: teacher.fullName }),
      },
    });

    return { success: true, data: teacher };
  } catch (error) {
    console.error('Create teacher error:', error);
    return { success: false, error: 'CREATE_TEACHER_ERROR' };
  }
});

ipcMain.handle('teachers:update', async (_, id: number, data: { fullName?: string; phone?: string }, userId: number) => {
  try {
    const teacher = await prisma.teacher.update({
      where: { id },
      data,
      include: { branches: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'UPDATE',
        entityType: 'TEACHER',
        entityId: teacher.id,
        details: JSON.stringify({ fullName: teacher.fullName }),
      },
    });

    return { success: true, data: teacher };
  } catch (error) {
    console.error('Update teacher error:', error);
    return { success: false, error: 'UPDATE_TEACHER_ERROR' };
  }
});

ipcMain.handle('teachers:delete', async (_, id: number, userId: number) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) {
      return { success: false, error: 'TEACHER_NOT_FOUND' };
    }

    // Check if teacher has branches assigned
    const branchCount = await prisma.branch.count({ where: { teacherId: id } });
    if (branchCount > 0) {
      return { success: false, error: 'TEACHER_HAS_BRANCHES' };
    }

    await prisma.teacher.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'DELETE',
        entityType: 'TEACHER',
        entityId: id,
        details: JSON.stringify({ fullName: teacher.fullName }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Delete teacher error:', error);
    return { success: false, error: 'DELETE_TEACHER_ERROR' };
  }
});

ipcMain.handle('teachers:deleteAll', async (_, userId: number, password: string) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: 'USER_NOT_FOUND' };
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return { success: false, error: 'INVALID_PASSWORD' };
    }

    const teachersWithBranches = await prisma.teacher.findMany({
      where: { branches: { some: {} } },
      select: { id: true },
    });
    const excludeIds = teachersWithBranches.map(t => t.id);

    const deleteResult = await prisma.teacher.deleteMany({
      where: excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {},
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'DELETE',
        entityType: 'TEACHER',
        entityId: 0,
        details: JSON.stringify({ action: 'DELETE_ALL', deletedCount: deleteResult.count, skippedWithBranches: excludeIds.length }),
      },
    });

    return { success: true, data: { deletedCount: deleteResult.count, skippedCount: excludeIds.length } };
  } catch (error) {
    console.error('Delete all teachers error:', error);
    return { success: false, error: 'DELETE_ALL_TEACHERS_ERROR' };
  }
});

// Branches handlers
ipcMain.handle('branches:getAll', async (_, filters?: { grade?: number }) => {
  try {
    const where: any = {};
    if (filters?.grade) {
      where.grade = filters.grade;
    }

    const branches = await prisma.branch.findMany({
      where,
      include: { teacher: true },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
    });
    return { success: true, data: branches };
  } catch (error) {
    console.error('Get branches error:', error);
    return { success: false, error: 'GET_BRANCHES_ERROR' };
  }
});

ipcMain.handle('branches:getById', async (_, id: number) => {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: { teacher: true, distributions: true },
    });
    return { success: true, data: branch };
  } catch (error) {
    console.error('Get branch error:', error);
    return { success: false, error: 'GET_BRANCH_ERROR' };
  }
});

ipcMain.handle('branches:create', async (_, data: { name: string; grade: number; teacherId?: number; studentCount?: number }, userId: number) => {
  try {
    const branch = await prisma.branch.create({
      data,
      include: { teacher: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'CREATE',
        entityType: 'BRANCH',
        entityId: branch.id,
        details: JSON.stringify({ name: branch.name, grade: branch.grade }),
      },
    });

    return { success: true, data: branch };
  } catch (error) {
    console.error('Create branch error:', error);
    return { success: false, error: 'CREATE_BRANCH_ERROR' };
  }
});

ipcMain.handle('branches:update', async (_, id: number, data: { name?: string; grade?: number; teacherId?: number | null; studentCount?: number }, userId: number) => {
  try {
    const branch = await prisma.branch.update({
      where: { id },
      data,
      include: { teacher: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'UPDATE',
        entityType: 'BRANCH',
        entityId: branch.id,
        details: JSON.stringify({ name: branch.name, grade: branch.grade }),
      },
    });

    return { success: true, data: branch };
  } catch (error) {
    console.error('Update branch error:', error);
    return { success: false, error: 'UPDATE_BRANCH_ERROR' };
  }
});

ipcMain.handle('branches:delete', async (_, id: number, userId: number) => {
  try {
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      return { success: false, error: 'BRANCH_NOT_FOUND' };
    }

    // Check if branch has distributions
    const distributionCount = await prisma.textbookDistribution.count({ where: { branchId: id } });
    if (distributionCount > 0) {
      return { success: false, error: 'BRANCH_HAS_DISTRIBUTIONS' };
    }

    await prisma.branch.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'DELETE',
        entityType: 'BRANCH',
        entityId: id,
        details: JSON.stringify({ name: branch.name }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Delete branch error:', error);
    return { success: false, error: 'DELETE_BRANCH_ERROR' };
  }
});

ipcMain.handle('branches:deleteAll', async (_, userId: number, password: string) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: 'USER_NOT_FOUND' };
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return { success: false, error: 'INVALID_PASSWORD' };
    }

    // Check if any branches have distributions
    const branchesWithDistributions = await prisma.branch.findMany({
      where: { distributions: { some: {} } },
      select: { id: true },
    });

    if (branchesWithDistributions.length > 0) {
      return { success: false, error: 'BRANCHES_HAVE_DISTRIBUTIONS', data: { count: branchesWithDistributions.length } };
    }

    const deleteResult = await prisma.branch.deleteMany({});

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'DELETE',
        entityType: 'BRANCH',
        entityId: 0,
        details: JSON.stringify({ action: 'DELETE_ALL', deletedCount: deleteResult.count }),
      },
    });

    return { success: true, data: { deletedCount: deleteResult.count } };
  } catch (error) {
    console.error('Delete all branches error:', error);
    return { success: false, error: 'DELETE_ALL_BRANCHES_ERROR' };
  }
});

// Textbooks handlers
ipcMain.handle('textbooks:getAll', async (_, filters?: { search?: string; grade?: number; subject?: string; language?: string }) => {
  try {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { author: { contains: filters.search } },
        { subject: { contains: filters.search } },
        { isbn: { contains: filters.search } },
        { publisher: { contains: filters.search } },
      ];
    }
    if (filters?.grade) {
      // Match if grade is between gradeFrom and gradeTo (or equals gradeFrom if gradeTo is null)
      where.AND = [
        { gradeFrom: { lte: filters.grade } },
        {
          OR: [
            { gradeTo: { gte: filters.grade } },
            { gradeTo: null },
          ],
        },
      ];
    }
    if (filters?.subject) {
      where.subject = filters.subject;
    }
    if (filters?.language) {
      where.language = filters.language;
    }

    const textbooks = await prisma.textbook.findMany({
      where,
      orderBy: [{ gradeFrom: 'asc' }, { subject: 'asc' }, { title: 'asc' }],
    });
    return { success: true, data: textbooks };
  } catch (error) {
    console.error('Get textbooks error:', error);
    return { success: false, error: 'GET_TEXTBOOKS_ERROR' };
  }
});

ipcMain.handle('textbooks:getById', async (_, id: number) => {
  try {
    const textbook = await prisma.textbook.findUnique({
      where: { id },
      include: { setItems: { include: { set: true } } },
    });
    return { success: true, data: textbook };
  } catch (error) {
    console.error('Get textbook error:', error);
    return { success: false, error: 'GET_TEXTBOOK_ERROR' };
  }
});

ipcMain.handle('textbooks:create', async (_, data: {
  author?: string;
  title: string;
  publicationType?: string;
  direction?: string;
  publisher?: string;
  yearPublished?: number;
  isbn?: string;
  price?: number;
  language?: string;
  gradeFrom: number;
  gradeTo?: number;
  totalStock?: number;
  subject: string;
}, userId: number) => {
  try {
    console.log('Creating textbook with data:', JSON.stringify(data));
    const textbook = await prisma.textbook.create({
      data: {
        author: data.author,
        title: data.title,
        publicationType: data.publicationType,
        direction: data.direction,
        publisher: data.publisher,
        yearPublished: data.yearPublished,
        isbn: data.isbn,
        price: data.price,
        language: data.language,
        gradeFrom: data.gradeFrom,
        gradeTo: data.gradeTo,
        totalStock: data.totalStock || 0,
        availableStock: data.totalStock || 0,
        subject: data.subject,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'CREATE',
        entityType: 'TEXTBOOK',
        entityId: textbook.id,
        details: JSON.stringify({ title: textbook.title, subject: textbook.subject, author: textbook.author }),
      },
    });

    return { success: true, data: textbook };
  } catch (error: any) {
    console.error('Create textbook error:', error);
    console.error('Error message:', error?.message);
    console.error('Error code:', error?.code);
    return { success: false, error: 'CREATE_TEXTBOOK_ERROR', details: error?.message };
  }
});

ipcMain.handle('textbooks:update', async (_, id: number, data: any, userId: number) => {
  try {
    const textbook = await prisma.textbook.update({
      where: { id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'UPDATE',
        entityType: 'TEXTBOOK',
        entityId: textbook.id,
        details: JSON.stringify({ title: textbook.title }),
      },
    });

    return { success: true, data: textbook };
  } catch (error) {
    console.error('Update textbook error:', error);
    return { success: false, error: 'UPDATE_TEXTBOOK_ERROR' };
  }
});

ipcMain.handle('textbooks:delete', async (_, id: number, userId: number) => {
  try {
    const textbook = await prisma.textbook.findUnique({ where: { id } });
    if (!textbook) {
      return { success: false, error: 'TEXTBOOK_NOT_FOUND' };
    }

    // Check if textbook is in any set
    const setItemCount = await prisma.textbookSetItem.count({ where: { textbookId: id } });
    if (setItemCount > 0) {
      return { success: false, error: 'TEXTBOOK_IN_SETS' };
    }

    // Check if textbook has distributions
    const distributionCount = await prisma.textbookDistributionDetail.count({ where: { textbookId: id } });
    if (distributionCount > 0) {
      return { success: false, error: 'TEXTBOOK_HAS_DISTRIBUTIONS' };
    }

    await prisma.textbook.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'DELETE',
        entityType: 'TEXTBOOK',
        entityId: id,
        details: JSON.stringify({ title: textbook.title }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Delete textbook error:', error);
    return { success: false, error: 'DELETE_TEXTBOOK_ERROR' };
  }
});

ipcMain.handle('textbooks:updateStock', async (_, id: number, totalStock: number, userId: number) => {
  try {
    const textbook = await prisma.textbook.findUnique({ where: { id } });
    if (!textbook) {
      return { success: false, error: 'TEXTBOOK_NOT_FOUND' };
    }

    const stockDiff = totalStock - textbook.totalStock;
    const newAvailableStock = textbook.availableStock + stockDiff;

    if (newAvailableStock < 0) {
      return { success: false, error: 'INSUFFICIENT_AVAILABLE_STOCK' };
    }

    const updated = await prisma.textbook.update({
      where: { id },
      data: {
        totalStock,
        availableStock: newAvailableStock,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'UPDATE',
        entityType: 'TEXTBOOK',
        entityId: id,
        details: JSON.stringify({ title: textbook.title, oldStock: textbook.totalStock, newStock: totalStock }),
      },
    });

    return { success: true, data: updated };
  } catch (error) {
    console.error('Update textbook stock error:', error);
    return { success: false, error: 'UPDATE_STOCK_ERROR' };
  }
});

// TextbookSets handlers
ipcMain.handle('textbookSets:getAll', async (_, filters?: { grade?: number }) => {
  try {
    const where: any = {};
    if (filters?.grade) {
      where.grade = filters.grade;
    }

    const sets = await prisma.textbookSet.findMany({
      where,
      include: {
        items: {
          include: { textbook: true },
        },
      },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
    });
    return { success: true, data: sets };
  } catch (error) {
    console.error('Get textbook sets error:', error);
    return { success: false, error: 'GET_TEXTBOOK_SETS_ERROR' };
  }
});

ipcMain.handle('textbookSets:getById', async (_, id: number) => {
  try {
    const set = await prisma.textbookSet.findUnique({
      where: { id },
      include: {
        items: {
          include: { textbook: true },
        },
        distributions: true,
      },
    });
    return { success: true, data: set };
  } catch (error) {
    console.error('Get textbook set error:', error);
    return { success: false, error: 'GET_TEXTBOOK_SET_ERROR' };
  }
});

ipcMain.handle('textbookSets:create', async (_, data: { name: string; grade: number; textbookIds?: number[] }, userId: number) => {
  try {
    const set = await prisma.textbookSet.create({
      data: {
        name: data.name,
        grade: data.grade,
        items: data.textbookIds?.length ? {
          create: data.textbookIds.map(textbookId => ({ textbookId })),
        } : undefined,
      },
      include: {
        items: {
          include: { textbook: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'CREATE',
        entityType: 'TEXTBOOK_SET',
        entityId: set.id,
        details: JSON.stringify({ name: set.name, grade: set.grade }),
      },
    });

    return { success: true, data: set };
  } catch (error) {
    console.error('Create textbook set error:', error);
    return { success: false, error: 'CREATE_TEXTBOOK_SET_ERROR' };
  }
});

ipcMain.handle('textbookSets:update', async (_, id: number, data: { name?: string; grade?: number }, userId: number) => {
  try {
    const set = await prisma.textbookSet.update({
      where: { id },
      data,
      include: {
        items: {
          include: { textbook: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'UPDATE',
        entityType: 'TEXTBOOK_SET',
        entityId: set.id,
        details: JSON.stringify({ name: set.name }),
      },
    });

    return { success: true, data: set };
  } catch (error) {
    console.error('Update textbook set error:', error);
    return { success: false, error: 'UPDATE_TEXTBOOK_SET_ERROR' };
  }
});

ipcMain.handle('textbookSets:delete', async (_, id: number, userId: number) => {
  try {
    const set = await prisma.textbookSet.findUnique({ where: { id } });
    if (!set) {
      return { success: false, error: 'TEXTBOOK_SET_NOT_FOUND' };
    }

    // Check if set has distributions
    const distributionCount = await prisma.textbookDistribution.count({ where: { setId: id } });
    if (distributionCount > 0) {
      return { success: false, error: 'SET_HAS_DISTRIBUTIONS' };
    }

    await prisma.textbookSet.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'DELETE',
        entityType: 'TEXTBOOK_SET',
        entityId: id,
        details: JSON.stringify({ name: set.name }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Delete textbook set error:', error);
    return { success: false, error: 'DELETE_TEXTBOOK_SET_ERROR' };
  }
});

ipcMain.handle('textbookSets:addTextbook', async (_, setId: number, textbookId: number, userId: number) => {
  try {
    // Check if already exists
    const existing = await prisma.textbookSetItem.findFirst({
      where: { setId, textbookId },
    });
    if (existing) {
      return { success: false, error: 'TEXTBOOK_ALREADY_IN_SET' };
    }

    await prisma.textbookSetItem.create({
      data: { setId, textbookId },
    });

    const set = await prisma.textbookSet.findUnique({
      where: { id: setId },
      include: {
        items: {
          include: { textbook: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'UPDATE',
        entityType: 'TEXTBOOK_SET',
        entityId: setId,
        details: JSON.stringify({ action: 'addTextbook', textbookId }),
      },
    });

    return { success: true, data: set };
  } catch (error) {
    console.error('Add textbook to set error:', error);
    return { success: false, error: 'ADD_TEXTBOOK_TO_SET_ERROR' };
  }
});

ipcMain.handle('textbookSets:removeTextbook', async (_, setId: number, textbookId: number, userId: number) => {
  try {
    await prisma.textbookSetItem.deleteMany({
      where: { setId, textbookId },
    });

    const set = await prisma.textbookSet.findUnique({
      where: { id: setId },
      include: {
        items: {
          include: { textbook: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'UPDATE',
        entityType: 'TEXTBOOK_SET',
        entityId: setId,
        details: JSON.stringify({ action: 'removeTextbook', textbookId }),
      },
    });

    return { success: true, data: set };
  } catch (error) {
    console.error('Remove textbook from set error:', error);
    return { success: false, error: 'REMOVE_TEXTBOOK_FROM_SET_ERROR' };
  }
});

// TextbookDistributions handlers
ipcMain.handle('textbookDistributions:getAll', async (_, filters?: { academicYear?: string; status?: string; branchId?: number }) => {
  try {
    const where: any = {};
    if (filters?.academicYear) {
      where.academicYear = filters.academicYear;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.branchId) {
      where.branchId = filters.branchId;
    }

    const distributions = await prisma.textbookDistribution.findMany({
      where,
      include: {
        branch: { include: { teacher: true } },
        set: {
          include: {
            items: {
              include: { textbook: true },
            },
          },
        },
        details: {
          include: { textbook: true },
        },
      },
      orderBy: { distributedAt: 'desc' },
    });
    return { success: true, data: distributions };
  } catch (error) {
    console.error('Get textbook distributions error:', error);
    return { success: false, error: 'GET_DISTRIBUTIONS_ERROR' };
  }
});

ipcMain.handle('textbookDistributions:getById', async (_, id: number) => {
  try {
    const distribution = await prisma.textbookDistribution.findUnique({
      where: { id },
      include: {
        branch: { include: { teacher: true } },
        set: {
          include: {
            items: {
              include: { textbook: true },
            },
          },
        },
        details: {
          include: { textbook: true },
        },
      },
    });
    return { success: true, data: distribution };
  } catch (error) {
    console.error('Get textbook distribution error:', error);
    return { success: false, error: 'GET_DISTRIBUTION_ERROR' };
  }
});

ipcMain.handle('textbookDistributions:create', async (_, data: { branchId: number; setId: number; academicYear: string; notes?: string }, userId: number) => {
  try {
    // Get branch and set info
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch) {
      return { success: false, error: 'BRANCH_NOT_FOUND' };
    }

    const set = await prisma.textbookSet.findUnique({
      where: { id: data.setId },
      include: {
        items: {
          include: { textbook: true },
        },
      },
    });
    if (!set) {
      return { success: false, error: 'SET_NOT_FOUND' };
    }

    // Check stock availability for each textbook
    const studentCount = branch.studentCount;
    for (const item of set.items) {
      if (item.textbook.availableStock < studentCount) {
        return {
          success: false,
          error: 'INSUFFICIENT_STOCK',
          data: {
            textbook: item.textbook.title,
            required: studentCount,
            available: item.textbook.availableStock,
          },
        };
      }
    }

    // Create distribution with details
    const distribution = await prisma.textbookDistribution.create({
      data: {
        branchId: data.branchId,
        setId: data.setId,
        academicYear: data.academicYear,
        notes: data.notes,
        details: {
          create: set.items.map((item: any) => ({
            textbookId: item.textbookId,
            distributedQty: studentCount,
          })),
        },
      },
      include: {
        branch: { include: { teacher: true } },
        set: true,
        details: {
          include: { textbook: true },
        },
      },
    });

    // Update stock for each textbook
    for (const item of set.items) {
      await prisma.textbook.update({
        where: { id: item.textbookId },
        data: {
          availableStock: { decrement: studentCount },
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'CREATE',
        entityType: 'TEXTBOOK_DISTRIBUTION',
        entityId: distribution.id,
        details: JSON.stringify({
          branch: branch.name,
          set: set.name,
          academicYear: data.academicYear,
          studentCount,
        }),
      },
    });

    return { success: true, data: distribution };
  } catch (error) {
    console.error('Create textbook distribution error:', error);
    return { success: false, error: 'CREATE_DISTRIBUTION_ERROR' };
  }
});

ipcMain.handle('textbookDistributions:return', async (_, id: number, returnDetails: { textbookId: number; returnedQty: number; missingQty: number }[], userId: number, returnNotes?: string) => {
  try {
    const distribution = await prisma.textbookDistribution.findUnique({
      where: { id },
      include: {
        details: true,
        branch: true,
        set: true,
      },
    });

    if (!distribution) {
      return { success: false, error: 'DISTRIBUTION_NOT_FOUND' };
    }

    if (distribution.status === 'returned') {
      return { success: false, error: 'ALREADY_RETURNED' };
    }

    // Update each detail
    for (const detail of returnDetails) {
      await prisma.textbookDistributionDetail.updateMany({
        where: {
          distributionId: id,
          textbookId: detail.textbookId,
        },
        data: {
          returnedQty: detail.returnedQty,
          missingQty: detail.missingQty,
        },
      });

      // Return books to stock (only returned, not missing)
      await prisma.textbook.update({
        where: { id: detail.textbookId },
        data: {
          availableStock: { increment: detail.returnedQty },
        },
      });
    }

    // Determine status
    const totalDistributed = distribution.details.reduce((sum, d) => sum + d.distributedQty, 0);
    const totalReturned = returnDetails.reduce((sum, d) => sum + d.returnedQty, 0);
    const totalMissing = returnDetails.reduce((sum, d) => sum + d.missingQty, 0);

    let status = 'returned';
    if (totalMissing > 0) {
      status = 'partial';
    }

    const updated = await prisma.textbookDistribution.update({
      where: { id },
      data: {
        status,
        returnedAt: new Date(),
        returnNotes,
      },
      include: {
        branch: { include: { teacher: true } },
        set: true,
        details: {
          include: { textbook: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'UPDATE',
        entityType: 'TEXTBOOK_DISTRIBUTION',
        entityId: id,
        details: JSON.stringify({
          action: 'return',
          branch: distribution.branch.name,
          totalReturned,
          totalMissing,
        }),
      },
    });

    return { success: true, data: updated };
  } catch (error) {
    console.error('Return textbook distribution error:', error);
    return { success: false, error: 'RETURN_DISTRIBUTION_ERROR' };
  }
});

ipcMain.handle('textbookDistributions:delete', async (_, id: number, userId: number) => {
  try {
    const distribution = await prisma.textbookDistribution.findUnique({
      where: { id },
      include: {
        details: true,
        branch: true,
      },
    });

    if (!distribution) {
      return { success: false, error: 'DISTRIBUTION_NOT_FOUND' };
    }

    // Restore stock for non-returned items
    if (distribution.status === 'distributed') {
      for (const detail of distribution.details) {
        await prisma.textbook.update({
          where: { id: detail.textbookId },
          data: {
            availableStock: { increment: detail.distributedQty },
          },
        });
      }
    }

    await prisma.textbookDistribution.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'DELETE',
        entityType: 'TEXTBOOK_DISTRIBUTION',
        entityId: id,
        details: JSON.stringify({ branch: distribution.branch.name }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Delete textbook distribution error:', error);
    return { success: false, error: 'DELETE_DISTRIBUTION_ERROR' };
  }
});

// Textbook statistics
ipcMain.handle('textbookDistributions:getStatistics', async (_, academicYear?: string) => {
  try {
    const where: any = {};
    if (academicYear) {
      where.academicYear = academicYear;
    }

    const totalDistributions = await prisma.textbookDistribution.count({ where });
    const pendingReturns = await prisma.textbookDistribution.count({
      where: { ...where, status: 'distributed' },
    });
    const completedReturns = await prisma.textbookDistribution.count({
      where: { ...where, status: { in: ['returned', 'partial'] } },
    });

    // Get missing books count
    const distributions = await prisma.textbookDistribution.findMany({
      where,
      include: { details: true },
    });

    let totalMissingBooks = 0;
    for (const dist of distributions) {
      for (const detail of dist.details) {
        totalMissingBooks += detail.missingQty;
      }
    }

    // Get textbook stock summary
    const textbooks = await prisma.textbook.findMany();
    const totalTextbookStock = textbooks.reduce((sum, t) => sum + t.totalStock, 0);
    const availableTextbookStock = textbooks.reduce((sum, t) => sum + t.availableStock, 0);

    return {
      success: true,
      data: {
        totalDistributions,
        pendingReturns,
        completedReturns,
        totalMissingBooks,
        totalTextbookStock,
        availableTextbookStock,
      },
    };
  } catch (error) {
    console.error('Get textbook statistics error:', error);
    return { success: false, error: 'GET_STATISTICS_ERROR' };
  }
});

// ==========================================
// INDIVIDUAL TEXTBOOK DISTRIBUTION HANDLERS
// ==========================================

ipcMain.handle('individualDistributions:getAll', async (_, filters?: { academicYear?: string; status?: string; recipientType?: string; textbookId?: number }) => {
  try {
    const where: any = {};
    if (filters?.academicYear) {
      where.academicYear = filters.academicYear;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.recipientType) {
      where.recipientType = filters.recipientType;
    }
    if (filters?.textbookId) {
      where.textbookId = filters.textbookId;
    }

    const distributions = await prisma.individualTextbookDistribution.findMany({
      where,
      include: { textbook: true },
      orderBy: { distributedAt: 'desc' },
    });
    return { success: true, data: distributions };
  } catch (error) {
    console.error('Get individual distributions error:', error);
    return { success: false, error: 'GET_INDIVIDUAL_DISTRIBUTIONS_ERROR' };
  }
});

ipcMain.handle('individualDistributions:getById', async (_, id: number) => {
  try {
    const distribution = await prisma.individualTextbookDistribution.findUnique({
      where: { id },
      include: { textbook: true },
    });
    return { success: true, data: distribution };
  } catch (error) {
    console.error('Get individual distribution error:', error);
    return { success: false, error: 'GET_INDIVIDUAL_DISTRIBUTION_ERROR' };
  }
});

ipcMain.handle('individualDistributions:create', async (_, data: {
  textbookId: number;
  recipientType: string;
  recipientId: number;
  recipientName: string;
  quantity: number;
  academicYear: string;
  notes?: string;
}, userId: number) => {
  try {
    // Check textbook exists and has enough stock
    const textbook = await prisma.textbook.findUnique({ where: { id: data.textbookId } });
    if (!textbook) {
      return { success: false, error: 'TEXTBOOK_NOT_FOUND' };
    }
    if (textbook.availableStock < data.quantity) {
      return { success: false, error: 'INSUFFICIENT_STOCK' };
    }

    // Create distribution
    const distribution = await prisma.individualTextbookDistribution.create({
      data: {
        textbookId: data.textbookId,
        recipientType: data.recipientType,
        recipientId: data.recipientId,
        recipientName: data.recipientName,
        quantity: data.quantity,
        academicYear: data.academicYear,
        notes: data.notes,
      },
      include: { textbook: true },
    });

    // Update stock
    await prisma.textbook.update({
      where: { id: data.textbookId },
      data: {
        availableStock: { decrement: data.quantity },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'CREATE',
        entityType: 'INDIVIDUAL_DISTRIBUTION',
        entityId: distribution.id,
        details: JSON.stringify({
          textbook: textbook.title,
          recipient: data.recipientName,
          recipientType: data.recipientType,
          quantity: data.quantity,
        }),
      },
    });

    return { success: true, data: distribution };
  } catch (error) {
    console.error('Create individual distribution error:', error);
    return { success: false, error: 'CREATE_INDIVIDUAL_DISTRIBUTION_ERROR' };
  }
});

ipcMain.handle('individualDistributions:return', async (_, id: number, returnedQty: number, missingQty: number, returnNotes?: string, userId?: number) => {
  try {
    const distribution = await prisma.individualTextbookDistribution.findUnique({
      where: { id },
      include: { textbook: true },
    });

    if (!distribution) {
      return { success: false, error: 'DISTRIBUTION_NOT_FOUND' };
    }

    const totalProcessed = returnedQty + missingQty;
    if (totalProcessed > distribution.quantity) {
      return { success: false, error: 'INVALID_RETURN_QUANTITY' };
    }

    const status = missingQty > 0 ? 'partial' : 'returned';

    const updated = await prisma.individualTextbookDistribution.update({
      where: { id },
      data: {
        returnedQty,
        missingQty,
        returnNotes,
        status,
        returnedAt: new Date(),
      },
      include: { textbook: true },
    });

    // Restore returned stock
    await prisma.textbook.update({
      where: { id: distribution.textbookId },
      data: {
        availableStock: { increment: returnedQty },
      },
    });

    if (userId) {
      await prisma.auditLog.create({
        data: {
          actorUserId: userId,
          actionType: 'UPDATE',
          entityType: 'INDIVIDUAL_DISTRIBUTION',
          entityId: id,
          details: JSON.stringify({
            action: 'return',
            recipient: distribution.recipientName,
            returnedQty,
            missingQty,
          }),
        },
      });
    }

    return { success: true, data: updated };
  } catch (error) {
    console.error('Return individual distribution error:', error);
    return { success: false, error: 'RETURN_INDIVIDUAL_DISTRIBUTION_ERROR' };
  }
});

ipcMain.handle('individualDistributions:delete', async (_, id: number, userId: number) => {
  try {
    const distribution = await prisma.individualTextbookDistribution.findUnique({
      where: { id },
      include: { textbook: true },
    });

    if (!distribution) {
      return { success: false, error: 'DISTRIBUTION_NOT_FOUND' };
    }

    // Restore stock if not returned
    if (distribution.status === 'distributed') {
      await prisma.textbook.update({
        where: { id: distribution.textbookId },
        data: {
          availableStock: { increment: distribution.quantity },
        },
      });
    }

    await prisma.individualTextbookDistribution.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'DELETE',
        entityType: 'INDIVIDUAL_DISTRIBUTION',
        entityId: id,
        details: JSON.stringify({
          recipient: distribution.recipientName,
          textbook: distribution.textbook.title,
        }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Delete individual distribution error:', error);
    return { success: false, error: 'DELETE_INDIVIDUAL_DISTRIBUTION_ERROR' };
  }
});

// ==========================================
// CERTIFICATE AWARD HANDLERS
// ==========================================

ipcMain.handle('certificates:getTopStudents', async (_, period: string, type: string) => {
  try {
    let startDate: string;
    let endDate: string;

    if (type === 'monthly') {
      // period format: "2026-01"
      const [year, month] = period.split('-').map(Number);
      startDate = new Date(year, month - 1, 1).toISOString();
      endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
    } else {
      // period format: "2026"
      const year = parseInt(period);
      startDate = new Date(year, 0, 1).toISOString();
      endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();
    }

    const results: any[] = await prisma.$queryRaw`
      SELECT s."id", s."fullName", s."grade", COUNT(l."id") as "booksRead"
      FROM "Loan" l
      JOIN "Student" s ON l."studentId" = s."id"
      WHERE l."returnedAt" IS NOT NULL
        AND l."returnedAt" >= ${startDate}
        AND l."returnedAt" <= ${endDate}
      GROUP BY s."id", s."fullName", s."grade"
      ORDER BY COUNT(l."id") DESC
      LIMIT 3
    `;

    const mapped = results.map((r: any, idx: number) => ({
      id: r.id,
      fullName: r.fullName,
      grade: r.grade,
      booksRead: Number(r.booksRead),
      rank: idx + 1,
    }));

    return { success: true, data: mapped };
  } catch (error) {
    console.error('Get top students error:', error);
    return { success: false, error: 'GET_TOP_STUDENTS_ERROR' };
  }
});

ipcMain.handle('certificates:getTopClasses', async (_, period: string, type: string) => {
  try {
    let startDate: string;
    let endDate: string;

    if (type === 'monthly') {
      const [year, month] = period.split('-').map(Number);
      startDate = new Date(year, month - 1, 1).toISOString();
      endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
    } else {
      const year = parseInt(period);
      startDate = new Date(year, 0, 1).toISOString();
      endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();
    }

    const results: any[] = await prisma.$queryRaw`
      SELECT s."grade", COUNT(l."id") as "booksRead"
      FROM "Loan" l
      JOIN "Student" s ON l."studentId" = s."id"
      WHERE l."returnedAt" IS NOT NULL
        AND l."returnedAt" >= ${startDate}
        AND l."returnedAt" <= ${endDate}
      GROUP BY s."grade"
      ORDER BY COUNT(l."id") DESC
      LIMIT 3
    `;

    const mapped = results.map((r: any, idx: number) => ({
      grade: r.grade,
      booksRead: Number(r.booksRead),
      rank: idx + 1,
    }));

    return { success: true, data: mapped };
  } catch (error) {
    console.error('Get top classes error:', error);
    return { success: false, error: 'GET_TOP_CLASSES_ERROR' };
  }
});

ipcMain.handle('certificates:finalize', async (_, data: any, userId: number) => {
  try {
    const { type, period, awards } = data;

    // Delete existing awards for this period and type
    await prisma.$executeRaw`
      DELETE FROM "CertificateAward" WHERE "period" = ${period} AND "type" = ${type}
    `;

    // Get academic year from settings
    const settings: any[] = await prisma.$queryRaw`SELECT "academicYear" FROM "Settings" LIMIT 1`;
    const academicYear = settings.length > 0 ? settings[0].academicYear : null;

    // Insert new awards
    for (const award of awards) {
      await prisma.$executeRaw`
        INSERT INTO "CertificateAward" ("type", "category", "rank", "awardee", "awardeeId", "grade", "booksRead", "period", "academicYear")
        VALUES (${type}, ${award.category}, ${award.rank}, ${award.awardee}, ${award.awardeeId || null}, ${award.grade || null}, ${award.booksRead}, ${period}, ${academicYear || null})
      `;
    }

    if (userId) {
      await prisma.auditLog.create({
        data: {
          actorUserId: userId,
          actionType: 'CREATE',
          entityType: 'CERTIFICATE',
          entityId: 0,
          details: JSON.stringify({ type, period, count: awards.length }),
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Finalize certificates error:', error);
    return { success: false, error: 'FINALIZE_CERTIFICATES_ERROR' };
  }
});

ipcMain.handle('certificates:getHistory', async (_, filters?: { type?: string; category?: string }) => {
  try {
    let query = `SELECT * FROM "CertificateAward"`;
    const conditions: string[] = [];

    if (filters?.type) {
      conditions.push(`"type" = '${filters.type}'`);
    }
    if (filters?.category) {
      conditions.push(`"category" = '${filters.category}'`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY "createdAt" DESC`;

    const results = await prisma.$queryRawUnsafe(query);
    return { success: true, data: results };
  } catch (error) {
    console.error('Get certificate history error:', error);
    return { success: false, error: 'GET_CERTIFICATE_HISTORY_ERROR' };
  }
});

ipcMain.handle('certificates:delete', async (_, period: string, type: string, userId: number) => {
  try {
    await prisma.$executeRaw`
      DELETE FROM "CertificateAward" WHERE "period" = ${period} AND "type" = ${type}
    `;

    if (userId) {
      await prisma.auditLog.create({
        data: {
          actorUserId: userId,
          actionType: 'DELETE',
          entityType: 'CERTIFICATE',
          entityId: 0,
          details: JSON.stringify({ type, period }),
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Delete certificates error:', error);
    return { success: false, error: 'DELETE_CERTIFICATES_ERROR' };
  }
});

// ==========================================
// LIBRARY EVENTS HANDLERS
// ==========================================

ipcMain.handle('libraryEvents:getAll', async () => {
  try {
    const events = await prisma.libraryEvent.findMany({
      orderBy: { eventDate: 'desc' },
    });
    return { success: true, data: events };
  } catch (error) {
    console.error('Get library events error:', error);
    return { success: false, error: 'GET_EVENTS_ERROR' };
  }
});

ipcMain.handle('libraryEvents:getById', async (_, id: number) => {
  try {
    const event = await prisma.libraryEvent.findUnique({
      where: { id },
    });
    return { success: true, data: event };
  } catch (error) {
    console.error('Get library event error:', error);
    return { success: false, error: 'GET_EVENT_ERROR' };
  }
});

ipcMain.handle('libraryEvents:create', async (_, data: any, userId: number) => {
  try {
    const event = await prisma.libraryEvent.create({
      data: {
        title: data.title,
        topic: data.topic || null,
        eventDate: new Date(data.eventDate),
        eventTime: data.eventTime || null,
        participants: data.participants || null,
        content: data.content || null,
        notes: data.notes || null,
        photo: data.photo || null,
        createdBy: userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'CREATE',
        entityType: 'LIBRARY_EVENT',
        entityId: event.id,
        details: JSON.stringify({ title: event.title }),
      },
    });

    return { success: true, data: event };
  } catch (error) {
    console.error('Create library event error:', error);
    return { success: false, error: 'CREATE_EVENT_ERROR' };
  }
});

ipcMain.handle('libraryEvents:update', async (_, id: number, data: any, userId: number) => {
  try {
    const event = await prisma.libraryEvent.update({
      where: { id },
      data: {
        title: data.title,
        topic: data.topic || null,
        eventDate: new Date(data.eventDate),
        eventTime: data.eventTime || null,
        participants: data.participants || null,
        content: data.content || null,
        notes: data.notes || null,
        photo: data.photo || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'UPDATE',
        entityType: 'LIBRARY_EVENT',
        entityId: event.id,
        details: JSON.stringify({ title: event.title }),
      },
    });

    return { success: true, data: event };
  } catch (error) {
    console.error('Update library event error:', error);
    return { success: false, error: 'UPDATE_EVENT_ERROR' };
  }
});

ipcMain.handle('libraryEvents:delete', async (_, id: number, userId: number) => {
  try {
    const event = await prisma.libraryEvent.findUnique({ where: { id } });
    if (!event) {
      return { success: false, error: 'EVENT_NOT_FOUND' };
    }

    await prisma.libraryEvent.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'DELETE',
        entityType: 'LIBRARY_EVENT',
        entityId: id,
        details: JSON.stringify({ title: event.title }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Delete library event error:', error);
    return { success: false, error: 'DELETE_EVENT_ERROR' };
  }
});

// ==========================================
// LICENSE IPC HANDLERS
// ==========================================

ipcMain.handle('license:getStatus', async () => {
  try {
    return { success: true, data: getLicenseStatus() };
  } catch (error) {
    console.error('Get license status error:', error);
    return { success: false, error: 'LICENSE_STATUS_ERROR' };
  }
});

ipcMain.handle('license:activate', async (_, licenseKey: string) => {
  try {
    const result = activateLicense(licenseKey.trim());
    return { success: result.success, data: result.status, error: result.error };
  } catch (error) {
    console.error('Activate license error:', error);
    return { success: false, error: 'ACTIVATION_ERROR' };
  }
});

ipcMain.handle('license:deactivate', async () => {
  try {
    const status = deactivateLicense();
    return { success: true, data: status };
  } catch (error) {
    console.error('Deactivate license error:', error);
    return { success: false, error: 'DEACTIVATION_ERROR' };
  }
});
