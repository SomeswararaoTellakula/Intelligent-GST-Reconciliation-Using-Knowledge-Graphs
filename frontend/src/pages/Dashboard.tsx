import { useEffect, useState } from 'react'
import { getDashboardSummary, getReportExport, postWorkflowRiskUpdate, getReconcile } from '../services/api'
import KpiCard from '../components/KpiCard'
import ComplianceGauge from '../components/ComplianceGauge'
import RiskHeatmap from '../components/RiskHeatmap'
import Sidebar from '../components/Sidebar'
import AnimatedPage from '../components/AnimatedPage'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import useDashboardStream from '../hooks/useDashboardStream'
import { useSearchParams, useNavigate } from 'react-router-dom'

type Summary = {
  kpis: {
    taxpayers: number
    invoices: number
    returns: number
    high_risk_taxpayers: number
    high_risk_invoices: number
  }
  clusters: Record<string, number>
  components: Record<string, number>
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const gstin = params.get('gstin') || ''

  useEffect(() => {
    setLoading(true)
    getDashboardSummary(gstin ? { gstin } : undefined)
      .then((data) => setSummary(data as Summary))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [gstin])
  if (!gstin) {
    useDashboardStream((data) => {
      setSummary(data as Summary)
    })
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div className="text-red-400">{error}</div>
  if (!summary) return null

  const k = summary.kpis
  const trend = Array.from({ length: 12 }).map((_, i) => ({ date: `M${i + 1}`, value: Math.round(50 + Math.random() * 50) }))
  const riskPie = [
    { name: 'Low', value: Math.max(k.invoices - k.high_risk_invoices - 10, 0) },
    { name: 'Medium', value: 10 },
    { name: 'High', value: k.high_risk_invoices }
  ]
  const colors = ['#22c55e', '#f59e0b', '#ef4444']
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-4">
        <AnimatedPage>
          <div className="flex justify-end mb-3">
            <button
              onClick={async () => {
                try {
                  await postWorkflowRiskUpdate({ action: 'download_report' })
                } catch {}
                try {
                  // Get reconciliation data for audit report
                  const reconciliationData = await getReconcile();
                  // Navigate to audit report with data
                  navigate('/audit-report', { 
                    state: { 
                      reconciliationData, 
                      gstin: gstin || undefined 
                    } 
                  });
                } catch (e) {
                  // Fallback to download if audit report fails
                  try {
                    const blob = await getReportExport()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'report.json'
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                    URL.revokeObjectURL(url)
                  } catch (e) {
                    // ignore
                  }
                }
              }}
              className="px-3 py-2 bg-brand rounded"
            >
              Generate Audit Report
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Total ITC Claimed" value={k.invoices * 1000} />
            <KpiCard title="ITC At Risk" value={k.high_risk_invoices * 500} />
            <KpiCard title="Vendor Compliance Score" value={Math.round((1 - (k.high_risk_taxpayers / Math.max(k.taxpayers, 1))) * 100)} />
            <KpiCard title="Returns Filed" value={k.returns} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="md:col-span-2 card">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend}>
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#0ea5e9" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card flex items-center justify-center">
              <PieChart width={220} height={220}>
                <Pie dataKey="value" data={riskPie} cx={110} cy={110} outerRadius={90}>
                  {riskPie.map((_, i) => <Cell key={i} fill={colors[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <ComplianceGauge value={Math.round((1 - (k.high_risk_invoices / Math.max(k.invoices, 1))) * 100)} />
            <RiskHeatmap buckets={Object.entries(summary.clusters).slice(0, 8).map(([label, value]) => ({ label: `Cluster ${label}`, value: Number(value) }))} />
          </div>
        </AnimatedPage>
      </div>
    </div>
  )
}
