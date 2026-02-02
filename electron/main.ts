import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'school-library-secret-key-2024';
const isDev = process.env.NODE_ENV !== 'production';

let mainWindow: BrowserWindow | null = null;
let prisma: PrismaClient;

function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'library.db');
}

function initDatabase(): void {
  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  process.env.DATABASE_URL = `file:${dbPath}`;
  prisma = new PrismaClient();
}

async function createWindow(): Promise<void> {
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
    icon: path.join(__dirname, '../public/icon.ico'),
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize database and create default admin if needed
async function initializeApp(): Promise<void> {
  initDatabase();

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
          schoolName: 'Талгарская частная школа-интернат-лицей №1',
          schoolNameKk: 'Талғар жеке мектеп-интернат лицейі №1',
        },
      });
      console.log('Default settings created');
    }
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

app.whenReady().then(async () => {
  await initializeApp();
  await createWindow();

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
ipcMain.handle('books:getAll', async (_, filters?: { search?: string; categoryId?: number }) => {
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
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
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

ipcMain.handle('categories:create', async (_, data: { name: string; nameKk: string }, userId: number) => {
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

    if (returnedAt > loan.dueDate) {
      const settings = await prisma.settings.findFirst();
      const feePerDay = settings?.feePerDay || 50;
      const overdueDays = Math.ceil(
        (returnedAt.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      fee = overdueDays * feePerDay;
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
        }),
      },
    });

    return { success: true, data: updatedLoan };
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
    const settings = await prisma.settings.findFirst();
    return { success: true, data: settings };
  } catch (error) {
    console.error('Get settings error:', error);
    return { success: false, error: 'GET_SETTINGS_ERROR' };
  }
});

ipcMain.handle('settings:update', async (_, data: any, userId: number) => {
  try {
    const existingSettings = await prisma.settings.findFirst();
    let settings;

    if (existingSettings) {
      settings = await prisma.settings.update({
        where: { id: existingSettings.id },
        data,
      });
    } else {
      settings = await prisma.settings.create({ data });
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
ipcMain.handle('backup:create', async () => {
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
    return { success: true, data: { path: result.filePath } };
  } catch (error) {
    console.error('Create backup error:', error);
    return { success: false, error: 'CREATE_BACKUP_ERROR' };
  }
});

ipcMain.handle('backup:restore', async () => {
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
    prisma = new PrismaClient();

    return { success: true };
  } catch (error) {
    console.error('Restore backup error:', error);
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

    return {
      success: true,
      data: {
        totalBooks,
        totalStudents,
        activeLoans,
        overdueLoans,
        totalLoansThisMonth,
      },
    };
  } catch (error) {
    console.error('Get statistics error:', error);
    return { success: false, error: 'GET_STATISTICS_ERROR' };
  }
});
