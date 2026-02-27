import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../store/auth'
import { useNavigate } from 'react-router-dom'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuth(s => s.login)
  const navigate = useNavigate()

  const submit = async () => {
    setError('')
    if (!name || !email || !password) { setError('All fields required'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    setTimeout(() => {
      login('dev-token', { name, email })
      navigate('/dashboard')
    }, 600)
  }
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-[#0b1220] via-[#0f1b2e] to-[#0b1220]">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-96 max-w-[95%] backdrop-blur bg-white/10 dark:bg-gray-800/40 border border-white/20 dark:border-gray-700/40 rounded-2xl p-6">
        <div className="text-2xl font-semibold text-center">Create account</div>
        <div className="grid gap-3 mt-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="bg-gray-800 rounded px-3 py-2" />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="bg-gray-800 rounded px-3 py-2" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="bg-gray-800 rounded px-3 py-2" />
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm Password" className="bg-gray-800 rounded px-3 py-2" />
          {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm">{error}</motion.div>}
          <button onClick={submit} className="px-3 py-2 rounded bg-brand flex justify-center">{loading ? <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full" /> : 'Sign Up'}</button>
          <button className="px-3 py-2 rounded bg-gray-700">Sign up with Google</button>
        </div>
      </motion.div>
    </div>
  )
}
