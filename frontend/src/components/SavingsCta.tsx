import { PiggyBank, ArrowRight } from 'lucide-react'
import type { Leak } from '../api'

/** Turns the analysis into a decision: cancel the flagged ones, save this much.
 *  Counts forgotten subs + the converting trial only — these don't overlap, so
 *  the running total never double-counts (duplicate pairs are already forgotten). */
export function SavingsCta({ leaks }: { leaks: Leak[] }) {
  const actionable = leaks.filter(l => l.type === 'forgotten' || l.type === 'trial')
  const total = actionable.reduce((s, l) => s + l.annual_impact, 0)
  const monthly = total / 12
  if (actionable.length === 0) return null

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0e3325] text-amber-300">
          <PiggyBank className="h-6 w-6" />
        </div>
        <div>
          <div className="text-lg font-extrabold text-[#11180f]">
            Cancel {actionable.length} flagged → save ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
          </div>
          <div className="text-sm text-slate-600">
            That's <strong>${monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}/month</strong> back in your pocket —
            forgotten subs, duplicates, and a converting trial.
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {actionable.slice(0, 3).map((l, i) => (
          <span key={i} className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-800">
            {l.title} +${l.annual_impact.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        ))}
        <span className="vault-dark-chip flex items-center gap-1 rounded-full bg-[#0e3325] px-3 py-1 text-xs font-semibold">
          review below <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  )
}
