import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { signInWithPassword, signUp } = useAuth()

  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const fn = mode === 'login' ? signInWithPassword : signUp
      const { error } = await fn(email, password)
      if (error) throw error
    } catch (err) {
      setError('הפעולה נכשלה. נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-xl p-6 bg-white text-right">
        <h1 className="text-xl font-semibold mb-4">
          {mode === 'login' ? 'התחברות' : 'יצירת חשבון'}
        </h1>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-sm">אימייל</label>
            <input
              className="w-full border rounded-md px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="שם@דוגמה.com"
              dir="ltr"
              required
            />
          </div>

          <div>
            <label className="text-sm">סיסמה</label>
            <div className="relative">
              <input
                className="w-full border rounded-md px-3 py-2 pl-12"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800"
                aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <button
            className="w-full rounded-md px-3 py-2 bg-slate-900 text-white disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? 'נא להמתין…' : (mode === 'login' ? 'התחברות' : 'הרשמה')}
          </button>
        </form>

        <div className="mt-4 text-sm">
          {mode === 'login' ? (
            <button className="underline" onClick={() => setMode('signup')}>
              אין לך חשבון? הרשמה
            </button>
          ) : (
            <button className="underline" onClick={() => setMode('login')}>
              כבר יש לך חשבון? התחברות
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
