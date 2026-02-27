type Cell = { code: string; label: string; value: number }

const GRID: { code: string; label: string; row: number; col: number }[] = [
  { code: 'JK', label: 'JK', row: 0, col: 3 },
  { code: 'HP', label: 'HP', row: 1, col: 3 },
  { code: 'PB', label: 'PB', row: 1, col: 2 },
  { code: 'UK', label: 'UK', row: 2, col: 3 },
  { code: 'HR', label: 'HR', row: 2, col: 2 },
  { code: 'DL', label: 'DL', row: 2, col: 1 },
  { code: 'RJ', label: 'RJ', row: 2, col: 0 },
  { code: 'UP', label: 'UP', row: 3, col: 3 },
  { code: 'BR', label: 'BR', row: 3, col: 4 },
  { code: 'GJ', label: 'GJ', row: 3, col: 0 },
  { code: 'MP', label: 'MP', row: 4, col: 2 },
  { code: 'MH', label: 'MH', row: 5, col: 1 },
  { code: 'CG', label: 'CG', row: 4, col: 3 },
  { code: 'JH', label: 'JH', row: 4, col: 4 },
  { code: 'WB', label: 'WB', row: 4, col: 5 },
  { code: 'KA', label: 'KA', row: 6, col: 1 },
  { code: 'GA', label: 'GA', row: 6, col: 0 },
  { code: 'TS', label: 'TS', row: 6, col: 2 },
  { code: 'AP', label: 'AP', row: 7, col: 2 },
  { code: 'TN', label: 'TN', row: 7, col: 1 },
  { code: 'KL', label: 'KL', row: 8, col: 1 },
  { code: 'OR', label: 'OR', row: 5, col: 4 }
]

export default function GeoHeatGrid({ values }: { values: Record<string, number> }) {
  const cells: Cell[] = GRID.map(g => ({
    code: g.code,
    label: g.label,
    value: values[g.code] || 0
  }))
  const max = Math.max(...cells.map(c => c.value), 1)
  return (
    <div className="card">
      <div className="text-sm font-semibold mb-2">Geospatial Heat Grid</div>
      <div className="relative" style={{ width: '100%', height: 260 }}>
        <svg width="100%" height="100%" viewBox="0 0 600 300">
          {cells.map(c => {
            const g = GRID.find(x => x.code === c.code)!
            const x = g.col * 90 + 40
            const y = g.row * 30 + 30
            const alpha = c.value / max
            const fill = `rgba(14,165,233,${alpha})`
            return (
              <g key={c.code} transform={`translate(${x},${y})`}>
                <rect x={-30} y={-12} width={60} height={24} rx={6} fill={fill} stroke="#1f2937" />
                <text x={0} y={4} textAnchor="middle" fontSize="10" fill="#e5e7eb">{c.label}: {c.value}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
