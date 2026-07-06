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
        <p className="text-lg font-bold text-dot-text">Not shared yet</p>
        <p className="text-sm font-medium text-dot-muted mt-1.5 leading-relaxed max-w-[240px] mx-auto">
          When sharing is turned on in the app, you'll see a summary here.
        </p>
      </div>
    </div>
  )
}

function SharedState({ data }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Last period */}
      <SummaryCard
        label="Last period started"
        value={data.last_period_start
          ? format(parseISO(data.last_period_start), 'MMMM d, yyyy')
          : 'No data yet'}
      />

      {/* Prediction */}
      {data.prediction?.status === 'predicted' && (
        <div className="bg-dot-rose-light rounded-4xl px-6 py-5">
          <p className="text-xs font-bold text-dot-rose uppercase tracking-widest mb-2">Estimated next period</p>
          <p className="text-2xl font-bold text-dot-rose">
            {format(parseISO(data.prediction.range_start), 'MMM d')} – {format(parseISO(data.prediction.range_end), 'MMM d')}
          </p>
          <p className="text-xs font-medium text-dot-rose-mid mt-1">Rough estimate only</p>
        </div>
      )}

      {data.prediction?.status === 'learning' && (
        <SummaryCard
          label="Estimated next period"
          value="Still learning — check back soon"
          muted
        />
      )}

      {/* Visibility badge */}
      <div className="bg-dot-sage-light rounded-3xl px-5 py-4 flex items-center gap-3">
        <span className="text-lg">🔒</span>
        <div>
          <p className="text-xs font-bold text-dot-text">Shared visibility</p>
          <p className="text-sm font-medium text-dot-muted mt-0.5">{shareLevelLabel(data.share_level)}</p>
        </div>
      </div>
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

function shareLevelLabel(level) {
  return {
    basic:      'Dates only',
    flow:       'Dates and flow',
    symptoms:   'Dates and symptoms',
    everything: 'Almost everything',
  }[level] || level
}
