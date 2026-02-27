function quantiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const q = (p: number) => {
    const i = (sorted.length - 1) * p
    const lo = Math.floor(i), hi = Math.ceil(i)
    if (lo === hi) return sorted[lo]
    return sorted[lo] * (hi - i) + sorted[hi] * (i - lo)
  }
  return { min: sorted[0], q1: q(0.25), median: q(0.5), q3: q(0.75), max: sorted[sorted.length - 1] }
}

export default function BoxPlot({ values }: { values: number[] }) {
  if (!values || values.length === 0) return <div className="card">No data</div>
  const { min, q1, median, q3, max } = quantiles(values)
  const scaleX = (v: number) => 20 + v * 2.6 // 0..100 => pixels
  return (
    <div className="card">
      <div className="text-sm font-semibold mb-2">Risk Score Box Plot</div>
      <svg width="100%" height="100" viewBox="0 0 300 100">
        <line x1={scaleX(min)} x2={scaleX(max)} y1={50} y2={50} stroke="#9ca3af" />
        <line x1={scaleX(min)} x2={scaleX(min)} y1={40} y2={60} stroke="#9ca3af" />
        <line x1={scaleX(max)} x2={scaleX(max)} y1={40} y2={60} stroke="#9ca3af" />
        <rect x={scaleX(q1)} y={35} width={scaleX(q3) - scaleX(q1)} height={30} fill="rgba(245,158,11,0.3)" stroke="#f59e0b" />
        <line x1={scaleX(median)} x2={scaleX(median)} y1={35} y2={65} stroke="#f59e0b" />
        <text x={scaleX(min)} y={80} fontSize="9" fill="#9ca3af">min</text>
        <text x={scaleX(q1)} y={80} fontSize="9" fill="#9ca3af">q1</text>
        <text x={scaleX(median)} y={80} fontSize="9" fill="#9ca3af">med</text>
        <text x={scaleX(q3)} y={80} fontSize="9" fill="#9ca3af">q3</text>
        <text x={scaleX(max)} y={80} fontSize="9" fill="#9ca3af">max</text>
      </svg>
    </div>
  )
}
