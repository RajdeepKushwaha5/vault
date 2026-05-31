import { TrendingDown, AlertTriangle } from 'lucide-react'
import type { LeakSummary } from '../api'

export function HeroLeak({ summary }: { summary?: LeakSummary }) {
  const leak = summary?.annual_leak_usd ?? 0
  const soon = summary?.about_to_start_usd ?? 0
  const review = summary?.to_review_usd ?? 0
  const monthly = summary?.monthly_bleed_usd ?? 0

  return (
    <div className="vault-hero relative overflow-hidden rounded-3xl border border-emerald-900/30 bg-gradient-to-br from-[#0c2a1e] via-[#0e3325] to-[#08231a] p-8 text-white shadow-2xl">
      <div className="relative z-10 !text-white">
        <div className="vault-hero-kicker mb-2 flex items-center gap-2 text-sm font-medium">
          <TrendingDown className="h-4 w-4" />
          Money quietly leaving your accounts
        </div>
        <div className="flex items-end gap-3">
          <span className="vault-hero-amount text-6xl font-extrabold tracking-tight drop-shadow">
            ${leak.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="vault-hero-suffix mb-2 text-xl font-semibold">/ year on forgotten subscriptions</span>
        </div>
        <div className="vault-hero-meta mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span>≈ <strong>${monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> every month</span>
          <span>{summary?.forgotten_count ?? 0} subscriptions unused 60+ days</span>
          {review > 0 && (
            <span>+ ${review.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr worth reviewing</span>
          )}
          {soon > 0 && (
            <span className="vault-hero-warning flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              ${soon.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr trial about to start
            </span>
          )}
        </div>
        <div className="vault-hero-source mt-5 inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1 font-mono text-xs">
          vault.transactions × vault.receipts × vault.usage — joined locally by Coral
        </div>
      </div>
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
    </div>
  )
}
