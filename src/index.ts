#!/usr/bin/env node
import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from './config'
import { createAIProvider } from './ai'
import { PolymarketClient } from './polymarket/client'
import { SafetyManager } from './agent/safety'
import { Agent } from './agent'
import { startCLI } from './cli'
import { printBanner } from './cli/display'

async function main(): Promise<void> {
  printBanner()

  // Load config
  let config
  try {
    config = loadConfig()
  } catch (err) {
    console.error(chalk.red('Config error: ') + String(err))
    console.error(chalk.gray('Copy .env.example to .env and fill in your credentials.'))
    process.exit(1)
  }

  // Initialize components
  const spinner = ora('Initializing...').start()

  try {
    // AI provider
    spinner.text = `Connecting to ${config.ai.provider === 'openai' ? 'OpenAI' : 'Claude'}...`
    const ai = createAIProvider(config)

    // Polymarket client
    spinner.text = 'Connecting to Polymarket...'
    const client = new PolymarketClient(config)
    await client.init()

    // Safety manager
    const safety = new SafetyManager(config)

    // Agent
    const agent = new Agent(ai, client, safety)

    spinner.succeed(chalk.green('Connected'))

    console.log(chalk.gray(`  Provider: ${config.ai.provider === 'openai' ? 'OpenAI' : 'Claude'}`))
    console.log(chalk.gray(`  Wallet:   ${client.address}`))
    console.log(chalk.gray(`  Max order: $${config.safety.maxOrderSizeUsdc} | Daily loss limit: $${config.safety.dailyLossLimitUsdc}`))
    console.log()

    await startCLI(agent, client, safety)

  } catch (err) {
    spinner.fail(chalk.red('Initialization failed'))
    console.error(String(err))
    process.exit(1)
  }
}

main().catch(err => {
  console.error(chalk.red('Fatal error:'), err)
  process.exit(1)
})
