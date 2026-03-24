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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = exports.ClaudeProvider = void 0;
exports.createAIProvider = createAIProvider;
__exportStar(require("./types"), exports);
var claude_1 = require("./claude");
Object.defineProperty(exports, "ClaudeProvider", { enumerable: true, get: function () { return claude_1.ClaudeProvider; } });
var openai_1 = require("./openai");
Object.defineProperty(exports, "OpenAIProvider", { enumerable: true, get: function () { return openai_1.OpenAIProvider; } });
const claude_2 = require("./claude");
const openai_2 = require("./openai");
function createAIProvider(config) {
    if (config.ai.provider === 'openai') {
        if (!config.ai.openaiApiKey)
            throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai');
        return new openai_2.OpenAIProvider(config.ai.openaiApiKey, config.ai.openaiModel);
    }
    // Default: claude
    if (!config.ai.anthropicApiKey)
        throw new Error('ANTHROPIC_API_KEY is required when AI_PROVIDER=claude');
    return new claude_2.ClaudeProvider(config.ai.anthropicApiKey, config.ai.claudeModel);
}
//# sourceMappingURL=index.js.map