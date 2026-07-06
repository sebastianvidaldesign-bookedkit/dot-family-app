import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { CatSleeping } from '../../components/Cat'

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <h1 className="text-2xl font-bold text-dot-text mb-1">Account</h1>
      <p className="text-sm font-medium text-dot-muted mb-8">Your Dot profile</p>

      <div className="flex justify-center mb-8">
        <CatSleeping className="w-32 h-20 text-dot-rose" />
      </div>

      <div className="bg-dot-white rounded-3xl border border-dot-border divide-y divide-dot-border mb-8">
        <div className="px-5 py-4">
          <p className="text-xs font-bold text-dot-muted uppercase tracking-wide mb-1">Name</p>
          <p className="text-base font-bold text-dot-text">{user?.name}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-bold text-dot-muted uppercase tracking-wide mb-1">Family</p>
          <p className="text-base font-bold text-dot-text">Your family uses Dot together</p>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full h-[56px] rounded-4xl border-2 border-dot-border bg-dot-white text-dot-muted font-semibold active:scale-[0.98] transition-all"
      >
        Sign out
      </button>
    </div>
  )
}
