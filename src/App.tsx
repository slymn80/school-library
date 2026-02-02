import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import BooksPage from './pages/BooksPage';
import BookFormPage from './pages/BookFormPage';
import StudentsPage from './pages/StudentsPage';
import StudentFormPage from './pages/StudentFormPage';
import LoansPage from './pages/LoansPage';
import LoanFormPage from './pages/LoanFormPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import UserFormPage from './pages/UserFormPage';
import AuditLogPage from './pages/AuditLogPage';
import BarcodeLabelsPage from './pages/BarcodeLabelsPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (requireAdmin && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/change-password"
        element={
          isAuthenticated && user?.mustChangePassword ? (
            <ChangePasswordPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route path="books" element={<BooksPage />} />
        <Route path="books/new" element={<BookFormPage />} />
        <Route path="books/:id/edit" element={<BookFormPage />} />
        <Route path="books/labels" element={<BarcodeLabelsPage />} />

        <Route path="students" element={<StudentsPage />} />
        <Route path="students/new" element={<StudentFormPage />} />
        <Route path="students/:id/edit" element={<StudentFormPage />} />

        <Route path="loans" element={<LoansPage />} />
        <Route path="loans/new" element={<LoanFormPage />} />

        <Route path="reports" element={<ReportsPage />} />

        <Route path="settings" element={<SettingsPage />} />

        <Route
          path="users"
          element={
            <ProtectedRoute requireAdmin>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users/new"
          element={
            <ProtectedRoute requireAdmin>
              <UserFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users/:id/edit"
          element={
            <ProtectedRoute requireAdmin>
              <UserFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="audit"
          element={
            <ProtectedRoute requireAdmin>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
