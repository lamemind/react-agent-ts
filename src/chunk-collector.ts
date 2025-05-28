import { AIMessageChunk, UsageMetadata } from "@langchain/core/messages";
import { IterableReadableStream } from "@langchain/core/utils/stream";

export interface AIResponseMessage {
  type: 'text' | 'thinking' | 'tool_use';
  // content?: string;
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

export class AIMessageChunksCollector {

  public readonly chunks: AIMessageChunk[] = [];
  public readonly result: AIResponse = {
    additional_kwargs: {
      id: '',
      model: '',
      role: '',
      stop_reason: null
    },
    messages: [],
    tool_calls: [],
    usage_metadata: {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0
    }
  };

  private currentMessage: AIResponseMessage | null = null;
  private currentMessageIndex: number = -1;
  private currentToolCallArgs: string = '';

  constructor() {
  }

  public async consume(stream: IterableReadableStream<AIMessageChunk>) {
    for await (const chunk of stream) {
      this.addChunk(chunk);
    }
    console.log(`Ricevuti ${this.chunks.length} chunk di risposta`);
  }

  public formatMessage(): any {
    return {
      role: "assistant",
      content: this.result.messages
    };
  }

  public dumpResponse() {
    console.log("--------------------");
    console.log("Risposta elaborata:", JSON.stringify(this.result, null, 2));
    console.log("--------------------");
  }

  public addChunk(chunk: AIMessageChunk) {
    // console.log(`Chunk ricevuto: ${this.chunks.length + 1}`);
    this.chunks.push(chunk);

    this.extractMainInfo(chunk);
    this.extractUsage(chunk);

    if (chunk.content && chunk.content.length > 0) {
      //@ts-ignore
      chunk.content.forEach(c => {
        this.processChunkContent(chunk, c);
      });
    }

    if (chunk.additional_kwargs.stop_reason) {
      this.result.additional_kwargs.stop_reason = chunk.additional_kwargs.stop_reason as string;
      this.finalizeCurrentMessage();
    }
  }

  private extractMainInfo(chunk: AIMessageChunk) {
    const result = this.result;
    if (chunk.additional_kwargs.id && !result.additional_kwargs.id) {
      result.additional_kwargs.id = chunk.additional_kwargs.id as string;
      result.additional_kwargs.role = (chunk.additional_kwargs.role || '') as string;
      result.additional_kwargs.model = (chunk.additional_kwargs.model || '') as string;
    }
  }

  private extractUsage(chunk: AIMessageChunk) {
    if (chunk.usage_metadata) {
      this.result.usage_metadata.input_tokens += chunk.usage_metadata.input_tokens;
      this.result.usage_metadata.output_tokens += chunk.usage_metadata.output_tokens;
      this.result.usage_metadata.total_tokens += chunk.usage_metadata.total_tokens;
    }
  }

  private processChunkContent(chunk: AIMessageChunk, c: any) {
    if (this.currentMessageIndex < c.index) {
      this.finalizeCurrentMessage();
      this.createNewMessage(chunk, c);

    } else {
      this.appendChunkContent(c);
    }
  }

  private createNewMessage(chunk: AIMessageChunk, c: any) {
    this.currentMessageIndex = c.index;

    switch (c.type) {
      case 'tool_use':
        this.currentMessage = {
          type: 'tool_use',
          id: chunk.tool_call_chunks![0].id,
          name: chunk.tool_call_chunks![0].name,
          input: {}
        }
        this.currentToolCallArgs = '';
        break;

      case 'thinking':
        this.currentMessage = {
          type: 'thinking',
          // content: c.thinking,
          thinking: c.thinking,
          signature: c.signature
        };
        break;

      case 'text':
        this.currentMessage = {
          type: 'text',
          // content: c.text,
          text: c.text
        };
        break;

      default:
        throw new Error(`Unknown chunk type: ${c.type}`);
    }
  }

  private finalizeCurrentMessage() {
    if (this.currentMessage) {
      if (this.currentMessage.type === 'tool_use') {
        if (this.currentToolCallArgs !== '')
          this.currentMessage.input = JSON.parse(this.currentToolCallArgs);

        this.currentToolCallArgs = '';
        this.result.tool_calls.push(clone(this.currentMessage) as AIResponseToolCall);
      }

      this.result.messages.push(this.currentMessage);
    }
  }

  private appendChunkContent(c: any) {
    const m = this.currentMessage as AIResponseMessage;
    let append = '';
    if (c.type === 'thinking') {
      append = c.thinking || '';
      // m.content = (m.content || '') + append;
      m.thinking = (m.thinking || '') + append;
      m.signature = c.signature || m.signature;

    } else if (c.type === 'text') {
      append = c.text || '';
      // m.content = (m.content || '') + append;
      m.text = (m.text || '') + append;
    }

    else if (c.type === 'tool_use')
      throw new Error('Tool use cannot append to existing message');

    else if (c.type === 'input_json_delta')
      this.currentToolCallArgs += c.input || '';

    if (append != '')
      this.logAppend(append);
  }

  private askljdhaskjd = '';
  private logAppend(append: string) {
    this.askljdhaskjd += append;
    if (this.askljdhaskjd.length > 128) {
      console.log(this.askljdhaskjd);
      this.askljdhaskjd = '';
    }
  }

}

function clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}