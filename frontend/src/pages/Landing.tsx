import Navbar from '../components/Navbar'
import AnimatedPage from '../components/AnimatedPage'
import GlassCard from '../components/GlassCard'
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f1b2e] to-[#0b1220] text-gray-100">
      <Navbar />
      <AnimatedPage>
        <section className="px-6 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-500">GST Graph Intelligence</h1>
          <p className="mt-4 text-gray-300 max-w-2xl mx-auto">Knowledge Graph driven GST reconciliation, risk analytics, and vendor intelligence for finance teams.</p>
          <div className="mt-6 flex justify-center gap-4">
            <Link to="/login" className="px-4 py-2 rounded bg-gray-800">Login</Link>
            <Link to="/signup" className="px-4 py-2 rounded bg-brand">Get Started</Link>
          </div>
        </section>
        <section className="px-6 pb-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { t: 'Graph-based Reconciliation', s: 'Match across returns, invoices, and vendors' },
            { t: 'Risk Intelligence', s: 'Detect high-risk vendors and invoices' },
            { t: 'Audit Trail', s: 'Explain every anomaly with context' }
          ].map((f, i) => (
            <GlassCard key={i} className="transition-transform hover:translate-y-[-2px]">
              <div className="text-lg font-semibold">{f.t}</div>
              <div className="text-sm text-gray-300 mt-1">{f.s}</div>
            </GlassCard>
          ))}
        </section>
      </AnimatedPage>
    </div>
  )
}
