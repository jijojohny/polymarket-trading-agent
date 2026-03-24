// Gamma API — market discovery and metadata (no auth required)

const GAMMA_API = 'https://gamma-api.polymarket.com'

export interface GammaMarket {
  id: string
  conditionId: string
  question: string
  description: string
  slug: string
  category: string
  endDate: string
  active: boolean
  closed: boolean
  archived: boolean
  liquidity: number
  volume: number
  volume24hr: number
  bestBid: number
  bestAsk: number
  lastTradePrice: number
  clobTokenIds: string[]      // [yesTokenId, noTokenId]
  outcomePrices: string[]     // ["0.55", "0.45"]
  outcomes: string[]          // ["Yes", "No"]
  negRisk: boolean
  enableOrderBook: boolean
  minimumOrderSize: number
  minimumTickSize: number
}

export interface GammaEvent {
  id: string
  title: string
  slug: string
  description: string
  category: string
  endDate: string
  active: boolean
  closed: boolean
  markets: GammaMarket[]
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Gamma API error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

export async function searchMarkets(query: string, limit = 10): Promise<GammaMarket[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    active: 'true',
    closed: 'false',
    archived: 'false',
  })
  const markets = await get<GammaMarket[]>(`${GAMMA_API}/markets?${params}`)
  if (!query) return markets.slice(0, limit)

  const q = query.toLowerCase()
  return markets
    .filter(m =>
      m.question?.toLowerCase().includes(q) ||
      m.slug?.toLowerCase().includes(q) ||
      m.category?.toLowerCase().includes(q)
    )
    .slice(0, limit)
}

export async function getMarketBySlug(slug: string): Promise<GammaMarket | null> {
  try {
    const markets = await get<GammaMarket[]>(`${GAMMA_API}/markets?slug=${encodeURIComponent(slug)}`)
    return markets[0] ?? null
  } catch {
    return null
  }
}

export async function getMarketByConditionId(conditionId: string): Promise<GammaMarket | null> {
  try {
    const markets = await get<GammaMarket[]>(
      `${GAMMA_API}/markets?condition_ids=${encodeURIComponent(conditionId)}`
    )
    return markets[0] ?? null
  } catch {
    return null
  }
}

export async function getTopMarkets(limit = 20): Promise<GammaMarket[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    active: 'true',
    closed: 'false',
    archived: 'false',
    order: 'volume24hr',
    ascending: 'false',
  })
  return get<GammaMarket[]>(`${GAMMA_API}/markets?${params}`)
}

export async function getEvents(limit = 10): Promise<GammaEvent[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    active: 'true',
    closed: 'false',
  })
  return get<GammaEvent[]>(`${GAMMA_API}/events?${params}`)
}
