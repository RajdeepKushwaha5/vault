import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Vault as VaultIcon, RefreshCw, FileText, Smartphone } from 'lucide-react'
import { fetchLeaks } from './api'
import { LocalFirstBadge } from './components/LocalFirstBadge'
import { HeroLeak } from './components/HeroLeak'
import { LeaksFeed } from './components/LeaksFeed'
import { SpendMap } from './components/SpendMap'
import { AskVault } from './components/AskVault'
import { PrivacyPanel } from './components/PrivacyPanel'
import { JoinDiagram } from './components/JoinDiagram'
import { SavingsCta } from './components/SavingsCta'
import { CoralProofPanel } from './components/CoralProof'

export default function App() {
  const [showProofs, setShowProofs] = useState(false)
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['leaks'],
    queryFn: fetchLeaks,
    staleTime: 60_000,
  })

  const summary = data?.summary
  const leaks = data?.leaks ?? []
  const proofs = data?.proofs ?? []

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0e3325] text-amber-300">
            <VaultIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#11180f]">Vault</h1>
            <p className="text-xs text-slate-500">The money agent that never leaves your laptop</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LocalFirstBadge />
          <button onClick={() => refetch()} disabled={isFetching}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="glass rounded-3xl p-12 text-center text-slate-500">
          <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />
          Joining your bank, inbox, and usage locally through Coral…
        </div>
      ) : (
        <div className="space-y-6">
          <HeroLeak summary={summary} />

          <JoinDiagram />

          <SavingsCta leaks={leaks} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <LeaksFeed leaks={leaks} />
            </div>
            <div className="space-y-6 lg:col-span-2">
              <PrivacyPanel />
              <SpendMap />
              <AskVault />
            </div>
          </div>

          {/* Coral proof + iPhone hint */}
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setShowProofs(s => !s)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              <FileText className="h-3.5 w-3.5" /> {showProofs ? 'Hide' : 'Show'} Coral SQL proofs ({proofs.length})
            </button>
            <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
              <Smartphone className="h-3.5 w-3.5" /> iPhone brief: <code className="font-mono">GET /api/iphone/brief</code>
            </span>
            <span className="text-xs text-slate-400">
              {summary?.sources_joined?.join(' × ')} — joined locally, nothing uploaded.
            </span>
          </div>

          {showProofs && proofs.length > 0 && <CoralProofPanel proofs={proofs} />}
        </div>
      )}
    </div>
  )
}
