import { contextBridge, ipcRenderer } from 'electron';

export interface AuthAPI {
  login: (username: string, password: string) => Promise<any>;
  changePassword: (userId: number, oldPassword: string, newPassword: string) => Promise<any>;
}

export interface BooksAPI {
  getAll: (filters?: { search?: string; categoryId?: number }) => Promise<any>;
  getById: (id: number) => Promise<any>;
  create: (data: any, userId: number) => Promise<any>;
  update: (id: number, data: any, userId: number) => Promise<any>;
  delete: (id: number, userId: number) => Promise<any>;
}

export interface CategoriesAPI {
  getAll: () => Promise<any>;
  create: (data: { name: string; nameKk: string }, userId: number) => Promise<any>;
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
  create: () => Promise<any>;
  restore: () => Promise<any>;
}

export interface ReportsAPI {
  getStatistics: () => Promise<any>;
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
  },
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    create: (data, userId) => ipcRenderer.invoke('categories:create', data, userId),
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
    create: () => ipcRenderer.invoke('backup:create'),
    restore: () => ipcRenderer.invoke('backup:restore'),
  },
  reports: {
    getStatistics: () => ipcRenderer.invoke('reports:getStatistics'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
