import * as readline from 'readline'
import ora from 'ora'
import chalk from 'chalk'
import type { Agent } from '../agent'
import type { PolymarketClient } from '../polymarket/client'
import type { SafetyManager } from '../agent/safety'
import { searchMarkets, getTopMarkets } from '../polymarket/gamma'
import {
  printHelp,
  printPositions,
  printAgentStep,
  printAgentResponse,
  printError,
  printSuccess,
  printWarning,
  printKillSwitchActive,
  printPrompt,
} from './display'

export async function startCLI(
  agent: Agent,
  client: PolymarketClient,
  safety: SafetyManager,
): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  })

  printHelp()
  console.log(chalk.gray('Type a message or command to get started.\n'))
  printPrompt()

  rl.on('line', async (line) => {
    const input = line.trim()
    if (!input) {
      printPrompt()
      return
    }

    await handleCommand(input, agent, client, safety)
    printPrompt()
  })

  rl.on('close', () => {
    console.log(chalk.gray('\nGoodbye.'))
    process.exit(0)
  })
}

async function handleCommand(
  input: string,
  agent: Agent,
  client: PolymarketClient,
  safety: SafetyManager,
): Promise<void> {
  const [cmd, ...rest] = input.split(' ')
  const args = rest.join(' ')

  switch (cmd.toLowerCase()) {
    case 'exit':
    case 'quit':
      console.log(chalk.gray('Goodbye.'))
      process.exit(0)
      break

    case 'help':
      printHelp()
      break

    case 'clear':
      agent.clearHistory()
      printSuccess('Conversation history cleared.')
      break

    case 'kill':
      safety.kill()
      printKillSwitchActive()
      break

    case 'resume':
      safety.resume()
      printSuccess('Kill switch deactivated. Trading resumed.')
      break

    case 'status': {
      const stats = safety.getDailyStats()
      const killed = safety.isKilled()
      console.log('')
      console.log(chalk.bold('  Bot Status'))
      console.log(`  Kill switch: ${killed ? chalk.red('ACTIVE') : chalk.green('inactive')}`)
      console.log(`  Daily loss: ${chalk.yellow(`$${stats.realizedLoss.toFixed(2)}`)} / $${stats.limit}`)
      console.log(`  Trades today: ${stats.tradeCount}`)
      console.log(`  Conversation turns: ${agent.getHistoryLength()}`)
      console.log('')
      break
    }

    case 'balance': {
      const spinner = ora('Fetching balance...').start()
      try {
        const balance = await client.getBalance()
        spinner.stop()
        console.log(`  USDC balance: ${chalk.green.bold(`$${balance.toFixed(2)}`)}`)
      } catch (err) {
        spinner.stop()
        printError(String(err))
      }
      break
    }

    case 'positions': {
      const spinner = ora('Fetching positions...').start()
      try {
        const positions = await client.getPositions()
        spinner.stop()
        printPositions(positions)
      } catch (err) {
        spinner.stop()
        printError(String(err))
      }
      break
    }

    case 'orders': {
      const spinner = ora('Fetching open orders...').start()
      try {
        const orders = await client.getOpenOrders()
        spinner.stop()
        if (!orders || orders.length === 0) {
          console.log(chalk.gray('  No open orders.'))
        } else {
          console.log(JSON.stringify(orders, null, 2))
        }
      } catch (err) {
        spinner.stop()
        printError(String(err))
      }
      break
    }

    case 'cancel': {
      if (!args) { printError('Usage: cancel <orderId>'); break }
      const spinner = ora('Cancelling order...').start()
      try {
        const ok = await client.cancelOrder(args)
        spinner.stop()
        ok ? printSuccess(`Order ${args} cancelled.`) : printError(`Failed to cancel ${args}.`)
      } catch (err) {
        spinner.stop()
        printError(String(err))
      }
      break
    }

    case 'cancel-all': {
      const spinner = ora('Cancelling all orders...').start()
      try {
        await client.cancelAllOrders()
        spinner.stop()
        printSuccess('All orders cancelled.')
      } catch (err) {
        spinner.stop()
        printError(String(err))
      }
      break
    }

    case 'markets': {
      const spinner = ora('Searching markets...').start()
      try {
        const markets = await searchMarkets(args, 10)
        spinner.stop()
        if (markets.length === 0) {
          console.log(chalk.gray('  No markets found.'))
        } else {
          for (const m of markets) {
            const yes = m.outcomePrices?.[0] ?? '?'
            const no = m.outcomePrices?.[1] ?? '?'
            console.log(
              `  ${chalk.yellow(m.slug)}\n` +
              `    ${m.question}\n` +
              `    YES: ${chalk.green(yes)} | NO: ${chalk.red(no)} | ` +
              `Vol 24h: $${(m.volume24hr || 0).toLocaleString()} | ` +
              `Liquidity: $${(m.liquidity || 0).toLocaleString()}\n`
            )
          }
        }
      } catch (err) {
        spinner.stop()
        printError(String(err))
      }
      break
    }

    case 'top': {
      const spinner = ora('Fetching top markets...').start()
      try {
        const markets = await getTopMarkets(15)
        spinner.stop()
        for (const m of markets) {
          const yes = m.outcomePrices?.[0] ?? '?'
          console.log(
            `  ${chalk.yellow(m.slug)}\n` +
            `    ${m.question}\n` +
            `    YES: ${chalk.green(yes)} | Vol 24h: $${(m.volume24hr || 0).toLocaleString()}\n`
          )
        }
      } catch (err) {
        spinner.stop()
        printError(String(err))
      }
      break
    }

    case 'scan': {
      if (safety.isKilled()) { printKillSwitchActive(); break }
      console.log(chalk.cyan('\n  Starting autonomous market scan...\n'))
      const spinner = ora({ text: 'Agent thinking...', color: 'cyan' })
      spinner.start()
      try {
        const response = await agent.autonomousScan((step) => {
          spinner.stop()
          printAgentStep(step)
          spinner.start()
        })
        spinner.stop()
        printAgentResponse(response)
      } catch (err) {
        spinner.stop()
        printError(String(err))
      }
      break
    }

    case 'chat': {
      if (!args) { printError('Usage: chat <message>'); break }
      await runAgentChat(args, agent, safety)
      break
    }

    default: {
      // Treat any unrecognized input as a chat message
      await runAgentChat(input, agent, safety)
      break
    }
  }
}

async function runAgentChat(message: string, agent: Agent, safety: SafetyManager): Promise<void> {
  if (safety.isKilled()) {
    printWarning('Kill switch is active. Non-trading queries still work.')
  }

  const spinner = ora({ text: 'Thinking...', color: 'cyan' })
  spinner.start()

  try {
    const response = await agent.chat(message, (step) => {
      spinner.stop()
      printAgentStep(step)
      spinner.start()
    })
    spinner.stop()
    printAgentResponse(response)
  } catch (err) {
    spinner.stop()
    printError(String(err))
  }
}
