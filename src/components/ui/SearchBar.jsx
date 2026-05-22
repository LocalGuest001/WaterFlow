import { Search } from 'lucide-react'

export default function SearchBar({ value, onChange, placeholder = 'Search', className = '' }) {
  return (
    <label className={['relative block', className].filter(Boolean).join(' ')}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-14 w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-4 text-lg text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  )
}
