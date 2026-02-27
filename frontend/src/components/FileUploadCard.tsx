import { useState } from 'react'
import GlassCard from './GlassCard'

export default function FileUploadCard({ title }: { title: string }) {
  const [progress, setProgress] = useState(0)
  const [drag, setDrag] = useState(false)

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files?.[0]
    if (file) simulateUpload()
  }
  const simulateUpload = () => {
    setProgress(0)
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(id); return 100 }
        return p + 5
      })
    }, 100)
  }
  return (
    <GlassCard className="grid gap-2">
      <div className="text-sm text-gray-400">{title}</div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onDragEnter={() => setDrag(true)}
        onDragLeave={() => setDrag(false)}
        className={`border-2 border-dashed rounded-xl p-6 ${drag ? 'border-brand' : 'border-gray-700'}`}
      >
        <div className="text-center">Drag & Drop or Click to Upload</div>
      </div>
      <div className="h-2 bg-gray-700 rounded">
        <div className="h-2 bg-brand rounded" style={{ width: `${progress}%` }} />
      </div>
    </GlassCard>
  )
}
