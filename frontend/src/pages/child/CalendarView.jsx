import { useState, useEffect } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday, parseISO, isSameDay
} from 'date-fns'
import client from '../../api/client'

const FLOWS = [
  { value: 'light',    label: 'Light' },
  { value: 'medium',   label: 'Medium' },
  { value: 'heavy',    label: 'Heavy' },
  { value: 'not_sure', label: 'Not sure' },
]

const SYMPTOMS = [
  { value: 'cramps',    label: 'Cramps' },
  { value: 'tired',     label: 'Tired' },
  { value: 'headache',  label: 'Headache' },
  { value: 'emotional', label: 'Emotional' },
  { value: 'nothing',   label: 'Nothing' },
]

export default function CalendarView() {
  const [current, setCurrent] = useState(new Date())
  const [logs, setLogs]       = useState([])
  const [prediction, setPrediction] = useState(null)
  const [selected, setSelected]     = useState(null)
  const [editLog, setEditLog]       = useState(null)
  const [saving, setSaving]         = useState(false)

  const monthKey = format(current, 'yyyy-MM')

  useEffect(() => {
    client.get(`/period-logs?month=${monthKey}`).then(({ data }) => setLogs(data))
    client.get('/period-logs/prediction').then(({ data }) => setPrediction(data))
  }, [monthKey])

  const logMap = Object.fromEntries(logs.map(l => [l.date, l]))

  function isPredicted(date) {
    if (!prediction || prediction.status !== 'predicted') return false
    const d = format(date, 'yyyy-MM-dd')
    return d >= prediction.range_start && d <= prediction.range_end
  }

  const calDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(current), { weekStartsOn: 0 }),
  })

  function openDay(date) {
    const key = format(date, 'yyyy-MM-dd')
    setSelected(key)
    setEditLog(logMap[key] || { date: key, is_period_day: false, flow: null, symptoms: [] })
  }

  async function saveEdit() {
    setSaving(true)
    try {
      const { data } = await client.post('/period-logs', {
        date:           editLog.date,
        is_period_day:  editLog.is_period_day,
        flow:           editLog.is_period_day ? editLog.flow : null,
        symptoms:       editLog.is_period_day ? (editLog.symptoms || []) : [],
      })
      setLogs(prev => {
        const next = prev.filter(l => l.date !== data.date)
        if (data.is_period_day) next.push(data)
        return next
      })
      setSelected(null)
    } finally {
      setSaving(false)
    }
  }

  function toggleSymptom(val) {
    setEditLog(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(val)
        ? prev.symptoms.filter(s => s !== val)
        : [...prev.symptoms, val],
    }))
  }

  return (
    <div className="px-4 pt-10 pb-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-6 px-2">
        <button
          onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1))}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-dot-surface"
        >
          ‹
        </button>
        <h2 className="text-lg font-semibold text-dot-text">
          {format(current, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1))}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-dot-surface"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-xs text-dot-muted py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {calDays.map(date => {
          const key         = format(date, 'yyyy-MM-dd')
          const log         = logMap[key]
          const isPeriod    = log?.is_period_day
          const predicted   = !isPeriod && isPredicted(date)
          const inMonth     = isSameMonth(date, current)
          const today       = isToday(date)

          return (
            <button
              key={key}
              onClick={() => inMonth && openDay(date)}
              disabled={!inMonth}
              className="flex items-center justify-center py-1"
            >
              <span
                className={`
                  w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-colors
                  ${!inMonth    ? 'text-dot-border cursor-default' : ''}
                  ${isPeriod    ? 'bg-dot-rose text-white' : ''}
                  ${predicted   ? 'border-2 border-dashed border-dot-rose text-dot-rose' : ''}
                  ${today && !isPeriod && !predicted ? 'border-2 border-dot-rose text-dot-rose' : ''}
                  ${inMonth && !isPeriod && !predicted && !today ? 'text-dot-text hover:bg-dot-surface' : ''}
                `}
              >
                {format(date, 'd')}
              </span>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 px-2">
        <LegendItem color="bg-dot-rose" label="Period" />
        <LegendItem predicted label="Estimated" />
      </div>

      {/* Day edit sheet */}
      {selected && editLog && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setSelected(null)}>
          <div
            className="w-full max-w-md mx-auto bg-white rounded-t-3xl p-6 pb-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-dot-border rounded-full mx-auto mb-5" />
            <h3 className="text-base font-semibold text-dot-text mb-5">
              {format(parseISO(editLog.date), 'MMMM d, yyyy')}
            </h3>

            {/* Period toggle */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-medium text-dot-text">Period day</span>
              <button
                onClick={() => setEditLog(prev => ({ ...prev, is_period_day: !prev.is_period_day }))}
                className={`w-12 h-7 rounded-full transition-colors ${editLog.is_period_day ? 'bg-dot-rose' : 'bg-dot-border'}`}
              >
                <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mx-1 ${editLog.is_period_day ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {editLog.is_period_day && (
              <>
                {/* Flow */}
                <p className="text-xs font-medium text-dot-muted mb-2">Flow</p>
                <div className="flex gap-2 flex-wrap mb-4">
                  {FLOWS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setEditLog(prev => ({ ...prev, flow: value }))}
                      className={`px-4 py-2 rounded-full text-sm border-2 font-medium transition-colors
                        ${editLog.flow === value ? 'border-dot-rose bg-dot-rose-light text-dot-rose' : 'border-dot-border text-dot-text'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Symptoms */}
                <p className="text-xs font-medium text-dot-muted mb-2">Symptoms</p>
                <div className="flex gap-2 flex-wrap mb-4">
                  {SYMPTOMS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => toggleSymptom(value)}
                      className={`px-4 py-2 rounded-full text-sm border-2 font-medium transition-colors
                        ${(editLog.symptoms || []).includes(value) ? 'border-dot-rose bg-dot-rose-light text-dot-rose' : 'border-dot-border text-dot-text'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={saveEdit}
              disabled={saving}
              className="w-full py-4 rounded-2xl bg-dot-rose text-white font-semibold text-base disabled:opacity-60 active:opacity-80 transition-opacity"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LegendItem({ color, predicted, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-4 h-4 rounded-full inline-block ${color || ''} ${predicted ? 'border-2 border-dashed border-dot-rose' : ''}`} />
      <span className="text-xs text-dot-muted">{label}</span>
    </div>
  )
}
