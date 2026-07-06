import { useState, useEffect, useCallback, useRef } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday, parseISO,
  addDays, subDays, differenceInDays,
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
  { value: 'bloating',  label: 'Bloating' },
  { value: 'nothing',   label: 'Nothing' },
]

const FLOW_LABEL    = Object.fromEntries(FLOWS.map(f => [f.value, f.label]))
const SYMPTOM_LABEL = Object.fromEntries(SYMPTOMS.map(s => [s.value, s.label]))

const todayKey  = format(new Date(), 'yyyy-MM-dd')
const HAS_RANGE = new Set(['first_guess', 'learned'])

export default function FamilyCalendar() {
  const [current, setCurrent]       = useState(new Date())
  const [ranges, setRanges]         = useState([])
  const [prediction, setPrediction] = useState(null)
  const [modalRange, setModalRange] = useState(null)
  const [modalIsNew, setModalIsNew] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [saveError, setSaveError]   = useState(null)
  const [toast, setToast]           = useState(null)
  const toastTimer                  = useRef(null)

  const monthKey = format(current, 'yyyy-MM')

  useEffect(() => {
    client.get(`/family/ranges?month=${monthKey}`).then(({ data }) => setRanges(data))
    client.get('/family/prediction').then(({ data }) => setPrediction(data))
  }, [monthKey])

  const refreshPrediction = useCallback(async () => {
    const { data } = await client.get('/family/prediction')
    setPrediction(data)
  }, [])

  function triggerToast(msg) {
    clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  // ── Range helpers ─────────────────────────────────────────────────────────

  // Build a Set of all date strings covered by any range (for calendar colouring)
  const inRangeDates = new Set()
  for (const r of ranges) {
    if (r.ongoing || !r.end_date) {
      inRangeDates.add(r.start_date)
    } else {
      let d   = parseISO(r.start_date)
      const e = parseISO(r.end_date)
      while (d <= e) {
        inRangeDates.add(format(d, 'yyyy-MM-dd'))
        d = addDays(d, 1)
      }
    }
  }

  // For a given calendar date, return rendering info
  function getDayInfo(date) {
    const key     = format(date, 'yyyy-MM-dd')
    const inRange = inRangeDates.has(key)
    if (!inRange) return { inRange: false }

    const prevKey = format(subDays(date, 1), 'yyyy-MM-dd')
    const nextKey = format(addDays(date, 1), 'yyyy-MM-dd')
    const dow     = date.getDay()

    // Cap left if previous day is not in range OR we're at the start of a grid row
    const capLeft  = !inRangeDates.has(prevKey) || dow === 0
    // Cap right if next day is not in range OR we're at the end of a grid row
    const capRight = !inRangeDates.has(nextKey) || dow === 6

    const isOngoing = ranges.some(r => r.ongoing && r.start_date === key)

    return { inRange: true, capLeft, capRight, isOngoing }
  }

  // Find the range that contains a given date
  function findRangeForDate(key) {
    return ranges.find(r => {
      const start = r.start_date
      const end   = r.end_date || r.start_date
      return key >= start && key <= end
    }) ?? null
  }

  function isPredicted(date) {
    if (!prediction || !HAS_RANGE.has(prediction.status)) return false
    const d = format(date, 'yyyy-MM-dd')
    if (prediction.status === 'first_guess') return d === prediction.estimated_center_date
    return d >= prediction.estimated_range_start && d <= prediction.estimated_range_end
  }

  // ── Modal open helpers ────────────────────────────────────────────────────

  function openRange(range) {
    setSaveError(null)
    setModalRange(range)
    setModalIsNew(false)
  }

  function openNewRange(startDate = todayKey) {
    setSaveError(null)
    setModalRange({ id: null, start_date: startDate, end_date: null, ongoing: true, flow: null, symptoms: [], updated_by: null })
    setModalIsNew(true)
  }

  function handleAddPeriod() {
    const ongoing = ranges.find(r => r.ongoing)
    if (ongoing) {
      openRange(ongoing)
    } else {
      openNewRange(todayKey)
    }
  }

  function openDay(date) {
    if (!isSameMonth(date, current)) return
    const key      = format(date, 'yyyy-MM-dd')
    const existing = findRangeForDate(key)
    if (existing) {
      openRange(existing)
    } else {
      openNewRange(key)
    }
  }

  // ── Save / delete ─────────────────────────────────────────────────────────

  async function saveRange(payload) {
    setSaving(true)
    setSaveError(null)
    try {
      const { data } = await client.post('/family/ranges', payload)
      // Replace or insert
      setRanges(prev => {
        const without = prev.filter(r => r.id !== data.id)
        return [data, ...without]
      })
      setModalRange(null)
      triggerToast('Saved')
      await refreshPrediction()
    } catch {
      setSaveError("Couldn't save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  async function deleteRange(id) {
    setDeleting(true)
    setSaveError(null)
    try {
      await client.delete(`/family/ranges/${id}`)
      setRanges(prev => prev.filter(r => r.id !== id))
      setModalRange(null)
      triggerToast('Period deleted')
      await refreshPrediction()
    } catch {
      setSaveError("Couldn't delete. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  // ── Calendar grid ─────────────────────────────────────────────────────────

  const calDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(current),     { weekStartsOn: 0 }),
  })

  // Sorted for entries list (newest first, ongoing at top)
  const sortedRanges = [...ranges].sort((a, b) => {
    if (a.ongoing && !b.ongoing) return -1
    if (!a.ongoing && b.ongoing) return 1
    return b.start_date.localeCompare(a.start_date)
  })

  return (
    <div className="px-4 pt-6 pb-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-dot-surface text-dot-muted text-xl font-bold"
          aria-label="Previous month"
        >‹</button>
        <h2 className="text-base font-bold text-dot-text">{format(current, 'MMMM yyyy')}</h2>
        <button
          onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-dot-surface text-dot-muted text-xl font-bold"
          aria-label="Next month"
        >›</button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-2xs font-bold text-dot-muted py-0.5 tracking-wide uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calDays.map(date => {
          const key       = format(date, 'yyyy-MM-dd')
          const di        = getDayInfo(date)
          const predicted = !di.inRange && isPredicted(date)
          const inMonth   = isSameMonth(date, current)
          const today     = isToday(date)

          return (
            <button
              key={key}
              onClick={() => openDay(date)}
              disabled={!inMonth}
              className="relative flex flex-col items-center justify-center py-[3px]"
              aria-label={`${format(date, 'MMMM d')}${di.inRange ? ', period' : ''}`}
            >
              {/* Range pill background */}
              {di.inRange && inMonth && (
                <div className={[
                  'absolute inset-0 bg-dot-rose',
                  di.capLeft  ? 'rounded-l-full' : '',
                  di.capRight ? 'rounded-r-full' : '',
                ].join(' ')} />
              )}

              {/* Date number */}
              <span className={[
                'relative z-10 w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-colors',
                !inMonth  && 'text-dot-border cursor-default',
                di.inRange && inMonth && 'text-white',
                !di.inRange && predicted && 'border-2 border-dashed border-dot-rose-mid text-dot-rose',
                !di.inRange && !predicted && today && 'border-2 border-dot-rose text-dot-rose',
                !di.inRange && !predicted && !today && inMonth && 'text-dot-text active:bg-dot-surface',
              ].filter(Boolean).join(' ')}>
                {format(date, 'd')}
              </span>

              {/* Ongoing pulse dot */}
              {di.isOngoing && inMonth && (
                <span className="relative z-10 w-1 h-1 rounded-full bg-white/80 mt-px" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 mb-5 px-1">
        <LegendItem filled label="Period" />
        <LegendItem dashed label="Estimated" />
      </div>

      {/* Periods list */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-dot-muted uppercase tracking-wider">Periods</p>
          <button
            onClick={handleAddPeriod}
            className="flex items-center gap-1 h-8 px-3 rounded-full bg-dot-rose/10 border border-dot-rose/20 text-xs font-bold text-dot-rose active:bg-dot-rose/20 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
            Add period
          </button>
        </div>

        {sortedRanges.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-2">
            {sortedRanges.map(r => (
              <RangeCard key={r.id} range={r} onTap={() => openRange(r)} />
            ))}
          </div>
        )}
      </div>

      {/* Period modal */}
      {modalRange && (
        <PeriodModal
          rangeData={modalRange}
          isNew={modalIsNew}
          onClose={() => setModalRange(null)}
          onSave={saveRange}
          onDelete={() => deleteRange(modalRange.id)}
          saving={saving}
          deleting={deleting}
          saveError={saveError}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <CatSleeping className="w-24 h-16 text-dot-rose-mid mb-3" />
      <p className="text-sm font-bold text-dot-text">No periods this month</p>
      <p className="text-xs font-medium text-dot-muted mt-1">
        Tap a day or use "Add period" above.
      </p>
    </div>
  )
}

// ── Range card ────────────────────────────────────────────────────────────────

function RangeCard({ range, onTap }) {
  const start    = format(parseISO(range.start_date), 'MMM d')
  const end      = range.end_date ? format(parseISO(range.end_date), 'MMM d') : null
  const sameDay  = range.end_date && range.start_date === range.end_date
  const symptoms = (range.symptoms || []).filter(s => s !== 'nothing')

  const durationDays = range.end_date
    ? differenceInDays(parseISO(range.end_date), parseISO(range.start_date)) + 1
    : differenceInDays(new Date(), parseISO(range.start_date)) + 1

  const durationLabel = durationDays === 1 ? '1 day' : `${durationDays} days`

  return (
    <button
      onClick={onTap}
      className="w-full bg-dot-white rounded-3xl border border-dot-border px-5 py-4 text-left active:bg-dot-surface transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-dot-text">
            {sameDay ? start : end ? `${start} – ${end}` : `${start} – ongoing`}
          </p>
          <p className="text-xs font-semibold text-dot-rose mt-0.5">
            {range.ongoing ? `Duration so far: ${durationLabel}` : `Duration: ${durationLabel}`}
          </p>
          {range.flow && (
            <p className="text-xs font-medium text-dot-muted mt-1.5">
              Flow: {FLOW_LABEL[range.flow] ?? range.flow}
            </p>
          )}
          {symptoms.length > 0 && (
            <p className="text-xs font-medium text-dot-muted mt-0.5">
              {symptoms.map(s => SYMPTOM_LABEL[s] ?? s).join(', ')}
            </p>
          )}
          {range.updated_by && (
            <p className="text-xs text-dot-muted mt-1.5">Updated by {range.updated_by}</p>
          )}
        </div>
        <svg className="w-4 h-4 text-dot-border flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

// ── Period modal ──────────────────────────────────────────────────────────────

function PeriodModal({ rangeData, isNew, onClose, onSave, onDelete, saving, deleting, saveError }) {
  const [startDate, setStartDate]         = useState(rangeData.start_date || todayKey)
  const [endDate, setEndDate]             = useState(rangeData.end_date || '')
  const [notEndedYet, setNotEndedYet]     = useState(!rangeData.end_date)
  const [flow, setFlow]                   = useState(rangeData.flow || null)
  const [symptoms, setSymptoms]           = useState(rangeData.symptoms || [])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function toggleSymptom(val) {
    setSymptoms(prev =>
      prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]
    )
  }

  function handleSave() {
    onSave({
      id:         rangeData.id || null,
      start_date: startDate,
      end_date:   notEndedYet ? null : (endDate || null),
      flow:       flow,
      symptoms:   symptoms,
    })
  }

  const CalIcon = () => (
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] bg-dot-white rounded-t-[2rem] px-5 pt-4 shadow-2xl overflow-y-auto max-h-[92dvh]"
        style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-dot-border rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="mb-6">
          <h3 className="text-base font-bold text-dot-text">Period</h3>
          {rangeData.updated_by && (
            <p className="text-xs text-dot-muted mt-0.5">Updated by {rangeData.updated_by}</p>
          )}
        </div>

        {/* Started */}
        <p className="text-xs font-bold text-dot-muted uppercase tracking-wide mb-1.5">Started</p>
        <div className="flex items-center justify-between bg-dot-surface rounded-2xl px-4 py-3 mb-4">
          <span className="text-sm font-bold text-dot-text">
            {startDate ? format(parseISO(startDate), 'MMMM d, yyyy') : '—'}
          </span>
          <label className="flex items-center gap-1 text-xs font-bold text-dot-rose cursor-pointer select-none">
            <CalIcon />
            Change
            <input
              type="date"
              value={startDate}
              max={todayKey}
              onChange={e => e.target.value && setStartDate(e.target.value)}
              className="sr-only"
            />
          </label>
        </div>

        {/* Ended */}
        <p className="text-xs font-bold text-dot-muted uppercase tracking-wide mb-1.5">Ended</p>
        {notEndedYet ? (
          <div className="flex items-center justify-between bg-dot-surface rounded-2xl px-4 py-3 mb-5">
            <span className="text-sm font-medium text-dot-muted">Not ended yet</span>
            <button
              onClick={() => setNotEndedYet(false)}
              className="text-xs font-bold text-dot-rose"
            >
              Add end date
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-dot-surface rounded-2xl px-4 py-3 mb-5">
            <span className="text-sm font-bold text-dot-text">
              {endDate ? format(parseISO(endDate), 'MMMM d, yyyy') : 'Pick a date'}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setNotEndedYet(true); setEndDate('') }}
                className="text-xs font-semibold text-dot-muted active:opacity-70"
              >
                Clear
              </button>
              <label className="flex items-center gap-1 text-xs font-bold text-dot-rose cursor-pointer select-none">
                <CalIcon />
                {endDate ? 'Change' : 'Pick date'}
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={todayKey}
                  onChange={e => e.target.value && setEndDate(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        )}

        {/* Flow */}
        <p className="text-xs font-bold text-dot-muted mb-2 uppercase tracking-wider">Flow</p>
        <div className="flex gap-2 flex-wrap mb-5">
          {FLOWS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFlow(v => v === value ? null : value)}
              className={`h-[40px] px-4 rounded-full text-sm font-semibold border-2 transition-colors active:scale-[0.97]
                ${flow === value
                  ? 'border-dot-rose bg-dot-rose-light text-dot-rose'
                  : 'border-dot-border bg-dot-white text-dot-text'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Symptoms */}
        <p className="text-xs font-bold text-dot-muted mb-2 uppercase tracking-wider">Symptoms</p>
        <div className="flex gap-2 flex-wrap mb-6">
          {SYMPTOMS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => toggleSymptom(value)}
              className={`h-[40px] px-4 rounded-full text-sm font-semibold border-2 transition-colors active:scale-[0.97]
                ${symptoms.includes(value)
                  ? 'border-dot-rose bg-dot-rose-light text-dot-rose'
                  : 'border-dot-border bg-dot-white text-dot-text'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error */}
        {saveError && (
          <div className="flex items-start gap-2 bg-dot-rose-light border border-dot-rose/20 px-4 py-3 rounded-2xl mb-4">
            <span className="text-dot-rose text-lg leading-none mt-0.5">!</span>
            <p className="text-sm font-medium text-dot-rose">{saveError}</p>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || deleting}
          className="w-full h-[56px] rounded-3xl bg-dot-rose text-white font-bold text-base disabled:opacity-60 active:scale-[0.98] transition-all"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        {/* Delete */}
        {!isNew && !showDeleteConfirm && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={saving || deleting}
            className="w-full mt-3 py-2 text-sm font-semibold text-dot-muted active:opacity-60 transition-opacity disabled:opacity-40"
          >
            Delete period
          </button>
        )}

        {!isNew && showDeleteConfirm && (
          <div className="mt-4 bg-dot-surface rounded-3xl px-4 py-4">
            <p className="text-sm font-bold text-dot-text mb-1">Delete this period?</p>
            <p className="text-xs font-medium text-dot-muted mb-4 leading-relaxed">
              This removes it from the shared family calendar.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 h-11 rounded-2xl border-2 border-dot-border bg-dot-white text-dot-text text-sm font-semibold active:bg-dot-surface disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="flex-1 h-11 rounded-2xl bg-dot-rose text-white text-sm font-bold active:opacity-80 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message }) {
  return (
    <div
      className="fixed bottom-24 inset-x-0 flex justify-center z-[60] pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-dot-text/90 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-xl">
        {message}
      </div>
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

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
