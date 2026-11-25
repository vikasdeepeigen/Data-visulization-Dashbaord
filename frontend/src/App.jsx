import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import SummaryDashboardPage from './pages/dashboard/SummaryDashboardPage';
import SoftwareDetailPage from './pages/software/SoftwareDetailPage';
import DataEntryPage from './pages/dataEntry/DataEntryPage';
import ExcelManagementPage from './pages/excel/ExcelManagementPage';
import ReportsActivityPage from './pages/reports/ReportsActivityPage';
import SoftwareListPage from './pages/admin/SoftwareListPage';
import AddEditSoftwarePage from './pages/admin/AddEditSoftwarePage';
import UsersPermissionsPage from './pages/admin/UsersPermissionsPage';
import EmptyState from './components/common/EmptyState';
import { Cpu } from 'lucide-react';

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
        <div className="w-7 h-7 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (user) {
    return <Navigate to={user.role === 'Admin' ? '/software-list' : '/'} replace />;
  }
  return children;
}

function RoleHomeRedirect() {
  const { user, accessibleSoftware, loading } = useAuth();
  if (loading) return null;

  if (user?.role === 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (accessibleSoftware.length > 0) {
    return <Navigate to={`/software/${accessibleSoftware[0]._id}`} replace />;
  }

  return (
    <div className="py-10">
      <EmptyState
        icon={Cpu}
        title="No Software Assigned Yet"
        description="Your User account does not have any software permissions yet. Ask an Administrator to assign software access."
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RoleHomeRedirect />} />
            <Route path="software/:id" element={<SoftwareDetailPage />} />

            {/* Admin-Only Routes */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <SummaryDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="data-entry"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <DataEntryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="excel"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <ExcelManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <ReportsActivityPage />
                </ProtectedRoute>
              }
            />
            <Route path="admin" element={<Navigate to="/software-list" replace />} />
            <Route
              path="software-list"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <SoftwareListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="add-software"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <AddEditSoftwarePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="edit-software/:id"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <AddEditSoftwarePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <UsersPermissionsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
