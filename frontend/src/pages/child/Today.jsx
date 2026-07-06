import { useState, useEffect } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import client from '../../api/client'
import { CatSitting, PawPrint } from '../../components/Cat'

const todayKey = format(new Date(), 'yyyy-MM-dd')
const displayDate = format(new Date(), 'EEEE, MMMM d')

export default function Today() {
  const [ranges, setRanges]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    client.get('/family/ranges')
      .then(({ data }) => setRanges(data))
      .finally(() => setLoading(false))
  }, [])

  async function startPeriod() {
    setSaving(true)
    try {
      const { data } = await client.post('/family/ranges', {
        start_date: todayKey,
        end_date:   null,
      })
      setRanges(prev => [data, ...prev.filter(r => r.id !== data.id)])
    } finally {
      setSaving(false)
    }
  }

  async function endPeriod(range) {
    setSaving(true)
    try {
      const { data } = await client.post('/family/ranges', {
        id:         range.id,
        start_date: range.start_date,
        end_date:   todayKey,
        flow:       range.flow,
        symptoms:   range.symptoms,
      })
      setRanges(prev => [data, ...prev.filter(r => r.id !== data.id)])
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-[3px] border-dot-rose border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Determine view state from ranges
  const ongoingRange = ranges.find(r => r.ongoing)
  const activeRange  = ranges.find(r =>
    r.start_date <= todayKey && (r.ongoing || (r.end_date && r.end_date >= todayKey))
  )

  return (
    <div className="flex flex-col min-h-[calc(100dvh-64px)] px-5 pt-10 pb-6">
      {ongoingRange ? (
        <OngoingView range={ongoingRange} onEnd={() => endPeriod(ongoingRange)} saving={saving} />
      ) : activeRange ? (
        <InRangeView range={activeRange} />
      ) : (
        <NoneView onStart={startPeriod} saving={saving} />
      )}
    </div>
  )
}

// ── No active period ───────────────────────────────────────────────────────────

function NoneView({ onStart, saving }) {
  const [declined, setDeclined] = useState(false)

  if (declined) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-dot-surface flex items-center justify-center text-2xl">
          ✓
        </div>
        <div>
          <p className="text-xl font-bold text-dot-text">Got it!</p>
          <p className="text-sm font-medium text-dot-muted mt-1">
            Come back when it starts.
          </p>
        </div>
        <button
          onClick={() => setDeclined(false)}
          className="text-sm font-semibold text-dot-muted underline underline-offset-2 mt-2"
        >
          Actually, it did start
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-dot-muted uppercase tracking-widest mb-1">
            {displayDate}
          </p>
          <h1 className="text-[28px] font-bold text-dot-text leading-tight">
            Did your period<br />start today?
          </h1>
        </div>
        <CatSitting className="w-[72px] h-[72px] text-dot-rose flex-shrink-0 -mb-1" />
      </div>

      <div className="flex flex-col gap-3 mt-auto">
        <button
          onClick={onStart}
          disabled={saving}
          className="w-full h-[64px] rounded-4xl bg-dot-rose text-white font-bold text-xl active:scale-[0.98] disabled:opacity-60 transition-all"
        >
          {saving ? 'Saving…' : 'Yes, it started today'}
        </button>
        <button
          onClick={() => setDeclined(true)}
          disabled={saving}
          className="w-full h-[64px] rounded-4xl border-2 border-dot-border bg-dot-white text-dot-text font-semibold text-xl active:scale-[0.98] disabled:opacity-60 transition-all"
        >
          Not today
        </button>
      </div>
    </div>
  )
}

// ── Period ongoing ─────────────────────────────────────────────────────────────

function OngoingView({ range, onEnd, saving }) {
  const started     = format(parseISO(range.start_date), 'MMMM d')
  const daysSoFar   = differenceInDays(new Date(), parseISO(range.start_date)) + 1
  const durationStr = daysSoFar === 1 ? '1 day so far' : `${daysSoFar} days so far`

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-dot-muted uppercase tracking-widest mb-1">
            {displayDate}
          </p>
          <h1 className="text-[28px] font-bold text-dot-text leading-tight">
            You're on<br />your period
          </h1>
        </div>
        <CatSitting className="w-[72px] h-[72px] text-dot-rose flex-shrink-0 -mb-1" />
      </div>

      <div className="bg-dot-rose-light rounded-3xl px-5 py-5 mb-4">
        <p className="text-xs font-bold text-dot-rose uppercase tracking-wide mb-3">
          Current period
        </p>
        <div className="flex flex-col gap-1.5">
          <InfoRow label="Started"  value={started} />
          <InfoRow label="Duration" value={durationStr} />
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-auto">
        <button
          onClick={onEnd}
          disabled={saving}
          className="w-full h-[64px] rounded-4xl bg-dot-rose text-white font-bold text-xl active:scale-[0.98] disabled:opacity-60 transition-all"
        >
          {saving ? 'Saving…' : 'Mark it ended today'}
        </button>
        <p className="text-center text-xs font-medium text-dot-muted">
          You can also edit the end date later in the Calendar.
        </p>
      </div>
    </div>
  )
}

// ── Period complete (today is within a finished range) ────────────────────────

function InRangeView({ range }) {
  const started  = format(parseISO(range.start_date), 'MMMM d')
  const ended    = range.end_date ? format(parseISO(range.end_date), 'MMMM d') : null
  const days     = range.end_date
    ? differenceInDays(parseISO(range.end_date), parseISO(range.start_date)) + 1
    : null

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col items-center pt-10 pb-6 text-center">
        <div className="w-16 h-16 rounded-full bg-dot-rose-light flex items-center justify-center mb-4">
          <PawPrint className="w-8 h-8 text-dot-rose" />
        </div>
        <h2 className="text-2xl font-bold text-dot-text">Period complete</h2>
        <p className="text-sm font-medium text-dot-muted mt-1.5">
          Dot has it logged.
        </p>
      </div>

      <div className="bg-dot-rose-light rounded-3xl px-5 py-5">
        <p className="text-xs font-bold text-dot-rose uppercase tracking-wide mb-3">
          This period
        </p>
        <div className="flex flex-col gap-1.5">
          <InfoRow label="Started"  value={started} />
          {ended && <InfoRow label="Ended"    value={ended} />}
          {days  && <InfoRow label="Duration" value={days === 1 ? '1 day' : `${days} days`} />}
        </div>
      </div>
    </div>
  )
}

// ── Shared primitive ──────────────────────────────────────────────────────────

function InfoRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm font-medium text-dot-rose-mid">{label}</span>
      <span className="text-sm font-bold text-dot-rose">{value}</span>
    </div>
  )
}
