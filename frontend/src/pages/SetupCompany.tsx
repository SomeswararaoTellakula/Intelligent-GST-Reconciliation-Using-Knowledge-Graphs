import AnimatedPage from '../components/AnimatedPage'
import Sidebar from '../components/Sidebar'
import { useState } from 'react'

export default function SetupCompany() {
  const [name, setName] = useState('')
  const [gstin, setGstin] = useState('')
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-4">
        <AnimatedPage>
          <div className="text-lg font-semibold mb-4">Setup Company</div>
          <div className="card grid gap-2 max-w-md">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Company Name" className="bg-gray-800 rounded px-3 py-2" />
            <input value={gstin} onChange={e => setGstin(e.target.value)} placeholder="GSTIN" className="bg-gray-800 rounded px-3 py-2" />
            <button className="px-3 py-2 bg-brand rounded">Save</button>
          </div>
        </AnimatedPage>
      </div>
    </div>
  )
}
