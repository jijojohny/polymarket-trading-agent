"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeProvider = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
class ClaudeProvider {
    constructor(apiKey, model) {
        this.client = new sdk_1.default({ apiKey });
        this.model = model;
    }
    async chat(messages, tools) {
        // Convert our message format to Anthropic's format
        const anthropicMessages = [];
        for (const msg of messages) {
            if (msg.role === 'user') {
                anthropicMessages.push({ role: 'user', content: msg.content });
            }
            else if (msg.role === 'assistant') {
                if (msg.toolCalls && msg.toolCalls.length > 0) {
                    const content = [];
                    if (msg.content) {
                        content.push({ type: 'text', text: msg.content });
                    }
                    for (const tc of msg.toolCalls) {
                        content.push({
                            type: 'tool_use',
                            id: tc.id,
                            name: tc.name,
                            input: tc.input,
                        });
                    }
                    anthropicMessages.push({ role: 'assistant', content });
                }
                else {
                    anthropicMessages.push({ role: 'assistant', content: msg.content });
                }
            }
            else if (msg.role === 'tool') {
                // Tool results must follow the assistant message that requested them
                // Group consecutive tool results into the same user message
                const last = anthropicMessages[anthropicMessages.length - 1];
                const toolResult = {
                    type: 'tool_result',
                    tool_use_id: msg.toolCallId,
                    content: msg.content,
                };
                if (last && last.role === 'user' && Array.isArray(last.content)) {
                    last.content.push(toolResult);
                }
                else {
                    anthropicMessages.push({ role: 'user', content: [toolResult] });
                }
            }
        }
        const anthropicTools = tools.map(t => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters,
        }));
        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 4096,
            tools: anthropicTools,
            messages: anthropicMessages,
        });
        const toolCalls = [];
        let textContent = '';
        for (const block of response.content) {
            if (block.type === 'text') {
                textContent += block.text;
            }
            else if (block.type === 'tool_use') {
                toolCalls.push({
                    id: block.id,
                    name: block.name,
                    input: block.input,
                });
            }
        }
        return {
            content: textContent,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        };
    }
}
exports.ClaudeProvider = ClaudeProvider;
//# sourceMappingURL=claude.js.map