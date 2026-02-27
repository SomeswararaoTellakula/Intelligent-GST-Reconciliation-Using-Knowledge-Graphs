import { Link } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  return (
    <div className="flex items-center justify-between p-4">
      <Link to="/" className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-500">GST Graph Intelligence</Link>
      <div className="flex items-center gap-3">
        <Link to="/login" className="px-3 py-2 rounded bg-gray-800">Login</Link>
        <Link to="/signup" className="px-3 py-2 rounded bg-brand">Get Started</Link>
        <ThemeToggle />
      </div>
    </div>
  )
}
