import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'

const SHARE_LEVELS = [
  { value: 'basic',      label: 'Basic dates only',          desc: 'They can see when your period started and ended.' },
  { value: 'flow',       label: 'Dates + flow',              desc: 'Also shows how heavy your flow was.' },
  { value: 'symptoms',   label: 'Dates + symptoms',          desc: 'Also shows symptoms like cramps or tiredness.' },
  { value: 'everything', label: 'Everything except private notes', desc: 'Dates, flow, and symptoms — but not your private notes.' },
]

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    client.get('/cycle-profile').then(({ data }) => setProfile(data)).finally(() => setLoading(false))
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
      setTimeout(() => setSaved(false), 2000)
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
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-dot-rose border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-6 pt-12 pb-6">
      <h1 className="text-2xl font-semibold text-dot-text mb-1">Privacy</h1>
      <p className="text-dot-muted text-sm mb-8">You control what your parents can see.</p>

      {/* Parent toggles */}
      <div className="bg-white rounded-3xl border border-dot-border divide-y divide-dot-border mb-6">
        <ToggleRow
          label="Share with Dad"
          value={profile.share_with_parent_1}
          onChange={v => setProfile(p => ({ ...p, share_with_parent_1: v }))}
        />
        <ToggleRow
          label="Share with Mom"
          value={profile.share_with_parent_2}
          onChange={v => setProfile(p => ({ ...p, share_with_parent_2: v }))}
        />
      </div>

      {/* Share level */}
      <p className="text-sm font-medium text-dot-text mb-3">What they can see</p>
      <div className="flex flex-col gap-2 mb-8">
        {SHARE_LEVELS.map(({ value, label, desc }) => (
          <button
            key={value}
            onClick={() => setProfile(p => ({ ...p, share_level: value }))}
            className={`text-left px-5 py-4 rounded-2xl border-2 transition-colors
              ${profile.share_level === value
                ? 'border-dot-rose bg-dot-rose-light'
                : 'border-dot-border bg-white'}`}
          >
            <p className={`text-sm font-medium ${profile.share_level === value ? 'text-dot-rose' : 'text-dot-text'}`}>
              {label}
            </p>
            <p className="text-xs text-dot-muted mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-4 rounded-3xl bg-dot-rose text-white font-semibold text-base disabled:opacity-60 active:opacity-80 transition-opacity mb-3"
      >
        {saved ? 'Saved!' : saving ? 'Saving…' : 'Save settings'}
      </button>

      <div className="mt-8 pt-6 border-t border-dot-border">
        <p className="text-sm font-medium text-dot-text mb-1">{user?.name}</p>
        <p className="text-xs text-dot-muted mb-4">Signed in as {user?.role}</p>
        <button
          onClick={handleLogout}
          className="text-sm text-dot-muted underline"
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
      <span className="text-sm font-medium text-dot-text">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full transition-colors relative ${value ? 'bg-dot-rose' : 'bg-dot-border'}`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white shadow-sm absolute top-1 transition-all ${value ? 'left-6' : 'left-1'}`}
        />
      </button>
    </div>
  )
}
