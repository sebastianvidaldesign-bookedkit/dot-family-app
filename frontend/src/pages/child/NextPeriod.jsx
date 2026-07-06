import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import client from '../../api/client'
import { CatSitting } from '../../components/Cat'

export default function NextPeriod() {
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    client.get('/family/prediction')
      .then(({ data }) => setPrediction(data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-5 pt-10 pb-8">
      <h1 className="text-2xl font-bold text-dot-text mb-1">Next period</h1>
      <p className="text-sm font-medium text-dot-muted mb-8">A rough guess, not a guarantee.</p>

      {loading && (
        <div className="flex justify-center mt-16">
          <div className="w-8 h-8 border-[3px] border-dot-rose border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && prediction?.status === 'none'        && <LearningCard />}
      {!loading && prediction?.status === 'first_guess' && <EstimateCard prediction={prediction} />}
      {!loading && prediction?.status === 'learned'     && <EstimateCard prediction={prediction} />}
    </div>
  )
}

function LearningCard() {
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-dot-surface rounded-4xl p-6 flex flex-col items-center text-center gap-4">
        <CatSitting className="w-24 h-24 text-dot-rose" />
        <div>
          <p className="text-lg font-bold text-dot-text">Dot is still learning</p>
          <p className="text-sm font-medium text-dot-muted mt-1.5 leading-relaxed max-w-[260px] mx-auto">
            Dot will learn as you add period days.
          </p>
        </div>
      </div>

      <InfoCard
        icon="📅"
        title="Keep adding days"
        body="Just log whether today is a period day, and mark the first day when your period starts."
      />
    </div>
  )
}

function EstimateCard({ prediction }) {
  const center     = format(parseISO(prediction.estimated_center_date), 'MMM d')
  const rangeStart = format(parseISO(prediction.estimated_range_start), 'MMM d')
  const rangeEnd   = format(parseISO(prediction.estimated_range_end),   'MMM d')
  const isFirst    = prediction.status === 'first_guess'
  const hasOv      = !!prediction.possible_ovulation_window_start

  return (
    <div className="flex flex-col gap-4">
      {/* Main estimate */}
      <div className="bg-dot-rose-light rounded-4xl px-6 py-6">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-bold text-dot-rose uppercase tracking-widest">
            Might start around
          </p>
          {prediction.confidence_label && (
            <span className="text-xs font-bold text-dot-rose-mid bg-dot-white px-2 py-0.5 rounded-full capitalize">
              {prediction.confidence_label}
            </span>
          )}
        </div>

        <p className="text-[34px] font-bold text-dot-rose leading-none mb-2">{center}</p>

        {isFirst ? (
          <p className="text-sm font-medium text-dot-rose-mid">
            A normal early cycle can vary a lot — roughly {rangeStart} to {rangeEnd}.
          </p>
        ) : (
          <p className="text-sm font-medium text-dot-rose-mid">
            Possible range: {rangeStart} – {rangeEnd}
            {prediction.average_cycle_days ? ` · About every ${prediction.average_cycle_days} days` : ''}
          </p>
        )}
      </div>

      {/* Last period started */}
      {prediction.last_period_start && (
        <div className="bg-dot-white rounded-3xl border border-dot-border px-5 py-4">
          <p className="text-xs font-bold text-dot-muted uppercase tracking-wide mb-1">Last period started</p>
          <p className="text-base font-bold text-dot-text">
            {format(parseISO(prediction.last_period_start), 'MMMM d')}
          </p>
          {prediction.duration_days && (
            <p className="text-xs font-medium text-dot-muted mt-1">
              {prediction.duration_days === 1
                ? '1 day logged'
                : `${prediction.duration_days} days logged`}
            </p>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-dot-sage-light rounded-3xl px-5 py-4">
        <p className="text-sm font-medium text-dot-text leading-relaxed">
          {prediction.message} Dot will learn over time.
        </p>
      </div>

      {/* Possible cycle phase — very light, child-facing */}
      {hasOv && (
        <div className="px-1">
          <p className="text-xs font-medium text-dot-muted text-center leading-relaxed">
            Possible cycle phase around{' '}
            {format(parseISO(prediction.possible_ovulation_window_start), 'MMM d')}–
            {format(parseISO(prediction.possible_ovulation_window_end),   'MMM d')}.{' '}
            Very rough estimate.
          </p>
        </div>
      )}
    </div>
  )
}

function InfoCard({ icon, title, body }) {
  return (
    <div className="bg-dot-white rounded-3xl border border-dot-border px-5 py-4 flex gap-4 items-start">
      <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-bold text-dot-text">{title}</p>
        <p className="text-sm font-medium text-dot-muted mt-1 leading-relaxed">{body}</p>
      </div>
    </div>
  )
}
