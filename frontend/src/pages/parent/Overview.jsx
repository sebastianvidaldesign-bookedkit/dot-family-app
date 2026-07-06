import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import client from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { CatPeeking } from '../../components/Cat'

export default function Overview() {
  const { user } = useAuth()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    client.get('/parent/dashboard')
      .then(({ data }) => setData(data))
      .catch(err => setError(err.response?.data?.message || 'Could not load.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-5 pt-10 pb-8">
      <h1 className="text-2xl font-bold text-dot-text mb-1">Hi, {user?.name}</h1>
      <p className="text-sm font-medium text-dot-muted mb-8">Shared family calendar</p>

      {loading && (
        <div className="flex justify-center mt-16">
          <div className="w-8 h-8 border-[3px] border-dot-rose border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-dot-rose-light rounded-3xl p-5">
          <p className="text-sm font-semibold text-dot-rose">{error}</p>
        </div>
      )}

      {!loading && !error && data?.shared === false && <NoDataState />}

      {!loading && !error && data?.shared === true && <SharedState prediction={data.prediction} />}
    </div>
  )
}

function NoDataState() {
  return (
    <div className="bg-dot-surface rounded-4xl p-6 flex flex-col items-center text-center gap-4">
      <CatPeeking className="w-20 h-12 text-dot-rose" />
      <div>
        <p className="text-lg font-bold text-dot-text">No entries yet</p>
        <p className="text-sm font-medium text-dot-muted mt-1.5 leading-relaxed max-w-[240px] mx-auto">
          Add a period day from the Calendar tab, and Dot will start learning.
        </p>
      </div>
    </div>
  )
}

function SharedState({ prediction }) {
  const hasPeriodData = !!prediction?.last_period_start
  const hasEstimate   = prediction?.status === 'first_guess' || prediction?.status === 'learned'
  const hasOvulation  = hasEstimate && prediction?.possible_ovulation_window_start

  return (
    <div className="flex flex-col gap-4">

      {/* Last period summary */}
      {hasPeriodData ? (
        <PeriodSummaryCard prediction={prediction} />
      ) : (
        <Card>
          <Label>Last period</Label>
          <p className="text-base font-bold text-dot-muted">No entries yet</p>
        </Card>
      )}

      {/* Next period estimate */}
      {hasEstimate && <NextEstimateCard prediction={prediction} />}

      {prediction?.status === 'none' && (
        <Card>
          <Label>Next period</Label>
          <p className="text-sm font-medium text-dot-muted leading-relaxed">
            Dot will learn as you add period days.
          </p>
        </Card>
      )}

      {/* Possible ovulation window — subtle, secondary */}
      {hasOvulation && <OvulationCard prediction={prediction} />}

    </div>
  )
}

function PeriodSummaryCard({ prediction }) {
  const started    = format(parseISO(prediction.last_period_start),      'MMM d')
  const lastLogged = format(parseISO(prediction.last_logged_period_day), 'MMM d')
  const same       = prediction.last_period_start === prediction.last_logged_period_day
  const days       = prediction.duration_days
  const isInferred = prediction.period_start_source === 'inferred'
  const isLong     = days > 7

  return (
    <div className="bg-dot-white rounded-3xl border border-dot-border px-5 py-4">
      <Label>Last period</Label>

      <div className="flex flex-col gap-1.5 mt-3">
        <Row label="Started"          value={started} />
        {!same && <Row label="Last logged day" value={lastLogged} />}
        <Row
          label={same ? 'Duration so far' : 'Duration'}
          value={days === 1 ? '1 day' : `${days} days`}
        />
      </div>

      {isInferred && (
        <p className="text-xs text-dot-muted mt-3 leading-relaxed">
          Mark the first day in the Calendar to improve estimates.
        </p>
      )}

      {isLong && (
        <p className="text-xs text-dot-muted mt-3 leading-relaxed">
          Periods often last 2–7 days. If bleeding feels heavy or lasts longer than usual, check with a trusted adult or doctor.
        </p>
      )}
    </div>
  )
}

function NextEstimateCard({ prediction }) {
  const center     = format(parseISO(prediction.estimated_center_date), 'MMM d')
  const rangeStart = format(parseISO(prediction.estimated_range_start), 'MMM d')
  const rangeEnd   = format(parseISO(prediction.estimated_range_end),   'MMM d')
  const isFirst    = prediction.status === 'first_guess'

  return (
    <div className="bg-dot-rose-light rounded-4xl px-6 py-5">
      <div className="flex items-center gap-2 mb-3">
        <Label rose>Next period</Label>
        {prediction.confidence_label && (
          <span className="text-xs font-bold text-dot-rose-mid bg-dot-white px-2 py-0.5 rounded-full capitalize">
            {prediction.confidence_label}
          </span>
        )}
      </div>

      <p className="text-xs font-semibold text-dot-rose-mid mb-0.5 uppercase tracking-wide">
        Might start around
      </p>
      <p className="text-2xl font-bold text-dot-rose mb-1">{center}</p>

      {isFirst ? (
        <p className="text-xs font-medium text-dot-rose-mid">
          A normal early cycle can vary a lot — roughly {rangeStart} to {rangeEnd}.
        </p>
      ) : (
        <p className="text-xs font-medium text-dot-rose-mid">
          Possible range: {rangeStart} – {rangeEnd}
          {prediction.average_cycle_days ? ` · About every ${prediction.average_cycle_days} days` : ''}
        </p>
      )}

      <p className="text-xs font-medium text-dot-rose-mid mt-2">
        {prediction.message}
      </p>
    </div>
  )
}

function OvulationCard({ prediction }) {
  const start = format(parseISO(prediction.possible_ovulation_window_start), 'MMM d')
  const end   = format(parseISO(prediction.possible_ovulation_window_end),   'MMM d')

  return (
    <div className="bg-dot-surface rounded-3xl px-5 py-4 border border-dot-border">
      <Label>Possible cycle phase</Label>
      <p className="text-sm font-bold text-dot-text mt-2">Around {start} – {end}</p>
      <p className="text-xs font-medium text-dot-muted mt-1 leading-relaxed">
        Very rough estimate. Dot is still learning.
      </p>
    </div>
  )
}

// ── Shared primitives ──────────────────────────────────────────────────────────

function Card({ children }) {
  return (
    <div className="bg-dot-white rounded-3xl border border-dot-border px-5 py-4">
      {children}
    </div>
  )
}

function Label({ children, rose }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${rose ? 'text-dot-rose' : 'text-dot-muted'}`}>
      {children}
    </p>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm font-medium text-dot-muted">{label}</span>
      <span className="text-sm font-bold text-dot-text">{value}</span>
    </div>
  )
}
