export class AIMessageChunksCollector {
    constructor() {
        this.chunks = [];
        this.result = {
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
        this.currentMessage = null;
        this.currentMessageIndex = -1;
        this.currentToolCallArgs = '';
        this.askljdhaskjd = '';
    }
    async consume(stream) {
        for await (const chunk of stream) {
            this.addChunk(chunk);
        }
        console.log(`Ricevuti ${this.chunks.length} chunk di risposta`);
    }
    formatMessage() {
        return {
            role: "assistant",
            content: this.result.messages
        };
    }
    dumpResponse() {
        console.log("--------------------");
        console.log("Risposta elaborata:", JSON.stringify(this.result, null, 2));
        console.log("--------------------");
    }
    addChunk(chunk) {
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
            this.result.additional_kwargs.stop_reason = chunk.additional_kwargs.stop_reason;
            this.finalizeCurrentMessage();
        }
    }
    extractMainInfo(chunk) {
        const result = this.result;
        if (chunk.additional_kwargs.id && !result.additional_kwargs.id) {
            result.additional_kwargs.id = chunk.additional_kwargs.id;
            result.additional_kwargs.role = (chunk.additional_kwargs.role || '');
            result.additional_kwargs.model = (chunk.additional_kwargs.model || '');
        }
    }
    extractUsage(chunk) {
        if (chunk.usage_metadata) {
            this.result.usage_metadata.input_tokens += chunk.usage_metadata.input_tokens;
            this.result.usage_metadata.output_tokens += chunk.usage_metadata.output_tokens;
            this.result.usage_metadata.total_tokens += chunk.usage_metadata.total_tokens;
        }
    }
    processChunkContent(chunk, c) {
        if (this.currentMessageIndex < c.index) {
            this.finalizeCurrentMessage();
            this.createNewMessage(chunk, c);
        }
        else {
            this.appendChunkContent(c);
        }
    }
    createNewMessage(chunk, c) {
        this.currentMessageIndex = c.index;
        switch (c.type) {
            case 'tool_use':
                this.currentMessage = {
                    type: 'tool_use',
                    id: chunk.tool_call_chunks[0].id,
                    name: chunk.tool_call_chunks[0].name,
                    input: {}
                };
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
    finalizeCurrentMessage() {
        if (this.currentMessage) {
            if (this.currentMessage.type === 'tool_use') {
                if (this.currentToolCallArgs !== '')
                    this.currentMessage.input = JSON.parse(this.currentToolCallArgs);
                this.currentToolCallArgs = '';
                this.result.tool_calls.push(clone(this.currentMessage));
            }
            this.result.messages.push(this.currentMessage);
        }
    }
    appendChunkContent(c) {
        const m = this.currentMessage;
        let append = '';
        if (c.type === 'thinking') {
            append = c.thinking || '';
            // m.content = (m.content || '') + append;
            m.thinking = (m.thinking || '') + append;
            m.signature = c.signature || m.signature;
        }
        else if (c.type === 'text') {
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
    logAppend(append) {
        this.askljdhaskjd += append;
        if (this.askljdhaskjd.length > 128) {
            console.log(this.askljdhaskjd);
            this.askljdhaskjd = '';
        }
    }
}
function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
