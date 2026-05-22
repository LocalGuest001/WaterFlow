import Button from './Button'

export default function CounterInput({ label, value, onChange, min = 0, max = 99, helperText }) {
  const decreaseValue = () => onChange(Math.max(min, value - 1))
  const increaseValue = () => onChange(Math.min(max, value + 1))

  return (
    <div className="space-y-2">
      <div>
        <span className="text-base font-semibold text-slate-800">{label}</span>
        {helperText ? <p className="text-sm text-slate-500">{helperText}</p> : null}
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-slate-50 p-3 shadow-sm">
        <Button variant="secondary" size="md" className="w-14 px-0 text-2xl leading-none" onClick={decreaseValue} aria-label={`Decrease ${label}`}>
          -
        </Button>
        <div className="flex-1 rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="text-3xl font-bold tracking-tight text-slate-900">{value}</div>
        </div>
        <Button variant="primary" size="md" className="w-14 px-0 text-2xl leading-none" onClick={increaseValue} aria-label={`Increase ${label}`}>
          +
        </Button>
      </div>
    </div>
  )
}
