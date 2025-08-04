import { AIMessageChunksCollector, AIResponseToolCall } from "./chunk-collector.js";
import { userMessage } from "./messages.js";

const MAX_ITERATIONS = 10;

export type callbackStateChange = (state: AgentState) => Promise<boolean>;

export interface AgentState {
    messages: any[];
    llmResponse?: string;
    completed: boolean;
    iteration: number;
}

export class ReActAgent {

    public readonly model: any;
    public readonly tools: any[];
    public messages: any[];
    private readonly toolsMap: Record<string, any> = {};

    private interrupted: boolean = false;
    private isToolCallsComplete: boolean = false;
    private readonly maxIterations: number;

    private _duringRestore_isToolCallRequest: boolean = false;
    private onStateChangeCallback: null | callbackStateChange = null;
    private iteration: number = 0;

    constructor(model: any, tools: any[], maxIterations: number = MAX_ITERATIONS) {
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

    public onStateChange(callback: callbackStateChange) {
        this.onStateChangeCallback = callback;
    }

    private async notifyStateChange(): Promise<void> {
        if (this.onStateChangeCallback) {
            this.interrupted = await this.onStateChangeCallback(this.saveState());
            if (this.interrupted)
                console.log("\nConversazione interrotta dall'utente.");
        }
    }

    public saveState(): AgentState {
        return {
            messages: [...this.messages],
            completed: this.isToolCallsComplete,
            llmResponse: this.isToolCallsComplete ? this.extractAiTextResponse() : undefined,
            iteration: this.iteration
        };
    }

    public async invokeState(state: AgentState): Promise<AgentState> {
        this.messages = [...state.messages];
        this.isToolCallsComplete = state.completed;
        this.iteration = state.iteration;

        const lastMessage = this.messages[this.messages.length - 1];
        const lastSubMessage = lastMessage.role === 'assistant'
            ? lastMessage.content[lastMessage.content.length - 1]
            : null;
        this._duringRestore_isToolCallRequest = lastSubMessage && lastSubMessage.type === 'tool_use';

        return this.run();
    }

    public async invokeMessage(messages: any[] | string): Promise<AgentState> {
        if (typeof messages === "string") {
            this.messages.push(userMessage(messages));
        } else {
            this.messages = messages;
        }

        return this.run();
    }

    /**
     * Estrae l'ultima risposta dell'assistente, concatenando i messaggi di tipo text ed escludendo il resto (tool call, ecc.)
     * @returns L'ultimo messaggio di tipo text dell'assistente
     */
    public extractAiTextResponse() {
        // 1. Trova l'ultimo messaggio dell'utente, possono essere più di uno
        // 2. Trova tutti i messaggi role=assistant successivi
        // 3. Concatena i contenuti di tipo text di questi messaggi

        const reversed = [...this.messages].reverse();
        const userMeggageIndex = reversed.findIndex((m: any) => m.role === "user");
        const assistantMessages = reversed
            .slice(0, userMeggageIndex)
            .filter((m: any) => m.role === "assistant")
            .reverse();
        const assistantTextMessage = assistantMessages
            .flatMap((m: any) => m.content)
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("\n");
        return assistantTextMessage;
    }

    private async run(): Promise<AgentState> {
        this.interrupted = false;
        this.isToolCallsComplete = false;

        while (!this.isToolCallsComplete && this.iteration < this.maxIterations) {
            this.iteration++;

            let tool_calls: AIResponseToolCall[] = [];
            if (this._duringRestore_isToolCallRequest)
                this._duringRestore_isToolCallRequest = false;

            else {
                tool_calls = await this.callLLM();
                if (this.interrupted)
                    break
            }

            await this.callTools(tool_calls!);
            if (this.interrupted)
                break
        }

        if (this.iteration >= this.maxIterations)
            console.warn(`\nRaggiunto il numero massimo di iterazioni (${this.maxIterations})`);

        // this.dumpConversation();
        return this.saveState();
    }

    private async callLLM(): Promise<AIResponseToolCall[]> {
        const stream = await this.model.stream(this.messages);
        const collector = new AIMessageChunksCollector();
        await collector.consume(stream);
        const llmMessage = collector.formatMessage();
        this.messages.push(llmMessage);

        await this.notifyStateChange();
        return collector.result.tool_calls;
    }

    private async callTools(tool_calls: AIResponseToolCall[]): Promise<void> {
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

    private async executeToolCall(call: any) {
        const tool = this.toolsMap[call.name];
        if (!tool)
            throw new Error(`Tool non trovato: ${call.name}`);

        try {
            const result = await tool.call(call.input);
            return result;
        } catch (error) {
            console.error(`Errore durante l'esecuzione del tool ${call.name}: ${error}`);
            return `@@@@ Errore durante l'esecuzione del tool ${call.name}: ${error} @@@@`;
        }
    }

    public dumpConversation() {
        console.log("\nConversazione completa:");
        console.log("-----------------------");
        this.messages.forEach((msg, i) => {
            if (msg.role === "user") {
                console.log(`[${i}] User: ${msg.content}`);
            } else if (msg.role === "assistant") {
                console.log(`[${i}] Assistant: ${JSON.stringify(msg.content)}...`);
            } else if (msg.role === "tool") {
                const tool_call_id = (msg as any).tool_call_id
                console.log(`[${i}] Tool (${tool_call_id}): ${msg.content}`);
            } else
                console.log(`[${i}] Messaggio sconosciuto: ${JSON.stringify(msg)}`);
        });
        console.log("-----------------------");
    }

}
