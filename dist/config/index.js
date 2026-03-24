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
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.savePolymarketCreds = savePolymarketCreds;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const CONFIG_DIR = path.join(os.homedir(), '.hylivbot');
const CREDS_FILE = path.join(CONFIG_DIR, 'polymarket-creds.json');
function requireEnv(name) {
    const val = process.env[name];
    if (!val)
        throw new Error(`Missing required env var: ${name}`);
    return val;
}
function loadConfig() {
    const provider = (process.env.AI_PROVIDER || 'claude');
    // Load persisted Polymarket API creds if they exist
    let creds;
    if (fs.existsSync(CREDS_FILE)) {
        try {
            creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
        }
        catch {
            // ignore malformed file
        }
    }
    // Also check env vars for creds (env takes precedence)
    if (process.env.POLYMARKET_API_KEY && process.env.POLYMARKET_SECRET && process.env.POLYMARKET_PASSPHRASE) {
        creds = {
            key: process.env.POLYMARKET_API_KEY,
            secret: process.env.POLYMARKET_SECRET,
            passphrase: process.env.POLYMARKET_PASSPHRASE,
        };
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
    };
}
function savePolymarketCreds(creds) {
    if (!fs.existsSync(CONFIG_DIR))
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2));
}
//# sourceMappingURL=index.js.map