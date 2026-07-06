import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import client from '../../api/client'
import { CatSitting } from '../../components/Cat'

export default function NextPeriod() {
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    client.get('/period-logs/prediction')
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

      {!loading && prediction?.status === 'learning' && <LearningCard />}
      {!loading && prediction?.status === 'predicted' && <PredictionCard prediction={prediction} />}
    </div>
  )
}

function LearningCard() {
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-dot-surface rounded-4xl p-6 flex flex-col items-center text-center gap-4">
        <CatSitting className="w-24 h-24 text-dot-rose" />
        <div>
          <p className="text-lg font-bold text-dot-text">Tiny reminder</p>
          <p className="text-sm font-medium text-dot-muted mt-1.5 leading-relaxed max-w-[260px] mx-auto">
            Your calendar is learning. After a couple of cycles, it'll give you a rough idea of what's coming.
          </p>
        </div>
      </div>

      <InfoCard
        icon="📅"
        title="Keep adding days"
        body="Just log whether today is a period day. That's all it needs."
      />
    </div>
  )
}

function PredictionCard({ prediction }) {
  const rangeStart = format(parseISO(prediction.range_start), 'MMM d')
  const rangeEnd   = format(parseISO(prediction.range_end),   'MMM d')
  const lastStart  = format(parseISO(prediction.last_period_start), 'MMMM d')

  return (
    <div className="flex flex-col gap-4">
      {/* Main estimate card */}
      <div className="bg-dot-rose-light rounded-4xl px-6 py-6">
        <p className="text-xs font-bold text-dot-rose uppercase tracking-widest mb-3">Estimated next period</p>
        <p className="text-[34px] font-bold text-dot-rose leading-none mb-1">
          {rangeStart} – {rangeEnd}
        </p>
        <p className="text-sm font-medium text-dot-rose-mid mt-2">
          About every {prediction.avg_cycle_days} days
        </p>
      </div>

      {/* Last period */}
      <div className="bg-dot-white rounded-3xl border border-dot-border px-5 py-4">
        <p className="text-xs font-bold text-dot-muted uppercase tracking-wide mb-1">Last period started</p>
        <p className="text-base font-bold text-dot-text">{lastStart}</p>
      </div>

      {/* Gentle disclaimer */}
      <div className="bg-dot-sage-light rounded-3xl px-5 py-4">
        <p className="text-sm font-medium text-dot-text leading-relaxed">
          Cycles can be irregular, especially at first. This is only a guess — your body knows its own timing.
        </p>
      </div>
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
