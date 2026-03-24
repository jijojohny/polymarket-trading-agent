"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolymarketClient = void 0;
const ethers_1 = require("ethers");
const clob_client_1 = require("@polymarket/clob-client");
const config_1 = require("../config");
const CLOB_HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137; // Polygon
class PolymarketClient {
    constructor(config) {
        this.initialized = false;
        this.config = config;
        this.wallet = new ethers_1.ethers.Wallet(config.polymarket.privateKey);
    }
    async init() {
        if (this.initialized)
            return;
        let creds;
        if (this.config.polymarket.creds) {
            creds = this.config.polymarket.creds;
        }
        // Create client (with or without creds initially)
        this.clob = new clob_client_1.ClobClient(CLOB_HOST, CHAIN_ID, this.wallet, creds, 0, // EOA signature type
        this.config.polymarket.funderAddress || this.wallet.address);
        // If no creds, derive/create them
        if (!creds) {
            const newCreds = await this.clob.createOrDeriveApiKey();
            const credsToSave = {
                key: newCreds.key,
                secret: newCreds.secret,
                passphrase: newCreds.passphrase,
            };
            (0, config_1.savePolymarketCreds)(credsToSave);
            this.config.polymarket.creds = credsToSave;
            // Reinitialize with creds
            this.clob = new clob_client_1.ClobClient(CLOB_HOST, CHAIN_ID, this.wallet, newCreds, 0, this.config.polymarket.funderAddress || this.wallet.address);
        }
        this.initialized = true;
    }
    get address() {
        return this.wallet.address;
    }
    async getOrderBook(tokenId) {
        await this.init();
        const book = await this.clob.getOrderBook(tokenId);
        return book;
    }
    async placeOrder(params) {
        await this.init();
        if (params.orderType === 'MARKET') {
            const result = await this.clob.createAndPostMarketOrder({
                tokenID: params.tokenId,
                amount: params.size,
                side: params.side === 'BUY' ? clob_client_1.Side.BUY : clob_client_1.Side.SELL,
            });
            return {
                orderId: result.orderID || '',
                status: result.status || 'unknown',
                makingAmount: result.makingAmount || '0',
                takingAmount: result.takingAmount || '0',
            };
        }
        // Limit order
        const result = await this.clob.createAndPostOrder({
            tokenID: params.tokenId,
            price: params.price,
            side: params.side === 'BUY' ? clob_client_1.Side.BUY : clob_client_1.Side.SELL,
            size: params.size,
        }, {
            tickSize: params.tickSize,
            negRisk: params.negRisk,
        }, clob_client_1.OrderType.GTC);
        return {
            orderId: result.orderID || '',
            status: result.status || 'unknown',
            makingAmount: result.makingAmount || '0',
            takingAmount: result.takingAmount || '0',
        };
    }
    async cancelOrder(orderId) {
        await this.init();
        const result = await this.clob.cancelOrder({ orderID: orderId });
        return result.canceled?.includes(orderId) ?? false;
    }
    async cancelAllOrders() {
        await this.init();
        await this.clob.cancelAll();
    }
    async getOpenOrders(conditionId) {
        await this.init();
        const params = conditionId ? { market: conditionId } : {};
        const result = await this.clob.getOpenOrders(params);
        return result.data ?? result;
    }
    async getBalance() {
        await this.init();
        const bal = await this.clob.getBalanceAllowance({ asset_type: clob_client_1.AssetType.COLLATERAL });
        return Number(bal.balance ?? 0) / 1e6;
    }
    async getPositions() {
        const address = this.config.polymarket.funderAddress || this.wallet.address;
        const url = `https://data-api.polymarket.com/positions?user=${address}&sizeThreshold=0.01&limit=100`;
        const res = await fetch(url);
        if (!res.ok)
            return [];
        const data = await res.json();
        return data;
    }
    async getTrades(conditionId, limit = 20) {
        await this.init();
        const params = {
            maker_address: this.config.polymarket.funderAddress || this.wallet.address,
        };
        if (conditionId)
            params.market = conditionId;
        const result = await this.clob.getTrades(params);
        const trades = result.data ?? result;
        return trades.slice(0, limit);
    }
}
exports.PolymarketClient = PolymarketClient;
//# sourceMappingURL=client.js.map