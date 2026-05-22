const toneClasses = {
  active: 'border-sky-100 bg-sky-50 text-sky-700',
  completed: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  overdue: 'border-red-100 bg-red-50 text-red-700',
  pending: 'border-amber-100 bg-amber-50 text-amber-700',
  neutral: 'border-gray-200 bg-gray-50 text-gray-700',
}

const dotClasses = {
  active: 'bg-sky-500',
  completed: 'bg-emerald-500',
  overdue: 'bg-red-500',
  pending: 'bg-amber-500',
  neutral: 'bg-gray-400',
}

export default function StatusBadge({ tone = 'neutral', children, className = '', small = false }) {
  const toneKey = toneClasses[tone] ? tone : 'neutral'

  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full border text-sm font-semibold',
        small ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm',
        toneClasses[toneKey],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={['h-2.5 w-2.5 rounded-full', dotClasses[toneKey]].join(' ')} />
      {children}
    </span>
  )
}
