import { useEffect, useState } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday, parseISO,
} from 'date-fns'
import client from '../../api/client'
import { CatPeeking } from '../../components/Cat'

export default function ParentCalendar() {
  const [current, setCurrent] = useState(new Date())
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get('/parent/dashboard')
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false))
  }, [])

  const periodSet = new Set((data?.calendar || []).map(c => c.date))

  function isPredicted(date) {
    const pred = data?.prediction
    if (!pred || pred.status !== 'predicted') return false
    const d = format(date, 'yyyy-MM-dd')
    return d >= pred.range_start && d <= pred.range_end
  }

  const calDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(current),   { weekStartsOn: 0 }),
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-[3px] border-dot-rose border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data?.shared) {
    return (
      <div className="px-5 pt-10 pb-8">
        <h1 className="text-2xl font-bold text-dot-text mb-8">Calendar</h1>
        <div className="bg-dot-surface rounded-4xl p-6 flex flex-col items-center text-center gap-4">
          <CatPeeking className="w-20 h-12 text-dot-rose" />
          <p className="text-sm font-medium text-dot-muted leading-relaxed">
            No data shared yet. The calendar will appear here once sharing is turned on.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-8 pb-8">
      <h1 className="text-2xl font-bold text-dot-text mb-6 px-1">Calendar</h1>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-5 px-1">
        <button
          onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1))}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-dot-surface text-dot-muted text-xl font-bold"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="text-base font-bold text-dot-text">{format(current, 'MMMM yyyy')}</p>
        <button
          onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1))}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-dot-surface text-dot-muted text-xl font-bold"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-2xs font-bold text-dot-muted py-1 tracking-wide uppercase">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {calDays.map(date => {
          const key      = format(date, 'yyyy-MM-dd')
          const isPeriod = periodSet.has(key)
          const predicted= !isPeriod && isPredicted(date)
          const inMonth  = isSameMonth(date, current)
          const today    = isToday(date)

          return (
            <div key={key} className="flex items-center justify-center py-1">
              <span className={[
                'w-10 h-10 flex items-center justify-center rounded-full text-sm font-semibold',
                !inMonth  && 'text-dot-border',
                isPeriod  && 'bg-dot-rose text-white',
                predicted && 'border-2 border-dashed border-dot-rose-mid text-dot-rose',
                today && !isPeriod && !predicted && 'border-2 border-dot-rose text-dot-rose',
                inMonth && !isPeriod && !predicted && !today && 'text-dot-text',
              ].filter(Boolean).join(' ')}>
                {format(date, 'd')}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-5 mt-4 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-dot-rose flex-shrink-0" />
          <span className="text-xs font-semibold text-dot-muted">Period day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full border-2 border-dashed border-dot-rose-mid flex-shrink-0" />
          <span className="text-xs font-semibold text-dot-muted">Estimated</span>
        </div>
      </div>

      {/* Read-only note */}
      <div className="mt-6 bg-dot-sage-light rounded-2xl px-4 py-3">
        <p className="text-xs font-medium text-dot-text">
          This is read-only. Only your child can add or change entries.
        </p>
      </div>
    </div>
  )
}
