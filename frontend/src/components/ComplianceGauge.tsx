import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'

export default function ComplianceGauge({ value = 70 }: { value?: number }) {
  const data = [{ name: 'Compliance', value }]
  return (
    <div className="card flex items-center justify-center">
      <RadialBarChart width={200} height={200} cx={100} cy={100} innerRadius={60} outerRadius={80} barSize={10} data={data}>
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar minAngle={15} background clockWise dataKey="value" fill="#22c55e" />
      </RadialBarChart>
      <div className="absolute text-2xl">{value}%</div>
    </div>
  )
}
