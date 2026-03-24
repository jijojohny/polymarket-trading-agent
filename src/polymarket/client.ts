import { ethers } from 'ethers'
import {
  ClobClient,
  Side,
  OrderType,
  AssetType,
} from '@polymarket/clob-client'
import type { ApiKeyCreds } from '@polymarket/clob-client'
import type { Config, PolymarketCreds } from '../config'
import { savePolymarketCreds } from '../config'

const CLOB_HOST = 'https://clob.polymarket.com'
const CHAIN_ID = 137 // Polygon

export interface OrderBook {
  market: string
  asset_id: string
  bids: Array<{ price: string; size: string }>
  asks: Array<{ price: string; size: string }>
  last_trade_price: string
  min_order_size: string
  tick_size: string
}

export interface PlaceOrderParams {
  tokenId: string
  side: 'BUY' | 'SELL'
  price: number          // 0.01–0.99
  size: number           // USDC amount (for BUY) or token amount (for SELL)
  orderType?: 'LIMIT' | 'MARKET'
  tickSize?: string
  negRisk?: boolean
}

export interface OrderResult {
  orderId: string
  status: string
  makingAmount: string
  takingAmount: string
}

export interface Position {
  asset: string
  conditionId: string
  size: number
  avgPrice: number
  currentValue: number
  cashPnl: number
  percentPnl: number
  title: string
  outcome: string
  redeemable: boolean
}

export class PolymarketClient {
  private clob!: ClobClient
  private wallet: ethers.Wallet
  private config: Config
  private initialized = false

  constructor(config: Config) {
    this.config = config
    this.wallet = new ethers.Wallet(config.polymarket.privateKey)
  }

  async init(): Promise<void> {
    if (this.initialized) return

    let creds: ApiKeyCreds | undefined

    if (this.config.polymarket.creds) {
      creds = this.config.polymarket.creds as unknown as ApiKeyCreds
    }

    // Create client (with or without creds initially)
    this.clob = new ClobClient(
      CLOB_HOST,
      CHAIN_ID,
      this.wallet,
      creds,
      0, // EOA signature type
      this.config.polymarket.funderAddress || this.wallet.address,
    )

    // If no creds, derive/create them
    if (!creds) {
      const newCreds = await this.clob.createOrDeriveApiKey()
      const credsToSave: PolymarketCreds = {
        key: newCreds.key,
        secret: newCreds.secret,
        passphrase: newCreds.passphrase,
      }
      savePolymarketCreds(credsToSave)
      this.config.polymarket.creds = credsToSave

      // Reinitialize with creds
      this.clob = new ClobClient(
        CLOB_HOST,
        CHAIN_ID,
        this.wallet,
        newCreds,
        0,
        this.config.polymarket.funderAddress || this.wallet.address,
      )
    }

    this.initialized = true
  }

  get address(): string {
    return this.wallet.address
  }

  async getOrderBook(tokenId: string): Promise<OrderBook> {
    await this.init()
    const book = await this.clob.getOrderBook(tokenId)
    return book as unknown as OrderBook
  }

  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    await this.init()

    if (params.orderType === 'MARKET') {
      const result = await this.clob.createAndPostMarketOrder({
        tokenID: params.tokenId,
        amount: params.size,
        side: params.side === 'BUY' ? Side.BUY : Side.SELL,
      })
      return {
        orderId: result.orderID || '',
        status: result.status || 'unknown',
        makingAmount: result.makingAmount || '0',
        takingAmount: result.takingAmount || '0',
      }
    }

    // Limit order
    const result = await this.clob.createAndPostOrder(
      {
        tokenID: params.tokenId,
        price: params.price,
        side: params.side === 'BUY' ? Side.BUY : Side.SELL,
        size: params.size,
      },
      {
        tickSize: params.tickSize as '0.1' | '0.01' | '0.001' | '0.0001' | undefined,
        negRisk: params.negRisk,
      },
      OrderType.GTC,
    )

    return {
      orderId: result.orderID || '',
      status: result.status || 'unknown',
      makingAmount: result.makingAmount || '0',
      takingAmount: result.takingAmount || '0',
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    await this.init()
    const result = await this.clob.cancelOrder({ orderID: orderId })
    return result.canceled?.includes(orderId) ?? false
  }

  async cancelAllOrders(): Promise<void> {
    await this.init()
    await this.clob.cancelAll()
  }

  async getOpenOrders(conditionId?: string): Promise<unknown[]> {
    await this.init()
    const params = conditionId ? { market: conditionId } : {}
    const result = await this.clob.getOpenOrders(params)
    return (result as { data?: unknown[] }).data ?? (result as unknown[])
  }

  async getBalance(): Promise<number> {
    await this.init()
    const bal = await this.clob.getBalanceAllowance({ asset_type: AssetType.COLLATERAL })
    return Number((bal as unknown as { balance: string }).balance ?? 0) / 1e6
  }

  async getPositions(): Promise<Position[]> {
    const address = this.config.polymarket.funderAddress || this.wallet.address
    const url = `https://data-api.polymarket.com/positions?user=${address}&sizeThreshold=0.01&limit=100`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json() as Position[]
    return data
  }

  async getTrades(conditionId?: string, limit = 20): Promise<unknown[]> {
    await this.init()
    const params: Record<string, string> = {
      maker_address: this.config.polymarket.funderAddress || this.wallet.address,
    }
    if (conditionId) params.market = conditionId
    const result = await this.clob.getTrades(params)
    const trades = (result as unknown as { data?: unknown[] }).data ?? (result as unknown[])
    return trades.slice(0, limit)
  }
}
