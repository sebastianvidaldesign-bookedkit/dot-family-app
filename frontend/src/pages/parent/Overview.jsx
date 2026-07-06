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
      <p className="text-sm font-medium text-dot-muted mb-8">Family overview</p>

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

      {!loading && !error && data?.shared === false && (
        <NotSharedState />
      )}

      {!loading && !error && data?.shared === true && (
        <SharedState data={data} />
      )}
    </div>
  )
}

function NotSharedState() {
  return (
    <div className="bg-dot-surface rounded-4xl p-6 flex flex-col items-center text-center gap-4">
      <CatPeeking className="w-20 h-12 text-dot-rose" />
      <div>
        <p className="text-lg font-bold text-dot-text">No data yet</p>
        <p className="text-sm font-medium text-dot-muted mt-1.5 leading-relaxed max-w-[240px] mx-auto">
          Add the first period day from the Calendar tab.
        </p>
      </div>
    </div>
  )
}

function SharedState({ data }) {
  const { period_summary: ps, prediction } = data
  // share_level field removed — parents always see full data

  return (
    <div className="flex flex-col gap-4">
      {/* Period range summary */}
      {ps ? (
        <PeriodSummaryCard summary={ps} />
      ) : (
        <SummaryCard
          label="Last period"
          value="No entries yet"
          muted
        />
      )}

      {/* Prediction */}
      {(prediction?.status === 'fallback' || prediction?.status === 'learned') && (
        <div className="bg-dot-rose-light rounded-4xl px-6 py-5">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-bold text-dot-rose uppercase tracking-widest">Might start around</p>
            {prediction.confidence_label && (
              <span className="text-xs font-bold text-dot-rose-mid bg-dot-white px-2 py-0.5 rounded-full capitalize">
                {prediction.confidence_label}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-dot-rose">
            {format(parseISO(prediction.range_start), 'MMM d')} – {format(parseISO(prediction.range_end), 'MMM d')}
          </p>
          <p className="text-xs font-medium text-dot-rose-mid mt-2">
            {prediction.status === 'fallback'
              ? 'First guess — Dot will learn over time.'
              : 'Dot is learning your cycle.'}
          </p>
        </div>
      )}

      {prediction?.status === 'none' && (
        <SummaryCard
          label="Estimated next period"
          value="Dot will learn as more days are added"
          muted
        />
      )}

    </div>
  )
}

function PeriodSummaryCard({ summary }) {
  const started    = format(parseISO(summary.started),        'MMM d')
  const lastLogged = format(parseISO(summary.last_logged_day), 'MMM d')
  const same       = summary.started === summary.last_logged_day

  return (
    <div className="bg-dot-white rounded-3xl border border-dot-border px-5 py-4">
      <p className="text-xs font-bold text-dot-muted uppercase tracking-wide mb-3">Last period</p>

      <div className="flex flex-col gap-1.5">
        <Row label="Started" value={started} />
        {!same && <Row label="Last logged day" value={lastLogged} />}
        <Row
          label={same ? 'Duration so far' : 'Duration'}
          value={summary.duration_days === 1 ? '1 day' : `${summary.duration_days} days`}
        />
      </div>

      {!summary.has_cycle_start_marker && (
        <p className="text-xs text-dot-muted mt-3 leading-relaxed">
          Mark the first day in the Calendar to improve estimates.
        </p>
      )}
    </div>
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

function SummaryCard({ label, value, muted }) {
  return (
    <div className="bg-dot-white rounded-3xl border border-dot-border px-5 py-4">
      <p className="text-xs font-bold text-dot-muted uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-base font-bold ${muted ? 'text-dot-muted' : 'text-dot-text'}`}>{value}</p>
    </div>
  )
}

