"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyManager = void 0;
class SafetyManager {
    constructor(config) {
        this.config = config;
        this.killSwitch = config.safety.killSwitch;
        this.dailyStats = {
            date: new Date().toISOString().split('T')[0],
            realizedLoss: 0,
            tradeCount: 0,
        };
    }
    resetIfNewDay() {
        const today = new Date().toISOString().split('T')[0];
        if (this.dailyStats.date !== today) {
            this.dailyStats = { date: today, realizedLoss: 0, tradeCount: 0 };
        }
    }
    isKilled() {
        return this.killSwitch;
    }
    kill() {
        this.killSwitch = true;
    }
    resume() {
        this.killSwitch = false;
    }
    recordLoss(amount) {
        this.resetIfNewDay();
        this.dailyStats.realizedLoss += amount;
        this.dailyStats.tradeCount++;
    }
    getDailyStats() {
        this.resetIfNewDay();
        return { ...this.dailyStats, limit: this.config.safety.dailyLossLimitUsdc };
    }
    /**
     * Returns null if the order is safe to place, or an error string explaining why it was blocked.
     */
    checkOrder(params) {
        if (this.killSwitch) {
            return 'Kill switch is active. Trading is halted.';
        }
        this.resetIfNewDay();
        if (params.sizeUsdc > this.config.safety.maxOrderSizeUsdc) {
            return `Order size $${params.sizeUsdc} exceeds max order size $${this.config.safety.maxOrderSizeUsdc}`;
        }
        if (params.currentPositionSizeUsdc !== undefined &&
            params.currentPositionSizeUsdc + params.sizeUsdc > this.config.safety.maxPositionSizeUsdc) {
            return `Position would reach $${(params.currentPositionSizeUsdc + params.sizeUsdc).toFixed(2)}, exceeding max $${this.config.safety.maxPositionSizeUsdc}`;
        }
        if (this.dailyStats.realizedLoss >= this.config.safety.dailyLossLimitUsdc) {
            return `Daily loss limit reached ($${this.dailyStats.realizedLoss.toFixed(2)} / $${this.config.safety.dailyLossLimitUsdc})`;
        }
        return null;
    }
}
exports.SafetyManager = SafetyManager;
//# sourceMappingURL=safety.js.map