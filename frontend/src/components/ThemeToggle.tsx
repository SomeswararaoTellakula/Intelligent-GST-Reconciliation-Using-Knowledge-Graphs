import { useUI } from '../store/ui'
import { FiMoon, FiSun } from 'react-icons/fi'

export default function ThemeToggle() {
  const { theme, setTheme } = useUI()
  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  return (
    <button onClick={toggle} className="p-2 rounded bg-gray-800 text-gray-100 dark:bg-gray-700">
      {theme === 'dark' ? <FiSun /> : <FiMoon />}
    </button>
  )
}
