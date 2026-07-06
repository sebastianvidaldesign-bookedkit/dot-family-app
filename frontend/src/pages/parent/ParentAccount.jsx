import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ParentAccount() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <h1 className="text-2xl font-bold text-dot-text mb-8">Account</h1>

      <div className="bg-dot-white rounded-3xl border border-dot-border divide-y divide-dot-border mb-6">
        <div className="px-5 py-4">
          <p className="text-xs font-bold text-dot-muted uppercase tracking-wide mb-1">Name</p>
          <p className="text-base font-bold text-dot-text">{user?.name}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-bold text-dot-muted uppercase tracking-wide mb-1">Role</p>
          <p className="text-base font-bold text-dot-text capitalize">{user?.role}</p>
        </div>
      </div>

      <div className="bg-dot-sage-light rounded-3xl px-5 py-4 mb-8">
        <p className="text-sm font-medium text-dot-text leading-relaxed">
          This is a read-only view. Only your child can update data or change sharing settings.
        </p>
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
