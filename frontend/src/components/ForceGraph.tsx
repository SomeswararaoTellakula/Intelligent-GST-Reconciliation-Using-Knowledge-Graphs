import ForceGraph2D from 'react-force-graph-2d'

type Node = { id: string; label: string; properties: any }
type Link = { source: string; target: string; type: string }

export default function ForceGraph({ nodes, links }: { nodes: Node[]; links: Link[] }) {
  return (
    <div className="card">
      <ForceGraph2D
        graphData={{ nodes, links }}
        nodeLabel={(n: any) => `${n.id} (${n.properties?.risk_band || ''})`}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const label = node.id
          const band = node.properties?.risk_band
          const color = band === 'HIGH' ? '#ef4444' : band === 'MEDIUM' ? '#f59e0b' : '#22c55e'
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(node.x!, node.y!, 6, 0, 2 * Math.PI, false)
          ctx.fill()
          ctx.font = `${12 / globalScale}px Sans-Serif`
          ctx.fillStyle = '#e5e7eb'
          ctx.fillText(label, node.x! + 8, node.y! + 2)
        }}
        linkColor={() => '#3b82f6'}
        backgroundColor="#111827"
      />
    </div>
  )
}
