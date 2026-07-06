import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import client from '../../api/client'
import { CatSitting, PawPrint } from '../../components/Cat'

const FLOWS = [
  { value: 'light',    label: 'Light',    hint: 'Just a little' },
  { value: 'medium',   label: 'Medium',   hint: 'Regular day' },
  { value: 'heavy',    label: 'Heavy',    hint: 'Heavier than usual' },
  { value: 'not_sure', label: 'Not sure', hint: "That's okay too" },
]

const SYMPTOMS = [
  { value: 'cramps',    label: 'Cramps' },
  { value: 'tired',     label: 'Tired' },
  { value: 'headache',  label: 'Headache' },
  { value: 'emotional', label: 'Emotional' },
  { value: 'nothing',   label: 'Nothing' },
]

const today = format(new Date(), 'yyyy-MM-dd')

export default function Today() {
  const [log, setLog]           = useState(null)
  const [step, setStep]         = useState('ask')
  const [flow, setFlow]         = useState(null)
  const [symptoms, setSymptoms] = useState([])
  const [saving, setSaving]     = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    client.get(`/period-logs?month=${today.slice(0, 7)}`)
      .then(({ data }) => {
        const todayLog = data.find(l => l.date === today)
        if (todayLog) {
          setLog(todayLog)
          setFlow(todayLog.flow)
          setSymptoms(todayLog.symptoms || [])
          setStep(todayLog.is_period_day ? 'done' : 'not-today')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function save(isPeriodDay, chosenFlow, chosenSymptoms) {
    setSaving(true)
    try {
      const { data } = await client.post('/period-logs', {
        date:          today,
        is_period_day: isPeriodDay,
        flow:          isPeriodDay ? chosenFlow : null,
        symptoms:      isPeriodDay ? chosenSymptoms : [],
      })
      setLog(data)
      setStep(isPeriodDay ? 'done' : 'not-today')
    } finally {
      setSaving(false)
    }
  }

  function toggleSymptom(val) {
    setSymptoms(prev =>
      prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-[3px] border-dot-rose border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-64px)] px-5 pt-10 pb-6">
      {step === 'ask'       && <AskStep onYes={() => setStep('flow')} onNo={() => save(false, null, [])} saving={saving} />}
      {step === 'flow'      && <FlowStep selected={flow} onSelect={v => { setFlow(v); setStep('symptoms') }} onBack={() => setStep('ask')} />}
      {step === 'symptoms'  && <SymptomsStep selected={symptoms} onToggle={toggleSymptom} onSave={() => save(true, flow, symptoms)} onBack={() => setStep('flow')} saving={saving} />}
      {step === 'done'      && <DoneStep log={log} flow={flow} symptoms={symptoms} onEdit={() => setStep('flow')} onNotToday={() => save(false, null, [])} saving={saving} />}
      {step === 'not-today' && <NotTodayStep onUndo={() => setStep('ask')} />}
    </div>
  )
}

/* ── Steps ── */

function AskStep({ onYes, onNo, saving }) {
  const displayDate = format(new Date(), 'EEEE, MMMM d')

  return (
    <div className="flex flex-col flex-1">
      {/* Date + cat header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-dot-muted uppercase tracking-widest mb-1">
            {displayDate}
          </p>
          <h1 className="text-[28px] font-bold text-dot-text leading-tight">
            Are you on your<br />period today?
          </h1>
        </div>
        <CatSitting className="w-[72px] h-[72px] text-dot-rose flex-shrink-0 -mb-1" />
      </div>

      {/* Action buttons — pushed to bottom third */}
      <div className="flex flex-col gap-3 mt-auto">
        <button
          onClick={onYes}
          disabled={saving}
          className="w-full h-[64px] rounded-4xl bg-dot-rose text-white font-bold text-xl active:scale-[0.98] disabled:opacity-60 transition-all"
        >
          Yes
        </button>
        <button
          onClick={onNo}
          disabled={saving}
          className="w-full h-[64px] rounded-4xl border-2 border-dot-border bg-dot-white text-dot-text font-semibold text-xl active:scale-[0.98] disabled:opacity-60 transition-all"
        >
          Not today
        </button>
      </div>
    </div>
  )
}

function FlowStep({ selected, onSelect, onBack }) {
  return (
    <div className="flex flex-col flex-1">
      <BackButton onClick={onBack} />
      <h2 className="text-2xl font-bold text-dot-text mt-4 mb-1">How's your flow?</h2>
      <p className="text-sm font-medium text-dot-muted mb-7">Pick whatever feels right.</p>

      <div className="grid grid-cols-2 gap-3">
        {FLOWS.map(({ value, label, hint }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={`
              flex flex-col items-center justify-center h-[88px] rounded-3xl border-2 gap-1
              transition-all active:scale-[0.97]
              ${selected === value
                ? 'bg-dot-rose-light border-dot-rose'
                : 'bg-dot-white border-dot-border'}
            `}
          >
            <span className={`text-base font-bold ${selected === value ? 'text-dot-rose' : 'text-dot-text'}`}>
              {label}
            </span>
            <span className={`text-xs font-medium ${selected === value ? 'text-dot-rose-mid' : 'text-dot-muted'}`}>
              {hint}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function SymptomsStep({ selected, onToggle, onSave, onBack, saving }) {
  return (
    <div className="flex flex-col flex-1">
      <BackButton onClick={onBack} />
      <h2 className="text-2xl font-bold text-dot-text mt-4 mb-1">How are you feeling?</h2>
      <p className="text-sm font-medium text-dot-muted mb-7">Tap everything that applies.</p>

      <div className="flex flex-wrap gap-2.5 mb-auto">
        {SYMPTOMS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onToggle(value)}
            className={`
              h-[48px] px-5 rounded-full border-2 font-semibold text-sm
              transition-all active:scale-[0.97]
              ${selected.includes(value)
                ? 'bg-dot-rose-light border-dot-rose text-dot-rose'
                : 'bg-dot-white border-dot-border text-dot-text'}
            `}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full h-[64px] rounded-4xl bg-dot-rose text-white font-bold text-xl mt-8 active:scale-[0.98] disabled:opacity-60 transition-all"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

function DoneStep({ log, flow, symptoms, onEdit, onNotToday, saving }) {
  const flowLabel    = FLOWS.find(f => f.value === flow)?.label
  const symptomLabels = SYMPTOMS.filter(s => symptoms.includes(s.value)).map(s => s.label)

  return (
    <div className="flex flex-col flex-1">
      {/* Confirmation header */}
      <div className="flex flex-col items-center pt-10 pb-8 text-center">
        <div className="w-16 h-16 rounded-full bg-dot-rose-light flex items-center justify-center mb-4">
          <PawPrint className="w-8 h-8 text-dot-rose" />
        </div>
        <h2 className="text-2xl font-bold text-dot-text">All set!</h2>
        <p className="text-dot-muted text-sm font-medium mt-1.5">
          Saved. You can change this any time.
        </p>
      </div>

      {/* Summary pill */}
      <div className="bg-dot-rose-light rounded-3xl px-5 py-4 mb-2">
        <p className="text-sm font-semibold text-dot-rose mb-2">Today's log</p>
        <div className="flex items-center gap-2 flex-wrap">
          {flowLabel && (
            <span className="text-sm font-semibold text-dot-text bg-dot-white px-3 py-1 rounded-full">
              {flowLabel} flow
            </span>
          )}
          {symptomLabels.map(s => (
            <span key={s} className="text-sm font-semibold text-dot-text bg-dot-white px-3 py-1 rounded-full">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-auto">
        <button
          onClick={onEdit}
          className="w-full h-[56px] rounded-4xl border-2 border-dot-border bg-dot-white text-dot-text font-semibold active:scale-[0.98] transition-all"
        >
          Edit today's entry
        </button>
        <button
          onClick={onNotToday}
          disabled={saving}
          className="w-full h-[44px] text-sm text-dot-muted font-semibold active:opacity-70 disabled:opacity-50 transition-opacity"
        >
          Actually, not today
        </button>
      </div>
    </div>
  )
}

function NotTodayStep({ onUndo }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-dot-sage-light flex items-center justify-center text-3xl">
        ✓
      </div>
      <div>
        <p className="text-xl font-bold text-dot-text">Got it!</p>
        <p className="text-sm font-medium text-dot-muted mt-1">Come back tomorrow.</p>
      </div>
      <button
        onClick={onUndo}
        className="text-sm font-semibold text-dot-muted underline underline-offset-2 mt-2"
      >
        Wait, actually it is
      </button>
    </div>
  )
}

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm font-semibold text-dot-muted active:opacity-70 self-start"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  )
}
