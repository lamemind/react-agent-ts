import { z } from "zod";
export declare function validateAndParseInput<T>(args: unknown, schema: z.ZodObject<any, "strip", z.ZodTypeAny, any, any>): T;
export type ToolOutput = {
    content: Array<{
        type: string;
        text: string;
    }>;
};
export declare function formatToolOuput(output: any): ToolOutput;
