import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AnimatedPage from '../components/AnimatedPage'
import Sidebar from '../components/Sidebar'
import { postWorkflowStart } from '../services/api'

const samples = {
  LOW: ['33AAACA1234A1Z9'],
  MEDIUM: ['07BBBCC2345D1Z7'],
  HIGH: ['27ABCDE1234F1Z5']
}

export default function StartFlow() {
  const [selected, setSelected] = useState<{ band: 'LOW' | 'MEDIUM' | 'HIGH'; gstin: string } | null>(null)
  const navigate = useNavigate()
  const submit = async () => {
    if (!selected) return
    await postWorkflowStart({ gstin_band: selected.band, gstin: selected.gstin })
    navigate(`/reconcile?gstin=${encodeURIComponent(selected.gstin)}`)
  }
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-4">
        <AnimatedPage>
          <div className="text-lg font-semibold mb-3">Choose GSTIN by Risk Band</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['LOW', 'MEDIUM', 'HIGH'] as const).map((band) => (
              <button key={band} onClick={() => setSelected({ band, gstin: samples[band][0] })} className={`card text-left ${selected?.band === band ? 'ring-2 ring-brand' : ''}`}>
                <div className="text-sm text-gray-400">{band}</div>
                <div className="text-xl font-semibold">{samples[band][0]}</div>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <button onClick={submit} className="px-3 py-2 bg-brand rounded">Submit</button>
          </div>
        </AnimatedPage>
      </div>
    </div>
  )
}
