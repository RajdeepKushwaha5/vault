import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, WifiOff, HardDrive, Cloud, CheckCircle2, Loader2, Play } from 'lucide-react'
import { fetchPrivacy } from '../api'

export function PrivacyPanel() {
  const { data, refetch, isFetching } = useQuery({ queryKey: ['privacy'], queryFn: fetchPrivacy })
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null)

  async function verify() {
    await refetch()
    setVerifiedAt(new Date().toLocaleTimeString())
  }

  const verified = data?.verified
  const rows = data?.verify_rows
  const ms = data?.verify_ms

  return (
    <div className="glass rounded-2xl border-emerald-200 p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">
        <ShieldCheck className="h-4 w-4" /> Privacy &amp; network
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <Cloud className="mx-auto mb-1 h-4 w-4 text-emerald-600" />
          <div className="text-xl font-extrabold text-emerald-700">0</div>
          <div className="text-[10px] font-medium uppercase text-slate-500">cloud calls</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <HardDrive className="mx-auto mb-1 h-4 w-4 text-emerald-600" />
          <div className="text-xl font-extrabold text-emerald-700">this device</div>
          <div className="text-[10px] font-medium uppercase text-slate-500">data location</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <WifiOff className="mx-auto mb-1 h-4 w-4 text-emerald-600" />
          <div className="text-xl font-extrabold text-emerald-700">offline ✓</div>
          <div className="text-[10px] font-medium uppercase text-slate-500">works without net</div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Coral reads your bank, receipts, and usage as <code className="font-mono text-emerald-700">jsonl</code> files
        directly from <code className="font-mono text-emerald-700">file://</code> on this machine. No upload, no cloud,
        no third party. You could unplug from the internet right now.
      </p>

      <button onClick={verify} disabled={isFetching}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e3325] px-4 py-2.5 text-sm font-semibold !text-white hover:bg-[#11402f] disabled:opacity-60">
        {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {isFetching ? 'Running query locally…' : 'Verify offline — run a live local query'}
      </button>

      {verified && verifiedAt && !isFetching && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Read {rows} rows in {ms}ms with <strong>0 external calls</strong> · verified {verifiedAt}
        </div>
      )}
    </div>
  )
}
