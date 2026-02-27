import { NavLink } from 'react-router-dom'
import { FiHome, FiTrendingUp, FiUsers, FiFileText, FiSettings, FiShield } from 'react-icons/fi'

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: FiHome },
  { to: '/select', label: 'Select GSTIN', icon: FiFileText },
  { to: '/risk', label: 'Risk Analysis', icon: FiShield },
  { to: '/vendors', label: 'Vendors', icon: FiUsers },
  { to: '/reconcile', label: 'Reconcile', icon: FiFileText },
  { to: '/audit', label: 'Audit Trail', icon: FiTrendingUp },
  { to: '/settings', label: 'Settings', icon: FiSettings }
]

export default function Sidebar() {
  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 p-4">
      <div className="text-sm text-gray-400 mb-3">Navigation</div>
      <div className="grid gap-1">
        {items.map(i => {
          const Icon = i.icon
          return (
            <NavLink key={i.to} to={i.to} className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded ${isActive ? 'bg-gray-800' : 'hover:bg-gray-800'}`}>
              <Icon />
              <span>{i.label}</span>
            </NavLink>
          )
        })}
      </div>
    </aside>
  )
}
