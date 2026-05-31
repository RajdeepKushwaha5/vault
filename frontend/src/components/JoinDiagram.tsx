import { Landmark, Mail, Activity, ArrowRight, Database } from 'lucide-react'

/** The "impossible without Coral" moment — three local files into one SQL query. */
export function JoinDiagram() {
  const files = [
    { icon: Landmark, label: 'transactions.jsonl', sub: 'your bank', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { icon: Mail,     label: 'receipts.jsonl',     sub: 'your inbox', color: 'text-sky-700 bg-sky-50 border-sky-200' },
    { icon: Activity, label: 'usage.jsonl',        sub: 'your activity', color: 'text-violet-700 bg-violet-50 border-violet-200' },
  ]
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <Database className="h-4 w-4" /> One query, three sources
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex flex-col gap-2">
          {files.map(f => {
            const Icon = f.icon
            return (
              <div key={f.label} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${f.color}`}>
                <Icon className="h-4 w-4 shrink-0" />
                <div className="leading-tight">
                  <div className="font-mono text-xs font-semibold">{f.label}</div>
                  <div className="text-[10px] opacity-70">{f.sub}</div>
                </div>
              </div>
            )
          })}
        </div>
        <ArrowRight className="h-6 w-6 shrink-0 text-slate-400" />
        <div className="vault-coral-node rounded-xl border border-[#0e3325] bg-[#0e3325] px-4 py-3 text-center">
          <Database className="mx-auto mb-1 h-5 w-5" />
          <div className="text-sm font-bold">Coral</div>
          <div className="font-mono text-[10px] text-emerald-200">one local SQL JOIN</div>
        </div>
        <ArrowRight className="h-6 w-6 shrink-0 text-slate-400" />
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center">
          <div className="text-lg font-extrabold text-amber-700">$ leaks</div>
          <div className="text-[10px] text-slate-500">found</div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        No single app connects spending, sign-ups, and usage. Coral joins all three on your machine — impossible without it.
      </p>
    </div>
  )
}
