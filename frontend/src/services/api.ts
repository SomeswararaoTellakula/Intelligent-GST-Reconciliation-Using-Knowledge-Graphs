import axios from 'axios'

export const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8002'
const api = axios.create({ baseURL: apiBase, timeout: 10000 })

import { useAuth } from '../store/auth'
api.interceptors.request.use((config) => {
  try {
    const token = useAuth.getState().token
    if (token) {
      (config as any).headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` }
    }
  } catch {}
  return config
})
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      try { useAuth.getState().logout() } catch {}
      if (typeof window !== 'undefined') window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const getDashboardSummary = (params?: any) => api.get('/dashboard-summary', { params }).then(r => r.data)
export const getVendorRisk = (gstin: string) => api.get(`/vendor-risk/${gstin}`).then(r => r.data)
export const getVendorSamples = () => api.get('/vendor-samples').then(r => r.data)
export const getInvoiceTrace = (invoice_id: string) => api.get(`/invoice-trace/${invoice_id}`).then(r => r.data)
export const getReconcile = () => api.get('/reconcile').then(r => r.data)
export const getGraphData = () => api.get('/graph-data').then(r => r.data)
export const postSimulateRisk = (payload: any) => api.post('/simulate-risk', payload).then(r => r.data)
export const postModelTrain = () => api.post('/model/train').then(r => r.data)
export const postModelPredict = (payload: any) => api.post('/model/predict', payload).then(r => r.data)
export const postWorkflowStart = (payload: any) => api.post('/workflow/start', payload).then(r => r.data)
export const postWorkflowReconcile = (payload: any) => api.post('/workflow/reconcile', payload).then(r => r.data)
export const postWorkflowRiskUpdate = (payload: any) => api.post('/workflow/risk-update', payload).then(r => r.data)
export const getReportExport = () => api.get('/report/export', { responseType: 'blob' }).then(r => r.data)

export default api
