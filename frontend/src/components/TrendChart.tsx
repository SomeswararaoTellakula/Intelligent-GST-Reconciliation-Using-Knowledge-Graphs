import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function TrendChart({ data }: { data: any[] }) {
  return (
    <div className="card">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <XAxis dataKey="date" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#0ea5e9" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
