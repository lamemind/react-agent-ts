export interface AgentState {
    messages: any[];
    llmResponse?: string;
    completed: boolean;
    iteration: number;
}
export declare class ReActAgent {
    readonly model: any;
    readonly tools: any[];
    messages: any[];
    private readonly toolsMap;
    private interrupted;
    private isToolCallsComplete;
    private readonly maxIterations;
    private onStateChangeCallback;
    private iteration;
    constructor(model: any, tools: any[], maxIterations?: number);
    onStateChange(callback: (state: AgentState) => boolean): void;
    private notifyStateChange;
    saveState(): AgentState;
    invokeState(state: AgentState): Promise<AgentState>;
    invokeMessage(messages: any[] | string): Promise<AgentState>;
    /**
     * Estrae l'ultima risposta dell'assistente, concatenando i messaggi di tipo text ed escludendo il resto (tool call, ecc.)
     * @returns L'ultimo messaggio di tipo text dell'assistente
     */
    extractAiTextResponse(): string;
    private run;
    private callLLM;
    private callTools;
    private executeToolCall;
    dumpConversation(): void;
}
