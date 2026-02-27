import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../store/auth'
import { apiBase } from '../services/api'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuth(s => s.login)
  const navigate = useNavigate()

  const submit = async () => {
    setError('')
    if (!email || !password) { setError('Email and password required'); return }
    setLoading(true)
    setTimeout(() => {
      login('dev-token', { name: 'User', email })
      navigate('/dashboard')
    }, 600)
  }
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-[#0b1220] via-[#0f1b2e] to-[#0b1220]">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-96 max-w-[95%] backdrop-blur bg-white/10 dark:bg-gray-800/40 border border-white/20 dark:border-gray-700/40 rounded-2xl p-6">
        <div className="text-2xl font-semibold text-center">Welcome back</div>
        <div className="grid gap-3 mt-4">
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="bg-gray-800 rounded px-3 py-2" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="bg-gray-800 rounded px-3 py-2" />
          {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm">{error}</motion.div>}
          <button onClick={submit} className="px-3 py-2 rounded bg-brand flex justify-center">{loading ? <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full" /> : 'Login'}</button>
          <button onClick={() => { window.location.href = `${apiBase}/auth/google/login` }} className="px-3 py-2 rounded bg-gray-700">Login with Google</button>
          <div className="text-right text-sm"><Link to="/signup" className="text-brand">Create account</Link></div>
          <div className="text-right text-sm"><Link to="/forgot" className="text-gray-400">Forgot password</Link></div>
        </div>
      </motion.div>
    </div>
  )
}
