# School Library Management System

A production-ready Windows desktop application for school library management built with Electron, React, and TypeScript.

## Features

- **Multi-language support**: Russian (ru) and Kazakh (kk)
- **Offline-first**: Works without internet using local SQLite database
- **Complete library management**:
  - Books inventory with barcode generation (Code128)
  - Student/member management
  - Loan tracking with overdue fees
  - Reports and statistics
- **Security**: Password hashing, role-based access control
- **Data export**: Excel and PDF reports
- **Backup/Restore**: Database backup and recovery

## Tech Stack

- **Frontend**: React 18, TypeScript, Material UI, Vite
- **Backend**: Electron (main + preload)
- **Database**: SQLite with Prisma ORM
- **Localization**: i18next + react-i18next
- **Barcode**: bwip-js (Code128)
- **Export**: ExcelJS, jsPDF

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- Git

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd school-library
```

2. Install dependencies:
```bash
npm install
```

3. Generate Prisma client:
```bash
npx prisma generate
```

4. Create database and run migrations:
```bash
npx prisma migrate dev --name init
```

5. Seed the database with initial data:
```bash
npx ts-node prisma/seed.ts
```

## Running the Application

### Development Mode

```bash
npm run dev
```

This will start both the Vite development server and Electron.

### Production Build

```bash
npm run build
npm run package
```

The installer will be created in the `release/` folder.

## Default Login Credentials

- **Username**: admin
- **Password**: admin123

**Note**: You will be prompted to change your password on first login.

## Project Structure

```
school-library/
├── electron/
│   ├── main.ts           # Electron main process
│   └── preload.ts        # Preload script for IPC
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seeding
├── src/
│   ├── components/       # React components
│   ├── pages/            # Page components
│   ├── store/            # Zustand state management
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   ├── locales/          # Translation files
│   │   ├── ru/
│   │   └── kk/
│   ├── App.tsx           # Main App component
│   ├── main.tsx          # React entry point
│   └── i18n.ts           # i18next configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Database Modes

### Mode A: Local SQLite (Default)
- Data stored in user's AppData folder
- Works completely offline
- No additional setup required

### Mode B: Server Mode (Optional)
For shared database across multiple computers on a local network, set up the server:

1. Set up PostgreSQL database
2. Configure server in `/server` folder
3. Set `SERVER_URL` environment variable in the client app

## User Roles

- **Admin**: Full access to all features including user management and audit logs
- **Librarian**: Access to books, students, loans, reports, and settings

## Features Guide

### Books Management
- Add, edit, delete books
- Search by title, author, ISBN, inventory number
- Filter by category
- Generate and print barcode labels
- Import/export from Excel

### Students Management
- Add, edit, delete students
- Search by name, student ID
- Filter by grade/class
- Track active loans per student

### Loans Management
- Issue new loans with due date
- Return books with automatic fee calculation
- View active, returned, and overdue loans
- Export loan reports

### Barcode Labels
- Generate Code128 barcodes from inventory numbers
- Multiple label sizes (30x15mm, 50x25mm, 70x35mm)
- Print preview and PDF export
- Batch printing support

### Reports
- Books inventory (Excel/PDF)
- Students list (Excel)
- Active loans (Excel)
- Overdue report with fees (Excel/PDF)

### Settings
- Fee per day configuration
- School name customization
- Database backup and restore

## Git Initialization

```bash
# Initialize Git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: School Library Management System

Features:
- Electron + React + TypeScript
- SQLite database with Prisma ORM
- Multi-language support (RU/KK)
- Books, Students, Loans management
- Barcode generation and printing
- Excel/PDF export
- User authentication and roles
- Audit logging
- Backup/restore"

# Add remote (replace with your repository URL)
git remote add origin <your-repository-url>

# Push to remote
git push -u origin main
```

## License

MIT License

## Support

For issues and feature requests, please create an issue in the repository.
