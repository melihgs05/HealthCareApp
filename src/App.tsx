import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './context/AuthContext'
import { LandingLayout } from './layouts/LandingLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { PortalLayout } from './layouts/PortalLayout'
import { DoctorLayout } from './layouts/DoctorLayout'
import { AdminLayout } from './layouts/AdminLayout'
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
import { DoctorDashboardPage } from './pages/DoctorDashboardPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'

type Role = 'patient' | 'doctor' | 'admin'

function roleHomePath(role: Role) {
  if (role === 'doctor') return '/doctor'
  if (role === 'admin') return '/admin'
  return '/portal'
}

function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactElement
  roles?: Role[]
}) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={roleHomePath(user.role)} replace />
  }

  return children
}

function App() {
  const { isAuthenticated, user } = useAuth()

  return (
    <>
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
              isAuthenticated ? <Navigate to={roleHomePath(user!.role)} replace /> : <LoginPage />
            }
          />
          <Route
            path="/signup"
            element={
              isAuthenticated ? <Navigate to={roleHomePath(user!.role)} replace /> : <SignupPage />
            }
          />
        </Route>

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

        <Route
          element={
            <ProtectedRoute roles={['doctor']}>
              <DoctorLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/doctor" element={<DoctorDashboardPage />} />
          <Route path="/doctor/settings" element={<AccountSettingsPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/settings" element={<AccountSettingsPage />} />
        </Route>

        <Route
          path="*"
          element={<Navigate to={isAuthenticated && user ? roleHomePath(user.role) : '/'} replace />}
        />
      </Routes>
    </>
  )
}

export default App
