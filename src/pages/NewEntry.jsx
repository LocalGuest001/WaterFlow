import { useState } from 'react'
import { Mic } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import CounterInput from '../components/ui/CounterInput'
import { useAppStore } from '../store/useAppStore'

const emptyForm = {
  customerName: '',
  phoneNumber: '',
  coolerCount: 1,
  bottleCount: 0,
  notes: '',
}

export default function NewEntry() {
  const navigate = useNavigate()
  const addEntry = useAppStore((state) => state.addEntry)
  const [formState, setFormState] = useState(emptyForm)
  const [voiceState, setVoiceState] = useState('Tap to note by voice')

  const canSave = formState.customerName.trim().length > 0 && formState.phoneNumber.trim().length === 10

  const updateField = (fieldName, value) => {
    setFormState((current) => ({ ...current, [fieldName]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!canSave) {
      return
    }

    const saved = await addEntry({ ...formState, phoneNumber: formState.phoneNumber.slice(0, 10) })

    if (!saved) {
      return
    }

    setFormState(emptyForm)
    navigate('/active-records', { replace: true })
  }

  return (
    <div className="space-y-4 pb-2">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Card className="space-y-4 p-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">Customer Name</p>
            <p className="text-sm text-slate-500">Tap mic to add by voice</p>
          </div>

          <div className="relative">
            <input
              value={formState.customerName}
              onChange={(e) => updateField('customerName', e.target.value)}
              placeholder="Enter customer name"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-14 text-lg text-slate-900 shadow-sm outline-none"
            />
            <button
              type="button"
              onClick={() => setVoiceState('Voice input ready')}
              className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-sky-50 text-sky-700"
              aria-label="Start voice input"
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>

          <div>
            <p className="text-lg font-semibold text-slate-900">Phone Number</p>
            <input
              value={formState.phoneNumber}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                updateField('phoneNumber', digits)
              }}
              placeholder="10-digit mobile"
              inputMode="numeric"
              type="tel"
              maxLength={10}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-lg text-slate-900 shadow-sm outline-none"
            />
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <CounterInput label="Cooler Count" value={formState.coolerCount} onChange={(value) => updateField('coolerCount', value)} helperText="Default 1" />

          {formState.bottleCount > 0 ? (
            <CounterInput label="Bottle Count" value={formState.bottleCount} onChange={(value) => updateField('bottleCount', value)} helperText="Tap plus or minus" />
          ) : (
            <button
              type="button"
              onClick={() => updateField('bottleCount', 1)}
              className="flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-base font-semibold text-slate-600"
            >
              <span>+ Add Bottle Count</span>
              <span className="text-sky-700">Optional</span>
            </button>
          )}
        </Card>

        <Card className="space-y-3 p-4 pb-8">
          <label className="block space-y-2">
            <span className="text-base font-semibold text-slate-800">Notes</span>
            <textarea
              value={formState.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              placeholder="Add a short note if needed"
              rows={4}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-lg text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </label>
        </Card>

        <div className="sticky bottom-[6.5rem] z-20 -mx-1 rounded-t-3xl bg-white/95 px-1 pt-4 backdrop-blur">
          <Button type="submit" size="lg" className="w-full min-h-[56px]" disabled={!canSave}>
            Save Delivery
          </Button>
        </div>
      </form>

      <p className="sr-only" aria-live="polite">
        {voiceState}
      </p>
    </div>
  )
}
