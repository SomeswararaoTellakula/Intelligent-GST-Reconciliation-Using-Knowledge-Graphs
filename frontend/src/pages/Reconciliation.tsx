import { useEffect, useState } from 'react'
import { getReconcile } from '../services/api'
import { ReconciliationModel, ReconcileItem } from '../models/ReconciliationModel'

function exportCSV(model: ReconciliationModel) {
  const csv = model.exportToCSV()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'reconciliation_analysis.csv'
  a.click()
}

function exportJSON(model: ReconciliationModel) {
  const json = model.exportToJSON()
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'reconciliation_analysis.json'
  a.click()
}

export default function Reconciliation() {
  const [model, setModel] = useState<ReconciliationModel>(new ReconciliationModel())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showStatistics, setShowStatistics] = useState(false)

  useEffect(() => {
    setLoading(true)
    getReconcile()
      .then((items: ReconcileItem[]) => {
        const reconciliationModel = new ReconciliationModel(items)
        setModel(reconciliationModel)
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div className="text-red-400">{error}</div>

  const items = model.getAllItems()
  const statistics = model.getStatistics()
  const rootCauseAnalysis = model.getRootCauseAnalysis()
  const topSellers = model.getTopSellers(5)
  const topBuyers = model.getTopBuyers(5)

  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold">Reconciliation Analysis</div>
        <div className="flex gap-2">
          <button 
            className="px-3 py-2 bg-gray-700 rounded" 
            onClick={() => setShowStatistics(!showStatistics)}
          >
            {showStatistics ? 'Hide Stats' : 'Show Stats'}
          </button>
          <button 
            className="px-3 py-2 bg-brand rounded" 
            onClick={() => exportCSV(model)}
          >
            CSV Export
          </button>
          <button 
            className="px-3 py-2 bg-green-600 rounded" 
            onClick={() => exportJSON(model)}
          >
            JSON Export
          </button>
        </div>
      </div>

      {showStatistics && (
        <div className="card grid gap-4">
          <div className="text-lg font-semibold">Reconciliation Statistics</div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-800 rounded">
              <div className="text-2xl font-bold">{statistics.total}</div>
              <div className="text-sm text-gray-400">Total Mismatches</div>
            </div>
            <div className="text-center p-3 bg-green-800/30 rounded">
              <div className="text-2xl font-bold">{statistics.lowRisk}</div>
              <div className="text-sm text-gray-400">Low Risk</div>
            </div>
            <div className="text-center p-3 bg-yellow-800/30 rounded">
              <div className="text-2xl font-bold">{statistics.mediumRisk}</div>
              <div className="text-sm text-gray-400">Medium Risk</div>
            </div>
            <div className="text-center p-3 bg-red-800/30 rounded">
              <div className="text-2xl font-bold">{statistics.highRisk}</div>
              <div className="text-sm text-gray-400">High Risk</div>
            </div>
          </div>

          {rootCauseAnalysis.length > 0 && (
            <div>
              <div className="text-md font-semibold mb-2">Root Cause Analysis</div>
              <div className="grid gap-2">
                {rootCauseAnalysis.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.cause}</span>
                    <span className="text-gray-400">{item.count} ({item.percentage.toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topSellers.length > 0 && (
            <div>
              <div className="text-md font-semibold mb-2">Top Sellers with Issues</div>
              <div className="grid gap-1">
                {topSellers.map((seller, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{seller.seller}</span>
                    <span className="text-gray-400">{seller.count} issues</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topBuyers.length > 0 && (
            <div>
              <div className="text-md font-semibold mb-2">Top Buyers with Issues</div>
              <div className="grid gap-1">
                {topBuyers.map((buyer, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{buyer.buyer}</span>
                    <span className="text-gray-400">{buyer.count} issues</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-2">
        {items.map((item, idx) => (
          <div key={idx} className="card flex justify-between">
            <div>
              <div className="text-sm">Seller: {item.seller}</div>
              <div className="text-sm">Buyer: {item.buyer ?? '—'}</div>
            </div>
            <div>
              <div className="text-sm">Invoice: {item.invoice_id}</div>
              <div className="text-sm">
                Root: {(item.root_cause || []).join(', ')}
                {item.risk_band && (
                  <span className={`ml-2 px-1 py-0.5 rounded text-xs ${
                    item.risk_band === 'HIGH' ? 'bg-red-600' :
                    item.risk_band === 'MEDIUM' ? 'bg-yellow-600' :
                    'bg-green-600'
                  }`}>
                    {item.risk_band}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
