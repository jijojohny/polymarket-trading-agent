export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string   // for tool result messages
  toolCalls?: ToolCall[] // for assistant messages that call tools
}

export interface AIResponse {
  content: string
  toolCalls?: ToolCall[]
}

export interface AIProvider {
  chat(messages: AIMessage[], tools: ToolDefinition[]): Promise<AIResponse>
}
