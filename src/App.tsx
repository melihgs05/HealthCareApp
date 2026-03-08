import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './context/AuthContext'
import { LandingLayout } from './layouts/LandingLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { PortalLayout } from './layouts/PortalLayout'
import { DoctorLayout } from './layouts/DoctorLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { PersonnelLayout } from './layouts/PersonnelLayout'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/auth/LoginPage'
import { SignupPage } from './pages/auth/SignupPage'
import { DashboardPage } from './pages/DashboardPage'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { MedicalSummaryPage } from './pages/MedicalSummaryPage'
import { ActivityPage } from './pages/ActivityPage'
import { MessagesPage } from './pages/MessagesPage'
import { VisitSummaryPage } from './pages/VisitSummaryPage'
import { AccountSettingsPage } from './pages/AccountSettingsPage'
import { SiteSettingsPage } from './pages/SiteSettingsPage'
import { DoctorDashboardPage } from './pages/DoctorDashboardPage'
import { DoctorCalendarPage } from './pages/DoctorCalendarPage'
import { DoctorPatientsPage } from './pages/DoctorPatientsPage'
import { DoctorMessagesPage } from './pages/DoctorMessagesPage'
import { PatientChartPage } from './pages/PatientChartPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { PersonnelManagementPage } from './pages/PersonnelManagementPage'
import { PersonnelDashboardPage } from './pages/PersonnelDashboardPage'
import { PersonnelTasksPage } from './pages/PersonnelTasksPage'
import { PersonnelMessagesPage } from './pages/PersonnelMessagesPage'
import { AuditLogPage } from './pages/AuditLogPage'
import { HIPAAIdleWarning } from './components/ui/HIPAAIdleWarning'
import type { UserRole } from './api/types'

function roleHomePath(role: UserRole) {
  if (role === 'doctor') return '/doctor'
  if (role === 'admin') return '/admin'
  if (role === 'personnel') return '/staff'
  return '/portal'
}

function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactElement
  roles?: UserRole[]
}) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && user && !roles.includes(user.role as UserRole)) {
    return <Navigate to={roleHomePath(user.role as UserRole)} replace />
  }

  return children
}

function App() {
  const { isAuthenticated, user } = useAuth()

  return (
    <>
      <HIPAAIdleWarning />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '12px',
            fontSize: '0.8rem',
          },
        }}
      />
      <Routes>
        {/* Public landing */}
        <Route element={<LandingLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to={roleHomePath(user!.role as UserRole)} replace /> : <LoginPage />
            }
          />
          <Route
            path="/signup"
            element={
              isAuthenticated ? <Navigate to={roleHomePath(user!.role as UserRole)} replace /> : <SignupPage />
            }
          />
        </Route>

        {/* ── Patient portal ── */}
        <Route
          element={
            <ProtectedRoute roles={['patient']}>
              <PortalLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/portal" element={<DashboardPage />} />
          <Route path="/portal/appointments" element={<AppointmentsPage />} />
          <Route path="/portal/summary" element={<MedicalSummaryPage />} />
          <Route path="/portal/history" element={<ActivityPage />} />
          <Route path="/portal/messages" element={<MessagesPage />} />
          <Route path="/portal/visit-summary" element={<VisitSummaryPage />} />
          <Route path="/portal/settings" element={<AccountSettingsPage />} />
        </Route>

        {/* ── Doctor portal ── */}
        <Route
          element={
            <ProtectedRoute roles={['doctor']}>
              <DoctorLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/doctor" element={<DoctorDashboardPage />} />
          <Route path="/doctor/calendar" element={<DoctorCalendarPage />} />
          <Route path="/doctor/patients" element={<DoctorPatientsPage />} />
          <Route path="/doctor/patients/:patientId/chart" element={<PatientChartPage />} />
          <Route path="/doctor/messages" element={<DoctorMessagesPage />} />
          <Route path="/doctor/settings" element={<AccountSettingsPage />} />
        </Route>

        {/* ── Healthcare personnel portal ── */}
        <Route
          element={
            <ProtectedRoute roles={['personnel']}>
              <PersonnelLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/staff" element={<PersonnelDashboardPage />} />
          <Route path="/staff/tasks" element={<PersonnelTasksPage />} />
          <Route path="/staff/messages" element={<PersonnelMessagesPage />} />
          <Route path="/staff/settings" element={<AccountSettingsPage />} />
        </Route>

        {/* ── Admin portal ── */}
        <Route
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/personnel" element={<PersonnelManagementPage />} />
          <Route path="/admin/audit-log" element={<AuditLogPage />} />
          <Route path="/admin/site-settings" element={<SiteSettingsPage />} />
          <Route path="/admin/settings" element={<AccountSettingsPage />} />
        </Route>

        <Route
          path="*"
          element={<Navigate to={isAuthenticated && user ? roleHomePath(user.role as UserRole) : '/'} replace />}
        />
      </Routes>
    </>
  )
}

export default App
