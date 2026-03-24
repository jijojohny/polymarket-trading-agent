import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as dotenv from 'dotenv'

dotenv.config()

export interface PolymarketCreds {
  key: string      // matches @polymarket/clob-client ApiKeyCreds
  secret: string
  passphrase: string
}

export interface Config {
  ai: {
    provider: 'claude' | 'openai'
    anthropicApiKey: string
    openaiApiKey: string
    claudeModel: string
    openaiModel: string
  }
  polymarket: {
    privateKey: string
    funderAddress: string
    creds?: PolymarketCreds
  }
  safety: {
    maxOrderSizeUsdc: number
    maxPositionSizeUsdc: number
    dailyLossLimitUsdc: number
    killSwitch: boolean
  }
}

const CONFIG_DIR = path.join(os.homedir(), '.hylivbot')
const CREDS_FILE = path.join(CONFIG_DIR, 'polymarket-creds.json')

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required env var: ${name}`)
  return val
}

export function loadConfig(): Config {
  const provider = (process.env.AI_PROVIDER || 'claude') as 'claude' | 'openai'

  // Load persisted Polymarket API creds if they exist
  let creds: PolymarketCreds | undefined
  if (fs.existsSync(CREDS_FILE)) {
    try {
      creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'))
    } catch {
      // ignore malformed file
    }
  }

  // Also check env vars for creds (env takes precedence)
  if (process.env.POLYMARKET_API_KEY && process.env.POLYMARKET_SECRET && process.env.POLYMARKET_PASSPHRASE) {
    creds = {
      key: process.env.POLYMARKET_API_KEY,
      secret: process.env.POLYMARKET_SECRET,
      passphrase: process.env.POLYMARKET_PASSPHRASE,
    }
  }

  return {
    ai: {
      provider,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      claudeModel: process.env.CLAUDE_MODEL || 'claude-opus-4-6',
      openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
    },
    polymarket: {
      privateKey: requireEnv('POLYMARKET_PRIVATE_KEY'),
      funderAddress: process.env.POLYMARKET_FUNDER_ADDRESS || '',
      creds,
    },
    safety: {
      maxOrderSizeUsdc: Number(process.env.MAX_ORDER_SIZE_USDC) || 50,
      maxPositionSizeUsdc: Number(process.env.MAX_POSITION_SIZE_USDC) || 200,
      dailyLossLimitUsdc: Number(process.env.DAILY_LOSS_LIMIT_USDC) || 100,
      killSwitch: false,
    },
  }
}

export function savePolymarketCreds(creds: PolymarketCreds): void {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2))
}
