"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCLI = startCLI;
const readline = __importStar(require("readline"));
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const gamma_1 = require("../polymarket/gamma");
const display_1 = require("./display");
async function startCLI(agent, client, safety) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
    });
    (0, display_1.printHelp)();
    console.log(chalk_1.default.gray('Type a message or command to get started.\n'));
    (0, display_1.printPrompt)();
    rl.on('line', async (line) => {
        const input = line.trim();
        if (!input) {
            (0, display_1.printPrompt)();
            return;
        }
        await handleCommand(input, agent, client, safety);
        (0, display_1.printPrompt)();
    });
    rl.on('close', () => {
        console.log(chalk_1.default.gray('\nGoodbye.'));
        process.exit(0);
    });
}
async function handleCommand(input, agent, client, safety) {
    const [cmd, ...rest] = input.split(' ');
    const args = rest.join(' ');
    switch (cmd.toLowerCase()) {
        case 'exit':
        case 'quit':
            console.log(chalk_1.default.gray('Goodbye.'));
            process.exit(0);
            break;
        case 'help':
            (0, display_1.printHelp)();
            break;
        case 'clear':
            agent.clearHistory();
            (0, display_1.printSuccess)('Conversation history cleared.');
            break;
        case 'kill':
            safety.kill();
            (0, display_1.printKillSwitchActive)();
            break;
        case 'resume':
            safety.resume();
            (0, display_1.printSuccess)('Kill switch deactivated. Trading resumed.');
            break;
        case 'status': {
            const stats = safety.getDailyStats();
            const killed = safety.isKilled();
            console.log('');
            console.log(chalk_1.default.bold('  Bot Status'));
            console.log(`  Kill switch: ${killed ? chalk_1.default.red('ACTIVE') : chalk_1.default.green('inactive')}`);
            console.log(`  Daily loss: ${chalk_1.default.yellow(`$${stats.realizedLoss.toFixed(2)}`)} / $${stats.limit}`);
            console.log(`  Trades today: ${stats.tradeCount}`);
            console.log(`  Conversation turns: ${agent.getHistoryLength()}`);
            console.log('');
            break;
        }
        case 'balance': {
            const spinner = (0, ora_1.default)('Fetching balance...').start();
            try {
                const balance = await client.getBalance();
                spinner.stop();
                console.log(`  USDC balance: ${chalk_1.default.green.bold(`$${balance.toFixed(2)}`)}`);
            }
            catch (err) {
                spinner.stop();
                (0, display_1.printError)(String(err));
            }
            break;
        }
        case 'positions': {
            const spinner = (0, ora_1.default)('Fetching positions...').start();
            try {
                const positions = await client.getPositions();
                spinner.stop();
                (0, display_1.printPositions)(positions);
            }
            catch (err) {
                spinner.stop();
                (0, display_1.printError)(String(err));
            }
            break;
        }
        case 'orders': {
            const spinner = (0, ora_1.default)('Fetching open orders...').start();
            try {
                const orders = await client.getOpenOrders();
                spinner.stop();
                if (!orders || orders.length === 0) {
                    console.log(chalk_1.default.gray('  No open orders.'));
                }
                else {
                    console.log(JSON.stringify(orders, null, 2));
                }
            }
            catch (err) {
                spinner.stop();
                (0, display_1.printError)(String(err));
            }
            break;
        }
        case 'cancel': {
            if (!args) {
                (0, display_1.printError)('Usage: cancel <orderId>');
                break;
            }
            const spinner = (0, ora_1.default)('Cancelling order...').start();
            try {
                const ok = await client.cancelOrder(args);
                spinner.stop();
                ok ? (0, display_1.printSuccess)(`Order ${args} cancelled.`) : (0, display_1.printError)(`Failed to cancel ${args}.`);
            }
            catch (err) {
                spinner.stop();
                (0, display_1.printError)(String(err));
            }
            break;
        }
        case 'cancel-all': {
            const spinner = (0, ora_1.default)('Cancelling all orders...').start();
            try {
                await client.cancelAllOrders();
                spinner.stop();
                (0, display_1.printSuccess)('All orders cancelled.');
            }
            catch (err) {
                spinner.stop();
                (0, display_1.printError)(String(err));
            }
            break;
        }
        case 'markets': {
            const spinner = (0, ora_1.default)('Searching markets...').start();
            try {
                const markets = await (0, gamma_1.searchMarkets)(args, 10);
                spinner.stop();
                if (markets.length === 0) {
                    console.log(chalk_1.default.gray('  No markets found.'));
                }
                else {
                    for (const m of markets) {
                        const yes = m.outcomePrices?.[0] ?? '?';
                        const no = m.outcomePrices?.[1] ?? '?';
                        console.log(`  ${chalk_1.default.yellow(m.slug)}\n` +
                            `    ${m.question}\n` +
                            `    YES: ${chalk_1.default.green(yes)} | NO: ${chalk_1.default.red(no)} | ` +
                            `Vol 24h: $${(m.volume24hr || 0).toLocaleString()} | ` +
                            `Liquidity: $${(m.liquidity || 0).toLocaleString()}\n`);
                    }
                }
            }
            catch (err) {
                spinner.stop();
                (0, display_1.printError)(String(err));
            }
            break;
        }
        case 'top': {
            const spinner = (0, ora_1.default)('Fetching top markets...').start();
            try {
                const markets = await (0, gamma_1.getTopMarkets)(15);
                spinner.stop();
                for (const m of markets) {
                    const yes = m.outcomePrices?.[0] ?? '?';
                    console.log(`  ${chalk_1.default.yellow(m.slug)}\n` +
                        `    ${m.question}\n` +
                        `    YES: ${chalk_1.default.green(yes)} | Vol 24h: $${(m.volume24hr || 0).toLocaleString()}\n`);
                }
            }
            catch (err) {
                spinner.stop();
                (0, display_1.printError)(String(err));
            }
            break;
        }
        case 'scan': {
            if (safety.isKilled()) {
                (0, display_1.printKillSwitchActive)();
                break;
            }
            console.log(chalk_1.default.cyan('\n  Starting autonomous market scan...\n'));
            const spinner = (0, ora_1.default)({ text: 'Agent thinking...', color: 'cyan' });
            spinner.start();
            try {
                const response = await agent.autonomousScan((step) => {
                    spinner.stop();
                    (0, display_1.printAgentStep)(step);
                    spinner.start();
                });
                spinner.stop();
                (0, display_1.printAgentResponse)(response);
            }
            catch (err) {
                spinner.stop();
                (0, display_1.printError)(String(err));
            }
            break;
        }
        case 'chat': {
            if (!args) {
                (0, display_1.printError)('Usage: chat <message>');
                break;
            }
            await runAgentChat(args, agent, safety);
            break;
        }
        default: {
            // Treat any unrecognized input as a chat message
            await runAgentChat(input, agent, safety);
            break;
        }
    }
}
async function runAgentChat(message, agent, safety) {
    if (safety.isKilled()) {
        (0, display_1.printWarning)('Kill switch is active. Non-trading queries still work.');
    }
    const spinner = (0, ora_1.default)({ text: 'Thinking...', color: 'cyan' });
    spinner.start();
    try {
        const response = await agent.chat(message, (step) => {
            spinner.stop();
            (0, display_1.printAgentStep)(step);
            spinner.start();
        });
        spinner.stop();
        (0, display_1.printAgentResponse)(response);
    }
    catch (err) {
        spinner.stop();
        (0, display_1.printError)(String(err));
    }
}
//# sourceMappingURL=index.js.map