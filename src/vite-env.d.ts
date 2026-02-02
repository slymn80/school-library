/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    auth: {
      login: (username: string, password: string) => Promise<any>;
      changePassword: (userId: number, oldPassword: string, newPassword: string) => Promise<any>;
    };
    books: {
      getAll: (filters?: { search?: string; categoryId?: number }) => Promise<any>;
      getById: (id: number) => Promise<any>;
      create: (data: any, userId: number) => Promise<any>;
      update: (id: number, data: any, userId: number) => Promise<any>;
      delete: (id: number, userId: number) => Promise<any>;
    };
    categories: {
      getAll: () => Promise<any>;
      create: (data: { name: string; nameKk: string }, userId: number) => Promise<any>;
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
      create: () => Promise<any>;
      restore: () => Promise<any>;
    };
    reports: {
      getStatistics: () => Promise<any>;
    };
  };
}
