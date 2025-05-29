export declare function systemPrompt(prompt: string | undefined): {
    role: string;
    content: {
        type: string;
        text: string;
        cache_control: {
            type: string;
        };
    }[];
};
export declare function userMessage(message: string): {
    role: string;
    content: string;
};
