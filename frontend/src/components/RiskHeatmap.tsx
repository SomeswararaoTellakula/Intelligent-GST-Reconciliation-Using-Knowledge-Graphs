export default function RiskHeatmap({ buckets }: { buckets: { label: string; value: number }[] }) {
  const max = Math.max(...buckets.map(b => b.value), 1)
  return (
    <div className="card grid grid-cols-4 gap-2">
      {buckets.map((b, i) => {
        const intensity = b.value / max
        const bg = `rgba(239,68,68,${intensity})` // red heat
        return (
          <div key={i} className="rounded p-2" style={{ backgroundColor: bg }}>
            <div className="text-xs">{b.label}</div>
            <div className="text-sm font-semibold">{b.value}</div>
          </div>
        )
      })}
    </div>
  )
}
