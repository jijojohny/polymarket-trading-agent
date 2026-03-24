import OpenAI from 'openai'
import type { AIProvider, AIMessage, AIResponse, ToolDefinition, ToolCall } from './types'

export class OpenAIProvider implements AIProvider {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey })
    this.model = model
  }

  async chat(messages: AIMessage[], tools: ToolDefinition[]): Promise<AIResponse> {
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = []

    for (const msg of messages) {
      if (msg.role === 'user') {
        openaiMessages.push({ role: 'user', content: msg.content })
      } else if (msg.role === 'assistant') {
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          openaiMessages.push({
            role: 'assistant',
            content: msg.content || null,
            tool_calls: msg.toolCalls.map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: { name: tc.name, arguments: JSON.stringify(tc.input) },
            })),
          })
        } else {
          openaiMessages.push({ role: 'assistant', content: msg.content })
        }
      } else if (msg.role === 'tool') {
        openaiMessages.push({
          role: 'tool',
          tool_call_id: msg.toolCallId!,
          content: msg.content,
        })
      }
    }

    const openaiTools: OpenAI.ChatCompletionTool[] = tools.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }))

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      tools: openaiTools,
      tool_choice: 'auto',
    })

    const choice = response.choices[0]
    const message = choice.message
    const toolCalls: ToolCall[] = []

    if (message.tool_calls) {
      for (const tc of message.tool_calls) {
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments),
        })
      }
    }

    return {
      content: message.content || '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    }
  }
}
