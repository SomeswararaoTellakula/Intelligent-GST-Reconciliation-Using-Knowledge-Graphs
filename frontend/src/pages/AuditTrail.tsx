import AnimatedPage from '../components/AnimatedPage'
import Sidebar from '../components/Sidebar'

export default function AuditTrail() {
  const items: any[] = []
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-4">
        <AnimatedPage>
          <div className="text-lg font-semibold mb-2">Audit Trail</div>
          <div className="text-sm text-gray-400">No entries available</div>
        </AnimatedPage>
      </div>
    </div>
  )
}
