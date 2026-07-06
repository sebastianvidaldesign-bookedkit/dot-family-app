import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday } from 'date-fns'
import client from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    client.get('/parent/dashboard')
      .then(({ data }) => setData(data))
      .catch(err => setError(err.response?.data?.message || 'Could not load dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-dot-bg px-6 pt-12 pb-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-dot-text">Hi, {user?.name}</h1>
          <p className="text-dot-muted text-sm mt-0.5">Family overview</p>
        </div>
        <button onClick={handleLogout} className="text-xs text-dot-muted underline">
          Sign out
        </button>
      </div>

      {loading && (
        <div className="flex justify-center mt-16">
          <div className="w-8 h-8 border-2 border-dot-rose border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-rose-50 rounded-2xl p-5">
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      {!loading && !error && data?.shared === false && (
        <div className="bg-dot-surface rounded-3xl p-6 text-center">
          <p className="text-3xl mb-4">🔒</p>
          <p className="text-base font-semibold text-dot-text mb-2">Not shared yet</p>
          <p className="text-sm text-dot-muted leading-relaxed">
            When sharing is turned on in the app, you'll see a summary here.
          </p>
        </div>
      )}

      {!loading && !error && data?.shared === true && (
        <div className="flex flex-col gap-5">
          {/* Last period */}
          <div className="bg-white rounded-3xl border border-dot-border p-5">
            <p className="text-xs font-medium text-dot-muted mb-1">Last period started</p>
            <p className="text-lg font-semibold text-dot-text">
              {data.last_period_start
                ? format(parseISO(data.last_period_start), 'MMMM d, yyyy')
                : 'No data yet'}
            </p>
          </div>

          {/* Prediction */}
          {data.prediction?.status === 'predicted' && (
            <div className="bg-dot-surface rounded-3xl p-5">
              <p className="text-xs font-medium text-dot-muted mb-1">Next period estimate</p>
              <p className="text-lg font-semibold text-dot-rose">
                {format(parseISO(data.prediction.range_start), 'MMM d')} –{' '}
                {format(parseISO(data.prediction.range_end), 'MMM d')}
              </p>
              <p className="text-xs text-dot-muted mt-1">This is a rough estimate, not a certainty.</p>
            </div>
          )}

          {data.prediction?.status === 'learning' && (
            <div className="bg-dot-surface rounded-3xl p-5">
              <p className="text-xs font-medium text-dot-muted mb-1">Next period estimate</p>
              <p className="text-sm text-dot-muted">Still learning — check back after a few cycles.</p>
            </div>
          )}

          {/* Calendar */}
          {data.calendar && data.calendar.length > 0 && (
            <div>
              <p className="text-sm font-medium text-dot-text mb-3">This month</p>
              <MiniCalendar
                periodDates={data.calendar.map(c => c.date)}
                prediction={data.prediction}
              />
            </div>
          )}

          {/* Share level note */}
          <div className="bg-dot-sage-light rounded-2xl px-4 py-3">
            <p className="text-xs text-dot-text leading-relaxed">
              You're seeing: <span className="font-medium">{shareLevelLabel(data.share_level)}</span>.
              This is set by your child in their privacy settings.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniCalendar({ periodDates, prediction }) {
  const current = new Date()
  const periodSet = new Set(periodDates)

  function isPredicted(date) {
    if (!prediction || prediction.status !== 'predicted') return false
    const d = format(date, 'yyyy-MM-dd')
    return d >= prediction.range_start && d <= prediction.range_end
  }

  const calDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(current), { weekStartsOn: 0 }),
  })

  return (
    <div className="bg-white rounded-3xl border border-dot-border p-4">
      <p className="text-sm font-medium text-dot-text mb-3 px-1">{format(current, 'MMMM yyyy')}</p>

      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-xs text-dot-muted py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {calDays.map(date => {
          const key       = format(date, 'yyyy-MM-dd')
          const isPeriod  = periodSet.has(key)
          const predicted = !isPeriod && isPredicted(date)
          const inMonth   = isSameMonth(date, current)
          const today     = isToday(date)

          return (
            <div key={key} className="flex items-center justify-center py-0.5">
              <span
                className={`
                  w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium
                  ${!inMonth   ? 'text-dot-border' : ''}
                  ${isPeriod   ? 'bg-dot-rose text-white' : ''}
                  ${predicted  ? 'border-2 border-dashed border-dot-rose text-dot-rose' : ''}
                  ${today && !isPeriod && !predicted ? 'border-2 border-dot-rose text-dot-rose' : ''}
                  ${inMonth && !isPeriod && !predicted && !today ? 'text-dot-text' : ''}
                `}
              >
                {format(date, 'd')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function shareLevelLabel(level) {
  const map = {
    basic:      'Basic dates only',
    flow:       'Dates and flow',
    symptoms:   'Dates and symptoms',
    everything: 'Everything except private notes',
  }
  return map[level] || level
}
