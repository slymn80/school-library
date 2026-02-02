export interface User {
  id: number;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'LIBRARIAN';
  mustChangePassword: boolean;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  nameKk: string;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  year?: number;
  categoryId: number;
  category?: Category;
  shelfLocation?: string;
  inventoryNumber: string;
  totalCopies: number;
  availableCopies: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  id: number;
  fullName: string;
  studentId: string;
  grade: string;
  school: string;
  branch?: string;
  phone?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Loan {
  id: number;
  bookId: number;
  book?: Book;
  studentId: number;
  student?: Student;
  loanDate: string;
  dueDate: string;
  returnedAt?: string;
  fee: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Settings {
  id: number;
  feePerDay: number;
  schoolName: string;
  schoolNameKk: string;
  schoolLogo?: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  actorUserId: number;
  actorUser?: {
    id: number;
    username: string;
    fullName: string;
  };
  actionType: string;
  entityType: string;
  entityId: number;
  details: string;
}

export interface Statistics {
  totalBooks: number;
  totalStudents: number;
  activeLoans: number;
  overdueLoans: number;
  totalLoansThisMonth: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BookFormData {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  year?: number;
  categoryId: number;
  shelfLocation?: string;
  inventoryNumber: string;
  totalCopies: number;
  notes?: string;
}

export interface StudentFormData {
  fullName: string;
  studentId: string;
  grade: string;
  school: string;
  branch?: string;
  phone?: string;
  notes?: string;
}

export interface LoanFormData {
  studentId: number;
  bookId: number;
  loanDate: string;
  dueDate: string;
}

export interface UserFormData {
  username: string;
  fullName: string;
  password?: string;
  role: 'ADMIN' | 'LIBRARIAN';
}

export interface LabelTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  labelsPerRow: number;
  labelsPerPage: number;
}
