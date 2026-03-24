import type { Config } from '../config'

interface DailyStats {
  date: string   // YYYY-MM-DD
  realizedLoss: number
  tradeCount: number
}

export class SafetyManager {
  private config: Config
  private dailyStats: DailyStats
  private killSwitch: boolean

  constructor(config: Config) {
    this.config = config
    this.killSwitch = config.safety.killSwitch
    this.dailyStats = {
      date: new Date().toISOString().split('T')[0],
      realizedLoss: 0,
      tradeCount: 0,
    }
  }

  private resetIfNewDay(): void {
    const today = new Date().toISOString().split('T')[0]
    if (this.dailyStats.date !== today) {
      this.dailyStats = { date: today, realizedLoss: 0, tradeCount: 0 }
    }
  }

  isKilled(): boolean {
    return this.killSwitch
  }

  kill(): void {
    this.killSwitch = true
  }

  resume(): void {
    this.killSwitch = false
  }

  recordLoss(amount: number): void {
    this.resetIfNewDay()
    this.dailyStats.realizedLoss += amount
    this.dailyStats.tradeCount++
  }

  getDailyStats(): DailyStats & { limit: number } {
    this.resetIfNewDay()
    return { ...this.dailyStats, limit: this.config.safety.dailyLossLimitUsdc }
  }

  /**
   * Returns null if the order is safe to place, or an error string explaining why it was blocked.
   */
  checkOrder(params: {
    sizeUsdc: number
    currentPositionSizeUsdc?: number
  }): string | null {
    if (this.killSwitch) {
      return 'Kill switch is active. Trading is halted.'
    }

    this.resetIfNewDay()

    if (params.sizeUsdc > this.config.safety.maxOrderSizeUsdc) {
      return `Order size $${params.sizeUsdc} exceeds max order size $${this.config.safety.maxOrderSizeUsdc}`
    }

    if (
      params.currentPositionSizeUsdc !== undefined &&
      params.currentPositionSizeUsdc + params.sizeUsdc > this.config.safety.maxPositionSizeUsdc
    ) {
      return `Position would reach $${(params.currentPositionSizeUsdc + params.sizeUsdc).toFixed(2)}, exceeding max $${this.config.safety.maxPositionSizeUsdc}`
    }

    if (this.dailyStats.realizedLoss >= this.config.safety.dailyLossLimitUsdc) {
      return `Daily loss limit reached ($${this.dailyStats.realizedLoss.toFixed(2)} / $${this.config.safety.dailyLossLimitUsdc})`
    }

    return null
  }
}
