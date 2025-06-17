export declare class ReActAgent {
    readonly model: any;
    readonly tools: any[];
    messages: any[];
    private readonly toolsMap;
    private isToolCallsComplete;
    private readonly maxIterations;
    private onMessageCallback;
    constructor(model: any, tools: any[], maxIterations?: number);
    onMessage(callback: (msg: any) => boolean | void): void;
    invoke(messages: any[] | string): Promise<string | any[]>;
    /**
     * Estrae l'ultima risposta dell'assistente, concatenando i messaggi di tipo text ed escludendo il resto (tool call, ecc.)
     * @returns L'ultimo messaggio di tipo text dell'assistente
     */
    extractAiTextResponse(): Promise<string>;
    private run;
    dumpConversation(): void;
    private callTools;
    private executeToolCall;
}
