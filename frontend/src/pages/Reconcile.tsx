import { useEffect, useState } from 'react'
import { getInvoiceTrace } from '../services/api'
import AnimatedPage from '../components/AnimatedPage'
import Sidebar from '../components/Sidebar'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { postWorkflowReconcile } from '../services/api'

export default function Reconcile() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const gstin = params.get('gstin') || ''
  const [invoiceId, setInvoiceId] = useState('')
  const [trace, setTrace] = useState<any>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (!invoiceId) { setError('Invoice ID required'); return }
    setLoading(true)
    const data = await getInvoiceTrace(invoiceId).catch(e => { setError(String(e)); return null })
    await postWorkflowReconcile({ gstin, invoice_id: invoiceId })
    setTrace(data)
    setLoading(false)
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-4">
        <AnimatedPage>
          <div className="text-lg font-semibold mb-2">Invoice Reconciliation</div>
          <div className="text-sm text-gray-400 mb-2">GSTIN: {gstin || '—'}</div>
          <div className="card grid gap-2 max-w-xl">
            <input value={invoiceId} onChange={e => setInvoiceId(e.target.value)} placeholder="Enter Invoice ID" className="bg-gray-800 rounded px-3 py-2" />
            <div className="flex gap-2">
              <button onClick={submit} className="px-3 py-2 bg-brand rounded">Submit</button>
              {trace && <button onClick={() => navigate(`/risk?gstin=${encodeURIComponent(gstin)}`)} className="px-3 py-2 bg-gray-700 rounded">Next</button>}
            </div>
            {loading && <div>Loading...</div>}
            {error && <div className="text-red-400">{error}</div>}
          </div>
          {trace && (
            <div className="card grid gap-2 mt-4">
              <div className="text-lg font-semibold">Trace</div>
              <div className="text-sm">Found: {String(trace.found)}</div>
              <div className="text-sm">Root cause: {(trace.root_cause || []).join(', ')}</div>
              <div className="text-sm">Explanation: {trace.explanation}</div>
            </div>
          )}
        </AnimatedPage>
      </div>
    </div>
  )
}
