import { useState } from 'react'
import { Sparkles, Send, Loader2 } from 'lucide-react'
import { askVault } from '../api'
import { CoralProofPanel, type CoralProof } from './CoralProof'

const SUGGESTIONS = [
  'What should I cancel first?',
  'Which subscriptions am I not using?',
  'How much am I wasting per month?',
]

export function AskVault() {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState('')
  const [proofs, setProofs] = useState<CoralProof[]>([])
  const [loading, setLoading] = useState(false)

  async function ask(question: string) {
    if (!question.trim()) return
    setLoading(true); setAnswer(''); setProofs([])
    try {
      const res = await askVault(question)
      setAnswer(res.answer)
      setProofs(res.proofs || [])
    } catch {
      setAnswer('Could not reach Vault — is the backend running on :8002?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <Sparkles className="h-4 w-4" /> Ask Vault
      </div>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask(q)}
          placeholder="Ask about your money…"
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
        />
        <button onClick={() => ask(q)} disabled={loading}
                className="flex items-center gap-1.5 rounded-xl bg-[#0e3325] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#11402f] disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => { setQ(s); ask(s) }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-emerald-300 hover:text-emerald-700">
            {s}
          </button>
        ))}
      </div>
      {answer && (
        <div className="mt-4 whitespace-pre-wrap rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm leading-relaxed text-slate-700">
          {answer}
        </div>
      )}
      {proofs.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Answered from live Coral SQL — not from memory
          </div>
          <CoralProofPanel proofs={proofs} title="Coral SQL behind this answer" />
        </div>
      )}
    </div>
  )
}
