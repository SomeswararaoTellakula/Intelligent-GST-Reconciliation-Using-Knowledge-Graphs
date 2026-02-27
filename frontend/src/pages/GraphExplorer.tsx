import { useEffect, useState } from 'react'
import { getGraphData } from '../services/api'
import ForceGraph from '../components/ForceGraph'

export default function GraphExplorer() {
  const [data, setData] = useState<any>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [riskThreshold, setRiskThreshold] = useState(70)

  useEffect(() => {
    setLoading(true)
    getGraphData()
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div className="text-red-400">{error}</div>
  if (!data) return null

  const filtered = {
    nodes: data.nodes.filter((n: any) => (n.properties?.risk_score ?? 0) >= riskThreshold),
    links: data.links
  }

  return (
    <div className="grid gap-4">
      <div className="card flex items-center gap-4">
        <div>Risk Threshold: {riskThreshold}</div>
        <input type="range" min={0} max={100} value={riskThreshold} onChange={e => setRiskThreshold(Number(e.target.value))} />
      </div>
      <ForceGraph nodes={filtered.nodes} links={filtered.links} />
    </div>
  )
}
