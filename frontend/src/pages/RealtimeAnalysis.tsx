import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import AnimatedPage from '../components/AnimatedPage'
import { postModelPredict } from '../services/api'
import useDebouncedEffect from '../hooks/useDebouncedEffect'

export default function RealtimeAnalysis() {
  const [taxAmount, setTaxAmount] = useState<number>(10000)
  const [claimed, setClaimed] = useState<number>(9500)
  const [pagerank, setPagerank] = useState<number>(0.02)
  const [degree, setDegree] = useState<number>(3)
  const [compliance, setCompliance] = useState<number>(0.8)
  const [result, setResult] = useState<any>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useDebouncedEffect(() => {
    setLoading(true)
    setError('')
    postModelPredict({
      tax_amount: taxAmount,
      claimed_tax_amount: claimed,
      pagerank_score: pagerank,
      degree_centrality: degree,
      compliance_score: compliance
    })
      .then(setResult)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [taxAmount, claimed, pagerank, degree, compliance], 400)

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-4">
        <AnimatedPage>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card grid gap-2">
              <div className="text-lg font-semibold">Realtime ML Analysis</div>
              <label className="grid gap-1">
                <span>Tax Amount</span>
                <input type="number" value={taxAmount} onChange={e => setTaxAmount(Number(e.target.value))} className="bg-gray-800 rounded px-3 py-2" />
              </label>
              <label className="grid gap-1">
                <span>Claimed Tax Amount</span>
                <input type="number" value={claimed} onChange={e => setClaimed(Number(e.target.value))} className="bg-gray-800 rounded px-3 py-2" />
              </label>
              <label className="grid gap-1">
                <span>Pagerank Score</span>
                <input type="number" step="0.001" value={pagerank} onChange={e => setPagerank(Number(e.target.value))} className="bg-gray-800 rounded px-3 py-2" />
              </label>
              <label className="grid gap-1">
                <span>Degree Centrality</span>
                <input type="number" value={degree} onChange={e => setDegree(Number(e.target.value))} className="bg-gray-800 rounded px-3 py-2" />
              </label>
              <label className="grid gap-1">
                <span>Compliance Score</span>
                <input type="number" step="0.01" value={compliance} onChange={e => setCompliance(Number(e.target.value))} className="bg-gray-800 rounded px-3 py-2" />
              </label>
              {loading && <div>Predicting...</div>}
              {error && <div className="text-red-400">{error}</div>}
            </div>
            <div className="card grid gap-2">
              <div className="text-lg font-semibold">Result</div>
              {result ? (
                <div className="text-2xl">{result.risk_band}</div>
              ) : (
                <div className="text-sm text-gray-400">Adjust inputs to see results</div>
              )}
            </div>
          </div>
        </AnimatedPage>
      </div>
    </div>
  )
}
