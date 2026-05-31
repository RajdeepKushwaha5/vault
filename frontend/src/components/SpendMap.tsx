import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { PieChart as PieIcon } from 'lucide-react'
import { fetchSpendMap } from '../api'

const COLORS = ['#0e3325', '#14b8a6', '#f59e0b', '#6366f1', '#ef4444', '#22c55e', '#0ea5e9', '#a855f7', '#f97316', '#64748b']

export function SpendMap() {
  const { data } = useQuery({ queryKey: ['spend-map'], queryFn: fetchSpendMap })
  const cats: any[] = data?.categories ?? []
  const chart = cats.map((c) => ({ name: c.category, value: c.spent }))

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <PieIcon className="h-4 w-4" /> Where your money goes
      </div>
      {chart.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={chart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
              {chart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="py-12 text-center text-sm text-slate-400">Loading spend map…</div>
      )}
    </div>
  )
}
