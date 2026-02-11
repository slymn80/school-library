# School Library Management System

A production-ready Windows desktop application for school library and textbook distribution management built with Electron, React, and TypeScript.

## Features

### Library Module
- Books inventory with barcode generation (Code128)
- Student/member management
- Loan tracking with overdue fees
- Book recommendations (collaborative filtering)
- Reservations and favorites
- Library events management with photo upload
- Certificate awards for top readers
- Inventory count
- Reports and statistics with charts

### Textbook Distribution Module
- Teachers and class branches management
- Textbook catalog with stock tracking
- Textbook sets (grade-based grouping)
- Class-based distribution and return
- Individual distribution (teacher/student)
- Distribution reports and statistics

### General
- **4 languages**: Kazakh, Russian, Turkish, English
- **Offline-first**: Local SQLite database, no internet required
- **License system**: 30-day trial + license key activation
- **Security**: Password hashing (bcrypt), role-based access (Admin/Librarian)
- **Data export**: Excel (ExcelJS) and PDF (jsPDF) reports with Cyrillic support
- **Backup/Restore**: Manual and automatic database backup
- **Audit log**: All actions tracked with user info

## Tech Stack

- **Frontend**: React 18, TypeScript, Material UI 5, Recharts
- **Backend**: Electron 28 (main + preload)
- **Database**: SQLite with Prisma ORM
- **Localization**: i18next (kk, ru, tr, en)
- **Barcode**: bwip-js (Code128)
- **Export**: ExcelJS, jsPDF + jspdf-autotable
- **Build**: Vite, electron-builder (NSIS installer)

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm
- Git

## Installation

```bash
git clone <repository-url>
cd school-library
npm install
```

## Running

### Development

```bash
npm run dev
```

Starts Vite dev server + Electron simultaneously.

### Production Build

```bash
npm run package
```

Creates `build-output/School Library Setup X.X.X.exe` (NSIS installer).

The installer creates:
- Desktop shortcut
- Start menu shortcut
- Entry in Programs & Features (Add/Remove Programs)

## Default Login

- **Username**: `admin`
- **Password**: `admin123`

First login requires a password change.

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full access + user management + audit log |
| **Librarian** | Books, students, loans, reports, settings |

## Project Structure

```
school-library/
├── electron/
│   ├── main.ts              # Electron main process, DB init, IPC handlers
│   └── preload.ts           # contextBridge API definitions
├── prisma/
│   └── schema.prisma        # Database schema
├── scripts/
│   ├── generate-license.ts  # License key generator (developer tool)
│   ├── patch-icon.js        # Post-build icon patcher
│   └── create-icon.js       # App icon generator
├── src/
│   ├── components/
│   │   ├── Layout.tsx        # Library module sidebar layout
│   │   └── TextbookLayout.tsx# Textbook module sidebar layout
│   ├── pages/
│   │   ├── LicensePage.tsx   # License activation screen
│   │   ├── LoginPage.tsx     # Login screen
│   │   ├── ModuleSelectionPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── BooksPage.tsx / BookFormPage.tsx
│   │   ├── StudentsPage.tsx / StudentFormPage.tsx
│   │   ├── LoansPage.tsx / LoanFormPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── StatisticsPage.tsx
│   │   ├── CertificatesPage.tsx
│   │   ├── InventoryCountPage.tsx
│   │   ├── LibraryEventsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── UsersPage.tsx / UserFormPage.tsx
│   │   ├── AuditLogPage.tsx
│   │   ├── BarcodeLabelsPage.tsx
│   │   └── textbook/         # Textbook module pages
│   ├── store/
│   │   └── authStore.ts      # Zustand auth state
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   ├── utils/
│   │   ├── export.ts         # Excel/PDF export functions
│   │   └── pdf-fonts.ts      # Cyrillic font for jsPDF
│   ├── locales/
│   │   ├── kk/translation.json
│   │   ├── ru/translation.json
│   │   ├── tr/translation.json
│   │   └── en/translation.json
│   ├── App.tsx
│   ├── main.tsx
│   └── i18n.ts
├── public/
│   ├── icon.png
│   └── icon.ico
└── package.json
```

## Data Storage

All data is stored in the user's AppData directory:

```
%AppData%/school-library/
├── library.db        # SQLite database
├── license.json      # License/trial information
├── app.log           # Application log
└── backups/          # Auto backup files
```

## License System

The app includes a built-in license system:

- **Trial**: 30-day free trial starts on first launch (all features available)
- **PRO**: Activated with a license key (no feature restrictions)
- License status is visible in the sidebar and in Settings
- When expired, a new key can be entered from Settings to continue

See [LICENSE-GENERATOR.md](LICENSE-GENERATOR.md) for license key generation instructions.

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development mode |
| `npm run build` | Build for production |
| `npm run package` | Build + create NSIS installer |
| `npm run generate-license` | Generate a license key (see docs) |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:studio` | Open Prisma Studio (DB browser) |
