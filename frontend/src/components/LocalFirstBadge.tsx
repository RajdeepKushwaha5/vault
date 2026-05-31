import { ShieldCheck, WifiOff } from 'lucide-react'

/** The trust story, always visible: your data never leaves the machine. */
export function LocalFirstBadge() {
  return (
    <div className="flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
      <ShieldCheck className="h-4 w-4" />
      <span>100% local — 0 bytes left this device</span>
      <WifiOff className="h-3.5 w-3.5 opacity-60" />
    </div>
  )
}
