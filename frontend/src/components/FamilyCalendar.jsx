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

const FLOW_LABEL    = Object.fromEntries(FLOWS.map(f => [f.value, f.label]))
const SYMPTOM_LABEL = Object.fromEntries(SYMPTOMS.map(s => [s.value, s.label]))

const todayKey = format(new Date(), 'yyyy-MM-dd')

const HAS_RANGE = new Set(['first_guess', 'learned'])

export default function FamilyCalendar() {
  const [current, setCurrent]       = useState(new Date())
  const [logs, setLogs]             = useState([])
  const [prediction, setPrediction] = useState(null)
  const [selected, setSelected]     = useState(null)
  const [editLog, setEditLog]       = useState(null)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState(null)
  const [hasAnyData, setHasAnyData] = useState(false)

  const monthKey = format(current, 'yyyy-MM')

  useEffect(() => {
    client.get(`/family/calendar?month=${monthKey}`).then(({ data }) => setLogs(data))
    client.get('/family/prediction').then(({ data }) => {
      setPrediction(data)
      if (HAS_RANGE.has(data.status) || data.last_period_start) setHasAnyData(true)

    })
  }, [monthKey])

  const logMap = Object.fromEntries(logs.map(l => [l.date, l]))

  const periodEntries = logs
    .filter(l => l.is_period_day)
    .sort((a, b) => b.date.localeCompare(a.date))

  function isPredicted(date) {
    if (!prediction || !HAS_RANGE.has(prediction.status)) return false
    const d = format(date, 'yyyy-MM-dd')
    // For first_guess the range is 21–45 days wide — only mark the center day
    // so the calendar doesn't fill up with dashed circles.
    if (prediction.status === 'first_guess') {
      return d === prediction.estimated_center_date
    }
    return d >= prediction.estimated_range_start && d <= prediction.estimated_range_end
  }

  const calDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(current),     { weekStartsOn: 0 }),
  })

  function openDayByKey(key) {
    setSelected(key)
    setSaveError(null)
    setEditLog(logMap[key] || {
      date: key, is_period_day: false, is_cycle_start: false,
      flow: null, symptoms: [], updated_by: null,
    })
  }

  function openDay(date) {
    if (!isSameMonth(date, current)) return
    openDayByKey(format(date, 'yyyy-MM-dd'))
  }

  async function saveEdit() {
    setSaving(true)
    setSaveError(null)
    try {
      const { data } = await client.post('/family/calendar', {
        date:           editLog.date,
        is_period_day:  editLog.is_period_day,
        is_cycle_start: editLog.is_period_day ? (editLog.is_cycle_start || false) : false,
        flow:           editLog.is_period_day ? editLog.flow : null,
        symptoms:       editLog.is_period_day ? (editLog.symptoms || []) : [],
      })
      setLogs(prev => [...prev.filter(l => l.date !== data.date), data])
      setSelected(null)
    } catch {
      setSaveError("Couldn't save. Please try again.")
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

  return (
    <div className="px-4 pt-6 pb-6">
      {/* Month navigation — compact */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-dot-surface text-dot-muted text-xl font-bold"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h2 className="text-base font-bold text-dot-text">{format(current, 'MMMM yyyy')}</h2>
        <button
          onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-dot-surface text-dot-muted text-xl font-bold"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Weekday headers — tight */}
      <div className="grid grid-cols-7 mb-0.5">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-2xs font-bold text-dot-muted py-0.5 tracking-wide uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid — 20% shorter day cells */}
      <div className="grid grid-cols-7">
        {calDays.map(date => {
          const key       = format(date, 'yyyy-MM-dd')
          const log       = logMap[key]
          const isPeriod  = log?.is_period_day
          const isFirst   = log?.is_cycle_start
          const predicted = !isPeriod && isPredicted(date)
          const inMonth   = isSameMonth(date, current)
          const today     = isToday(date)

          return (
            <button
              key={key}
              onClick={() => openDay(date)}
              disabled={!inMonth}
              className="flex flex-col items-center justify-center py-0.5 gap-0.5"
              aria-label={`${format(date, 'MMMM d')}${isPeriod ? ', period day' : ''}${isFirst ? ', first day' : ''}`}
            >
              <span className={[
                'w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-colors',
                !inMonth  && 'text-dot-border cursor-default',
                isPeriod  && 'bg-dot-rose text-white',
                predicted && 'border-2 border-dashed border-dot-rose-mid text-dot-rose',
                today && !isPeriod && !predicted && 'border-2 border-dot-rose text-dot-rose',
                inMonth && !isPeriod && !predicted && !today && 'text-dot-text active:bg-dot-surface',
              ].filter(Boolean).join(' ')}>
                {format(date, 'd')}
              </span>
              {/* Tiny dot under the first day of a period */}
              {isFirst && inMonth && (
                <span className="w-1 h-1 rounded-full bg-dot-rose-mid" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 mb-5 px-1">
        <LegendItem filled label="Period day" />
        <LegendItem dashed label="Estimated" />
        <LegendItem dot    label="First day" />
      </div>

      {/* Entries this month */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-dot-muted uppercase tracking-wider">
            Entries this month
          </p>
          <button
            onClick={() => openDayByKey(todayKey)}
            className="flex items-center gap-1 h-8 px-3 rounded-full bg-dot-rose/10 border border-dot-rose/20 text-xs font-bold text-dot-rose active:bg-dot-rose/20 transition-colors"
            aria-label="Add today's entry"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
            Add today
          </button>
        </div>

        {periodEntries.length === 0 ? (
          <EmptyEntries hasAnyData={hasAnyData} />
        ) : (
          <div className="flex flex-col gap-2">
            {periodEntries.map(log => (
              <EntryCard
                key={log.date}
                log={log}
                onTap={() => openDayByKey(log.date)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      {selected && editLog && (
        <BottomSheet
          editLog={editLog}
          setEditLog={setEditLog}
          onClose={() => setSelected(null)}
          onSave={saveEdit}
          onToggleSymptom={toggleSymptom}
          onTogglePeriod={() => setEditLog(prev => ({
            ...prev,
            is_period_day: !prev.is_period_day,
            // reset first-day marker when toggling period off
            is_cycle_start: prev.is_period_day ? false : prev.is_cycle_start,
          }))}
          onSetFlow={v => setEditLog(prev => ({ ...prev, flow: v }))}
          saving={saving}
          saveError={saveError}
        />
      )}
    </div>
  )
}

// ── Entries list ──────────────────────────────────────────────────────────────

function EmptyEntries({ hasAnyData }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <CatSleeping className="w-24 h-16 text-dot-rose-mid mb-3" />
      <p className="text-sm font-bold text-dot-text">
        {hasAnyData ? 'No period days this month' : 'No entries yet'}
      </p>
      <p className="text-xs font-medium text-dot-muted mt-1">
        Tap a day or use "Add today" above.
      </p>
    </div>
  )
}

function EntryCard({ log, onTap }) {
  const symptoms = (log.symptoms || []).filter(s => s !== 'nothing')

  return (
    <button
      onClick={onTap}
      className="w-full bg-dot-white rounded-3xl border border-dot-border px-5 py-4 text-left active:bg-dot-surface transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-dot-text">
            {format(parseISO(log.date), 'MMM d')}
          </p>
          <p className="text-xs font-semibold text-dot-rose mt-0.5">
            Period day{log.is_cycle_start ? ' · First day' : ''}
          </p>

          {log.flow && (
            <p className="text-xs font-medium text-dot-muted mt-1.5">
              Flow: {FLOW_LABEL[log.flow] ?? log.flow}
            </p>
          )}
          {symptoms.length > 0 && (
            <p className="text-xs font-medium text-dot-muted mt-0.5">
              {symptoms.map(s => SYMPTOM_LABEL[s] ?? s).join(', ')}
            </p>
          )}
          {log.updated_by && (
            <p className="text-xs text-dot-muted mt-1.5">
              Updated by {log.updated_by}
            </p>
          )}
        </div>

        <svg
          className="w-4 h-4 text-dot-border flex-shrink-0 mt-0.5"
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

// ── Bottom sheet ──────────────────────────────────────────────────────────────

function BottomSheet({ editLog, setEditLog, onClose, onSave, onToggleSymptom, onTogglePeriod, onSetFlow, saving, saveError }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] bg-dot-white rounded-t-[2rem] px-5 pb-10 pt-4 shadow-2xl"
        style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-dot-border rounded-full mx-auto mb-5" />

        <div className="mb-5">
          <h3 className="text-base font-bold text-dot-text">
            {format(parseISO(editLog.date), 'MMMM d, yyyy')}
          </h3>
          {editLog.updated_by && (
            <p className="text-xs text-dot-muted mt-0.5">Updated by {editLog.updated_by}</p>
          )}
        </div>

        {/* Period day toggle */}
        <div className="flex items-center justify-between mb-3 bg-dot-surface rounded-2xl px-4 py-3">
          <span className="text-sm font-bold text-dot-text">Period day</span>
          <Toggle value={editLog.is_period_day} onChange={onTogglePeriod} />
        </div>

        {/* First day toggle — only when period day is on */}
        {editLog.is_period_day && (
          <div className="flex items-center justify-between mb-5 bg-dot-rose-light rounded-2xl px-4 py-3">
            <div>
              <span className="text-sm font-bold text-dot-text">First day of period</span>
              <p className="text-xs text-dot-muted mt-0.5">Helps estimate your next period</p>
            </div>
            <Toggle
              value={editLog.is_cycle_start || false}
              onChange={() => setEditLog(prev => ({ ...prev, is_cycle_start: !prev.is_cycle_start }))}
            />
          </div>
        )}

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

        {saveError && (
          <div className="flex items-start gap-2 bg-dot-rose-light border border-dot-rose/20 px-4 py-3 rounded-2xl mb-4">
            <span className="text-dot-rose text-lg leading-none mt-0.5">!</span>
            <p className="text-sm font-medium text-dot-rose">{saveError}</p>
          </div>
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={value}
      className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-dot-rose' : 'bg-dot-border'}`}
    >
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

function LegendItem({ filled, dashed, dot, label }) {
  return (
    <div className="flex items-center gap-1.5">
      {dot ? (
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-dot-rose-mid" />
        </span>
      ) : (
        <span className={[
          'w-4 h-4 rounded-full flex-shrink-0',
          filled && 'bg-dot-rose',
          dashed && 'border-2 border-dashed border-dot-rose-mid',
        ].filter(Boolean).join(' ')} />
      )}
      <span className="text-xs font-semibold text-dot-muted">{label}</span>
    </div>
  )
}
