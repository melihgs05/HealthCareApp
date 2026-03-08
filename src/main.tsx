import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { AuthProvider } from './context/AuthContext'
import { PatientDataProvider } from './context/PatientDataContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <NotificationsProvider>
        <AuthProvider>
          <PatientDataProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </PatientDataProvider>
        </AuthProvider>
      </NotificationsProvider>
    </ThemeProvider>
  </StrictMode>,
)
