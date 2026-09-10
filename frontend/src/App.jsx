import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// =========================
// Authentication Pages
// =========================
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// =========================
// Employee Pages
// =========================
import EmployeeDashboard from './pages/EmployeeDashboard';
import ProfilePage from './pages/ProfilePage';
import AttendancePage from './pages/AttendancePage';
import LeavePage from './pages/LeavePage';
import PayrollPage from './pages/PayrollPage';
import DocumentPage from './pages/DocumentPage';
import TicketPage from './pages/TicketPage';
import ReimbursementPage from './pages/ReimbursementPage';

// =========================
// Manager Pages
// =========================
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerTeamPage from './pages/ManagerTeamPage';
import ManagerAttendancePage from './pages/ManagerAttendancePage';
import ManagerLeavesPage from './pages/ManagerLeavesPage';
import ManagerReimbursementPage from './pages/ManagerReimbursementPage';

// =========================
// Admin Pages
// =========================
import AdminDashboard from './pages/AdminDashboard';
import AdminEmployeesPage from './pages/AdminEmployeesPage';
import AdminAttendanceManagementPage from './pages/AdminAttendanceManagementPage';
import AdminLeavesPage from './pages/AdminLeavesPage';
import AdminLeaveSettingsPage from './pages/AdminLeaveSettingsPage';
import AdminPayrollPage from './pages/AdminPayrollPage';
import AdminDocumentsPage from './pages/AdminDocumentsPage';
import AdminTicketsPage from './pages/AdminTicketsPage';
import AdminAuditPage from './pages/AdminAuditPage';
import AdminDepartmentsPage from './pages/AdminDepartmentsPage';

// =========================
// Common Pages
// =========================
import NotificationsPage from './pages/NotificationsPage';
import TicketDetailPage from './pages/TicketDetailPage';

// =========================
// Layout & Authentication
// =========================
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));

const App = () => {
  return (
    <Routes>

      {/* =========================
          PUBLIC ROUTES
      ========================== */}

      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/register"
        element={<RegisterPage />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPasswordPage />}
      />

      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />


      {/* =========================
          PROTECTED APPLICATION
      ========================== */}

      <Route
        element={
          <ProtectedRoute
            requiredRole={['EMPLOYEE', 'MANAGER', 'ADMIN']}
          >
            <MainLayout />
          </ProtectedRoute>
        }
      >

        {/* =========================
            COMMON ROUTES
        ========================== */}

        <Route
          path="/notifications"
          element={<NotificationsPage />}
        />

        <Route
          path="/tickets/:id"
          element={<TicketDetailPage />}
        />


        {/* =========================
            EMPLOYEE ROUTES
        ========================== */}

        <Route
          path="/employee"
          element={<EmployeeDashboard />}
        />

        <Route
          path="/employee/profile"
          element={<ProfilePage />}
        />

        <Route
          path="/employee/attendance"
          element={<AttendancePage />}
        />

        <Route
          path="/employee/leaves"
          element={<LeavePage />}
        />

        <Route
          path="/employee/payroll"
          element={<PayrollPage />}
        />

        <Route
          path="/employee/documents"
          element={<DocumentPage />}
        />

        <Route
          path="/employee/tickets"
          element={<TicketPage />}
        />

        <Route
          path="/employee/reimbursements"
          element={<ReimbursementPage />}
        />


        {/* =========================
            MANAGER ROUTES
        ========================== */}

        <Route
          path="/manager"
          element={<ManagerDashboard />}
        />

        <Route
          path="/manager/team"
          element={<ManagerTeamPage />}
        />

        <Route
          path="/manager/attendance"
          element={<ManagerAttendancePage />}
        />

        <Route
          path="/manager/leaves"
          element={<ManagerLeavesPage />}
        />

        <Route
          path="/manager/reimbursements"
          element={<ManagerReimbursementPage />}
        />


        {/* =========================
            ADMIN ROUTES
        ========================== */}

        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/employees"
          element={<AdminEmployeesPage />}
        />

        <Route path="/admin/departments" element={<AdminDepartmentsPage />} />

        <Route
          path="/admin/attendance"
          element={<AdminAttendanceManagementPage />}
        />

        <Route
          path="/admin/leaves"
          element={<AdminLeavesPage />}
        />

        <Route
          path="/admin/leave-settings"
          element={<AdminLeaveSettingsPage />}
        />

        <Route
          path="/admin/payroll"
          element={<AdminPayrollPage />}
        />

        <Route
          path="/admin/documents"
          element={<AdminDocumentsPage />}
        />

        <Route
          path="/admin/tickets"
          element={<AdminTicketsPage />}
        />

        {/* Analytics Dashboard */}
        <Route
          path="/admin/analytics"
          element={
            <Suspense
              fallback={
                <div className="card panel" style={{ textAlign: 'center' }}>
                  Loading analytics dashboard...
                </div>
              }
            >
              <AnalyticsPage />
            </Suspense>
          }
        />

        <Route
          path="/admin/audit"
          element={<AdminAuditPage />}
        />

      </Route>


      {/* =========================
          UNKNOWN ROUTES
      ========================== */}

      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />

    </Routes>
  );
};

export default App;
