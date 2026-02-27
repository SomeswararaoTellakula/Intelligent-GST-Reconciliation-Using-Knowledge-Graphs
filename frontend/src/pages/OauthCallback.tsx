import { useEffect } from 'react'
import { useAuth } from '../store/auth'
import { useNavigate, useLocation } from 'react-router-dom'

export default function OauthCallback() {
  const login = useAuth(s => s.login)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const token = params.get('token')
    const name = params.get('name') || 'User'
    const email = params.get('email') || 'user@example.com'
    const error = params.get('error')
    if (error) {
      navigate('/login', { replace: true })
      return
    }
    if (token) {
      login(token, { name, email })
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [location.search])
  return <div className="min-h-screen grid place-items-center">Processing login…</div>
}
