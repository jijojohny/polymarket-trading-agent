"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printBanner = printBanner;
exports.printHelp = printHelp;
exports.printPositions = printPositions;
exports.printAgentStep = printAgentStep;
exports.printAgentResponse = printAgentResponse;
exports.printError = printError;
exports.printSuccess = printSuccess;
exports.printWarning = printWarning;
exports.printKillSwitchActive = printKillSwitchActive;
exports.printPrompt = printPrompt;
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
function printBanner() {
    console.log(chalk_1.default.cyan.bold(`
  ██╗  ██╗██╗   ██╗██╗     ██╗██╗   ██╗
  ██║  ██║╚██╗ ██╔╝██║     ██║██║   ██║
  ███████║ ╚████╔╝ ██║     ██║██║   ██║
  ██╔══██║  ╚██╔╝  ██║     ██║╚██╗ ██╔╝
  ██║  ██║   ██║   ███████╗██║ ╚████╔╝
  ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═══╝  BOT v0.1
  `));
    console.log(chalk_1.default.gray('  Autonomous Polymarket Trading Bot\n'));
}
function printHelp() {
    const cmds = [
        ['chat <message>', 'Talk to the AI agent'],
        ['scan', 'Autonomous market scan + trade'],
        ['markets [query]', 'Search markets'],
        ['top', 'Show top markets by volume'],
        ['positions', 'Show open positions'],
        ['balance', 'Show USDC balance'],
        ['orders', 'Show open orders'],
        ['cancel <orderId>', 'Cancel a specific order'],
        ['cancel-all', 'Cancel all open orders'],
        ['kill', 'Activate kill switch (halt trading)'],
        ['resume', 'Deactivate kill switch'],
        ['status', 'Show bot status and safety limits'],
        ['clear', 'Clear conversation history'],
        ['help', 'Show this help'],
        ['exit / quit', 'Exit the bot'],
    ];
    const table = new cli_table3_1.default({
        head: [chalk_1.default.cyan('Command'), chalk_1.default.cyan('Description')],
        style: { head: [], border: ['gray'] },
    });
    cmds.forEach(([cmd, desc]) => table.push([chalk_1.default.yellow(cmd), desc]));
    console.log(table.toString());
}
function printPositions(positions) {
    if (positions.length === 0) {
        console.log(chalk_1.default.gray('No open positions.'));
        return;
    }
    const table = new cli_table3_1.default({
        head: [
            chalk_1.default.cyan('Market'),
            chalk_1.default.cyan('Outcome'),
            chalk_1.default.cyan('Size'),
            chalk_1.default.cyan('Avg Price'),
            chalk_1.default.cyan('Value'),
            chalk_1.default.cyan('P&L'),
            chalk_1.default.cyan('%'),
        ],
        style: { head: [], border: ['gray'] },
        colWidths: [40, 8, 8, 10, 10, 10, 8],
    });
    let totalPnl = 0;
    for (const p of positions) {
        const pnlColor = p.cashPnl >= 0 ? chalk_1.default.green : chalk_1.default.red;
        totalPnl += p.cashPnl;
        table.push([
            p.title?.slice(0, 38) ?? '—',
            p.outcome,
            p.size.toFixed(2),
            `$${p.avgPrice.toFixed(3)}`,
            `$${p.currentValue.toFixed(2)}`,
            pnlColor(`$${p.cashPnl.toFixed(2)}`),
            pnlColor(`${p.percentPnl.toFixed(1)}%`),
        ]);
    }
    console.log(table.toString());
    const totalColor = totalPnl >= 0 ? chalk_1.default.green.bold : chalk_1.default.red.bold;
    console.log(`  Total P&L: ${totalColor(`$${totalPnl.toFixed(2)}`)}\n`);
}
function printAgentStep(msg) {
    if (msg.startsWith('[tool]')) {
        console.log(chalk_1.default.blue('  → ') + chalk_1.default.gray(msg.slice(7)));
    }
    else if (msg.startsWith('[result]')) {
        console.log(chalk_1.default.blue('  ← ') + chalk_1.default.gray(msg.slice(9)));
    }
    else {
        console.log(chalk_1.default.gray('  ' + msg));
    }
}
function printAgentResponse(msg) {
    console.log('\n' + chalk_1.default.white(msg) + '\n');
}
function printError(msg) {
    console.log(chalk_1.default.red('Error: ') + msg);
}
function printSuccess(msg) {
    console.log(chalk_1.default.green('✓ ') + msg);
}
function printWarning(msg) {
    console.log(chalk_1.default.yellow('⚠ ') + msg);
}
function printKillSwitchActive() {
    console.log(chalk_1.default.red.bold('  ⛔  KILL SWITCH ACTIVE — Trading halted'));
}
function printPrompt() {
    process.stdout.write(chalk_1.default.cyan('hylivbot') + chalk_1.default.gray('> '));
}
//# sourceMappingURL=display.js.map