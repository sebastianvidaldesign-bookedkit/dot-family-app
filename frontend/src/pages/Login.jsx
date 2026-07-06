import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CatSitting } from '../components/Cat'

export default function Login() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(user.role === 'child' ? '/today' : '/parent/overview', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[430px] min-h-[100dvh] bg-dot-bg flex flex-col items-center justify-center px-6 py-10">
      {/* Branding */}
      <div className="flex flex-col items-center mb-10 select-none">
        {/* Cat + dot mark stacked */}
        <div className="relative mb-2">
          <CatSitting className="w-20 h-20 text-dot-rose" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-dot-rose" />
          <h1 className="text-3xl font-bold text-dot-text tracking-tight">Dot</h1>
        </div>
        <p className="text-dot-muted text-sm mt-1.5 font-medium">Your private calendar</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-dot-text mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoCapitalize="none"
            className="w-full px-4 h-[52px] rounded-2xl border-2 border-dot-border bg-dot-white text-dot-text text-base font-medium focus:outline-none focus:border-dot-rose transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-dot-text mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-4 h-[52px] rounded-2xl border-2 border-dot-border bg-dot-white text-dot-text text-base font-medium focus:outline-none focus:border-dot-rose transition-colors"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-dot-rose-light border border-dot-rose/20 px-4 py-3 rounded-2xl">
            <span className="text-dot-rose mt-0.5 text-lg leading-none">!</span>
            <p className="text-sm font-medium text-dot-rose leading-relaxed">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-[60px] rounded-3xl bg-dot-rose text-white font-bold text-lg active:opacity-80 disabled:opacity-60 transition-opacity mt-1"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-xs text-dot-muted mt-8 font-medium">
        This app is just for your family.
      </p>
    </div>
  )
}
