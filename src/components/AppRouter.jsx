import { Navigate, Route, Routes } from 'react-router-dom'
import Home from '../pages/Home'
import Dashboard from '../pages/Dashboard'
import NewEntry from '../pages/NewEntry'
import ActiveRecords from '../pages/ActiveRecords'
import History from '../pages/History'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/home" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/new-entry" element={<NewEntry />} />
      <Route path="/active-records" element={<ActiveRecords />} />
      <Route path="/history" element={<History />} />
    </Routes>
  )
}
