import StatusBadge from './ui/StatusBadge'

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-sky-600">Water Mineral Plant</p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">WaterTrack</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone="neutral">Local Preview</StatusBadge>
          </div>
        </div>
      </div>
    </header>
  )
}
