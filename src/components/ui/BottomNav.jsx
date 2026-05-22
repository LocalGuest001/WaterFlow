import { NavLink } from 'react-router-dom'
import { Clock3, Home, PlusCircle, ClipboardList } from 'lucide-react'

const tabs = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/active-records', label: 'Active', icon: ClipboardList },
  { to: '/new-entry', label: 'New Entry', icon: PlusCircle },
  { to: '/history', label: 'History', icon: Clock3 },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-sm font-semibold transition-colors',
                isActive ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:bg-slate-50',
              ]
                .filter(Boolean)
                .join(' ')
            }
          >
            <Icon className="h-5 w-5" />
            <span className="leading-none">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
