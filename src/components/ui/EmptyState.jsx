import Button from './Button'

export default function EmptyState({ title, description, actionLabel, onAction, icon }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        {icon || <span className="text-2xl font-bold">•</span>}
      </div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-base leading-6 text-slate-600">{description}</p>
      {actionLabel && onAction ? (
        <Button variant="soft" size="md" className="mt-4 w-full" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
