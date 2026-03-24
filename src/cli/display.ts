import chalk from 'chalk'
import Table from 'cli-table3'
import type { Position } from '../polymarket/client'

export function printBanner(): void {
  console.log(chalk.cyan.bold(`
  ██╗  ██╗██╗   ██╗██╗     ██╗██╗   ██╗
  ██║  ██║╚██╗ ██╔╝██║     ██║██║   ██║
  ███████║ ╚████╔╝ ██║     ██║██║   ██║
  ██╔══██║  ╚██╔╝  ██║     ██║╚██╗ ██╔╝
  ██║  ██║   ██║   ███████╗██║ ╚████╔╝
  ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═══╝  BOT v0.1
  `))
  console.log(chalk.gray('  Autonomous Polymarket Trading Bot\n'))
}

export function printHelp(): void {
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
  ]

  const table = new Table({
    head: [chalk.cyan('Command'), chalk.cyan('Description')],
    style: { head: [], border: ['gray'] },
  })
  cmds.forEach(([cmd, desc]) => table.push([chalk.yellow(cmd), desc]))
  console.log(table.toString())
}

export function printPositions(positions: Position[]): void {
  if (positions.length === 0) {
    console.log(chalk.gray('No open positions.'))
    return
  }
  const table = new Table({
    head: [
      chalk.cyan('Market'),
      chalk.cyan('Outcome'),
      chalk.cyan('Size'),
      chalk.cyan('Avg Price'),
      chalk.cyan('Value'),
      chalk.cyan('P&L'),
      chalk.cyan('%'),
    ],
    style: { head: [], border: ['gray'] },
    colWidths: [40, 8, 8, 10, 10, 10, 8],
  })

  let totalPnl = 0
  for (const p of positions) {
    const pnlColor = p.cashPnl >= 0 ? chalk.green : chalk.red
    totalPnl += p.cashPnl
    table.push([
      p.title?.slice(0, 38) ?? '—',
      p.outcome,
      p.size.toFixed(2),
      `$${p.avgPrice.toFixed(3)}`,
      `$${p.currentValue.toFixed(2)}`,
      pnlColor(`$${p.cashPnl.toFixed(2)}`),
      pnlColor(`${p.percentPnl.toFixed(1)}%`),
    ])
  }

  console.log(table.toString())
  const totalColor = totalPnl >= 0 ? chalk.green.bold : chalk.red.bold
  console.log(`  Total P&L: ${totalColor(`$${totalPnl.toFixed(2)}`)}\n`)
}

export function printAgentStep(msg: string): void {
  if (msg.startsWith('[tool]')) {
    console.log(chalk.blue('  → ') + chalk.gray(msg.slice(7)))
  } else if (msg.startsWith('[result]')) {
    console.log(chalk.blue('  ← ') + chalk.gray(msg.slice(9)))
  } else {
    console.log(chalk.gray('  ' + msg))
  }
}

export function printAgentResponse(msg: string): void {
  console.log('\n' + chalk.white(msg) + '\n')
}

export function printError(msg: string): void {
  console.log(chalk.red('Error: ') + msg)
}

export function printSuccess(msg: string): void {
  console.log(chalk.green('✓ ') + msg)
}

export function printWarning(msg: string): void {
  console.log(chalk.yellow('⚠ ') + msg)
}

export function printKillSwitchActive(): void {
  console.log(chalk.red.bold('  ⛔  KILL SWITCH ACTIVE — Trading halted'))
}

export function printPrompt(): void {
  process.stdout.write(chalk.cyan('hylivbot') + chalk.gray('> '))
}
