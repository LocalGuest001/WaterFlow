export function formatShortDateTime(value) {
  if (!value) return 'Today'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatShortDate(value) {
  if (!value) return 'Today'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function getPendingCount(record) {
  const coolerPending = Number(record.coolersPending ?? Math.max(0, (record.coolerTaken ?? 0) - (record.coolerReturned ?? 0)))
  const bottlePending = Number(record.bottlesPending ?? Math.max(0, (record.bottleTaken ?? 0) - (record.bottleReturned ?? 0)))

  return Math.max(0, coolerPending) + Math.max(0, bottlePending)
}
