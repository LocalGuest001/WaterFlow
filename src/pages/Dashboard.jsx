import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Clock3, Droplet, Package2, PlusCircle, Users } from 'lucide-react'
import Card from '../components/ui/Card'
import StatusBadge from '../components/ui/StatusBadge'
import { useAppStore } from '../store/useAppStore'
import { formatShortDateTime } from '../utils/formatters'

// PHASE 4: Memoize dashboard cards to prevent re-renders when data hasn't changed
const DashboardCard = React.memo(({ label, value, icon: Icon, cardClass, iconClass }) => (
  <Card className={`p-3 ${cardClass}`}>
    <div className="flex h-full flex-col items-start gap-3">
      <div className="flex w-full items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  </Card>
))

DashboardCard.displayName = 'DashboardCard'

function Dashboard() {
  const deliveries = useAppStore((state) => state.deliveries)
  const isBooting = deliveries === null

  const activeRecords = useMemo(() => {
    return (deliveries ?? [])
      .filter((record) => record.status === 'active' || record.status === 'overdue')
      .sort((a, b) => new Date(b.lastActionAt || b.createdAt).getTime() - new Date(a.lastActionAt || a.createdAt).getTime())
  }, [deliveries])

  const historyRecords = useMemo(() => {
    return (deliveries ?? [])
      .filter((record) => record.status === 'completed')
      .sort((a, b) => new Date(b.completedAt || b.lastActionAt || b.createdAt).getTime() - new Date(a.completedAt || a.lastActionAt || a.createdAt).getTime())
  }, [deliveries])

  // PHASE 4: Memoize summary calculations to prevent recalculation on every render
  const summary = useMemo(() => ({
    pendingCoolers: activeRecords.reduce((total, record) => total + Math.max(0, record.coolersPending ?? 0), 0),
    pendingBottles: activeRecords.reduce((total, record) => total + Math.max(0, record.bottlesPending ?? 0), 0),
    activeCustomers: activeRecords.length,
    overdueCustomers: activeRecords.filter((record) => record.status === 'overdue').length,
  }), [activeRecords])

  // PHASE 4: Memoize recent feed to prevent unnecessary sorting on every render
  const recentFeed = useMemo(() => {
    return [...activeRecords, ...historyRecords]
      .map((record) => ({
        record,
        date: record.completedAt || record.lastActionAt || record.updatedAt || record.createdAt,
        state: record.status === 'completed' ? 'Completed' : record.status === 'overdue' ? 'Overdue' : 'Active',
      }))
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 3)
  }, [activeRecords, historyRecords])

  return (
    <div className="space-y-4 pb-2">
      <section className="px-4 pt-1">
        <Link to="/new-entry" className="block">
          <Card className="border-blue-100 bg-sky-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-white">
                  <PlusCircle className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">New Entry</p>
                  <p className="text-sm font-medium text-slate-600">Tap to submit a delivery</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-sky-700" />
            </div>
          </Card>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 px-4">
        <Link to="/active-records" className="block">
          <Card className="min-h-[76px] border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">Pending</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/history" className="block">
          <Card className="min-h-[76px] border-gray-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-700">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">History</p>
              </div>
            </div>
          </Card>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 px-4">
        {[
          { label: 'Pending Coolers', value: summary.pendingCoolers, icon: Package2, cardClass: 'bg-sky-50 border-sky-100', iconClass: 'bg-sky-100 text-sky-700' },
          { label: 'Pending Bottles', value: summary.pendingBottles, icon: Droplet, cardClass: 'bg-cyan-50 border-cyan-100', iconClass: 'bg-cyan-100 text-cyan-700' },
          { label: 'Active Customers', value: summary.activeCustomers, icon: Users, cardClass: 'bg-emerald-50 border-emerald-100', iconClass: 'bg-emerald-100 text-emerald-700' },
          { label: 'Overdue', value: summary.overdueCustomers, icon: AlertTriangle, cardClass: 'bg-rose-50 border-rose-100', iconClass: 'bg-rose-100 text-rose-700' },
        ].map((card) => (
          <DashboardCard key={card.label} {...card} />
        ))}
      </section>

      <Card className="mx-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
            <p className="text-sm text-slate-500">Latest records</p>
          </div>
          <Link to="/history" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700">
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isBooting ? (
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {recentFeed.map(({ record, date, state }) => (
              <Link key={record.id} to="/active-records" className="block">
                <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{record.customerName}</p>
                      <p className="text-sm text-slate-500">{record.phoneNumber}</p>
                    </div>
                    <div className="text-sm font-medium text-slate-500">{formatShortDateTime(date)}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <StatusBadge tone={state === 'Completed' ? 'completed' : state === 'Overdue' ? 'overdue' : 'active'} small>
                      {state}
                    </StatusBadge>
                    <span>
                      {record.coolersPending ?? 0} cooler{(record.coolersPending ?? 0) !== 1 ? 's' : ''} pending · {record.bottlesPending ?? 0} bottle
                      {(record.bottlesPending ?? 0) !== 1 ? 's' : ''} pending
                    </span>
                  </div>
                  {record.notes ? <p className="mt-2 text-sm leading-6 text-slate-600">{record.notes}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default React.memo(Dashboard)
