import { useState } from 'react'
import { CheckCircle, Clipboard, Database, Gauge, GitBranch, Rows3, ShieldCheck, Table2, Terminal, XCircle } from 'lucide-react'
import { SourceLogo } from './BrandMarks'

export interface CoralProof {
  name: string
  sql: string
  sources: string[]
  cross_source: boolean
  row_count: number
  duration_ms: number
  status: 'ok' | 'error' | 'running'
  error?: string | null
  failed?: boolean
  error_type?: string | null
  mode?: string
  columns?: string[]
  sample_rows?: Record<string, unknown>[]
  span_count?: number
  trace_duration_ms?: number
  spans_summary?: Array<{ name: string; count: number }>
  trace_id?: string
}

export interface DraftAction {
  id: string
  title: string
  target: string
  status: string
  body: string
}

const KEYWORDS = new Set([
  'SELECT', 'FROM', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR',
  'WHERE', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'AS', 'WITH', 'COUNT', 'DISTINCT',
  'CAST', 'INTERVAL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IN', 'IS', 'NOT',
  'NULL', 'DESC', 'ASC', 'COALESCE',
])

function tokenClass(token: string) {
  const upper = token.toUpperCase()
  if (token.startsWith('--')) return 'text-emerald-500/70'
  if (/^'.*'$/.test(token)) return 'text-emerald-700'
  if (/^\d/.test(token)) return 'text-amber-600'
  if (KEYWORDS.has(upper)) return 'text-teal-700 font-bold'
  if (/^[(),.*=<>+/-]+$/.test(token)) return 'text-emerald-400'
  if (/^[a-z_]+\.[a-z_]/i.test(token)) return 'text-sky-600 font-medium'
  return 'text-emerald-950'
}

function HighlightedLine({ line, lineNo }: { line: string; lineNo: number }) {
  const parts = line.split(/(--.*$|'[^']*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_.]*\b|[(),.*=<>+/-])/g)
  return (
    <div className="table-row">
      <span className="table-cell select-none pr-4 text-right text-emerald-300">{lineNo}</span>
      <span className="table-cell whitespace-pre">
        {parts.map((part, i) => part ? <span key={i} className={tokenClass(part)}>{part}</span> : null)}
      </span>
    </div>
  )
}

export function SqlBlock({ sql }: { sql: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-emerald-200 bg-white p-4 text-xs leading-relaxed shadow-sm">
      <code className="table font-mono">
        {sql.trim().split('\n').map((line, i) => (
          <HighlightedLine key={`${i}-${line}`} line={line} lineNo={i + 1} />
        ))}
      </code>
    </pre>
  )
}

export function CoralRuntimeBadge({ meta }: { meta?: { durationMs: number; mode: string; description?: string } }) {
  if (!meta) return null
  const isCache = meta.mode === 'Coral Cache'
  return (
    <span
      title={meta.description}
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium ${
        isCache
          ? 'border-safe/30 bg-safe/10 text-safe'
          : 'border-teal-400/30 bg-teal-500/10 text-teal-300'
      }`}
    >
      {isCache ? <Gauge className="h-3 w-3" /> : <Database className="h-3 w-3" />}
      {meta.durationMs}ms · {meta.mode}
    </span>
  )
}

function StatusPill({ proof }: { proof: CoralProof }) {
  const ok = proof.status === 'ok'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium ${
      ok ? 'border-safe/30 bg-safe/10 text-safe' : 'border-danger/30 bg-danger/10 text-danger'
    }`}>
      {ok ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {proof.status} · {proof.row_count} rows · {proof.duration_ms}ms
    </span>
  )
}

function QueryVisual({ proof }: { proof: CoralProof }) {
  const rows = proof.sample_rows || []
  const columns = proof.columns?.length
    ? proof.columns
    : rows[0]
      ? Object.keys(rows[0])
      : []
  const visibleColumns = columns.slice(0, 5)

  return (
    <div className="query-visual space-y-4">
      <div className="query-flow">
        {(proof.sources || []).map((source, index) => (
          <div key={source} className="query-flow-step">
            <span className="source-card-logo">
              <SourceLogo source={source} className="h-5 w-5" />
            </span>
            <span>{source.replace(/_/g, ' ')}</span>
            {index < (proof.sources || []).length - 1 && (
              <span className="query-join-line" aria-hidden="true">
                {proof.cross_source ? 'JOIN' : 'READ'}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="proof-stat flex items-center gap-3 rounded-xl border border-emerald-200 bg-white p-3 shadow-sm">
          <Rows3 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-lg font-black text-emerald-950">{proof.row_count}</p>
            <p className="text-xs font-semibold text-emerald-700">rows returned</p>
          </div>
        </div>
        <div className="proof-stat flex items-center gap-3 rounded-xl border border-emerald-200 bg-white p-3 shadow-sm">
          <Table2 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-lg font-black text-emerald-950">{columns.length}</p>
            <p className="text-xs font-semibold text-emerald-700">columns</p>
          </div>
        </div>
        <div className="proof-stat flex items-center gap-3 rounded-xl border border-emerald-200 bg-white p-3 shadow-sm">
          <Gauge className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-lg font-black text-emerald-950">{proof.duration_ms}ms</p>
            <p className="text-xs font-semibold text-emerald-700">runtime</p>
          </div>
        </div>
      </div>

      {proof.span_count != null && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
            Coral trace · {proof.mode}
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-300">
            <span><span className="font-bold text-white">{proof.span_count}</span> spans</span>
            {proof.trace_duration_ms != null && (
              <span><span className="font-bold text-white">{proof.trace_duration_ms}ms</span> trace duration</span>
            )}
          </div>
          {proof.spans_summary && proof.spans_summary.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {proof.spans_summary.map(s => (
                <span key={s.name} className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                  {s.name} ×{s.count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {proof.error && (
        <p className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs text-danger">{proof.error}</p>
      )}

      {proof.status === 'error' ? (
        <div className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          <p className="font-black">Coral query failed</p>
          <p className="mt-1 text-xs">
            {proof.error_type || 'unknown'} · Vault did not treat this as an empty result.
          </p>
          {proof.error && <p className="mt-2 text-xs">{proof.error}</p>}
        </div>
      ) : rows.length > 0 && visibleColumns.length > 0 ? (
        <div className="vault-visual-table overflow-x-auto rounded-xl border border-emerald-200 bg-white shadow-sm">
          <table>
            <thead>
              <tr>
                {visibleColumns.map(column => (
                  <th key={column}>{column.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {visibleColumns.map(column => (
                    <td key={`${rowIndex}-${column}`}>{formatCell(row[column])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-white p-4 text-sm font-semibold text-slate-600">
          Query completed successfully with no matching rows. This is different from a failed Coral query.
        </div>
      )}

      {columns.length > visibleColumns.length && (
        <p className="text-xs font-semibold text-emerald-700/80">
          Showing {visibleColumns.length} of {columns.length} columns. Switch to SQL for the exact query.
        </p>
      )}
    </div>
  )
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 90)
  const text = String(value)
  return text.length > 90 ? `${text.slice(0, 87)}...` : text
}

function ProofItem({ proof, index }: { proof: CoralProof; index: number }) {
  const [mode, setMode] = useState<'visual' | 'sql'>('visual')

  return (
    <details className="proof-item vault-proof-item rounded-xl border border-emerald-200 bg-emerald-50/50 p-3" open={index === 0}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-emerald-950">{proof.name}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(proof.sources || []).map(source => (
                <span key={source} className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-white px-2 py-0.5 text-xs font-medium text-emerald-700 shadow-sm">
                  <SourceLogo source={source} className="h-3 w-3" />
                  {source}
                </span>
              ))}
              {proof.cross_source && (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-white px-2 py-0.5 text-xs font-medium text-emerald-700 shadow-sm">
                  <GitBranch className="h-3 w-3" /> cross-source
                </span>
              )}
            </div>
          </div>
          <StatusPill proof={proof} />
        </div>
        <p className="mt-2 text-xs font-semibold text-emerald-600/80">Click to inspect visual output or exact Coral SQL</p>
      </summary>

      <div className="mt-3 space-y-3">
        <div className="vault-proof-toggle inline-flex rounded-full border border-emerald-200 bg-emerald-100/50 p-1">
          <button
            type="button"
            onClick={() => setMode('visual')}
            className={mode === 'visual' ? 'active' : ''}
          >
            Visual output
          </button>
          <button
            type="button"
            onClick={() => setMode('sql')}
            className={mode === 'sql' ? 'active' : ''}
          >
            SQL query
          </button>
        </div>

        {mode === 'visual' ? <QueryVisual proof={proof} /> : (
          <>
            {proof.error && <p className="rounded border border-danger/20 bg-danger/10 p-2 text-xs text-danger">{proof.error}</p>}
            <SqlBlock sql={proof.sql} />
          </>
        )}
      </div>
    </details>
  )
}

export function CoralProofPanel({ proofs = [], title = 'Coral proof' }: { proofs?: CoralProof[]; title?: string }) {
  if (!proofs.length) return null
  const okCount = proofs.filter(proof => proof.status === 'ok').length
  return (
    <div className="proof-panel vault-proof-panel glass rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-emerald-700" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">{title}</span>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {okCount}/{proofs.length} queries ok
        </span>
      </div>
      <div className="space-y-3">
        {proofs.map((proof, index) => (
          <ProofItem key={`${proof.name}-${index}`} proof={proof} index={index} />
        ))}
      </div>
    </div>
  )
}

export function SourceHealthPanel({ health }: { health?: any }) {
  if (!health?.sources?.length) return null
  const okCount = health.sources.filter((source: any) => source.status === 'ok').length
  const totalCount = health.sources.length
  return (
    <div className="source-health-panel glass rounded-2xl border border-white/10 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="source-health-icon">
            <ShieldCheck className="h-4 w-4 text-white" />
          </span>
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-200">Coral source health</span>
            <p className="mt-1 text-sm text-slate-400">Installed sources, table visibility, and last query status.</p>
          </div>
        </div>
        <span className="source-health-summary">
          {okCount}/{totalCount} ready
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {health.sources.map((source: any) => {
          const ok = source.status === 'ok'
          const displayName = source.name
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (letter: string) => letter.toUpperCase())
          return (
            <div key={source.name} className="source-health-card rounded-xl border border-white/10 bg-white/[0.02] p-4" data-status={ok ? 'ok' : 'attention'}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-black text-white">
                  <span className="source-card-logo">
                    <SourceLogo source={source.name} className="h-5 w-5" />
                  </span>
                  {displayName}
                </span>
                {ok ? <CheckCircle className="h-4 w-4 text-safe" /> : <XCircle className="h-4 w-4 text-warn" />}
              </div>
              <p className="text-xs font-semibold text-slate-400">
                {source.readiness || source.status} · {source.table_count || 0} tables · {source.function_count || 0} functions
              </p>
              <div className="health-meter mt-3" aria-hidden="true">
                <span />
              </div>
              {!!source.missing_inputs?.length && (
                <p className="mt-1 text-xs text-warn">missing: {source.missing_inputs.join(', ')}</p>
              )}
              {!!source.missing && Object.values(source.missing).some((v: any) => Array.isArray(v) && v.length) && (
                <p className="mt-1 text-xs text-warn">schema contract has missing items</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

async function copyDraftToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    const copied = document.execCommand('copy')
    if (!copied) throw new Error('copy command was rejected')
  } finally {
    document.body.removeChild(textarea)
  }
}

function DraftActionCard({ action }: { action: DraftAction }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const [body, setBody] = useState(action.body)

  async function handleCopy() {
    try {
      await copyDraftToClipboard(body)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1800)
    } catch {
      setCopyState('error')
      window.setTimeout(() => setCopyState('idle'), 2400)
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3 space-y-3">
      <div>
        <p className="text-sm font-medium text-slate-200">{action.title}</p>
        <p className="mt-0.5 text-xs text-teal-300">
          {action.target} · draft only · manual execution outside Compass
        </p>
      </div>

      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={4}
        title="Draft body"
        className="w-full rounded border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-teal-500/40 focus:outline-none resize-none"
      />
      <button
        type="button"
        onClick={handleCopy}
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs transition-colors ${
          copyState === 'copied'
            ? 'border-safe/30 bg-safe/10 text-safe'
            : copyState === 'error'
              ? 'border-danger/30 bg-danger/10 text-danger'
              : 'border-white/10 text-slate-400 hover:border-teal-500/40 hover:text-teal-300'
        }`}
      >
        {copyState === 'copied' && <CheckCircle className="h-3 w-3" />}
        {copyState === 'error' && <XCircle className="h-3 w-3" />}
        {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy failed' : 'Copy draft'}
      </button>
    </div>
  )
}

export function ApprovalDraftPanel({ actions = [] }: { actions?: DraftAction[] }) {
  if (!actions.length) return null
  return (
    <div className="glass rounded-xl border border-warn/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Clipboard className="h-4 w-4 text-warn" />
        <span className="text-xs font-semibold uppercase tracking-wider text-warn">Safe drafts awaiting manual approval</span>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {actions.map(action => (
          <DraftActionCard key={action.id} action={action} />
        ))}
      </div>
    </div>
  )
}
