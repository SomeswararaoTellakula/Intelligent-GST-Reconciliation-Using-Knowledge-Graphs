import AnimatedPage from '../components/AnimatedPage'
import Sidebar from '../components/Sidebar'
import ThemeToggle from '../components/ThemeToggle'
import { useState } from 'react'
import { postModelTrain, postModelPredict } from '../services/api'

export default function Settings() {
  const [trainStatus, setTrainStatus] = useState<string>('')
  const [predictOut, setPredictOut] = useState<any>()
  const triggerTrain = async () => {
    setTrainStatus('Training...')
    try {
      const res = await postModelTrain()
      setTrainStatus(`Trained: ${res.status}`)
    } catch (e: any) {
      setTrainStatus(`Error: ${String(e)}`)
    }
  }
  const samplePredict = async () => {
    const res = await postModelPredict({ tax_amount: 10000, claimed_tax_amount: 9500, pagerank_score: 0.02, degree_centrality: 3, compliance_score: 0.8 })
    setPredictOut(res)
  }
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-4">
        <AnimatedPage>
          <div className="text-lg font-semibold mb-4">Settings</div>
          <div className="card flex items-center gap-3">
            <div>Theme</div>
            <ThemeToggle />
          </div>
          <div className="card mt-4 grid gap-2">
            <div className="font-semibold">Model</div>
            <div className="flex gap-2">
              <button onClick={triggerTrain} className="px-3 py-2 bg-brand rounded">Train from Excel</button>
              <button onClick={samplePredict} className="px-3 py-2 bg-gray-700 rounded">Sample Predict</button>
            </div>
            <div className="text-sm">{trainStatus}</div>
            {predictOut && <pre className="text-xs">{JSON.stringify(predictOut, null, 2)}</pre>}
          </div>
        </AnimatedPage>
      </div>
    </div>
  )
}
