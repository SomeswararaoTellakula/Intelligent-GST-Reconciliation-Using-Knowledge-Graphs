import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import AnimatedPage from '../components/AnimatedPage'
import { useNavigate } from 'react-router-dom'
import { postWorkflowStart, getVendorRisk, getVendorSamples } from '../services/api'

export default function SelectGstin() {
  const navigate = useNavigate()
  const [gstin, setGstin] = useState('')
  const [band, setBand] = useState<'LOW' | 'MEDIUM' | 'HIGH' | null>(null)
  const [samples, setSamples] = useState<{ low?: string | null, medium?: string | null, high?: string | null }>({})
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [proceeding, setProceeding] = useState(false)

  const valid = (v: string) => /^[A-Z0-9]{15}$/i.test(v)

  const check = async (value?: string) => {
    setError('')
    const g = (value ?? gstin).trim()
    if (!valid(g)) { setError('Enter a valid 15-character GSTIN'); return }
    setChecking(true)
    try {
      const info = await getVendorRisk(g)
      const rb = (info?.risk_band || 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH'
      setBand(rb)
    } catch (e: any) {
      setError(String(e))
    } finally {
      setChecking(false)
    }
  }

  const proceed = async () => {
    setError('')
    if (!valid(gstin)) { setError('Enter a valid 15-character GSTIN'); return }
    setProceeding(true)
    try {
      await postWorkflowStart({ gstin, band: band ?? 'LOW' })
      navigate(`/reconcile?gstin=${encodeURIComponent(gstin)}`)
    } catch (e: any) {
      setError(String(e))
    } finally {
      setProceeding(false)
    }
  }

  useEffect(() => {
    getVendorSamples().then(setSamples).catch(() => {})
  }, [])

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-4">
        <AnimatedPage>
          <div className="text-xl font-semibold mb-3">Check GSTIN Risk Band</div>
          <div className="card grid gap-3 max-w-2xl">
            <div className="flex gap-2 flex-wrap">
              {samples.low && <button className="px-2 py-1 bg-gray-800 rounded text-xs" onClick={() => { setGstin(samples.low || ''); check(samples.low || ''); }}>Use Sample Low</button>}
              {samples.medium && <button className="px-2 py-1 bg-gray-800 rounded text-xs" onClick={() => { setGstin(samples.medium || ''); check(samples.medium || ''); }}>Use Sample Medium</button>}
              {samples.high && <button className="px-2 py-1 bg-gray-800 rounded text-xs" onClick={() => { setGstin(samples.high || ''); check(samples.high || ''); }}>Use Sample High</button>}
            </div>
            <div className="flex gap-2 items-center">
              <input
                value={gstin}
                onChange={e => setGstin(e.target.value)}
                placeholder="Enter GSTIN"
                className="bg-gray-800 rounded px-3 py-2 flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') check() }}
              />
              <button onClick={() => check()} disabled={checking} className="px-3 py-2 bg-brand rounded disabled:opacity-50">
                {checking ? 'Checking…' : 'Check'}
              </button>
              <button onClick={proceed} disabled={!band || proceeding} className="px-3 py-2 bg-gray-700 rounded disabled:opacity-50">
                {proceeding ? 'Proceeding…' : 'Proceed'}
              </button>
            </div>
            {band && (
              <div className="text-sm">
                Risk Band: <span className={
                  band === 'LOW' ? 'text-emerald-400' : band === 'MEDIUM' ? 'text-amber-400' : 'text-rose-400'
                }>{band}</span>
              </div>
            )}
            {error && <div className="text-red-400 text-sm">{error}</div>}
          </div>
        </AnimatedPage>
      </div>
    </div>
  )
}
