"use strict";
// Gamma API — market discovery and metadata (no auth required)
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchMarkets = searchMarkets;
exports.getMarketBySlug = getMarketBySlug;
exports.getMarketByConditionId = getMarketByConditionId;
exports.getTopMarkets = getTopMarkets;
exports.getEvents = getEvents;
const GAMMA_API = 'https://gamma-api.polymarket.com';
async function get(url) {
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Gamma API error ${res.status}: ${await res.text()}`);
    return res.json();
}
async function searchMarkets(query, limit = 10) {
    const params = new URLSearchParams({
        limit: String(limit),
        active: 'true',
        closed: 'false',
        archived: 'false',
    });
    const markets = await get(`${GAMMA_API}/markets?${params}`);
    if (!query)
        return markets.slice(0, limit);
    const q = query.toLowerCase();
    return markets
        .filter(m => m.question?.toLowerCase().includes(q) ||
        m.slug?.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q))
        .slice(0, limit);
}
async function getMarketBySlug(slug) {
    try {
        const markets = await get(`${GAMMA_API}/markets?slug=${encodeURIComponent(slug)}`);
        return markets[0] ?? null;
    }
    catch {
        return null;
    }
}
async function getMarketByConditionId(conditionId) {
    try {
        const markets = await get(`${GAMMA_API}/markets?condition_ids=${encodeURIComponent(conditionId)}`);
        return markets[0] ?? null;
    }
    catch {
        return null;
    }
}
async function getTopMarkets(limit = 20) {
    const params = new URLSearchParams({
        limit: String(limit),
        active: 'true',
        closed: 'false',
        archived: 'false',
        order: 'volume24hr',
        ascending: 'false',
    });
    return get(`${GAMMA_API}/markets?${params}`);
}
async function getEvents(limit = 10) {
    const params = new URLSearchParams({
        limit: String(limit),
        active: 'true',
        closed: 'false',
    });
    return get(`${GAMMA_API}/events?${params}`);
}
//# sourceMappingURL=gamma.js.map