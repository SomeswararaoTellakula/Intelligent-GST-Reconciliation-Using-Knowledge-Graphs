import { motion } from 'framer-motion'

export default function RiskBadge({ score }: { score: number }) {
  const band = score < 40 ? 'LOW' : score < 71 ? 'MEDIUM' : 'HIGH'
  const cls = band === 'LOW' ? 'badge-low' : band === 'MEDIUM' ? 'badge-medium' : 'badge-high'
  return (
    <motion.span
      className={cls}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {band}
    </motion.span>
  )
}
