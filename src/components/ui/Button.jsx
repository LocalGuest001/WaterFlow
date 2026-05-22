const variantClasses = {
  primary: 'bg-sky-600 text-white shadow-sm hover:bg-sky-700 active:bg-sky-800',
  secondary: 'border border-gray-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 active:bg-slate-100',
  soft: 'border border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100 active:bg-sky-200',
  danger: 'border border-red-100 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200',
}

const sizeClasses = {
  sm: 'h-12 px-4 text-base',
  md: 'h-14 px-5 text-lg',
  lg: 'h-16 px-6 text-lg',
}

export default function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
        {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  )
}
