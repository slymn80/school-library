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
  nameTr?: string;
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
  language?: string;
  coverImage?: string;
  acquisitionType?: 'purchase' | 'donation' | 'grant';
  donorName?: string;
  acquisitionDate?: string;
  condition?: 'good' | 'worn' | 'damaged' | 'lost' | 'repair';
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
  photo?: string;
  notes?: string;
  rewardPoints?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Reservation {
  id: number;
  bookId: number;
  book?: Book;
  studentId: number;
  student?: Student;
  requestDate: string;
  status: 'waiting' | 'notified' | 'cancelled' | 'fulfilled';
  notifiedAt?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Favorite {
  id: number;
  bookId: number;
  book?: Book;
  studentId: number;
  student?: Student;
  createdAt?: string;
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

export interface BackupHistoryEntry {
  date: string;
  path?: string;
}

export interface Settings {
  id: number;
  feePerDay: number;
  schoolName: string;
  schoolNameKk: string;
  schoolNameTr: string;
  schoolNameEn?: string;
  schoolLogo?: string;
  autoBackupEnabled?: boolean;
  autoBackupInterval?: number; // in days
  autoBackupPath?: string;
  lastAutoBackup?: string;
  manualBackupHistory?: string; // JSON string of BackupHistoryEntry[]
  restoreHistory?: string; // JSON string of BackupHistoryEntry[]
  autoBackupHistory?: string; // JSON string of BackupHistoryEntry[]
  academicYear?: string;
  principalName?: string;
  librarianName?: string;
}

export interface CertificateAward {
  id: number;
  type: string;
  category: string;
  rank: number;
  awardee: string;
  awardeeId?: number;
  grade?: string;
  booksRead: number;
  period: string;
  academicYear?: string;
  createdAt: string;
}

export interface LibraryEvent {
  id: number;
  title: string;
  topic?: string;
  eventDate: string;
  eventTime?: string;
  participants?: string;
  content?: string;
  notes?: string;
  photo?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
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
  topStudent?: {
    id: number;
    fullName: string;
    grade: string;
    rewardPoints: number;
  };
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
  language?: string;
  coverImage?: string;
  acquisitionType?: 'purchase' | 'donation' | 'grant';
  donorName?: string;
  acquisitionDate?: string;
  condition?: 'good' | 'worn' | 'damaged' | 'lost' | 'repair';
}

export interface StudentFormData {
  fullName: string;
  studentId: string;
  grade: string;
  school: string;
  branch?: string;
  phone?: string;
  photo?: string;
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

export interface BackupFile {
  name: string;
  path: string;
  date: string;
  size: number;
}
