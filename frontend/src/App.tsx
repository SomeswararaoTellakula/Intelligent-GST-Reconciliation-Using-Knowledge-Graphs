import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Vendors from './pages/Vendors'
import Reconcile from './pages/Reconcile'
import InvoiceDetails from './pages/InvoiceDetails'
import RiskAnalysis from './pages/RiskAnalysis'
import AuditTrail from './pages/AuditTrail'
import AuditReport from './pages/AuditReport'
import Settings from './pages/Settings'
import SetupCompany from './pages/SetupCompany'
import UploadData from './pages/UploadData'
import OauthCallback from './pages/OauthCallback'
import RealtimeAnalysis from './pages/RealtimeAnalysis'
import SelectGstin from './pages/SelectGstin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/oauth/callback" element={<OauthCallback />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/select" element={<SelectGstin />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/reconcile" element={<Reconcile />} />
          <Route path="/invoice" element={<InvoiceDetails />} />
          <Route path="/risk" element={<RiskAnalysis />} />
          <Route path="/audit" element={<AuditTrail />} />
          <Route path="/audit-report" element={<AuditReport />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/setup" element={<SetupCompany />} />
          <Route path="/upload" element={<UploadData />} />
          <Route path="/analysis" element={<RealtimeAnalysis />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
