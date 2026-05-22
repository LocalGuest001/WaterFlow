import React, { useMemo, useState } from 'react'
import { Clock3 } from 'lucide-react'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import SearchBar from '../components/ui/SearchBar'
import StatusBadge from '../components/ui/StatusBadge'
import { useAppStore } from '../store/useAppStore'
import { formatShortDate, formatShortDateTime } from '../utils/formatters'

// PHASE 4: Memoize history record card to prevent unnecessary re-renders
const HistoryRecordCard = React.memo(({ record }) => (
  <Card className="space-y-4 p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-xl font-bold text-slate-900">{record.customerName}</h3>
        <p className="mt-1 text-base text-slate-500">{record.phoneNumber}</p>
      </div>
      <StatusBadge tone="completed">Completed</StatusBadge>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-slate-50 p-3">
        <p className="text-sm font-medium text-slate-500">Coolers</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {record.coolersReturned}/{record.coolersIssued}
        </p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-3">
        <p className="text-sm font-medium text-slate-500">Bottles</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {record.bottlesReturned}/{record.bottlesIssued}
        </p>
      </div>
    </div>

    <div className="rounded-2xl bg-emerald-50 p-4 text-base text-emerald-800">
      <p className="font-semibold">Completed on {formatShortDate(record.completedAt)}</p>
      <p className="mt-1">
        {record.coolersIssued} cooler{record.coolersIssued !== 1 ? 's' : ''} and {record.bottlesIssued} bottle
        {record.bottlesIssued !== 1 ? 's' : ''} delivered
      </p>
      <p className="mt-1">Started {formatShortDateTime(record.createdAt)}</p>
    </div>

    {record.notes ? (
      <div className="rounded-2xl bg-slate-50 p-4 text-base text-slate-700">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Notes</p>
        <p className="mt-2 leading-6">{record.notes}</p>
      </div>
    ) : null}
  </Card>
))

HistoryRecordCard.displayName = 'HistoryRecordCard'

function History() {
  const deliveries = useAppStore((state) => state.deliveries)
  const [historySearch, setHistorySearch] = useState('')
  const isBooting = deliveries === null

  const historyRecords = useMemo(() => {
    return (deliveries ?? [])
      .filter((record) => record.status === 'completed')
      .sort((a, b) => new Date(b.completedAt || b.lastActionAt || b.createdAt).getTime() - new Date(a.completedAt || a.lastActionAt || a.createdAt).getTime())
  }, [deliveries])

  // PHASE 4: Memoize filtered records to prevent recalculation on every render
  const filteredRecords = useMemo(() => {
    return historyRecords.filter((record) => {
      const query = historySearch.trim().toLowerCase()
      if (!query) return true

      return [record.customerName, record.phoneNumber]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [historyRecords, historySearch])

  if (isBooting) {
    return (
      <div className="space-y-3">
        <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
        {[0, 1, 2].map((index) => (
          <div key={index} className="animate-pulse rounded-2xl border border-gray-100 bg-slate-50 p-4 shadow-sm">
            <div className="h-5 w-1/2 rounded-full bg-slate-200" />
            <div className="mt-3 h-4 w-2/3 rounded-full bg-slate-200" />
            <div className="mt-4 h-20 rounded-2xl bg-slate-200" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-2">
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <StatusBadge tone="completed">Completed records</StatusBadge>
        <h2 className="mt-3 text-2xl font-bold text-slate-900">History</h2>
        <p className="mt-2 text-base leading-6 text-slate-600">Search completed deliveries by customer or phone number.</p>
      </section>

      <SearchBar value={historySearch} onChange={setHistorySearch} placeholder="Search customer or phone" />

      {filteredRecords.length === 0 ? (
        <EmptyState
          title="No history found"
          description="Try a different name, phone number, or water type."
          icon={<Clock3 className="h-7 w-7" />}
        />
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => (
            <HistoryRecordCard key={record.id} record={record} />
          ))}
        </div>
      )}
    </div>
  )
}

export default React.memo(History)
