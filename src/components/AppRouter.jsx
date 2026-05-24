import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

const Home = lazy(() => import('../pages/Home'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const NewEntry = lazy(() => import('../pages/NewEntry'))
const ActiveRecords = lazy(() => import('../pages/ActiveRecords'))
const History = lazy(() => import('../pages/History'))

function LoadingRoute() {
  return (
    <div className="flex min-h-[40dvh] items-center justify-center px-4 py-12 text-sm font-medium text-slate-500">
      Loading app...
    </div>
  )
}

export default function AppRouter() {
  return (
    <Suspense fallback={<LoadingRoute />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new-entry" element={<NewEntry />} />
        <Route path="/active-records" element={<ActiveRecords />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </Suspense>
  )
}
