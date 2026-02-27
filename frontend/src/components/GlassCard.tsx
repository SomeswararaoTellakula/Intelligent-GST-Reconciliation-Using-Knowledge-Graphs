import { ReactNode } from 'react'

export default function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`backdrop-blur bg-white/10 dark:bg-gray-800/40 border border-white/20 dark:border-gray-700/40 rounded-2xl p-4 shadow-lg ${className}`}>{children}</div>
}
