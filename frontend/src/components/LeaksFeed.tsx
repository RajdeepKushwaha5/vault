import { useState, useEffect } from 'react'
import {
  AlertTriangle, ArrowUpRight, Ban, Clock, Copy, Layers, Repeat, CalendarClock, Mail, X, Search,
} from 'lucide-react'
import { draftCancel, type Leak } from '../api'

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  forgotten:  { label: 'Forgotten',     icon: Ban,          color: 'text-red-600 bg-red-50 border-red-200' },
  price_hike: { label: 'Price hike',    icon: ArrowUpRight, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  duplicate:  { label: 'Duplicate',     icon: Layers,       color: 'text-violet-600 bg-violet-50 border-violet-200' },
  trial:      { label: 'Trial soon',    icon: Clock,        color: 'text-amber-600 bg-amber-50 border-amber-200' },
  annual:     { label: 'Annual',        icon: CalendarClock,color: 'text-sky-600 bg-sky-50 border-sky-200' },
  review:     { label: 'Review',        icon: Search,       color: 'text-slate-600 bg-slate-100 border-slate-200' },
}

function CancelModal({ leak, onClose }: { leak: Leak; onClose: () => void }) {
  const [draft, setDraft] = useState<string>('Generating…')
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    draftCancel(leak.title, leak.monthly, leak.cancel_url || undefined)
      .then(d => { setDraft(d.draft); setUrl(d.cancel_url) })
      .catch(() => setDraft('Could not generate draft — is the backend running?'))
  }, [leak])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-[#11180f]"><Mail className="h-5 w-5" /> Cancel {leak.title}</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{draft}</pre>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">Draft only — Vault never sends or cancels anything.</span>
          <div className="flex gap-2">
            {url && <a href={url} target="_blank" rel="noreferrer" className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Open cancel page</a>}
            <button onClick={() => { navigator.clipboard.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0e3325] px-3 py-1.5 text-sm font-semibold !text-white hover:bg-[#11402f]">
              <Copy className="h-4 w-4" /> {copied ? 'Copied' : 'Copy email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LeaksFeed({ leaks }: { leaks: Leak[] }) {
  const [cancelTarget, setCancelTarget] = useState<Leak | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <Repeat className="h-4 w-4" /> Leaks found — ranked by yearly impact
      </div>
      {leaks.map((leak, i) => {
        const meta = TYPE_META[leak.type] ?? TYPE_META.forgotten
        const Icon = meta.icon
        return (
          <div key={i} className="glass flex items-center gap-4 rounded-2xl p-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${meta.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold text-[#11180f]">{leak.title}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${meta.color}`}>{meta.label}</span>
              </div>
              <p className="truncate text-sm text-slate-500">{leak.detail}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-lg font-bold text-red-600">${leak.annual_impact.toLocaleString(undefined, { maximumFractionDigits: 0 })}<span className="text-xs font-medium text-slate-400">/yr</span></div>
              <div className="text-xs text-slate-400">${leak.monthly.toFixed(2)}/mo</div>
            </div>
            <button onClick={() => setCancelTarget(leak)}
                    className="shrink-0 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
              Draft cancel
            </button>
          </div>
        )
      })}
      {leaks.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center text-slate-500">
          <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-amber-500" />
          No leaks loaded yet — start the backend and refresh.
        </div>
      )}
      {cancelTarget && <CancelModal leak={cancelTarget} onClose={() => setCancelTarget(null)} />}
    </div>
  )
}
