import { AIMessageChunk, UsageMetadata } from "@langchain/core/messages";
import { IterableReadableStream } from "@langchain/core/utils/stream";
export interface AIResponseMessage {
    type: 'text' | 'thinking' | 'tool_use';
    thinking?: string;
    signature?: string;
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, any>;
}
export interface AIResponseToolCall {
    id: string;
    name: string;
    input: Record<string, any>;
}
export interface AIResponse {
    additional_kwargs: {
        id: string;
        model: string;
        role: string;
        stop_reason: string | null;
    };
    messages: AIResponseMessage[];
    tool_calls: AIResponseToolCall[];
    usage_metadata: UsageMetadata;
}
export declare class AIMessageChunksCollector {
    readonly chunks: AIMessageChunk[];
    readonly result: AIResponse;
    private currentMessage;
    private currentMessageIndex;
    private currentToolCallArgs;
    constructor();
    consume(stream: IterableReadableStream<AIMessageChunk>): Promise<void>;
    formatMessage(): any;
    dumpResponse(): void;
    addChunk(chunk: AIMessageChunk): void;
    private extractMainInfo;
    private extractUsage;
    private processChunkContent;
    private createNewMessage;
    private finalizeCurrentMessage;
    private appendChunkContent;
    private askljdhaskjd;
    private logAppend;
}
