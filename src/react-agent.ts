import { AIMessageChunksCollector, AIResponseToolCall } from "./chunk-collector.js";
import { userMessage } from "./messages.js";

const MAX_ITERATIONS = 10;

export class ReActAgent {

    public readonly model: any;
    public readonly tools: any[];
    public messages: any[];
    private readonly toolsMap: Record<string, any> = {};
    private isToolCallsComplete: boolean = false;
    private readonly maxIterations: number;
    private onMessageCallback: null | ((msg: any) => void) = null;

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

    public onMessage(callback: (msg: any) => void) {
        this.onMessageCallback = callback;
    }

    public async invoke(messages: any[] | string): Promise<string | any[]> {
        if (typeof messages === "string") {
            this.messages.push(userMessage(messages));
        } else {
            this.messages = messages;
        }

        return await this.run();
    }

    /**
     * Estrae l'ultima risposta dell'assistente, concatenando i messaggi di tipo text ed escludendo il resto (tool call, ecc.)
     * @returns L'ultimo messaggio di tipo text dell'assistente
     */
    public async extractAiTextResponse() {
        // 1. Trova l'ultimo messaggio dell'utente, possoo essere più di uno
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

    private async run(): Promise<string | any[]> {
        this.isToolCallsComplete = false;
        let iterations = 0;

        while (!this.isToolCallsComplete && iterations < this.maxIterations) {
            iterations++;
            // console.log(`\n--- Iterazione ${iterations} ---`);

            const stream = await this.model.stream(this.messages);
            const collector = new AIMessageChunksCollector();
            await collector.consume(stream);
            // collector.dumpResponse();
            const llmMessage = collector.formatMessage();
            this.messages.push(llmMessage);

            const toolResults = await this.callTools(collector.result.tool_calls);
            if (!this.isToolCallsComplete) {
                this.messages.push(...toolResults);
                // console.log("\nContinuo la conversazione con risultati degli strumenti...");
                // console.log(JSON.stringify(this.messages, null, 2));

                this.onMessageCallback?.(this.messages);
            }
        }

        if (iterations >= this.maxIterations)
            console.warn(`\nRaggiunto il numero massimo di iterazioni (${this.maxIterations})`);

        // this.dumpConversation();
        return this.messages[this.messages.length - 1].content;
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

    private async callTools(tool_calls: AIResponseToolCall[]) {
        if (tool_calls && tool_calls.length > 0) {
            // console.log(`\nTool calls richieste (${tool_calls.length}):`);

            const toolResults = [];
            for (const call of tool_calls) {
                console.log(`Call #${toolResults.length + 1} ${call.name} ${JSON.stringify(call.input, null, 2)}`);
                const result = await this.executeToolCall(call);
                // console.log(`Risultato: ${JSON.stringify(result, null, 2)}`);

                toolResults.push({
                    role: "tool",
                    tool_call_id: call.id,
                    content: JSON.stringify(result)
                });
            }

            return toolResults;
        } else {
            // console.log("\nNessun tool call richiesto, conversazione completata.");
            this.isToolCallsComplete = true;
            return [];
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

}