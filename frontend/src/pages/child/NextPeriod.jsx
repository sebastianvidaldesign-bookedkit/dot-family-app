import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import client from '../../api/client'

export default function NextPeriod() {
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    client.get('/period-logs/prediction')
      .then(({ data }) => setPrediction(data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-6 pt-12 pb-6 flex flex-col min-h-full">
      <h1 className="text-2xl font-semibold text-dot-text mb-1">Next period</h1>
      <p className="text-dot-muted text-sm mb-10">A rough estimate, not a guarantee.</p>

      {loading && (
        <div className="flex justify-center mt-16">
          <div className="w-8 h-8 border-2 border-dot-rose border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && prediction?.status === 'learning' && (
        <LearningCard />
      )}

      {!loading && prediction?.status === 'predicted' && (
        <PredictionCard prediction={prediction} />
      )}
    </div>
  )
}

function LearningCard() {
  return (
    <div className="bg-dot-surface rounded-3xl p-6 flex flex-col gap-4">
      <div className="w-14 h-14 rounded-full bg-dot-rose-light flex items-center justify-center text-2xl">
        🌱
      </div>
      <h2 className="text-lg font-semibold text-dot-text">Still learning your cycle</h2>
      <p className="text-dot-muted text-sm leading-relaxed">
        After you've tracked a couple of cycles, this will give you a rough idea of when your next period might arrive.
      </p>
      <p className="text-dot-muted text-sm leading-relaxed">
        Keep logging and it'll fill in over time.
      </p>
    </div>
  )
}

function PredictionCard({ prediction }) {
  const rangeStart = format(parseISO(prediction.range_start), 'MMM d')
  const rangeEnd   = format(parseISO(prediction.range_end), 'MMM d')
  const lastStart  = format(parseISO(prediction.last_period_start), 'MMMM d')

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-dot-surface rounded-3xl p-6">
        <p className="text-sm text-dot-muted mb-3">Your next period might start around</p>
        <p className="text-3xl font-semibold text-dot-rose">
          {rangeStart} – {rangeEnd}
        </p>
        <p className="text-xs text-dot-muted mt-3">
          Based on an average cycle of about {prediction.avg_cycle_days} days.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-dot-border p-5">
        <p className="text-xs font-medium text-dot-muted mb-1">Last period started</p>
        <p className="text-base font-semibold text-dot-text">{lastStart}</p>
      </div>

      <div className="bg-dot-sage-light rounded-3xl p-5">
        <p className="text-sm text-dot-text leading-relaxed">
          Cycles can be irregular, especially when you're younger. This is only a guess — your body knows its own timing.
        </p>
      </div>
    </div>
  )
}
