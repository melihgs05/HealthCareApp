import { Outlet } from 'react-router-dom'

export function LandingLayout() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Outlet />
    </div>
  )
}
