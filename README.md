# @lamemind/react-agent-ts

[![npm version](https://badge.fury.io/js/@lamemind%2Freact-agent-ts.svg)](https://badge.fury.io/js/@lamemind%2Freact-agent-ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

**Streaming ReAct agent in TypeScript - bring your own LLM model**

A lightweight, streaming-first ReAct (Reasoning + Acting) agent that works with any LangChain-compatible model. Focus on agent logic while LangChain handles the provider complexity.

## ✨ Features

- 🔄 **Streaming-first**: Real-time chunked response processing
- 🔧 **Tool Integration**: Seamless function calling with automatic iteration
- 🎯 **Provider Agnostic**: Works with any LangChain model (Anthropic, OpenAI, Groq, local, etc.)
- 💡 **Minimal**: ~200 LOC focused on ReAct pattern only
- 🔐 **Type Safe**: Full TypeScript support with proper interfaces
- ⚡ **Zero Config**: Just pass your model and tools

## 📦 Installation

```bash
npm install @lamemind/react-agent-ts
```

You'll also need a LangChain model provider:

```bash
# Choose your provider
npm install @langchain/anthropic    # for Claude
npm install @langchain/openai       # for GPT
npm install @langchain/google-genai  # for Gemini
```

## 🚀 Quick Start

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { ReActAgent } from "@lamemind/react-agent-ts";
import { DynamicTool } from "@langchain/core/tools";

// Create your model
const model = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-3-sonnet-20240229"
});

// Define tools
const tools = [
  new DynamicTool({
    name: "calculator",
    description: "Performs basic math operations",
    func: async (input: string) => {
      return eval(input).toString();
    }
  })
];

// Create and use agent
const agent = new ReActAgent(model, tools);
const response = await agent.invoke("What's 15 * 24 + 100?");
console.log(response);
```

## 🎯 Usage Examples

### With OpenAI GPT

```typescript
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4"
});

const agent = new ReActAgent(model, tools);
```

### With Google Gemini

```typescript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  model: "gemini-pro"
});

const agent = new ReActAgent(model, tools);
```

### Advanced Tool Example

```typescript
import { z } from "zod";
import { validateAndParseInput } from "@lamemind/react-agent-ts";

const weatherTool = new DynamicTool({
  name: "get_weather",
  description: "Get current weather for a city",
  func: async (input: string) => {
    const schema = z.object({
      city: z.string(),
      country: z.string().optional()
    });
    
    const parsed = validateAndParseInput(JSON.parse(input), schema);
    
    // Your weather API call here
    return `Weather in ${parsed.city}: 22°C, sunny`;
  }
});

const agent = new ReActAgent(model, [weatherTool]);
await agent.invoke("What's the weather like in Rome?");
```

### Conversation Management

```typescript
import { systemPrompt, userMessage } from "@lamemind/react-agent-ts";

// Start with system prompt
const messages = [
  systemPrompt("You are a helpful data analyst assistant"),
  userMessage("Analyze this sales data...")
];

const response = await agent.invoke(messages);

// Continue conversation
const textResponse = await agent.extractAiTextResponse();
console.log("AI said:", textResponse);
```

### Streaming Callbacks

```typescript
const agent = new ReActAgent(model, tools);

// Get notified of each iteration
agent.onMessage((messages) => {
  console.log(`Agent completed iteration, ${messages.length} messages so far`);
});

const response = await agent.invoke("Complex multi-step task...");
```

## 📚 API Reference

### `ReActAgent`

#### Constructor
```typescript
new ReActAgent(model: BaseChatModel, tools: any[], maxIterations?: number)
```

- `model`: Any LangChain-compatible chat model
- `tools`: Array of LangChain tools
- `maxIterations`: Maximum reasoning iterations (default: 10)

#### Methods

**`invoke(messages: string | any[]): Promise<any>`**
Execute the agent with a message or conversation history.

**`extractAiTextResponse(): Promise<string>`**
Extract the final text response from the agent, excluding tool calls.

**`onMessage(callback: (messages: any[]) => void): void`**
Set callback for streaming updates during execution.

**`dumpConversation(): void`**
Debug method to log the complete conversation history.

## 🔧 Configuration

### Model Configuration
The agent accepts any LangChain `BaseChatModel`. Configure your model according to LangChain documentation:

```typescript
// Anthropic with custom settings
const model = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-3-sonnet-20240229",
  temperature: 0.7,
  maxTokens: 4000
});

// OpenAI with streaming
const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4",
  streaming: true
});
```

### Agent Configuration
```typescript
const agent = new ReActAgent(
  model, 
  tools, 
  5  // Max iterations - prevents infinite loops
);
```

## 🎯 Why This Approach?

**Separation of Concerns**: You handle model configuration and API keys, we handle ReAct logic.

**No Vendor Lock-in**: Switch between providers without changing agent code.

**Minimal Dependencies**: Only LangChain core, no provider-specific dependencies.

**Production Ready**: Built for real applications with proper error handling and streaming.

## 🛠️ Development

```bash
# Clone the repo
git clone https://github.com/lamemind/react-agent-ts
cd react-agent-ts

# Install dependencies
npm install

# Build
npm run build

# Development mode
npm run dev
```

## 🤝 Contributing

Contributions are welcome! This project focuses on the ReAct pattern implementation. For provider-specific issues, please refer to LangChain documentation.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC © [lamemind](https://github.com/lamemind)

## 🙏 Acknowledgments

- Built on top of [LangChain](https://langchain.com) for model abstraction
- Inspired by the ReAct paper: [Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)

---

**🌟 If this helped you, consider giving it a star on GitHub!**