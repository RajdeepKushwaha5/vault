import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

function meta(durationMs: number) {
  const fast = durationMs < 250
  return {
    durationMs,
    mode: fast ? 'Coral Cache' : 'Local Coral query',
    description: fast
      ? 'Fast repeat path; Coral served from local cache.'
      : 'Live Coral SQL over local files — nothing left this machine.',
  }
}

async function getWithMeta(path: string) {
  const start = performance.now()
  const response = await api.get(path)
  const durationMs = Math.max(1, Math.round(performance.now() - start))
  return { ...response.data, __coralMeta: meta(durationMs) }
}

export const fetchLeaks         = () => getWithMeta('/leaks')
export const fetchSpendMap      = () => getWithMeta('/spend-map')
export const fetchSubscriptions = () => getWithMeta('/subscriptions')
export const fetchCoralHealth   = () => getWithMeta('/coral/health')
export const fetchPrivacy       = () => getWithMeta('/privacy')

export const draftCancel = (service: string, monthly?: number, cancel_url?: string) =>
  api.post('/draft-cancel', { service, monthly, cancel_url }).then(r => r.data)

export const askVault = (question: string) =>
  api.post('/ask', { question }).then(r => r.data)

export interface LeakSummary {
  annual_leak_usd: number
  to_review_usd: number
  about_to_start_usd: number
  forgotten_count: number
  total_leaks: number
  monthly_bleed_usd: number
  sources_joined: string[]
}

export interface Leak {
  type: 'forgotten' | 'price_hike' | 'duplicate' | 'trial' | 'annual' | 'review'
  severity: 'high' | 'medium' | 'low'
  title: string
  category: string
  monthly: number
  annual_impact: number
  detail: string
  cancel_url: string | null
}
