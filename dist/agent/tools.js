"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_DEFINITIONS = void 0;
exports.executeTool = executeTool;
const gamma_1 = require("../polymarket/gamma");
// Map of slug/conditionId -> market (cache lookups within a session)
const marketCache = new Map();
async function resolveMarket(slugOrId) {
    const cached = marketCache.get(slugOrId);
    if (cached)
        return cached;
    // Try slug first, then conditionId
    let market = await (0, gamma_1.getMarketBySlug)(slugOrId);
    if (!market)
        market = await (0, gamma_1.getMarketByConditionId)(slugOrId);
    if (market)
        marketCache.set(slugOrId, market);
    return market;
}
exports.TOOL_DEFINITIONS = [
    {
        name: 'search_markets',
        description: 'Search for active Polymarket prediction markets by keyword. Returns matching markets with prices, liquidity, and volume.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query (e.g., "election", "bitcoin", "weather")' },
                limit: { type: 'number', description: 'Max number of results (default 10)' },
            },
            required: ['query'],
        },
    },
    {
        name: 'get_top_markets',
        description: 'Get the top prediction markets by 24h volume.',
        parameters: {
            type: 'object',
            properties: {
                limit: { type: 'number', description: 'Number of markets to return (default 20)' },
            },
        },
    },
    {
        name: 'get_market',
        description: 'Get detailed info for a specific market by slug or condition ID.',
        parameters: {
            type: 'object',
            properties: {
                slug_or_id: { type: 'string', description: 'Market slug (e.g., "will-trump-win-2024") or condition ID' },
            },
            required: ['slug_or_id'],
        },
    },
    {
        name: 'get_order_book',
        description: 'Get the current order book (bids/asks) for a market outcome token.',
        parameters: {
            type: 'object',
            properties: {
                slug_or_id: { type: 'string', description: 'Market slug or condition ID' },
                outcome: { type: 'string', enum: ['YES', 'NO'], description: 'Which outcome token to fetch' },
            },
            required: ['slug_or_id', 'outcome'],
        },
    },
    {
        name: 'get_positions',
        description: 'Get your current open positions and their P&L.',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'get_balance',
        description: 'Get your current USDC balance on Polymarket.',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'get_open_orders',
        description: 'Get your currently open (unfilled) orders.',
        parameters: {
            type: 'object',
            properties: {
                slug_or_id: { type: 'string', description: 'Optional: filter by market slug or condition ID' },
            },
        },
    },
    {
        name: 'place_order',
        description: 'Place a prediction market order. Safety checks are enforced automatically.',
        parameters: {
            type: 'object',
            properties: {
                slug_or_id: { type: 'string', description: 'Market slug or condition ID' },
                outcome: { type: 'string', enum: ['YES', 'NO'], description: 'Which outcome to trade' },
                side: { type: 'string', enum: ['BUY', 'SELL'], description: 'Buy or sell' },
                size_usdc: { type: 'number', description: 'Order size in USDC (e.g., 10 = $10)' },
                price: { type: 'number', description: 'Limit price 0.01–0.99. For market orders omit this.' },
                order_type: { type: 'string', enum: ['LIMIT', 'MARKET'], description: 'Order type (default LIMIT)' },
            },
            required: ['slug_or_id', 'outcome', 'side', 'size_usdc'],
        },
    },
    {
        name: 'cancel_order',
        description: 'Cancel a specific open order by ID.',
        parameters: {
            type: 'object',
            properties: {
                order_id: { type: 'string', description: 'The order ID to cancel' },
            },
            required: ['order_id'],
        },
    },
    {
        name: 'cancel_all_orders',
        description: 'Cancel all open orders.',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'get_trade_history',
        description: 'Get recent trade history.',
        parameters: {
            type: 'object',
            properties: {
                slug_or_id: { type: 'string', description: 'Optional: filter by market slug or condition ID' },
                limit: { type: 'number', description: 'Max trades to return (default 20)' },
            },
        },
    },
];
async function executeTool(name, input, client, safety) {
    try {
        switch (name) {
            case 'search_markets': {
                const markets = await (0, gamma_1.searchMarkets)(String(input.query || ''), Number(input.limit) || 10);
                if (markets.length === 0)
                    return 'No markets found matching that query.';
                return JSON.stringify(markets.map(formatMarketSummary), null, 2);
            }
            case 'get_top_markets': {
                const markets = await (0, gamma_1.getTopMarkets)(Number(input.limit) || 20);
                return JSON.stringify(markets.map(formatMarketSummary), null, 2);
            }
            case 'get_market': {
                const market = await resolveMarket(String(input.slug_or_id));
                if (!market)
                    return `Market not found: ${input.slug_or_id}`;
                return JSON.stringify(formatMarketDetail(market), null, 2);
            }
            case 'get_order_book': {
                const market = await resolveMarket(String(input.slug_or_id));
                if (!market)
                    return `Market not found: ${input.slug_or_id}`;
                const tokenId = input.outcome === 'NO' ? market.clobTokenIds[1] : market.clobTokenIds[0];
                if (!tokenId)
                    return 'This market does not have CLOB trading enabled.';
                const book = await client.getOrderBook(tokenId);
                return JSON.stringify({
                    market: market.question,
                    outcome: input.outcome,
                    bestBid: book.bids[0] ?? null,
                    bestAsk: book.asks[0] ?? null,
                    top5Bids: book.bids.slice(0, 5),
                    top5Asks: book.asks.slice(0, 5),
                    lastTradePrice: book.last_trade_price,
                    minOrderSize: book.min_order_size,
                    tickSize: book.tick_size,
                }, null, 2);
            }
            case 'get_positions': {
                const positions = await client.getPositions();
                if (positions.length === 0)
                    return 'No open positions.';
                return JSON.stringify(positions.map(p => ({
                    market: p.title,
                    outcome: p.outcome,
                    size: p.size,
                    avgPrice: p.avgPrice,
                    currentValue: p.currentValue,
                    cashPnl: p.cashPnl,
                    percentPnl: p.percentPnl,
                    redeemable: p.redeemable,
                })), null, 2);
            }
            case 'get_balance': {
                const balance = await client.getBalance();
                return `USDC balance: $${balance.toFixed(2)}`;
            }
            case 'get_open_orders': {
                const market = input.slug_or_id
                    ? await resolveMarket(String(input.slug_or_id))
                    : null;
                const orders = await client.getOpenOrders(market?.conditionId);
                if (!orders || orders.length === 0)
                    return 'No open orders.';
                return JSON.stringify(orders, null, 2);
            }
            case 'place_order': {
                const market = await resolveMarket(String(input.slug_or_id));
                if (!market)
                    return `Market not found: ${input.slug_or_id}`;
                if (!market.enableOrderBook)
                    return 'This market does not support CLOB trading.';
                if (market.closed)
                    return 'This market is closed.';
                if (!market.active)
                    return 'This market is not active.';
                const tokenId = input.outcome === 'NO' ? market.clobTokenIds[1] : market.clobTokenIds[0];
                if (!tokenId)
                    return 'Token ID not found for this market/outcome.';
                const sizeUsdc = Number(input.size_usdc);
                const orderType = String(input.order_type || 'LIMIT');
                const price = input.price ? Number(input.price) : undefined;
                // Safety check
                const safetyError = safety.checkOrder({ sizeUsdc });
                if (safetyError)
                    return `ORDER BLOCKED: ${safetyError}`;
                if (orderType === 'LIMIT' && (!price || price <= 0 || price >= 1)) {
                    return 'Limit orders require a price between 0.01 and 0.99.';
                }
                const result = await client.placeOrder({
                    tokenId,
                    side: String(input.side),
                    price: price ?? 0.5,
                    size: sizeUsdc,
                    orderType,
                    tickSize: market.minimumTickSize ? String(market.minimumTickSize) : '0.01',
                    negRisk: market.negRisk,
                });
                return JSON.stringify({
                    success: true,
                    orderId: result.orderId,
                    status: result.status,
                    market: market.question,
                    outcome: input.outcome,
                    side: input.side,
                    size: sizeUsdc,
                    price: price ?? 'market',
                }, null, 2);
            }
            case 'cancel_order': {
                const cancelled = await client.cancelOrder(String(input.order_id));
                return cancelled ? `Order ${input.order_id} cancelled.` : `Failed to cancel order ${input.order_id}.`;
            }
            case 'cancel_all_orders': {
                await client.cancelAllOrders();
                return 'All open orders cancelled.';
            }
            case 'get_trade_history': {
                const market = input.slug_or_id
                    ? await resolveMarket(String(input.slug_or_id))
                    : null;
                const trades = await client.getTrades(market?.conditionId, Number(input.limit) || 20);
                if (!trades || trades.length === 0)
                    return 'No trade history found.';
                return JSON.stringify(trades, null, 2);
            }
            default:
                return `Unknown tool: ${name}`;
        }
    }
    catch (err) {
        return `Tool error: ${err instanceof Error ? err.message : String(err)}`;
    }
}
function formatMarketSummary(m) {
    return {
        slug: m.slug,
        conditionId: m.conditionId,
        question: m.question,
        category: m.category,
        endDate: m.endDate,
        yesPrice: m.outcomePrices?.[0] ?? m.bestBid,
        noPrice: m.outcomePrices?.[1] ?? m.bestAsk,
        liquidity: m.liquidity,
        volume24hr: m.volume24hr,
        active: m.active,
    };
}
function formatMarketDetail(m) {
    return {
        ...formatMarketSummary(m),
        description: m.description,
        yesTokenId: m.clobTokenIds?.[0],
        noTokenId: m.clobTokenIds?.[1],
        negRisk: m.negRisk,
        minimumOrderSize: m.minimumOrderSize,
        minimumTickSize: m.minimumTickSize,
    };
}
//# sourceMappingURL=tools.js.map