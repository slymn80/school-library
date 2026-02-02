import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'school-library-server-secret';

app.use(cors());
app.use(express.json());

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check admin role
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'ADMIN_REQUIRED' });
  }
  next();
};

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return res.json({ success: false, error: 'USER_NOT_FOUND' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.json({ success: false, error: 'INVALID_PASSWORD' });
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

    res.json({
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
    });
  } catch (error) {
    console.error('Login error:', error);
    res.json({ success: false, error: 'LOGIN_ERROR' });
  }
});

app.post('/api/auth/change-password', authenticateToken, async (req: any, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.json({ success: false, error: 'USER_NOT_FOUND' });
    }

    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) {
      return res.json({ success: false, error: 'INVALID_PASSWORD' });
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
        details: JSON.stringify({}),
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.json({ success: false, error: 'CHANGE_PASSWORD_ERROR' });
  }
});

// Books routes
app.get('/api/books', authenticateToken, async (req: any, res) => {
  try {
    const { search, categoryId } = req.query;
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { isbn: { contains: search, mode: 'insensitive' } },
        { inventoryNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }

    const books = await prisma.book.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: books });
  } catch (error) {
    console.error('Get books error:', error);
    res.json({ success: false, error: 'GET_BOOKS_ERROR' });
  }
});

app.get('/api/books/:id', authenticateToken, async (req, res) => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { category: true },
    });
    res.json({ success: true, data: book });
  } catch (error) {
    console.error('Get book error:', error);
    res.json({ success: false, error: 'GET_BOOK_ERROR' });
  }
});

app.post('/api/books', authenticateToken, async (req: any, res) => {
  try {
    const data = req.body;
    const existingBook = await prisma.book.findUnique({
      where: { inventoryNumber: data.inventoryNumber },
    });
    if (existingBook) {
      return res.json({ success: false, error: 'INVENTORY_NUMBER_EXISTS' });
    }

    const book = await prisma.book.create({
      data: { ...data, availableCopies: data.totalCopies },
      include: { category: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actionType: 'CREATE',
        entityType: 'BOOK',
        entityId: book.id,
        details: JSON.stringify({ title: book.title, inventoryNumber: book.inventoryNumber }),
      },
    });

    res.json({ success: true, data: book });
  } catch (error) {
    console.error('Create book error:', error);
    res.json({ success: false, error: 'CREATE_BOOK_ERROR' });
  }
});

app.put('/api/books/:id', authenticateToken, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;

    if (data.inventoryNumber) {
      const existingBook = await prisma.book.findFirst({
        where: { inventoryNumber: data.inventoryNumber, id: { not: id } },
      });
      if (existingBook) {
        return res.json({ success: false, error: 'INVENTORY_NUMBER_EXISTS' });
      }
    }

    const book = await prisma.book.update({
      where: { id },
      data,
      include: { category: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actionType: 'UPDATE',
        entityType: 'BOOK',
        entityId: book.id,
        details: JSON.stringify({ title: book.title }),
      },
    });

    res.json({ success: true, data: book });
  } catch (error) {
    console.error('Update book error:', error);
    res.json({ success: false, error: 'UPDATE_BOOK_ERROR' });
  }
});

app.delete('/api/books/:id', authenticateToken, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) {
      return res.json({ success: false, error: 'BOOK_NOT_FOUND' });
    }

    const activeLoans = await prisma.loan.findFirst({
      where: { bookId: id, returnedAt: null },
    });
    if (activeLoans) {
      return res.json({ success: false, error: 'BOOK_HAS_ACTIVE_LOANS' });
    }

    await prisma.book.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actionType: 'DELETE',
        entityType: 'BOOK',
        entityId: id,
        details: JSON.stringify({ title: book.title }),
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete book error:', error);
    res.json({ success: false, error: 'DELETE_BOOK_ERROR' });
  }
});

// Categories routes
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.json({ success: false, error: 'GET_CATEGORIES_ERROR' });
  }
});

app.post('/api/categories', authenticateToken, async (req: any, res) => {
  try {
    const category = await prisma.category.create({ data: req.body });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actionType: 'CREATE',
        entityType: 'CATEGORY',
        entityId: category.id,
        details: JSON.stringify({ name: category.name }),
      },
    });

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Create category error:', error);
    res.json({ success: false, error: 'CREATE_CATEGORY_ERROR' });
  }
});

// Students routes
app.get('/api/students', authenticateToken, async (req: any, res) => {
  try {
    const { search, grade } = req.query;
    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (grade) {
      where.grade = grade;
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { fullName: 'asc' },
    });

    res.json({ success: true, data: students });
  } catch (error) {
    console.error('Get students error:', error);
    res.json({ success: false, error: 'GET_STUDENTS_ERROR' });
  }
});

app.get('/api/students/:id', authenticateToken, async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Get student error:', error);
    res.json({ success: false, error: 'GET_STUDENT_ERROR' });
  }
});

app.post('/api/students', authenticateToken, async (req: any, res) => {
  try {
    const data = req.body;
    const existingStudent = await prisma.student.findUnique({
      where: { studentId: data.studentId },
    });
    if (existingStudent) {
      return res.json({ success: false, error: 'STUDENT_ID_EXISTS' });
    }

    const student = await prisma.student.create({ data });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actionType: 'CREATE',
        entityType: 'STUDENT',
        entityId: student.id,
        details: JSON.stringify({ fullName: student.fullName }),
      },
    });

    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Create student error:', error);
    res.json({ success: false, error: 'CREATE_STUDENT_ERROR' });
  }
});

app.put('/api/students/:id', authenticateToken, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;

    if (data.studentId) {
      const existingStudent = await prisma.student.findFirst({
        where: { studentId: data.studentId, id: { not: id } },
      });
      if (existingStudent) {
        return res.json({ success: false, error: 'STUDENT_ID_EXISTS' });
      }
    }

    const student = await prisma.student.update({ where: { id }, data });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actionType: 'UPDATE',
        entityType: 'STUDENT',
        entityId: student.id,
        details: JSON.stringify({ fullName: student.fullName }),
      },
    });

    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Update student error:', error);
    res.json({ success: false, error: 'UPDATE_STUDENT_ERROR' });
  }
});

app.delete('/api/students/:id', authenticateToken, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return res.json({ success: false, error: 'STUDENT_NOT_FOUND' });
    }

    const activeLoans = await prisma.loan.findFirst({
      where: { studentId: id, returnedAt: null },
    });
    if (activeLoans) {
      return res.json({ success: false, error: 'STUDENT_HAS_ACTIVE_LOANS' });
    }

    await prisma.student.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actionType: 'DELETE',
        entityType: 'STUDENT',
        entityId: id,
        details: JSON.stringify({ fullName: student.fullName }),
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete student error:', error);
    res.json({ success: false, error: 'DELETE_STUDENT_ERROR' });
  }
});

// Loans routes
app.get('/api/loans', authenticateToken, async (req: any, res) => {
  try {
    const { status, studentId } = req.query;
    const where: any = {};

    if (status === 'active') {
      where.returnedAt = null;
    } else if (status === 'returned') {
      where.returnedAt = { not: null };
    } else if (status === 'overdue') {
      where.returnedAt = null;
      where.dueDate = { lt: new Date() };
    }
    if (studentId) {
      where.studentId = parseInt(studentId);
    }

    const loans = await prisma.loan.findMany({
      where,
      include: {
        book: { include: { category: true } },
        student: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: loans });
  } catch (error) {
    console.error('Get loans error:', error);
    res.json({ success: false, error: 'GET_LOANS_ERROR' });
  }
});

app.post('/api/loans', authenticateToken, async (req: any, res) => {
  try {
    const data = req.body;
    const book = await prisma.book.findUnique({ where: { id: data.bookId } });
    if (!book) {
      return res.json({ success: false, error: 'BOOK_NOT_FOUND' });
    }
    if (book.availableCopies <= 0) {
      return res.json({ success: false, error: 'BOOK_NOT_AVAILABLE' });
    }

    const student = await prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student) {
      return res.json({ success: false, error: 'STUDENT_NOT_FOUND' });
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
        actorUserId: req.user.id,
        actionType: 'CREATE',
        entityType: 'LOAN',
        entityId: loan.id,
        details: JSON.stringify({ book: book.title, student: student.fullName }),
      },
    });

    res.json({ success: true, data: loan });
  } catch (error) {
    console.error('Create loan error:', error);
    res.json({ success: false, error: 'CREATE_LOAN_ERROR' });
  }
});

app.post('/api/loans/:id/return', authenticateToken, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { book: true, student: true },
    });
    if (!loan) {
      return res.json({ success: false, error: 'LOAN_NOT_FOUND' });
    }
    if (loan.returnedAt) {
      return res.json({ success: false, error: 'LOAN_ALREADY_RETURNED' });
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
        actorUserId: req.user.id,
        actionType: 'RETURN',
        entityType: 'LOAN',
        entityId: loan.id,
        details: JSON.stringify({ book: loan.book.title, student: loan.student.fullName, fee }),
      },
    });

    res.json({ success: true, data: updatedLoan });
  } catch (error) {
    console.error('Return loan error:', error);
    res.json({ success: false, error: 'RETURN_LOAN_ERROR' });
  }
});

// Users routes (Admin only)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
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
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    res.json({ success: false, error: 'GET_USERS_ERROR' });
  }
});

app.post('/api/users', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const data = req.body;
    const existingUser = await prisma.user.findUnique({ where: { username: data.username } });
    if (existingUser) {
      return res.json({ success: false, error: 'USERNAME_EXISTS' });
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
        actorUserId: req.user.id,
        actionType: 'CREATE',
        entityType: 'USER',
        entityId: user.id,
        details: JSON.stringify({ username: user.username }),
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Create user error:', error);
    res.json({ success: false, error: 'CREATE_USER_ERROR' });
  }
});

app.put('/api/users/:id', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;

    if (data.username) {
      const existingUser = await prisma.user.findFirst({
        where: { username: data.username, id: { not: id } },
      });
      if (existingUser) {
        return res.json({ success: false, error: 'USERNAME_EXISTS' });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        username: data.username,
        fullName: data.fullName,
        role: data.role,
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
        actorUserId: req.user.id,
        actionType: 'UPDATE',
        entityType: 'USER',
        entityId: user.id,
        details: JSON.stringify({ username: user.username }),
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Update user error:', error);
    res.json({ success: false, error: 'UPDATE_USER_ERROR' });
  }
});

app.post('/api/users/:id/reset-password', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { newPassword } = req.body;

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword, mustChangePassword: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actionType: 'RESET_PASSWORD',
        entityType: 'USER',
        entityId: id,
        details: JSON.stringify({}),
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    res.json({ success: false, error: 'RESET_PASSWORD_ERROR' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.json({ success: false, error: 'USER_NOT_FOUND' });
    }
    if (user.username === 'admin') {
      return res.json({ success: false, error: 'CANNOT_DELETE_ADMIN' });
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actionType: 'DELETE',
        entityType: 'USER',
        entityId: id,
        details: JSON.stringify({ username: user.username }),
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.json({ success: false, error: 'DELETE_USER_ERROR' });
  }
});

// Settings routes
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const settings = await prisma.settings.findFirst();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.json({ success: false, error: 'GET_SETTINGS_ERROR' });
  }
});

app.put('/api/settings', authenticateToken, async (req: any, res) => {
  try {
    const existingSettings = await prisma.settings.findFirst();
    let settings;

    if (existingSettings) {
      settings = await prisma.settings.update({
        where: { id: existingSettings.id },
        data: req.body,
      });
    } else {
      settings = await prisma.settings.create({ data: req.body });
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actionType: 'UPDATE',
        entityType: 'SETTINGS',
        entityId: settings.id,
        details: JSON.stringify(req.body),
      },
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.json({ success: false, error: 'UPDATE_SETTINGS_ERROR' });
  }
});

// Audit log routes
app.get('/api/audit', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { actionType, entityType } = req.query;
    const where: any = {};

    if (actionType) {
      where.actionType = actionType;
    }
    if (entityType) {
      where.entityType = entityType;
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

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.json({ success: false, error: 'GET_AUDIT_LOGS_ERROR' });
  }
});

// Statistics route
app.get('/api/reports/statistics', authenticateToken, async (req, res) => {
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

    res.json({
      success: true,
      data: {
        totalBooks,
        totalStudents,
        activeLoans,
        overdueLoans,
        totalLoansThisMonth,
      },
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.json({ success: false, error: 'GET_STATISTICS_ERROR' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize and start server
async function main() {
  // Check if admin exists, create if not
  const adminExists = await prisma.user.findFirst({ where: { username: 'admin' } });
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

  // Check if default categories exist
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

  // Check if default settings exist
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

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
