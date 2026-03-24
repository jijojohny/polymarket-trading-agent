import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, AIMessage, AIResponse, ToolDefinition, ToolCall } from './types'

export class ClaudeProvider implements AIProvider {
  private client: Anthropic
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey })
    this.model = model
  }

  async chat(messages: AIMessage[], tools: ToolDefinition[]): Promise<AIResponse> {
    // Convert our message format to Anthropic's format
    const anthropicMessages: Anthropic.MessageParam[] = []

    for (const msg of messages) {
      if (msg.role === 'user') {
        anthropicMessages.push({ role: 'user', content: msg.content })
      } else if (msg.role === 'assistant') {
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          const content: Anthropic.ContentBlock[] = []
          if (msg.content) {
            content.push({ type: 'text', text: msg.content } as Anthropic.ContentBlock)
          }
          for (const tc of msg.toolCalls) {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.input,
            })
          }
          anthropicMessages.push({ role: 'assistant', content })
        } else {
          anthropicMessages.push({ role: 'assistant', content: msg.content })
        }
      } else if (msg.role === 'tool') {
        // Tool results must follow the assistant message that requested them
        // Group consecutive tool results into the same user message
        const last = anthropicMessages[anthropicMessages.length - 1]
        const toolResult: Anthropic.ToolResultBlockParam = {
          type: 'tool_result',
          tool_use_id: msg.toolCallId!,
          content: msg.content,
        }
        if (last && last.role === 'user' && Array.isArray(last.content)) {
          (last.content as Anthropic.ToolResultBlockParam[]).push(toolResult)
        } else {
          anthropicMessages.push({ role: 'user', content: [toolResult] })
        }
      }
    }

    const anthropicTools: Anthropic.Tool[] = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool['input_schema'],
    }))

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      tools: anthropicTools,
      messages: anthropicMessages,
    })

    const toolCalls: ToolCall[] = []
    let textContent = ''

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        })
      }
    }

    return {
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    }
  }
}
