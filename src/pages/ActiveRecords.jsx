import React, { useMemo } from 'react'
import { AlertTriangle, CalendarDays, Phone, Package, Milk, Refrigerator } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import StatusBadge from '../components/ui/StatusBadge'
import { useAppStore } from '../store/useAppStore'
import { formatShortDateTime } from '../utils/formatters'

// PHASE 4: Memoize individual record card to prevent re-renders
const RecordCard = React.memo(({ record, onReturnAll, onReturnCooler, onReturnBottle }) => {
  const pendingCoolers = Math.max(0, record.coolersPending ?? 0)
  const pendingBottles = Math.max(0, record.bottlesPending ?? 0)
  const pendingCount = pendingCoolers + pendingBottles
  const totalCount = (record.coolersIssued ?? 0) + (record.bottlesIssued ?? 0)
  const completedCount = (record.coolersReturned ?? 0) + (record.bottlesReturned ?? 0)
  const progress = totalCount === 0 ? 0 : Math.min(100, Math.round((completedCount / totalCount) * 100))
  const lastUpdatedLabel = formatShortDateTime(record.lastActionAt || record.updatedAt || record.createdAt)

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-3 justify-items-start">
          <p className="text-lg font-bold leading-tight text-slate-900">{record.customerName}</p>
          <a href={`tel:${record.phoneNumber}`} className="mt-2 inline-flex items-center gap-2 text-base font-medium text-slate-700">
            <Phone className="h-4 w-4 text-sky-600" />
            <span>{record.phoneNumber}</span>
          </a>
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <div className="flex items-center gap-2">
            <StatusBadge tone={record.status === 'overdue' ? 'overdue' : 'active'} small>
              {record.status === 'overdue' ? 'Overdue' : 'Active'}
            </StatusBadge>
          </div>
          <div className="text-sm font-medium text-slate-600">{lastUpdatedLabel}</div>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Package className="h-4 w-4 text-sky-600" />
            <span>{pendingCount} Item{pendingCount !== 1 ? 's' : ''} Pending</span>
          </div>
          <div className="text-sm font-medium text-slate-500">
            {record.notes ? record.notes : 'Tap return to complete this delivery'}
          </div>
        </div>

        <div className="mt-3 h-2 rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
        <Button variant="primary" size="md" className="min-h-[56px] w-full" onClick={() => onReturnAll(record.id)}>
          Return All
        </Button>

        <div className="flex gap-2">
          {pendingCoolers > 0 && (
            <Button variant="secondary" size="md" className="min-h-[56px] flex-1" onClick={() => onReturnCooler(record.id)}>
              <Refrigerator size={20} color="#578fc7" />
              +1
            </Button>
          )}
          {pendingBottles > 0 && (
            <Button variant="soft" size="md" className="min-h-[56px] flex-1" onClick={() => onReturnBottle(record.id)}>
              <Milk size={20} color="#578fc7" />
              +1
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm text-slate-500">
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          Started: {formatShortDateTime(record.createdAt)}
        </span>
        <span className="inline-flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {pendingCount > 0 ? 'Pending' : 'Complete'}
        </span>
      </div>
    </Card>
  )
})

RecordCard.displayName = 'RecordCard'

function ActiveRecords() {
  const deliveries = useAppStore((state) => state.deliveries)
  const returnCooler = useAppStore((state) => state.returnCooler)
  const returnBottle = useAppStore((state) => state.returnBottle)
  const returnAll = useAppStore((state) => state.returnAll)
  const isBooting = deliveries === null

  const activeRecords = useMemo(() => {
    return (deliveries ?? [])
      .filter((record) => record.status === 'active' || record.status === 'overdue')
      .sort((a, b) => new Date(b.lastActionAt || b.createdAt).getTime() - new Date(a.lastActionAt || a.createdAt).getTime())
  }, [deliveries])

  if (isBooting) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="animate-pulse rounded-2xl border border-gray-100 bg-slate-50 p-4 shadow-sm">
            <div className="h-5 w-1/2 rounded-full bg-slate-200" />
            <div className="mt-3 h-4 w-2/3 rounded-full bg-slate-200" />
            <div className="mt-4 h-24 rounded-2xl bg-slate-200" />
          </div>
        ))}
      </div>
    )
  }

  if (activeRecords.length === 0) {
    return (
      <EmptyState
        title="No active records"
        description="Every pending delivery and return is complete. New entries will appear here immediately."
        icon={<Package className="h-7 w-7" />}
      />
    )
  }

  return (
    <div className="space-y-4 pb-2">
      {activeRecords.map((record) => (
        <RecordCard key={record.id} record={record} onReturnAll={returnAll} onReturnCooler={returnCooler} onReturnBottle={returnBottle} />
      ))}
    </div>
  )
}

export default React.memo(ActiveRecords)
