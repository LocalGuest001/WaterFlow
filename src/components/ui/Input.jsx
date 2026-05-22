export default function Input({ label, helperText, className = '', ...props }) {
  return (
    <label className="block space-y-2">
      {label ? <span className="text-base font-semibold text-slate-800">{label}</span> : null}
      <input
        className={[
          'h-14 w-full rounded-2xl border border-gray-200 bg-white px-4 text-lg text-slate-900 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {helperText ? <p className="text-sm text-slate-500">{helperText}</p> : null}
    </label>
  )
}
