type Props = { title: string; value: number | string }
export default function KpiCard({ title, value }: Props) {
  return (
    <div className="card">
      <div className="text-sm text-gray-400">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  )
}
