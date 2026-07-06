import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { CatSleeping, PawPrint } from '../../components/Cat'

const SHARE_LEVELS = [
  {
    value: 'basic',
    label: 'Dates only',
    desc: 'They see when it started and ended.',
  },
  {
    value: 'flow',
    label: 'Dates + flow',
    desc: 'Also how heavy your flow was.',
  },
  {
    value: 'symptoms',
    label: 'Dates + symptoms',
    desc: 'Also cramps, tiredness, etc.',
  },
  {
    value: 'everything',
    label: 'Almost everything',
    desc: 'Dates, flow, and symptoms. Private notes stay private.',
  },
]

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get('/cycle-profile')
      .then(({ data }) => setProfile(data))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const { data } = await client.patch('/cycle-profile', {
        share_level:         profile.share_level,
        share_with_parent_1: profile.share_with_parent_1,
        share_with_parent_2: profile.share_with_parent_2,
      })
      setProfile(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-[3px] border-dot-rose border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const sharingEnabled = profile.share_with_parent_1 || profile.share_with_parent_2

  return (
    <div className="px-5 pt-10 pb-8">
      <h1 className="text-2xl font-bold text-dot-text mb-1">Privacy</h1>
      <p className="text-sm font-medium text-dot-muted mb-7">
        You decide what your parents see.
      </p>

      {/* Cozy safe-space illustration */}
      <div className="flex items-center justify-center bg-dot-rose-light rounded-4xl py-6 mb-7">
        <div className="flex flex-col items-center text-center gap-2">
          <CatSleeping className="w-32 h-20 text-dot-rose" />
          <p className="text-xs font-semibold text-dot-rose-mid">Your space. Your rules.</p>
        </div>
      </div>

      {/* Sharing toggles */}
      <p className="text-xs font-bold text-dot-muted uppercase tracking-wider mb-3">Share with</p>
      <div className="bg-dot-white rounded-3xl border border-dot-border divide-y divide-dot-border mb-6">
        <ToggleRow
          label="Dad"
          value={profile.share_with_parent_1}
          onChange={v => setProfile(p => ({ ...p, share_with_parent_1: v }))}
        />
        <ToggleRow
          label="Mom"
          value={profile.share_with_parent_2}
          onChange={v => setProfile(p => ({ ...p, share_with_parent_2: v }))}
        />
      </div>

      {/* Visibility level */}
      {sharingEnabled && (
        <>
          <p className="text-xs font-bold text-dot-muted uppercase tracking-wider mb-3">What they can see</p>
          <div className="flex flex-col gap-2 mb-7">
            {SHARE_LEVELS.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setProfile(p => ({ ...p, share_level: value }))}
                className={`
                  text-left px-5 py-4 rounded-2xl border-2 transition-colors active:scale-[0.99]
                  ${profile.share_level === value
                    ? 'border-dot-rose bg-dot-rose-light'
                    : 'border-dot-border bg-dot-white'}
                `}
              >
                <p className={`text-sm font-bold ${profile.share_level === value ? 'text-dot-rose' : 'text-dot-text'}`}>
                  {label}
                </p>
                <p className="text-xs font-medium text-dot-muted mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full h-[60px] rounded-4xl bg-dot-rose text-white font-bold text-lg disabled:opacity-60 active:scale-[0.98] transition-all mb-3 flex items-center justify-center gap-2"
      >
        {saved ? (
          <>
            <PawPrint className="w-5 h-5" />
            Saved!
          </>
        ) : saving ? 'Saving…' : 'Save settings'}
      </button>

      {/* Account footer */}
      <div className="mt-8 pt-6 border-t border-dot-border">
        <p className="text-sm font-bold text-dot-text">{user?.name}</p>
        <p className="text-xs font-medium text-dot-muted mt-0.5 mb-5">Signed in as child</p>
        <button
          onClick={handleLogout}
          className="text-sm font-semibold text-dot-muted underline underline-offset-2 active:opacity-70"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="text-base font-bold text-dot-text">{label}</span>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        className={`relative w-12 h-7 rounded-full transition-colors ${value ? 'bg-dot-rose' : 'bg-dot-border'}`}
      >
        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}
