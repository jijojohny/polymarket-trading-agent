export * from './types'
export { ClaudeProvider } from './claude'
export { OpenAIProvider } from './openai'

import type { Config } from '../config'
import type { AIProvider } from './types'
import { ClaudeProvider } from './claude'
import { OpenAIProvider } from './openai'

export function createAIProvider(config: Config): AIProvider {
  if (config.ai.provider === 'openai') {
    if (!config.ai.openaiApiKey) throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai')
    return new OpenAIProvider(config.ai.openaiApiKey, config.ai.openaiModel)
  }
  // Default: claude
  if (!config.ai.anthropicApiKey) throw new Error('ANTHROPIC_API_KEY is required when AI_PROVIDER=claude')
  return new ClaudeProvider(config.ai.anthropicApiKey, config.ai.claudeModel)
}
