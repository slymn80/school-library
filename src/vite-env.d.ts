/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    auth: {
      login: (username: string, password: string) => Promise<any>;
      changePassword: (userId: number, oldPassword: string, newPassword: string) => Promise<any>;
    };
    books: {
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
    };
    categories: {
      getAll: () => Promise<any>;
      create: (data: { name: string; nameKk: string; nameTr?: string }, userId: number) => Promise<any>;
      update: (id: number, data: { name: string; nameKk: string; nameTr?: string }, userId: number) => Promise<any>;
      delete: (id: number, userId: number) => Promise<any>;
    };
    students: {
      getAll: (filters?: { search?: string; grade?: string }) => Promise<any>;
      getById: (id: number) => Promise<any>;
      create: (data: any, userId: number) => Promise<any>;
      update: (id: number, data: any, userId: number) => Promise<any>;
      delete: (id: number, userId: number) => Promise<any>;
    };
    loans: {
      getAll: (filters?: { status?: string; studentId?: number }) => Promise<any>;
      create: (data: any, userId: number) => Promise<any>;
      return: (id: number, userId: number) => Promise<any>;
    };
    users: {
      getAll: () => Promise<any>;
      create: (data: any, actorUserId: number) => Promise<any>;
      update: (id: number, data: any, actorUserId: number) => Promise<any>;
      resetPassword: (id: number, newPassword: string, actorUserId: number) => Promise<any>;
      delete: (id: number, actorUserId: number) => Promise<any>;
    };
    settings: {
      get: () => Promise<any>;
      update: (data: any, userId: number) => Promise<any>;
    };
    audit: {
      getAll: (filters?: { actionType?: string; entityType?: string }) => Promise<any>;
    };
    backup: {
      create: (userId?: number) => Promise<any>;
      restore: (userId?: number) => Promise<any>;
      selectFolder: () => Promise<any>;
      checkAutoBackup: () => Promise<any>;
      getHistory: () => Promise<any>;
      getActivityHistory: () => Promise<any>;
      deleteBackup: (filePath: string) => Promise<any>;
      restoreFromFile: (filePath: string, userId?: number) => Promise<any>;
    };
    reports: {
      getStatistics: () => Promise<any>;
      getReadingTrends: (period?: 'monthly' | 'yearly') => Promise<any>;
      getPopularBooks: (limit?: number) => Promise<any>;
      getPopularCategories: (limit?: number) => Promise<any>;
      getGradeStatistics: () => Promise<any>;
      getClassReport: (grade: string) => Promise<any>;
    };
    reservations: {
      getAll: (filters?: { bookId?: number; studentId?: number; status?: string }) => Promise<any>;
      create: (data: { bookId: number; studentId: number }, userId: number) => Promise<any>;
      cancel: (id: number, userId: number) => Promise<any>;
      getNextInQueue: (bookId: number) => Promise<any>;
    };
    favorites: {
      getByStudent: (studentId: number) => Promise<any>;
      toggle: (bookId: number, studentId: number) => Promise<any>;
      check: (bookId: number, studentId: number) => Promise<any>;
    };
    certificates: {
      getTopStudents: (period: string, type: string) => Promise<any>;
      getTopClasses: (period: string, type: string) => Promise<any>;
      finalize: (data: any, userId: number) => Promise<any>;
      getHistory: (filters?: any) => Promise<any>;
      delete: (period: string, type: string, userId: number) => Promise<any>;
    };
    libraryEvents: {
      getAll: () => Promise<any>;
      getById: (id: number) => Promise<any>;
      create: (data: any, userId: number) => Promise<any>;
      update: (id: number, data: any, userId: number) => Promise<any>;
      delete: (id: number, userId: number) => Promise<any>;
    };
    license: {
      getStatus: () => Promise<any>;
      activate: (licenseKey: string) => Promise<any>;
      deactivate: () => Promise<any>;
    };
    // Textbook Distribution Module
    teachers: {
      getAll: () => Promise<any>;
      getById: (id: number) => Promise<any>;
      create: (data: { fullName: string; phone?: string }, userId: number) => Promise<any>;
      update: (id: number, data: { fullName?: string; phone?: string }, userId: number) => Promise<any>;
      delete: (id: number, userId: number) => Promise<any>;
      deleteAll: (userId: number, password: string) => Promise<any>;
    };
    branches: {
      getAll: (filters?: { grade?: number }) => Promise<any>;
      getById: (id: number) => Promise<any>;
      create: (data: { name: string; grade: number; teacherId?: number; studentCount?: number }, userId: number) => Promise<any>;
      update: (id: number, data: { name?: string; grade?: number; teacherId?: number | null; studentCount?: number }, userId: number) => Promise<any>;
      delete: (id: number, userId: number) => Promise<any>;
      deleteAll: (userId: number, password: string) => Promise<any>;
    };
    textbooks: {
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
    };
    textbookSets: {
      getAll: (filters?: { grade?: number }) => Promise<any>;
      getById: (id: number) => Promise<any>;
      create: (data: { name: string; grade: number; textbookIds?: number[] }, userId: number) => Promise<any>;
      update: (id: number, data: { name?: string; grade?: number }, userId: number) => Promise<any>;
      delete: (id: number, userId: number) => Promise<any>;
      addTextbook: (setId: number, textbookId: number, userId: number) => Promise<any>;
      removeTextbook: (setId: number, textbookId: number, userId: number) => Promise<any>;
    };
    textbookDistributions: {
      getAll: (filters?: { academicYear?: string; status?: string; branchId?: number }) => Promise<any>;
      getById: (id: number) => Promise<any>;
      create: (data: { branchId: number; setId: number; academicYear: string; notes?: string }, userId: number) => Promise<any>;
      return: (id: number, returnDetails: { textbookId: number; returnedQty: number; missingQty: number }[], userId: number, returnNotes?: string) => Promise<any>;
      delete: (id: number, userId: number) => Promise<any>;
      getStatistics: (academicYear?: string) => Promise<any>;
    };
    individualDistributions: {
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
    };
  };
}
