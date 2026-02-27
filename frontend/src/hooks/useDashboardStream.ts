import { useEffect } from 'react'
import { apiBase } from '../services/api'

export default function useDashboardStream(onData: (data: any) => void) {
  useEffect(() => {
    const wsUrl = apiBase.replace('http', 'ws') + '/ws/dashboard'
    const ws = new WebSocket(wsUrl)
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        onData(data)
      } catch {}
    }
    return () => {
      ws.close()
    }
  }, [onData])
}
