import { contextBridge, ipcRenderer } from 'electron';

export interface AuthAPI {
  login: (username: string, password: string) => Promise<any>;
  changePassword: (userId: number, oldPassword: string, newPassword: string) => Promise<any>;
}

export interface BooksAPI {
  getAll: (filters?: {
    search?: string;
    categoryId?: number;
    categoryIds?: number[];
    yearFrom?: number;
    yearTo?: number;
    isDonated?: boolean;
    condition?: string;
    acquisitionType?: string;
  }) => Promise<any>;
  getById: (id: number) => Promise<any>;
  create: (data: any, userId: number) => Promise<any>;
  update: (id: number, data: any, userId: number) => Promise<any>;
  delete: (id: number, userId: number) => Promise<any>;
  getRecommendations: (studentId: number, limit?: number) => Promise<any>;
}

export interface CategoriesAPI {
  getAll: () => Promise<any>;
  create: (data: { name: string; nameKk: string; nameTr?: string }, userId: number) => Promise<any>;
  update: (id: number, data: { name: string; nameKk: string; nameTr?: string }, userId: number) => Promise<any>;
  delete: (id: number, userId: number) => Promise<any>;
}

export interface StudentsAPI {
  getAll: (filters?: { search?: string; grade?: string }) => Promise<any>;
  getById: (id: number) => Promise<any>;
  create: (data: any, userId: number) => Promise<any>;
  update: (id: number, data: any, userId: number) => Promise<any>;
  delete: (id: number, userId: number) => Promise<any>;
}

export interface LoansAPI {
  getAll: (filters?: { status?: string; studentId?: number }) => Promise<any>;
  create: (data: any, userId: number) => Promise<any>;
  return: (id: number, userId: number) => Promise<any>;
}

export interface UsersAPI {
  getAll: () => Promise<any>;
  create: (data: any, actorUserId: number) => Promise<any>;
  update: (id: number, data: any, actorUserId: number) => Promise<any>;
  resetPassword: (id: number, newPassword: string, actorUserId: number) => Promise<any>;
  delete: (id: number, actorUserId: number) => Promise<any>;
}

export interface SettingsAPI {
  get: () => Promise<any>;
  update: (data: any, userId: number) => Promise<any>;
}

export interface AuditAPI {
  getAll: (filters?: { actionType?: string; entityType?: string }) => Promise<any>;
}

export interface BackupAPI {
  create: (userId?: number) => Promise<any>;
  restore: (userId?: number) => Promise<any>;
  selectFolder: () => Promise<any>;
  checkAutoBackup: () => Promise<any>;
  getHistory: () => Promise<any>;
  getActivityHistory: () => Promise<any>;
  deleteBackup: (filePath: string) => Promise<any>;
  restoreFromFile: (filePath: string, userId?: number) => Promise<any>;
}

export interface ReportsAPI {
  getStatistics: () => Promise<any>;
  getReadingTrends: (period?: 'monthly' | 'yearly') => Promise<any>;
  getPopularBooks: (limit?: number) => Promise<any>;
  getPopularCategories: (limit?: number) => Promise<any>;
  getGradeStatistics: () => Promise<any>;
  getClassReport: (grade: string) => Promise<any>;
}

export interface ReservationsAPI {
  getAll: (filters?: { bookId?: number; studentId?: number; status?: string }) => Promise<any>;
  create: (data: { bookId: number; studentId: number }, userId: number) => Promise<any>;
  cancel: (id: number, userId: number) => Promise<any>;
  getNextInQueue: (bookId: number) => Promise<any>;
}

export interface FavoritesAPI {
  getByStudent: (studentId: number) => Promise<any>;
  toggle: (bookId: number, studentId: number) => Promise<any>;
  check: (bookId: number, studentId: number) => Promise<any>;
}

// ==========================================
// TEXTBOOK DISTRIBUTION MODULE APIs
// ==========================================

export interface TeachersAPI {
  getAll: () => Promise<any>;
  getById: (id: number) => Promise<any>;
  create: (data: { fullName: string; phone?: string }, userId: number) => Promise<any>;
  update: (id: number, data: { fullName?: string; phone?: string }, userId: number) => Promise<any>;
  delete: (id: number, userId: number) => Promise<any>;
}

export interface BranchesAPI {
  getAll: (filters?: { grade?: number }) => Promise<any>;
  getById: (id: number) => Promise<any>;
  create: (data: { name: string; grade: number; teacherId?: number; studentCount?: number }, userId: number) => Promise<any>;
  update: (id: number, data: { name?: string; grade?: number; teacherId?: number | null; studentCount?: number }, userId: number) => Promise<any>;
  delete: (id: number, userId: number) => Promise<any>;
}

export interface TextbooksAPI {
  getAll: (filters?: { search?: string; grade?: number; subject?: string; language?: string }) => Promise<any>;
  getById: (id: number) => Promise<any>;
  create: (data: {
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
  }, userId: number) => Promise<any>;
  update: (id: number, data: any, userId: number) => Promise<any>;
  delete: (id: number, userId: number) => Promise<any>;
  updateStock: (id: number, totalStock: number, userId: number) => Promise<any>;
}

export interface TextbookSetsAPI {
  getAll: (filters?: { grade?: number }) => Promise<any>;
  getById: (id: number) => Promise<any>;
  create: (data: { name: string; grade: number; textbookIds?: number[] }, userId: number) => Promise<any>;
  update: (id: number, data: { name?: string; grade?: number }, userId: number) => Promise<any>;
  delete: (id: number, userId: number) => Promise<any>;
  addTextbook: (setId: number, textbookId: number, userId: number) => Promise<any>;
  removeTextbook: (setId: number, textbookId: number, userId: number) => Promise<any>;
}

export interface TextbookDistributionsAPI {
  getAll: (filters?: { academicYear?: string; status?: string; branchId?: number }) => Promise<any>;
  getById: (id: number) => Promise<any>;
  create: (data: { branchId: number; setId: number; academicYear: string; notes?: string }, userId: number) => Promise<any>;
  return: (id: number, returnDetails: { textbookId: number; returnedQty: number; missingQty: number }[], userId: number, returnNotes?: string) => Promise<any>;
  delete: (id: number, userId: number) => Promise<any>;
  getStatistics: (academicYear?: string) => Promise<any>;
}

export interface IndividualDistributionsAPI {
  getAll: (filters?: { academicYear?: string; status?: string; recipientType?: string; textbookId?: number }) => Promise<any>;
  getById: (id: number) => Promise<any>;
  create: (data: {
    textbookId: number;
    recipientType: string;
    recipientId: number;
    recipientName: string;
    quantity: number;
    academicYear: string;
    notes?: string;
  }, userId: number) => Promise<any>;
  return: (id: number, returnedQty: number, missingQty: number, returnNotes?: string, userId?: number) => Promise<any>;
  delete: (id: number, userId: number) => Promise<any>;
}

export interface CertificatesAPI {
  getTopStudents: (period: string, type: string) => Promise<any>;
  getTopClasses: (period: string, type: string) => Promise<any>;
  finalize: (data: any, userId: number) => Promise<any>;
  getHistory: (filters?: any) => Promise<any>;
  delete: (period: string, type: string, userId: number) => Promise<any>;
}

export interface LibraryEventsAPI {
  getAll: () => Promise<any>;
  getById: (id: number) => Promise<any>;
  create: (data: any, userId: number) => Promise<any>;
  update: (id: number, data: any, userId: number) => Promise<any>;
  delete: (id: number, userId: number) => Promise<any>;
}

export interface LicenseAPI {
  getStatus: () => Promise<any>;
  activate: (licenseKey: string) => Promise<any>;
  deactivate: () => Promise<any>;
}

export interface ElectronAPI {
  auth: AuthAPI;
  books: BooksAPI;
  categories: CategoriesAPI;
  students: StudentsAPI;
  loans: LoansAPI;
  users: UsersAPI;
  settings: SettingsAPI;
  audit: AuditAPI;
  backup: BackupAPI;
  reports: ReportsAPI;
  reservations: ReservationsAPI;
  favorites: FavoritesAPI;
  certificates: CertificatesAPI;
  libraryEvents: LibraryEventsAPI;
  license: LicenseAPI;
  // Textbook Distribution Module
  teachers: TeachersAPI;
  branches: BranchesAPI;
  textbooks: TextbooksAPI;
  textbookSets: TextbookSetsAPI;
  textbookDistributions: TextbookDistributionsAPI;
  individualDistributions: IndividualDistributionsAPI;
}

const electronAPI: ElectronAPI = {
  auth: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke('auth:login', username, password),
    changePassword: (userId: number, oldPassword: string, newPassword: string) =>
      ipcRenderer.invoke('auth:changePassword', userId, oldPassword, newPassword),
  },
  books: {
    getAll: (filters) => ipcRenderer.invoke('books:getAll', filters),
    getById: (id) => ipcRenderer.invoke('books:getById', id),
    create: (data, userId) => ipcRenderer.invoke('books:create', data, userId),
    update: (id, data, userId) => ipcRenderer.invoke('books:update', id, data, userId),
    delete: (id, userId) => ipcRenderer.invoke('books:delete', id, userId),
    getRecommendations: (studentId, limit) => ipcRenderer.invoke('books:getRecommendations', studentId, limit),
  },
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    create: (data, userId) => ipcRenderer.invoke('categories:create', data, userId),
    update: (id, data, userId) => ipcRenderer.invoke('categories:update', id, data, userId),
    delete: (id, userId) => ipcRenderer.invoke('categories:delete', id, userId),
  },
  students: {
    getAll: (filters) => ipcRenderer.invoke('students:getAll', filters),
    getById: (id) => ipcRenderer.invoke('students:getById', id),
    create: (data, userId) => ipcRenderer.invoke('students:create', data, userId),
    update: (id, data, userId) => ipcRenderer.invoke('students:update', id, data, userId),
    delete: (id, userId) => ipcRenderer.invoke('students:delete', id, userId),
  },
  loans: {
    getAll: (filters) => ipcRenderer.invoke('loans:getAll', filters),
    create: (data, userId) => ipcRenderer.invoke('loans:create', data, userId),
    return: (id, userId) => ipcRenderer.invoke('loans:return', id, userId),
  },
  users: {
    getAll: () => ipcRenderer.invoke('users:getAll'),
    create: (data, actorUserId) => ipcRenderer.invoke('users:create', data, actorUserId),
    update: (id, data, actorUserId) => ipcRenderer.invoke('users:update', id, data, actorUserId),
    resetPassword: (id, newPassword, actorUserId) =>
      ipcRenderer.invoke('users:resetPassword', id, newPassword, actorUserId),
    delete: (id, actorUserId) => ipcRenderer.invoke('users:delete', id, actorUserId),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (data, userId) => ipcRenderer.invoke('settings:update', data, userId),
  },
  audit: {
    getAll: (filters) => ipcRenderer.invoke('audit:getAll', filters),
  },
  backup: {
    create: (userId?: number) => ipcRenderer.invoke('backup:create', userId),
    restore: (userId?: number) => ipcRenderer.invoke('backup:restore', userId),
    selectFolder: () => ipcRenderer.invoke('backup:selectFolder'),
    checkAutoBackup: () => ipcRenderer.invoke('backup:checkAutoBackup'),
    getHistory: () => ipcRenderer.invoke('backup:getHistory'),
    getActivityHistory: () => ipcRenderer.invoke('backup:getActivityHistory'),
    deleteBackup: (filePath: string) => ipcRenderer.invoke('backup:deleteBackup', filePath),
    restoreFromFile: (filePath: string, userId?: number) => ipcRenderer.invoke('backup:restoreFromFile', filePath, userId),
  },
  reports: {
    getStatistics: () => ipcRenderer.invoke('reports:getStatistics'),
    getReadingTrends: (period) => ipcRenderer.invoke('reports:getReadingTrends', period),
    getPopularBooks: (limit) => ipcRenderer.invoke('reports:getPopularBooks', limit),
    getPopularCategories: (limit) => ipcRenderer.invoke('reports:getPopularCategories', limit),
    getGradeStatistics: () => ipcRenderer.invoke('reports:getGradeStatistics'),
    getClassReport: (grade) => ipcRenderer.invoke('reports:getClassReport', grade),
  },
  reservations: {
    getAll: (filters) => ipcRenderer.invoke('reservations:getAll', filters),
    create: (data, userId) => ipcRenderer.invoke('reservations:create', data, userId),
    cancel: (id, userId) => ipcRenderer.invoke('reservations:cancel', id, userId),
    getNextInQueue: (bookId) => ipcRenderer.invoke('reservations:getNextInQueue', bookId),
  },
  favorites: {
    getByStudent: (studentId) => ipcRenderer.invoke('favorites:getByStudent', studentId),
    toggle: (bookId, studentId) => ipcRenderer.invoke('favorites:toggle', bookId, studentId),
    check: (bookId, studentId) => ipcRenderer.invoke('favorites:check', bookId, studentId),
  },
  certificates: {
    getTopStudents: (period, type) => ipcRenderer.invoke('certificates:getTopStudents', period, type),
    getTopClasses: (period, type) => ipcRenderer.invoke('certificates:getTopClasses', period, type),
    finalize: (data, userId) => ipcRenderer.invoke('certificates:finalize', data, userId),
    getHistory: (filters) => ipcRenderer.invoke('certificates:getHistory', filters),
    delete: (period, type, userId) => ipcRenderer.invoke('certificates:delete', period, type, userId),
  },
  libraryEvents: {
    getAll: () => ipcRenderer.invoke('libraryEvents:getAll'),
    getById: (id: number) => ipcRenderer.invoke('libraryEvents:getById', id),
    create: (data: any, userId: number) => ipcRenderer.invoke('libraryEvents:create', data, userId),
    update: (id: number, data: any, userId: number) => ipcRenderer.invoke('libraryEvents:update', id, data, userId),
    delete: (id: number, userId: number) => ipcRenderer.invoke('libraryEvents:delete', id, userId),
  },
  license: {
    getStatus: () => ipcRenderer.invoke('license:getStatus'),
    activate: (licenseKey: string) => ipcRenderer.invoke('license:activate', licenseKey),
    deactivate: () => ipcRenderer.invoke('license:deactivate'),
  },
  // Textbook Distribution Module
  teachers: {
    getAll: () => ipcRenderer.invoke('teachers:getAll'),
    getById: (id) => ipcRenderer.invoke('teachers:getById', id),
    create: (data, userId) => ipcRenderer.invoke('teachers:create', data, userId),
    update: (id, data, userId) => ipcRenderer.invoke('teachers:update', id, data, userId),
    delete: (id, userId) => ipcRenderer.invoke('teachers:delete', id, userId),
  },
  branches: {
    getAll: (filters) => ipcRenderer.invoke('branches:getAll', filters),
    getById: (id) => ipcRenderer.invoke('branches:getById', id),
    create: (data, userId) => ipcRenderer.invoke('branches:create', data, userId),
    update: (id, data, userId) => ipcRenderer.invoke('branches:update', id, data, userId),
    delete: (id, userId) => ipcRenderer.invoke('branches:delete', id, userId),
  },
  textbooks: {
    getAll: (filters) => ipcRenderer.invoke('textbooks:getAll', filters),
    getById: (id) => ipcRenderer.invoke('textbooks:getById', id),
    create: (data, userId) => ipcRenderer.invoke('textbooks:create', data, userId),
    update: (id, data, userId) => ipcRenderer.invoke('textbooks:update', id, data, userId),
    delete: (id, userId) => ipcRenderer.invoke('textbooks:delete', id, userId),
    updateStock: (id, totalStock, userId) => ipcRenderer.invoke('textbooks:updateStock', id, totalStock, userId),
  },
  textbookSets: {
    getAll: (filters) => ipcRenderer.invoke('textbookSets:getAll', filters),
    getById: (id) => ipcRenderer.invoke('textbookSets:getById', id),
    create: (data, userId) => ipcRenderer.invoke('textbookSets:create', data, userId),
    update: (id, data, userId) => ipcRenderer.invoke('textbookSets:update', id, data, userId),
    delete: (id, userId) => ipcRenderer.invoke('textbookSets:delete', id, userId),
    addTextbook: (setId, textbookId, userId) => ipcRenderer.invoke('textbookSets:addTextbook', setId, textbookId, userId),
    removeTextbook: (setId, textbookId, userId) => ipcRenderer.invoke('textbookSets:removeTextbook', setId, textbookId, userId),
  },
  textbookDistributions: {
    getAll: (filters) => ipcRenderer.invoke('textbookDistributions:getAll', filters),
    getById: (id) => ipcRenderer.invoke('textbookDistributions:getById', id),
    create: (data, userId) => ipcRenderer.invoke('textbookDistributions:create', data, userId),
    return: (id, returnDetails, userId, returnNotes) => ipcRenderer.invoke('textbookDistributions:return', id, returnDetails, userId, returnNotes),
    delete: (id, userId) => ipcRenderer.invoke('textbookDistributions:delete', id, userId),
    getStatistics: (academicYear) => ipcRenderer.invoke('textbookDistributions:getStatistics', academicYear),
  },
  individualDistributions: {
    getAll: (filters) => ipcRenderer.invoke('individualDistributions:getAll', filters),
    getById: (id) => ipcRenderer.invoke('individualDistributions:getById', id),
    create: (data, userId) => ipcRenderer.invoke('individualDistributions:create', data, userId),
    return: (id, returnedQty, missingQty, returnNotes, userId) => ipcRenderer.invoke('individualDistributions:return', id, returnedQty, missingQty, returnNotes, userId),
    delete: (id, userId) => ipcRenderer.invoke('individualDistributions:delete', id, userId),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
