import Sidebar from '../components/Sidebar'
import AnimatedPage from '../components/AnimatedPage'
import FileUploadCard from '../components/FileUploadCard'

export default function UploadData() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-4">
        <AnimatedPage>
          <div className="text-lg font-semibold mb-4">Upload GST Data</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUploadCard title="GSTR-1" />
            <FileUploadCard title="GSTR-2B" />
            <FileUploadCard title="Purchase Register" />
            <FileUploadCard title="e-Invoice" />
            <FileUploadCard title="e-Way Bill" />
          </div>
        </AnimatedPage>
      </div>
    </div>
  )
}
