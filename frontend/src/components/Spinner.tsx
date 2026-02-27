export default function Spinner({ size = 20 }: { size?: number }) {
  return <div className="animate-spin rounded-full border-2 border-t-transparent border-brand" style={{ width: size, height: size }} />
}
