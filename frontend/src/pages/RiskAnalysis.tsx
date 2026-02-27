import { useEffect, useState } from 'react'
import { getGraphData, getInvoiceTrace } from '../services/api'
import Sidebar from '../components/Sidebar'
import AnimatedPage from '../components/AnimatedPage'
import ForceGraph from '../components/ForceGraph'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { postWorkflowRiskUpdate } from '../services/api'
import GeoHeatGrid from '../components/GeoHeatGrid'
import BoxPlot from '../components/BoxPlot'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Sankey, LineChart, Line } from 'recharts'

export default function RiskAnalysis() {
  const [data, setData] = useState<any>()
  const [trace, setTrace] = useState<any>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [riskThreshold, setRiskThreshold] = useState(70)
  const [params] = useSearchParams()
  const gstin = params.get('gstin') || ''
  const invoiceId = params.get('invoice') || ''
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getGraphData().then(setData),
      invoiceId ? getInvoiceTrace(invoiceId).then(setTrace) : Promise.resolve(null)
    ]).catch(e => setError(String(e))).finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div className="text-red-400">{error}</div>
  if (!data) return null

  const filteredNodes = data.nodes.filter((n: any) => (n.properties?.risk_score ?? 0) >= riskThreshold)
  const filtered = { nodes: filteredNodes.length ? filteredNodes : data.nodes, links: data.links }

  const bandCounts = ['LOW','MEDIUM','HIGH'].map(b => ({
    name: b,
    value: data.nodes.filter((n: any) => n.properties?.risk_band === b).length
  }))
  const colors = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444' } as any
  const degreeMap: Record<string, number> = {}
  data.links.forEach((l: any) => {
    degreeMap[l.source] = (degreeMap[l.source] || 0) + 1
    degreeMap[l.target] = (degreeMap[l.target] || 0) + 1
  })
  const topDegrees = Object.entries(degreeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([id, deg]) => ({ id, deg }))
  const riskScores = data.nodes.map((n: any) => Number(n.properties?.risk_score || 0))
  const stateCounts: Record<string, number> = {}
  data.nodes.forEach((n: any) => {
    const st = n.properties?.state
    if (st) stateCounts[st] = (stateCounts[st] || 0) + 1
  })
  const sankeyNodes = Array.from(new Set([...data.links.flatMap((l: any) => [l.source, l.target])]))
    .map((id: string, i: number) => ({ name: id }))
  const indexOf = (id: string) => sankeyNodes.findIndex((n: any) => n.name === id)
  const sankeyLinks = data.links.map((l: any) => ({ source: indexOf(l.source), target: indexOf(l.target), value: 1 }))

  const taxVsClaim = trace && trace.found ? [
    { name: 'Tax', value: Number(trace.path.find((p: any) => p.type === 'invoice')?.tax_amount || 0) },
    { name: 'Claimed', value: Number(trace.path.find((p: any) => p.type === 'invoice')?.claimed_tax_amount || 0) }
  ] : []
  const invoiceSankey = trace && trace.found ? (() => {
    const seller = trace.path.find((p: any) => p.type === 'seller')?.gstin
    const buyer = trace.path.find((p: any) => p.type === 'buyer')?.gstin
    const inv = trace.invoice_id
    const nodes = [{ name: seller || 'Seller' }, { name: inv }, { name: buyer || 'Buyer' }].filter(Boolean)
    const links = [
      { source: 0, target: 1, value: 1 },
      buyer ? { source: 1, target: 2, value: 1 } : null
    ].filter(Boolean) as any[]
    return { nodes, links }
  })() : null
  const lineSeries = (() => {
    const base = Date.now()
    return Array.from({ length: 12 }).map((_, i) => ({
      date: `M${i + 1}`,
      value: Math.round(60 + Math.sin(i / 2) * 20 + (i % 3) * 5)
    }))
  })()

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-4">
        <AnimatedPage>
          <div className="card flex items-center gap-4">
            <div>Invoice: {invoiceId || '—'}</div>
            <div>Risk Threshold: {riskThreshold}</div>
            <input type="range" min={0} max={100} value={riskThreshold} onChange={e => setRiskThreshold(Number(e.target.value))} />
            <button
              className="ml-auto px-3 py-2 bg-brand rounded"
              onClick={async () => {
                try {
                  await postWorkflowRiskUpdate({ gstin, threshold: riskThreshold, action: 'proceed_to_dashboard' })
                } catch {}
                navigate(`/dashboard?gstin=${encodeURIComponent(gstin)}`)
              }}
            >
              Save
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ForceGraph nodes={filtered.nodes} links={filtered.links} />
            <div className="card flex items-center justify-center">
              <PieChart width={260} height={260}>
                <Pie dataKey="value" data={bandCounts} cx={130} cy={130} outerRadius={100} innerRadius={60}>
                  {bandCounts.map((d, i) => <Cell key={i} fill={colors[d.name]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </div>
            <div className="card">
              <div className="text-sm font-semibold mb-2">Top Degree (Connectivity)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topDegrees}>
                  <XAxis dataKey="id" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip />
                  <Bar dataKey="deg" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <BoxPlot values={riskScores} />
            <GeoHeatGrid values={stateCounts} />
            <div className="card">
              <div className="text-sm font-semibold mb-2">Sankey: Seller → Buyer</div>
              <ResponsiveContainer width="100%" height={260}>
                <Sankey width={400} height={260} data={{ nodes: sankeyNodes, links: sankeyLinks }} nodePadding={20} link={{ stroke: '#64748b' }} node={{ fill: '#0ea5e9' }}>
                  <Tooltip />
                </Sankey>
              </ResponsiveContainer>
            </div>
            {trace && trace.found && (
              <>
                <div className="card">
                  <div className="text-sm font-semibold mb-2">Invoice Tax vs Claimed</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={taxVsClaim}>
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <div className="text-sm font-semibold mb-2">Invoice Flow</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <Sankey width={400} height={240} data={invoiceSankey!} nodePadding={30} link={{ stroke: '#94a3b8' }} node={{ fill: '#22c55e' }}>
                      <Tooltip />
                    </Sankey>
                  </ResponsiveContainer>
                </div>
              </>
            )}
            <div className="card">
              <div className="text-sm font-semibold mb-2">Time Series</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineSeries}>
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#0ea5e9" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </AnimatedPage>
      </div>
    </div>
  )
}
