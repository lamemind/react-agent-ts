export function systemPrompt(prompt) {
    if (!prompt)
        throw new Error("System prompt is undefined or empty.");
    return {
        role: "system",
        content: [{
                type: "text",
                text: prompt,
                cache_control: { type: "ephemeral" },
            }]
    };
}
export function userMessage(message) {
    return {
        role: "user",
        content: message
    };
}
