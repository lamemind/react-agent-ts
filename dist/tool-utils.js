export function validateAndParseInput(args, schema) {
    const validationResult = schema.safeParse(args);
    if (!validationResult.success)
        throw new Error(`Invalid input parameters: ${validationResult.error.message}`);
    return validationResult.data;
}
export function formatToolOuput(output) {
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify(output, null, 2),
            },
        ],
    };
}
