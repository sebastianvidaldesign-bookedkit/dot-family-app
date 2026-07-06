import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import client from '../../api/client'

const FLOWS = [
  { value: 'light',    label: 'Light',    emoji: '🌸' },
  { value: 'medium',   label: 'Medium',   emoji: '🌺' },
  { value: 'heavy',    label: 'Heavy',    emoji: '🌹' },
  { value: 'not_sure', label: 'Not sure', emoji: '?' },
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
  const [step, setStep]         = useState('ask') // ask | flow | symptoms | done
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
          setStep(todayLog.is_period_day ? 'done' : 'ask')
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

  const displayDate = format(new Date(), 'EEEE, MMMM d')

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Spinner /></div>
  }

  return (
    <div className="px-6 pt-12 pb-6 flex flex-col min-h-full">
      <p className="text-dot-muted text-sm font-medium mb-8">{displayDate}</p>

      {step === 'ask' && (
        <AskStep
          onYes={() => setStep('flow')}
          onNo={() => save(false, null, [])}
          saving={saving}
        />
      )}

      {step === 'flow' && (
        <FlowStep
          selected={flow}
          onSelect={v => { setFlow(v); setStep('symptoms') }}
          onBack={() => setStep('ask')}
        />
      )}

      {step === 'symptoms' && (
        <SymptomsStep
          selected={symptoms}
          onToggle={toggleSymptom}
          onSave={() => save(true, flow, symptoms)}
          onBack={() => setStep('flow')}
          saving={saving}
        />
      )}

      {step === 'done' && (
        <DoneStep
          log={log}
          flow={flow}
          symptoms={symptoms}
          onEdit={() => setStep('flow')}
          onNotToday={() => save(false, null, [])}
          saving={saving}
        />
      )}

      {step === 'not-today' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-dot-sage-light flex items-center justify-center text-4xl">
            ✓
          </div>
          <p className="text-xl font-semibold text-dot-text">Got it. Saved.</p>
          <p className="text-dot-muted text-sm">Come back tomorrow.</p>
          <button
            onClick={() => setStep('ask')}
            className="mt-4 text-sm text-dot-muted underline"
          >
            Actually, let me change that
          </button>
        </div>
      )}
    </div>
  )
}

function AskStep({ onYes, onNo, saving }) {
  return (
    <div className="flex flex-col flex-1">
      <h1 className="text-2xl font-semibold text-dot-text leading-snug mb-2">
        Are you on your period today?
      </h1>
      <p className="text-dot-muted text-sm mb-12">No pressure either way.</p>

      <div className="flex flex-col gap-4 mt-auto mb-4">
        <button
          onClick={onYes}
          disabled={saving}
          className="w-full py-5 rounded-3xl bg-dot-rose text-white text-lg font-semibold active:opacity-80 disabled:opacity-60 transition-opacity"
        >
          Yes
        </button>
        <button
          onClick={onNo}
          disabled={saving}
          className="w-full py-5 rounded-3xl border-2 border-dot-border bg-white text-dot-text text-lg font-medium active:opacity-80 disabled:opacity-60 transition-opacity"
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
      <button onClick={onBack} className="text-dot-muted text-sm mb-8 self-start">← Back</button>
      <h2 className="text-2xl font-semibold text-dot-text mb-2">How's the flow?</h2>
      <p className="text-dot-muted text-sm mb-8">Pick whichever feels right.</p>

      <div className="grid grid-cols-2 gap-3">
        {FLOWS.map(({ value, label, emoji }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={`py-6 rounded-3xl flex flex-col items-center gap-2 text-base font-medium transition-colors border-2
              ${selected === value
                ? 'bg-dot-rose-light border-dot-rose text-dot-rose'
                : 'bg-white border-dot-border text-dot-text'}`}
          >
            <span className="text-2xl">{emoji}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SymptomsStep({ selected, onToggle, onSave, onBack, saving }) {
  return (
    <div className="flex flex-col flex-1">
      <button onClick={onBack} className="text-dot-muted text-sm mb-8 self-start">← Back</button>
      <h2 className="text-2xl font-semibold text-dot-text mb-2">How are you feeling?</h2>
      <p className="text-dot-muted text-sm mb-8">Tap everything that applies.</p>

      <div className="flex flex-wrap gap-3 mb-auto">
        {SYMPTOMS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onToggle(value)}
            className={`px-5 py-3 rounded-full text-sm font-medium border-2 transition-colors
              ${selected.includes(value)
                ? 'bg-dot-rose-light border-dot-rose text-dot-rose'
                : 'bg-white border-dot-border text-dot-text'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-5 rounded-3xl bg-dot-rose text-white text-lg font-semibold mt-8 active:opacity-80 disabled:opacity-60 transition-opacity"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

function DoneStep({ log, flow, symptoms, onEdit, onNotToday, saving }) {
  const flowLabel = FLOWS.find(f => f.value === flow)?.label
  const symptomLabels = SYMPTOMS
    .filter(s => symptoms.includes(s.value))
    .map(s => s.label)

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col items-center pt-8 pb-6 gap-2">
        <div className="w-24 h-24 rounded-full bg-dot-rose flex items-center justify-center mb-2">
          <span className="text-white text-5xl font-bold">·</span>
        </div>
        <p className="text-xl font-semibold text-dot-text">Logged for today</p>
        {flowLabel && (
          <p className="text-dot-muted text-sm">Flow: {flowLabel}</p>
        )}
        {symptomLabels.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {symptomLabels.map(s => (
              <span key={s} className="px-3 py-1 rounded-full bg-dot-rose-light text-dot-rose text-xs font-medium">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 mt-auto">
        <button
          onClick={onEdit}
          className="w-full py-4 rounded-3xl border-2 border-dot-border bg-white text-dot-text font-medium active:opacity-80 transition-opacity"
        >
          Edit today's entry
        </button>
        <button
          onClick={onNotToday}
          disabled={saving}
          className="w-full py-4 rounded-3xl text-dot-muted text-sm active:opacity-80 disabled:opacity-60 transition-opacity"
        >
          Actually, not today
        </button>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="w-8 h-8 border-2 border-dot-rose border-t-transparent rounded-full animate-spin" />
  )
}
