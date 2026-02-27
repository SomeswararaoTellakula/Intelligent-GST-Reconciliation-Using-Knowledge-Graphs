import { useState } from 'react'
import { getVendorRisk } from '../services/api'
import RiskBadge from '../components/RiskBadge'
import AnimatedPage from '../components/AnimatedPage'
import Sidebar from '../components/Sidebar'

export default function Vendors() {
  const [gstin, setGstin] = useState('')
  const [data, setData] = useState<any>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetch = () => {
    setError('')
    if (!/^[A-Z0-9]{15}$/i.test(gstin)) { setError('Invalid GSTIN format'); return }
    setLoading(true)
    getVendorRisk(gstin).then(setData).catch(e => setError(String(e))).finally(() => setLoading(false))
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-4">
        <AnimatedPage>
          <div className="card flex gap-2 items-center">
            <input value={gstin} onChange={e => setGstin(e.target.value)} placeholder="Enter GSTIN" className="bg-gray-700 rounded px-3 py-2 w-64" />
            <button onClick={fetch} className="px-3 py-2 bg-brand rounded">Search</button>
            {loading && <span>Loading...</span>}
            {error && <span className="text-red-400">{error}</span>}
          </div>
          {data && (
            <div className="card grid gap-2 mt-4">
              <div className="flex items-center gap-2">
                <div className="text-xl font-semibold">{data.name || data.gstin}</div>
                <RiskBadge score={data.risk_score || 0} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>Pagerank: {Number(data.pagerank_score || 0).toFixed(4)}</div>
                <div>Degree: {Number(data.degree_centrality || 0).toFixed(2)}</div>
                <div>Cluster: {data.cluster_id ?? '—'}</div>
                <div>Component: {data.component_id ?? '—'}</div>
              </div>
            </div>
          )}
        </AnimatedPage>
      </div>
    </div>
  )
}
