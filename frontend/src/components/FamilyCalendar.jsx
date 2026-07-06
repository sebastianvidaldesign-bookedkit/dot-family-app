import { useState, useEffect } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday, parseISO,
} from 'date-fns'
import client from '../api/client'
import { CatSleeping } from './Cat'

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

export default function FamilyCalendar() {
  const [current, setCurrent]       = useState(new Date())
  const [logs, setLogs]             = useState([])
  const [prediction, setPrediction] = useState(null)
  const [selected, setSelected]     = useState(null)
  const [editLog, setEditLog]       = useState(null)
  const [saving, setSaving]         = useState(false)
  const [hasAnyData, setHasAnyData] = useState(false)

  const monthKey = format(current, 'yyyy-MM')

  useEffect(() => {
    client.get(`/family/calendar?month=${monthKey}`).then(({ data }) => setLogs(data))
    client.get('/family/prediction').then(({ data }) => {
      setPrediction(data)
      if (data.status === 'predicted' || data.last_period_start) setHasAnyData(true)
    })
  }, [monthKey])

  const logMap = Object.fromEntries(logs.map(l => [l.date, l]))

  function isPredicted(date) {
    if (!prediction || prediction.status !== 'predicted') return false
    const d = format(date, 'yyyy-MM-dd')
    return d >= prediction.range_start && d <= prediction.range_end
  }

  const calDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(current),     { weekStartsOn: 0 }),
  })

  function openDay(date) {
    if (!isSameMonth(date, current)) return
    const key = format(date, 'yyyy-MM-dd')
    setSelected(key)
    setEditLog(logMap[key] || { date: key, is_period_day: false, flow: null, symptoms: [], updated_by: null })
  }

  async function saveEdit() {
    setSaving(true)
    try {
      const { data } = await client.post('/family/calendar', {
        date:          editLog.date,
        is_period_day: editLog.is_period_day,
        flow:          editLog.is_period_day ? editLog.flow : null,
        symptoms:      editLog.is_period_day ? (editLog.symptoms || []) : [],
      })
      setLogs(prev => {
        const rest = prev.filter(l => l.date !== data.date)
        return data.is_period_day ? [...rest, data] : rest
      })
      setSelected(null)
    } finally {
      setSaving(false)
    }
  }

  function toggleSymptom(val) {
    setEditLog(prev => ({
      ...prev,
      symptoms: (prev.symptoms || []).includes(val)
        ? prev.symptoms.filter(s => s !== val)
        : [...(prev.symptoms || []), val],
    }))
  }

  const periodDaysThisMonth = logs.filter(l => l.is_period_day).length

  return (
    <div className="px-4 pt-8 pb-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6 px-1">
        <button
          onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1))}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-dot-surface text-dot-muted text-xl font-bold"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h2 className="text-lg font-bold text-dot-text">{format(current, 'MMMM yyyy')}</h2>
        <button
          onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1))}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-dot-surface text-dot-muted text-xl font-bold"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-2xs font-bold text-dot-muted py-1 tracking-wide uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calDays.map(date => {
          const key      = format(date, 'yyyy-MM-dd')
          const log      = logMap[key]
          const isPeriod  = log?.is_period_day
          const predicted = !isPeriod && isPredicted(date)
          const inMonth   = isSameMonth(date, current)
          const today     = isToday(date)

          return (
            <button
              key={key}
              onClick={() => openDay(date)}
              disabled={!inMonth}
              className="flex items-center justify-center py-1"
              aria-label={`${format(date, 'MMMM d')}${isPeriod ? ', period day' : ''}`}
            >
              <span className={[
                'w-10 h-10 flex items-center justify-center rounded-full text-sm font-semibold transition-colors',
                !inMonth  && 'text-dot-border cursor-default',
                isPeriod  && 'bg-dot-rose text-white',
                predicted && 'border-2 border-dashed border-dot-rose-mid text-dot-rose',
                today && !isPeriod && !predicted && 'border-2 border-dot-rose text-dot-rose',
                inMonth && !isPeriod && !predicted && !today && 'text-dot-text active:bg-dot-surface',
              ].filter(Boolean).join(' ')}>
                {format(date, 'd')}
              </span>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-4 px-1">
        <LegendItem filled label="Period day" />
        <LegendItem dashed label="Estimated" />
      </div>

      {/* Empty state */}
      {!hasAnyData && logs.length === 0 && (
        <div className="flex flex-col items-center justify-center mt-10 text-center px-4">
          <CatSleeping className="w-32 h-20 text-dot-rose-mid mb-4" />
          <p className="text-sm font-bold text-dot-text">The calendar is learning</p>
          <p className="text-xs font-medium text-dot-muted mt-1 leading-relaxed">
            Tap any day to mark a period day.
          </p>
        </div>
      )}

      {/* Month stat */}
      {periodDaysThisMonth > 0 && (
        <p className="text-xs font-semibold text-dot-muted text-center mt-4">
          {periodDaysThisMonth} period {periodDaysThisMonth === 1 ? 'day' : 'days'} this month
        </p>
      )}

      {/* Day edit bottom sheet */}
      {selected && editLog && (
        <BottomSheet
          editLog={editLog}
          onClose={() => setSelected(null)}
          onSave={saveEdit}
          onToggleSymptom={toggleSymptom}
          onTogglePeriod={() => setEditLog(prev => ({ ...prev, is_period_day: !prev.is_period_day }))}
          onSetFlow={v => setEditLog(prev => ({ ...prev, flow: v }))}
          saving={saving}
        />
      )}
    </div>
  )
}

function BottomSheet({ editLog, onClose, onSave, onToggleSymptom, onTogglePeriod, onSetFlow, saving }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] bg-dot-white rounded-t-[2rem] px-5 pb-8 pt-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1.5 bg-dot-border rounded-full mx-auto mb-5" />

        {/* Date + attribution */}
        <div className="mb-5">
          <h3 className="text-base font-bold text-dot-text">
            {format(parseISO(editLog.date), 'MMMM d, yyyy')}
          </h3>
          {editLog.updated_by && (
            <p className="text-xs text-dot-muted mt-0.5">
              Updated by {editLog.updated_by}
            </p>
          )}
        </div>

        {/* Period toggle */}
        <div className="flex items-center justify-between mb-5 bg-dot-surface rounded-2xl px-4 py-3">
          <span className="text-sm font-bold text-dot-text">Period day</span>
          <Toggle value={editLog.is_period_day} onChange={onTogglePeriod} />
        </div>

        {editLog.is_period_day && (
          <>
            <p className="text-xs font-bold text-dot-muted mb-2 uppercase tracking-wider">Flow</p>
            <div className="flex gap-2 flex-wrap mb-5">
              {FLOWS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onSetFlow(value)}
                  className={`h-[40px] px-4 rounded-full text-sm font-semibold border-2 transition-colors active:scale-[0.97]
                    ${editLog.flow === value
                      ? 'border-dot-rose bg-dot-rose-light text-dot-rose'
                      : 'border-dot-border bg-dot-white text-dot-text'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="text-xs font-bold text-dot-muted mb-2 uppercase tracking-wider">Symptoms</p>
            <div className="flex gap-2 flex-wrap mb-5">
              {SYMPTOMS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onToggleSymptom(value)}
                  className={`h-[40px] px-4 rounded-full text-sm font-semibold border-2 transition-colors active:scale-[0.97]
                    ${(editLog.symptoms || []).includes(value)
                      ? 'border-dot-rose bg-dot-rose-light text-dot-rose'
                      : 'border-dot-border bg-dot-white text-dot-text'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full h-[56px] rounded-3xl bg-dot-rose text-white font-bold text-base disabled:opacity-60 active:scale-[0.98] transition-all"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={value}
      className={`relative w-12 h-7 rounded-full transition-colors ${value ? 'bg-dot-rose' : 'bg-dot-border'}`}
    >
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

function LegendItem({ filled, dashed, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={[
        'w-4 h-4 rounded-full flex-shrink-0',
        filled && 'bg-dot-rose',
        dashed && 'border-2 border-dashed border-dot-rose-mid',
      ].filter(Boolean).join(' ')} />
      <span className="text-xs font-semibold text-dot-muted">{label}</span>
    </div>
  )
}
