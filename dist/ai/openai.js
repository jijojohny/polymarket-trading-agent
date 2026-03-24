"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIProvider {
    constructor(apiKey, model) {
        this.client = new openai_1.default({ apiKey });
        this.model = model;
    }
    async chat(messages, tools) {
        const openaiMessages = [];
        for (const msg of messages) {
            if (msg.role === 'user') {
                openaiMessages.push({ role: 'user', content: msg.content });
            }
            else if (msg.role === 'assistant') {
                if (msg.toolCalls && msg.toolCalls.length > 0) {
                    openaiMessages.push({
                        role: 'assistant',
                        content: msg.content || null,
                        tool_calls: msg.toolCalls.map(tc => ({
                            id: tc.id,
                            type: 'function',
                            function: { name: tc.name, arguments: JSON.stringify(tc.input) },
                        })),
                    });
                }
                else {
                    openaiMessages.push({ role: 'assistant', content: msg.content });
                }
            }
            else if (msg.role === 'tool') {
                openaiMessages.push({
                    role: 'tool',
                    tool_call_id: msg.toolCallId,
                    content: msg.content,
                });
            }
        }
        const openaiTools = tools.map(t => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
            },
        }));
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: openaiMessages,
            tools: openaiTools,
            tool_choice: 'auto',
        });
        const choice = response.choices[0];
        const message = choice.message;
        const toolCalls = [];
        if (message.tool_calls) {
            for (const tc of message.tool_calls) {
                toolCalls.push({
                    id: tc.id,
                    name: tc.function.name,
                    input: JSON.parse(tc.function.arguments),
                });
            }
        }
        return {
            content: message.content || '',
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        };
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openai.js.map