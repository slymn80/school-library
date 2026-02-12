import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import TextbookLayout from './components/TextbookLayout';
import LoginPage from './pages/LoginPage';
import LicensePage from './pages/LicensePage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ModuleSelectionPage from './pages/ModuleSelectionPage';
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
import StatisticsPage from './pages/StatisticsPage';
import CertificatesPage from './pages/CertificatesPage';
import InventoryCountPage from './pages/InventoryCountPage';
// Events Module Pages
import EventsLayout from './components/EventsLayout';
import EventsDashboardPage from './pages/events/EventsDashboardPage';
import EventsListPage from './pages/events/EventsListPage';
import PastEventsPage from './pages/events/PastEventsPage';
import EventReportsPage from './pages/events/EventReportsPage';

// Textbook Module Pages
import TextbookDashboardPage from './pages/textbook/TextbookDashboardPage';
import TeachersPage from './pages/textbook/TeachersPage';
import BranchesPage from './pages/textbook/BranchesPage';
import TextbooksPage from './pages/textbook/TextbooksPage';
import SetsPage from './pages/textbook/SetsPage';
import DistributionsPage from './pages/textbook/DistributionsPage';
import IndividualDistributionsPage from './pages/textbook/IndividualDistributionsPage';
import TextbookSettingsPage from './pages/textbook/TextbookSettingsPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuthStore();

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const [licenseValid, setLicenseValid] = useState(false);
  const [licenseLoading, setLicenseLoading] = useState(true);

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    try {
      const response = await window.electronAPI.license.getStatus();
      if (response.success && response.data.isValid && !response.data.isTrial) {
        // Only auto-skip for full (non-trial) licenses
        setLicenseValid(true);
      }
    } catch (err) {
      console.error('License check failed:', err);
    } finally {
      setLicenseLoading(false);
    }
  };

  if (licenseLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!licenseValid) {
    return <LicensePage onLicenseValid={() => setLicenseValid(true)} />;
  }

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

      {/* Module Selection */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ModuleSelectionPage />
          </ProtectedRoute>
        }
      />

      {/* Library Module Routes */}
      <Route
        path="/library"
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

        <Route path="statistics" element={<StatisticsPage />} />

        <Route path="certificates" element={<CertificatesPage />} />

        <Route path="inventory-count" element={<InventoryCountPage />} />

        <Route path="settings" element={<SettingsPage />} />

        <Route
          path="users"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="users/new"
          element={
            <AdminRoute>
              <UserFormPage />
            </AdminRoute>
          }
        />
        <Route
          path="users/:id/edit"
          element={
            <AdminRoute>
              <UserFormPage />
            </AdminRoute>
          }
        />

        <Route
          path="audit"
          element={
            <AdminRoute>
              <AuditLogPage />
            </AdminRoute>
          }
        />
      </Route>

      {/* Textbook Distribution Module Routes */}
      <Route
        path="/textbooks"
        element={
          <ProtectedRoute>
            <TextbookLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TextbookDashboardPage />} />
        <Route path="teachers" element={<TeachersPage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="books" element={<TextbooksPage />} />
        <Route path="sets" element={<SetsPage />} />
        <Route path="distributions" element={<DistributionsPage />} />
        <Route path="individual" element={<IndividualDistributionsPage />} />
        <Route path="settings" element={<TextbookSettingsPage />} />
      </Route>

      {/* Events Module Routes */}
      <Route
        path="/events"
        element={
          <ProtectedRoute>
            <EventsLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<EventsDashboardPage />} />
        <Route path="list" element={<EventsListPage />} />
        <Route path="past" element={<PastEventsPage />} />
        <Route path="reports" element={<EventReportsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
