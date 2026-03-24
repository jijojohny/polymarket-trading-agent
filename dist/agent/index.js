"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
const tools_1 = require("./tools");
const SYSTEM_PROMPT = `You are HylivBot, an autonomous AI trading agent for Polymarket prediction markets.

Your role:
- Analyze prediction markets and find profitable trading opportunities
- Execute trades autonomously when you identify good risk/reward setups
- Manage an existing portfolio of positions
- Be data-driven: always check order books and market data before trading

Trading guidelines:
- Prefer markets with high liquidity (>$10k) to minimize slippage
- Look for markets where the price disagrees with your probability assessment
- Consider time to resolution — avoid markets expiring within 24 hours unless you have strong conviction
- Start with small positions ($5–$20) and scale up on conviction
- When selling, prefer limit orders near best bid to avoid slippage
- Always check your balance before placing orders
- Diversify across multiple markets — do not over-concentrate

Risk rules you MUST follow:
- Never exceed the single order size limit (enforced automatically)
- Stop trading if the daily loss limit is reached (enforced automatically)
- When uncertain, do nothing — cash is a position too

When given a task or question, use your tools to gather data first, then reason about it, then act.
Always explain your reasoning before placing any trade.`;
class Agent {
    constructor(ai, client, safety) {
        this.conversationHistory = [];
        this.maxToolRounds = 10;
        this.ai = ai;
        this.client = client;
        this.safety = safety;
    }
    /**
     * Send a message to the agent and get a response.
     * The agent will autonomously use tools and reason until it produces a final answer.
     */
    async chat(userMessage, onStep) {
        this.conversationHistory.push({ role: 'user', content: userMessage });
        const messages = [
            { role: 'user', content: `[SYSTEM]\n${SYSTEM_PROMPT}\n[/SYSTEM]\n\n${userMessage}` },
        ];
        // Include recent conversation history (last 10 exchanges)
        const history = this.conversationHistory.slice(-20);
        if (history.length > 1) {
            // Replace first message with system + history
            messages[0] = {
                role: 'user',
                content: `[SYSTEM]\n${SYSTEM_PROMPT}\n[/SYSTEM]`,
            };
            for (const h of history) {
                messages.push(h);
            }
        }
        let rounds = 0;
        while (rounds < this.maxToolRounds) {
            rounds++;
            const response = await this.ai.chat(messages, tools_1.TOOL_DEFINITIONS);
            if (!response.toolCalls || response.toolCalls.length === 0) {
                // Final response
                const assistantMessage = { role: 'assistant', content: response.content };
                this.conversationHistory.push(assistantMessage);
                messages.push(assistantMessage);
                return response.content;
            }
            // Has tool calls — execute them
            const assistantMessage = {
                role: 'assistant',
                content: response.content,
                toolCalls: response.toolCalls,
            };
            messages.push(assistantMessage);
            for (const tc of response.toolCalls) {
                onStep?.(`[tool] ${tc.name}(${JSON.stringify(tc.input)})`);
                const result = await (0, tools_1.executeTool)(tc.name, tc.input, this.client, this.safety);
                onStep?.(`[result] ${result.slice(0, 200)}${result.length > 200 ? '...' : ''}`);
                messages.push({
                    role: 'tool',
                    content: result,
                    toolCallId: tc.id,
                });
            }
        }
        return 'Max tool rounds reached. Please try a more specific request.';
    }
    /**
     * Run the agent autonomously — scan top markets and make trading decisions.
     */
    async autonomousScan(onStep) {
        const prompt = `
Perform an autonomous market scan:
1. Get the top markets by 24h volume
2. Get your current balance and positions
3. Identify 2-3 markets where you see a trading opportunity (price mispricing, strong conviction)
4. For each opportunity, assess: current price vs. your estimated fair probability, liquidity, time to expiry
5. If you find good opportunities and have sufficient balance, place limit buy orders
6. Summarize what you found and what actions you took (or why you didn't trade)
`.trim();
        return this.chat(prompt, onStep);
    }
    clearHistory() {
        this.conversationHistory = [];
    }
    getHistoryLength() {
        return this.conversationHistory.length;
    }
}
exports.Agent = Agent;
//# sourceMappingURL=index.js.map