import { useState } from 'react'
import { postSimulateRisk } from '../services/api'

export default function Simulation() {
  const [gstin, setGstin] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [threshold, setThreshold] = useState(70)
  const [itc, setItc] = useState(false)
  const [depth, setDepth] = useState(2)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [cluster, setCluster] = useState<number | undefined>()
  const [result, setResult] = useState<any>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = () => {
    setError('')
    setLoading(true)
    postSimulateRisk({
      gstin: gstin || undefined,
      invoice_id: invoiceId || undefined,
      risk_threshold: threshold,
      itc_simulation: itc,
      depth,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      cluster_id: cluster
    })
      .then(setResult)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }

  return (
    <div className="grid gap-4">
      <div className="card grid grid-cols-2 md:grid-cols-3 gap-2">
        <input value={gstin} onChange={e => setGstin(e.target.value)} placeholder="GSTIN" className="bg-gray-700 rounded px-3 py-2" />
        <input value={invoiceId} onChange={e => setInvoiceId(e.target.value)} placeholder="Invoice ID" className="bg-gray-700 rounded px-3 py-2" />
        <div className="flex items-center gap-2">
          <span>Risk Threshold: {threshold}</span>
          <input type="range" min={0} max={100} value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
        </div>
        <div className="flex items-center gap-2">
          <span>ITC Simulation</span>
          <input type="checkbox" checked={itc} onChange={e => setItc(e.target.checked)} />
        </div>
        <div className="flex items-center gap-2">
          <span>Depth</span>
          <select value={depth} onChange={e => setDepth(Number(e.target.value))} className="bg-gray-700 rounded px-2 py-2">
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-gray-700 rounded px-3 py-2" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-gray-700 rounded px-3 py-2" />
        <input type="number" value={cluster ?? ''} onChange={e => setCluster(e.target.value ? Number(e.target.value) : undefined)} placeholder="Cluster ID" className="bg-gray-700 rounded px-3 py-2" />
        <button onClick={run} className="px-3 py-2 bg-brand rounded">Run Simulation</button>
        {loading && <span>Loading...</span>}
        {error && <span className="text-red-400">{error}</span>}
      </div>
      {result && (
        <div className="card">
          <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
