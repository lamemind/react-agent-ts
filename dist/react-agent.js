import { AIMessageChunksCollector } from "./chunk-collector.js";
import { userMessage } from "./messages.js";
const MAX_ITERATIONS = 10;
export class ReActAgent {
    constructor(model, tools, maxIterations = MAX_ITERATIONS) {
        this.toolsMap = {};
        this.interrupted = false;
        this.isToolCallsComplete = false;
        this.onStateChangeCallback = null;
        this.iteration = 0;
        this.model = model.bindTools(tools);
        this.tools = tools;
        this.tools.forEach(tool => {
            this.toolsMap[tool.name] = tool;
        });
        this.maxIterations = maxIterations;
        this.messages = [];
        if (tools.length > 0)
            console.log(`Tools: ${tools.map(tool => tool.name).join(", ")}`);
    }
    onStateChange(callback) {
        this.onStateChangeCallback = callback;
    }
    notifyStateChange() {
        if (this.onStateChangeCallback) {
            this.interrupted = this.onStateChangeCallback(this.saveState());
            if (this.interrupted)
                console.log("\nConversazione interrotta dall'utente.");
        }
    }
    saveState() {
        return {
            messages: [...this.messages],
            completed: this.isToolCallsComplete,
            llmResponse: this.isToolCallsComplete ? this.extractAiTextResponse() : undefined,
            iteration: this.iteration
        };
    }
    async invokeState(state) {
        this.messages = [...state.messages];
        this.isToolCallsComplete = state.completed;
        this.iteration = state.iteration;
        return this.run();
    }
    async invokeMessage(messages) {
        if (typeof messages === "string") {
            this.messages.push(userMessage(messages));
        }
        else {
            this.messages = messages;
        }
        return this.run();
    }
    /**
     * Estrae l'ultima risposta dell'assistente, concatenando i messaggi di tipo text ed escludendo il resto (tool call, ecc.)
     * @returns L'ultimo messaggio di tipo text dell'assistente
     */
    extractAiTextResponse() {
        // 1. Trova l'ultimo messaggio dell'utente, possono essere più di uno
        // 2. Trova tutti i messaggi role=assistant successivi
        // 3. Concatena i contenuti di tipo text di questi messaggi
        const reversed = [...this.messages].reverse();
        const userMeggageIndex = reversed.findIndex((m) => m.role === "user");
        const assistantMessages = reversed
            .slice(0, userMeggageIndex)
            .filter((m) => m.role === "assistant")
            .reverse();
        const assistantTextMessage = assistantMessages
            .flatMap((m) => m.content)
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("\n");
        return assistantTextMessage;
    }
    async run() {
        this.interrupted = false;
        this.isToolCallsComplete = false;
        while (!this.isToolCallsComplete && this.iteration < this.maxIterations) {
            this.iteration++;
            const tool_calls = await this.callLLM();
            if (this.interrupted)
                return this.saveState();
            await this.callTools(tool_calls);
            if (this.interrupted)
                return this.saveState();
        }
        if (this.iteration >= this.maxIterations)
            console.warn(`\nRaggiunto il numero massimo di iterazioni (${this.maxIterations})`);
        // this.dumpConversation();
        return this.saveState();
    }
    async callLLM() {
        const stream = await this.model.stream(this.messages);
        const collector = new AIMessageChunksCollector();
        await collector.consume(stream);
        const llmMessage = collector.formatMessage();
        this.messages.push(llmMessage);
        this.notifyStateChange();
        return collector.result.tool_calls;
    }
    async callTools(tool_calls) {
        if (!tool_calls || tool_calls.length <= 0) {
            this.isToolCallsComplete = true;
            return;
        }
        let counter = 1;
        for (const call of tool_calls) {
            console.log(`Call #${counter++} ${call.name} ${JSON.stringify(call.input, null, 2)}`);
            const result = await this.executeToolCall(call);
            const toolResult = {
                role: "tool",
                tool_call_id: call.id,
                content: JSON.stringify(result)
            };
            this.messages.push(toolResult);
            this.notifyStateChange();
            if (this.interrupted)
                return;
        }
    }
    async executeToolCall(call) {
        const tool = this.toolsMap[call.name];
        if (!tool)
            throw new Error(`Tool non trovato: ${call.name}`);
        try {
            const result = await tool.call(call.input);
            return result;
        }
        catch (error) {
            console.error(`Errore durante l'esecuzione del tool ${call.name}: ${error}`);
            return `@@@@ Errore durante l'esecuzione del tool ${call.name}: ${error} @@@@`;
        }
    }
    dumpConversation() {
        console.log("\nConversazione completa:");
        console.log("-----------------------");
        this.messages.forEach((msg, i) => {
            if (msg.role === "user") {
                console.log(`[${i}] User: ${msg.content}`);
            }
            else if (msg.role === "assistant") {
                console.log(`[${i}] Assistant: ${JSON.stringify(msg.content)}...`);
            }
            else if (msg.role === "tool") {
                const tool_call_id = msg.tool_call_id;
                console.log(`[${i}] Tool (${tool_call_id}): ${msg.content}`);
            }
            else
                console.log(`[${i}] Messaggio sconosciuto: ${JSON.stringify(msg)}`);
        });
        console.log("-----------------------");
    }
}
