#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const config_1 = require("./config");
const ai_1 = require("./ai");
const client_1 = require("./polymarket/client");
const safety_1 = require("./agent/safety");
const agent_1 = require("./agent");
const cli_1 = require("./cli");
const display_1 = require("./cli/display");
async function main() {
    (0, display_1.printBanner)();
    // Load config
    let config;
    try {
        config = (0, config_1.loadConfig)();
    }
    catch (err) {
        console.error(chalk_1.default.red('Config error: ') + String(err));
        console.error(chalk_1.default.gray('Copy .env.example to .env and fill in your credentials.'));
        process.exit(1);
    }
    // Initialize components
    const spinner = (0, ora_1.default)('Initializing...').start();
    try {
        // AI provider
        spinner.text = `Connecting to ${config.ai.provider === 'openai' ? 'OpenAI' : 'Claude'}...`;
        const ai = (0, ai_1.createAIProvider)(config);
        // Polymarket client
        spinner.text = 'Connecting to Polymarket...';
        const client = new client_1.PolymarketClient(config);
        await client.init();
        // Safety manager
        const safety = new safety_1.SafetyManager(config);
        // Agent
        const agent = new agent_1.Agent(ai, client, safety);
        spinner.succeed(chalk_1.default.green('Connected'));
        console.log(chalk_1.default.gray(`  Provider: ${config.ai.provider === 'openai' ? 'OpenAI' : 'Claude'}`));
        console.log(chalk_1.default.gray(`  Wallet:   ${client.address}`));
        console.log(chalk_1.default.gray(`  Max order: $${config.safety.maxOrderSizeUsdc} | Daily loss limit: $${config.safety.dailyLossLimitUsdc}`));
        console.log();
        await (0, cli_1.startCLI)(agent, client, safety);
    }
    catch (err) {
        spinner.fail(chalk_1.default.red('Initialization failed'));
        console.error(String(err));
        process.exit(1);
    }
}
main().catch(err => {
    console.error(chalk_1.default.red('Fatal error:'), err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map