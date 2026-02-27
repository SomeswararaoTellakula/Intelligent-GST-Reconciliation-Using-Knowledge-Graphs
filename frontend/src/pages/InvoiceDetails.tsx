import { useState } from 'react'
import { getInvoiceTrace } from '../services/api'
import AnimatedPage from '../components/AnimatedPage'
import Sidebar from '../components/Sidebar'
import { motion } from 'framer-motion'

export default function InvoiceDetails() {
  const [invoiceId, setInvoiceId] = useState('')
  const [data, setData] = useState<any>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetch = () => {
    setError('')
    if (!invoiceId) { setError('Invoice ID required'); return }
    setLoading(true)
    getInvoiceTrace(invoiceId).then(setData).catch(e => setError(String(e))).finally(() => setLoading(false))
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-4">
        <AnimatedPage>
          <div className="card flex gap-2 items-center">
            <input value={invoiceId} onChange={e => setInvoiceId(e.target.value)} placeholder="Enter Invoice ID" className="bg-gray-700 rounded px-3 py-2 w-64" />
            <button onClick={fetch} className="px-3 py-2 bg-brand rounded">Trace</button>
            {loading && <span>Loading...</span>}
            {error && <span className="text-red-400">{error}</span>}
          </div>
          {data && data.found && (
            <div className="card grid gap-2 mt-4">
              <div className="text-lg font-semibold">Trace</div>
              <div className="flex flex-wrap gap-2">
                {data.path.map((p: any, idx: number) => (
                  <motion.div key={idx} className="bg-gray-700 px-3 py-2 rounded"
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}>
                    <div className="text-xs text-gray-400">{p.type}</div>
                    <div className="text-sm">{p.gstin || p.invoice_id || p.return_id}</div>
                  </motion.div>
                ))}
              </div>
              <div className="text-sm">Root cause: {data.root_cause.join(', ')}</div>
              <div className="text-sm">Explanation: {data.explanation}</div>
            </div>
          )}
        </AnimatedPage>
      </div>
    </div>
  )
}
